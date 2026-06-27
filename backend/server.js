import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import YahooFinance from 'yahoo-finance2';
import { agent } from './agents/workflow.js';
import https from 'https';

function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: headers,
        method: 'GET'
      };
      https.get(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Failed to parse JSON response: ${e.message}`));
            }
          } else {
            reject(new Error(`Request failed with status code ${res.statusCode}`));
          }
        });
      }).on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
  fetchOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }
  }
});

// Enable CORS for frontend requests
const allowedOrigins = [
  'http://localhost:5172',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL?.replace(/\/$/, '')
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
    res.status(500).json({ 
      error: 'Failed to search for companies',
      details: error.message
    });
  }
});

async function fetchCompanyFallback(symbol) {
  try {
    const symbolUpper = symbol.toUpperCase();
    console.log(`Running fallback data fetcher for ${symbolUpper}...`);
    
    // 1. Fetch quote metadata from chart endpoint (no crumb required)
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolUpper}?interval=1d&range=1d`;
    let chartInfo = {};
    try {
      const data = await httpsGetJson(chartUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      });
      chartInfo = data?.chart?.result?.[0]?.meta || {};
    } catch (chartError) {
      console.warn(`Chart endpoint failed:`, chartError.message);
    }

    // 2. Fetch sector/industry/name from search endpoint (no crumb required)
    let searchInfo = {};
    try {
      const searchResults = await yahooFinance.search(symbolUpper);
      const match = (searchResults.quotes || []).find(q => q.symbol === symbolUpper);
      if (match) {
        searchInfo = {
          name: match.longname || match.shortname || match.symbol,
          sector: match.sector,
          industry: match.industry
        };
      }
    } catch (searchError) {
      console.warn(`Search fallback failed:`, searchError.message);
    }

    const details = {
      name: chartInfo.longName || chartInfo.shortName || searchInfo.name || symbolUpper,
      symbol: symbolUpper,
      price: chartInfo.regularMarketPrice || null,
      marketCap: null,
      sector: searchInfo.sector || 'N/A',
      industry: searchInfo.industry || 'N/A',
      description: `Stock profile for ${symbolUpper}. Detailed business description and key financials are currently unavailable due to Yahoo Finance security policies on cloud servers.`,
      currency: chartInfo.currency || 'USD',
      financials: {
        currentRatio: null,
        debtToEquity: null,
        operatingMargins: null,
        profitMargin: null,
        returnOnEquity: null
      }
    };

    return details;
  } catch (error) {
    console.error(`Fallback fetcher failed for ${symbol}:`, error);
    throw new Error(`Failed to fetch details for ticker ${symbol.toUpperCase()} (and fallback failed)`);
  }
}

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
    const searchResults = await yahooFinance.search(symbol);

    const news = (searchResults.news || []).map(n => ({
      title: n.title,
      publisher: n.publisher,
      link: n.link,
      time: n.providerPublishTime
    }));

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
        returnOnEquity: summary.financialData?.returnOnEquity || null,
        peRatio: quote.trailingPE || summary.defaultKeyStatistics?.trailingPE || null,
        eps: quote.epsTrailingTwelveMonths || summary.defaultKeyStatistics?.trailingEps || null,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow || null
      },
      news: news
    };

    res.json(details);
  } catch (error) {
    console.error(`Fetching company details failed for ${ticker}:`, error);
    try {
      const fallbackDetails = await fetchCompanyFallback(ticker);
      res.json(fallbackDetails);
    } catch (fallbackError) {
      res.status(500).json({ 
        error: `Failed to fetch details for ticker ${ticker.toUpperCase()}`,
        details: `${error.message} | Fallback failed: ${fallbackError.message}`
      });
    }
  }
});

// Get historical stock price data
app.get('/api/historical', async (req, res) => {
  const ticker = req.query.ticker;
  const range = req.query.range || '1y'; // '6m' or '1y'
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker query parameter "ticker" is required' });
  }

  try {
    const symbol = ticker.toUpperCase();
    const endDate = new Date();
    const startDate = new Date();
    if (range === '6m') {
      startDate.setMonth(endDate.getMonth() - 6);
    } else {
      startDate.setFullYear(endDate.getFullYear() - 1);
    }

    const result = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });

    const chartData = (result || []).map(day => ({
      date: new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }),
      close: day.close,
      volume: day.volume
    }));

    res.json(chartData);
  } catch (error) {
    console.error(`Fetching historical data failed for ${ticker}:`, error);
    res.status(500).json({ error: `Failed to fetch historical data for ticker ${ticker.toUpperCase()}` });
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
    let quote, summary;
    try {
      quote = await yahooFinance.quote(symbol);
      summary = await yahooFinance.quoteSummary(symbol, {
        modules: ['assetProfile', 'financialData', 'defaultKeyStatistics']
      });
    } catch (yfError) {
      console.warn(`Yahoo Finance primary fetch failed for ${symbol}, using fallback:`, yfError.message);
      const fallbackDetails = await fetchCompanyFallback(symbol);
      quote = {
        longName: fallbackDetails.name,
        shortName: fallbackDetails.name,
        regularMarketPrice: fallbackDetails.price,
        regularMarketCap: fallbackDetails.marketCap,
        currency: fallbackDetails.currency
      };
      summary = {
        assetProfile: {
          sector: fallbackDetails.sector,
          industry: fallbackDetails.industry,
          longBusinessSummary: fallbackDetails.description
        },
        financialData: fallbackDetails.financials
      };
    }

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
    res.status(500).json({ 
      error: `AI Analysis workflow failed for ${ticker.toUpperCase()}`,
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`CORS allowed origins:`, allowedOrigins);
});
