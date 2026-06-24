import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import YahooFinance from 'yahoo-finance2';
import { agent } from './agents/workflow.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// Enable CORS for frontend requests
const allowedOrigins = [
  'http://localhost:5172',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Health check API endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

// Search companies endpoint
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Search query parameter "q" is required' });
  }

  try {
    const searchResults = await yahooFinance.search(query);
    const results = (searchResults.quotes || [])
      .filter(q => q.quoteType === 'EQUITY' || q.typeDisp === 'Equity')
      .map(q => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        sector: q.sector || 'N/A',
        industry: q.industry || 'N/A',
        exchange: q.exchange || 'N/A'
      }));
    res.json(results);
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Failed to search for companies' });
  }
});

// Get company details endpoint
app.get('/api/company', async (req, res) => {
  const ticker = req.query.ticker;
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker query parameter "ticker" is required' });
  }

  try {
    const symbol = ticker.toUpperCase();
    const quote = await yahooFinance.quote(symbol);
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ['assetProfile', 'financialData', 'defaultKeyStatistics']
    });

    const details = {
      name: quote.longName || quote.shortName || symbol,
      symbol: symbol,
      price: quote.regularMarketPrice,
      marketCap: quote.regularMarketCap,
      sector: summary.assetProfile?.sector || 'N/A',
      industry: summary.assetProfile?.industry || 'N/A',
      description: summary.assetProfile?.longBusinessSummary || 'No description available.',
      currency: quote.currency || 'USD',
      financials: {
        currentRatio: summary.financialData?.currentRatio || null,
        debtToEquity: summary.financialData?.debtToEquity || null,
        operatingMargins: summary.financialData?.operatingMargins || null,
        profitMargin: summary.financialData?.profitMargin || null,
        returnOnEquity: summary.financialData?.returnOnEquity || null
      }
    };

    res.json(details);
  } catch (error) {
    console.error(`Fetching company details failed for ${ticker}:`, error);
    res.status(500).json({ error: `Failed to fetch details for ticker ${ticker.toUpperCase()}` });
  }
});

// Analyze company endpoint using multi-node LangGraph
app.post('/api/analyze', async (req, res) => {
  const { ticker } = req.body;
  if (!ticker) {
    return res.status(400).json({ error: 'Body parameter "ticker" is required' });
  }

  // 1. Check if LLM API keys are configured in environment
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.warn(`AI Analysis request for ${ticker.toUpperCase()} rejected: LLM API keys are missing in the environment.`);
    return res.status(400).json({
      error: 'LLM provider is not configured. Please set GEMINI_API_KEY or OPENAI_API_KEY in the environment.',
      code: 'LLM_UNCONFIGURED'
    });
  }

  try {
    const symbol = ticker.toUpperCase();
    console.log(`Running Multi-Stage AI Analysis workflow for ticker: ${symbol}...`);

    // 2. Fetch quote and financial summary details from Yahoo Finance
    const quote = await yahooFinance.quote(symbol);
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ['assetProfile', 'financialData', 'defaultKeyStatistics']
    });

    // 3. Fetch news articles from Yahoo Finance search autocomplete
    const searchResults = await yahooFinance.search(symbol);
    const newsArticles = (searchResults.news || []).map(n => ({
      title: n.title,
      publisher: n.publisher,
      link: n.link,
      time: n.providerPublishTime
    }));

    // 4. Construct unified company data structure
    const companyData = {
      name: quote.longName || quote.shortName || symbol,
      symbol: symbol,
      price: quote.regularMarketPrice,
      marketCap: quote.regularMarketCap,
      sector: summary.assetProfile?.sector || 'N/A',
      industry: summary.assetProfile?.industry || 'N/A',
      description: summary.assetProfile?.longBusinessSummary || 'No description available.',
      currency: quote.currency || 'USD',
      financials: {
        currentRatio: summary.financialData?.currentRatio || null,
        debtToEquity: summary.financialData?.debtToEquity || null,
        operatingMargins: summary.financialData?.operatingMargins || null,
        profitMargin: summary.financialData?.profitMargin || null,
        returnOnEquity: summary.financialData?.returnOnEquity || null
      },
      news: newsArticles
    };

    // 5. Invoke LangGraph agent workflow
    const stateInput = {
      companyData: companyData,
    };
    
    console.log('Invoking compiled LangGraph sequential workflow...');
    const result = await agent.invoke(stateInput);
    console.log('LangGraph execution completed successfully.');

    // 6. Return all analysis stages + recommendation separately
    res.json({
      ticker: symbol,
      recommendation: result.recommendation || null,
      overview: result.overview || '',
      financials: result.financials || '',
      news: result.news || '',
      risk: result.risk || '',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error in multi-stage analysis workflow for ${ticker}:`, error);
    res.status(500).json({ error: `AI Analysis workflow failed for ${ticker.toUpperCase()}` });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
