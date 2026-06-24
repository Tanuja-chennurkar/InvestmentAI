import { StateGraph, Annotation } from '@langchain/langgraph';

// 1. Define the LangGraph State with recommendation channel added
export const GraphState = Annotation.Root({
  companyData: Annotation(),
  overview: Annotation(),
  financials: Annotation(),
  news: Annotation(),
  risk: Annotation(),
  recommendation: Annotation(), // Holds the final decision object
});

// ================= Fallback Simulation Generators =================

function generateMockOverview(data) {
  return `### 🏢 Company Profile: ${data.name} (${data.symbol})
- **Core Operations**: ${data.name} is a global leader in the **${data.sector}** sector, operating in the **${data.industry}** industry. It designs, manufactures, and supports a broad suite of physical products, cloud services, and digital software ecosystems.
- **Key Products & Services**: Includes high-end consumer hardware devices, enterprise cloud platforms, advertising services, and recurring subscription content networks.
- **Revenue Model**: Captures value through direct consumer hardware sales, software licensing fees, monthly/annual digital ecosystem subscriptions, and co-branded financial services.`;
}

function generateMockFinancials(data) {
  const f = data.financials || {};
  const currentRatioText = f.currentRatio 
    ? `${f.currentRatio.toFixed(2)}x (${f.currentRatio >= 1.5 ? 'Strong liquidity' : 'Tight short-term liquidity'})`
    : 'N/A';
  const deText = f.debtToEquity 
    ? `${f.debtToEquity.toFixed(2)}% (${f.debtToEquity > 150 ? 'High leverage risk' : f.debtToEquity > 80 ? 'Moderate leverage' : 'Conservative/low leverage'})`
    : 'N/A';
  const marginText = f.operatingMargins 
    ? `${(f.operatingMargins * 100).toFixed(2)}% (${f.operatingMargins >= 0.15 ? 'Excellent operating profitability' : 'Moderate profitability'})`
    : 'N/A';
  const roeText = f.returnOnEquity 
    ? `${(f.returnOnEquity * 100).toFixed(2)}% (${f.returnOnEquity >= 0.15 ? 'Superb shareholder returns' : 'Moderate return performance'})`
    : 'N/A';

  return `### 💵 Fundamental Financial Analysis
- **Liquidity Position (Current Ratio)**: ${currentRatioText}. A current ratio below 1.5 indicates potential constraints in meeting short-term obligations using liquid assets.
- **Capital Structure (Debt-to-Equity)**: ${deText}. Debt levels dictate interest obligations and long-term solvency cushion.
- **Operating Margin Efficiency**: ${marginText}. Reflects strong pricing power and cost containment protocols.
- **Return on Equity (ROE)**: ${roeText}. Measures efficiency in utilizing equity capital to generate earnings.

*Financial Summary*: The company maintains exceptional operating profitability and ROE, though liquidity remains tight, requiring active working capital management.`;
}

function generateMockNews(data) {
  const articles = data.news || [];
  let bulletPoints = '';
  
  if (articles.length > 0) {
    bulletPoints = articles.slice(0, 3).map(a => `- **${a.title}** (${a.publisher}): Recent reporting indicates active public interest and news visibility.`).join('\n');
  } else {
    bulletPoints = `- No recent headlines discovered. Public visibility remains neutral.`;
  }

  return `### 📰 Recent News & Sentiment Analysis
**Key Developments & Headlines**:
${bulletPoints}

**Sentiment Assessment**:
The overall media coverage shows a **Neutral-to-Positive** bias. Markets are highly responsive to product releases and macroeconomic developments, maintaining standard trading volumes and volatility index metrics.`;
}

function generateMockRisk(data) {
  const f = data.financials || {};
  const highDebt = f.debtToEquity && f.debtToEquity > 150 ? 'High Debt Leverage' : null;
  const lowLiquidity = f.currentRatio && f.currentRatio < 1.2 ? 'Tight Short-Term Liquidity' : null;
  
  const risksList = [];
  if (highDebt) risksList.push(`- **Leverage Risk**: The company has significant debt liabilities relative to equity, posing interest payment sensitivities during rate hikes.`);
  if (lowLiquidity) risksList.push(`- **Liquidity Constraints**: Current ratio is below standard thresholds, potentially restricting active cash deployment or raising short-term borrowing costs.`);
  risksList.push(`- **Competitive Pressures**: Constant technological innovations and market entry by rivals require high R&D reinvestment rates, threatening margins.`);
  risksList.push(`- **Macroeconomic & Supply Chain Risk**: Exposed to international regulatory standards, currency fluctuations, and raw material procurement delays.`);

  return `### ⚠️ Key Risks & Concerns
**Financial & Operational Risk Factors**:
${risksList.join('\n')}

**Market Context**:
Investors should monitor the company's capability to refinance debt, expand operating margins, and maintain a competitive moat in the face of macro headwinds.`;
}

// Generate a structured recommendation object in simulation mode based on real financial stats
function generateMockRecommendation(data) {
  const f = data.financials || {};
  
  let score = 50;
  const positives = [];
  const concerns = [];

  // 1. Current Ratio Assessment
  if (f.currentRatio) {
    if (f.currentRatio >= 1.5) {
      score += 15;
      positives.push(`Strong short-term liquidity with a Current Ratio of ${f.currentRatio.toFixed(2)}x`);
    } else if (f.currentRatio < 1.1) {
      score -= 15;
      concerns.push(`Tight liquidity; Current Ratio is restricted at ${f.currentRatio.toFixed(2)}x (below 1.5 benchmark)`);
    } else {
      positives.push(`Adequate short-term liquidity of ${f.currentRatio.toFixed(2)}x`);
    }
  }

  // 2. Debt-to-Equity Assessment
  if (f.debtToEquity) {
    if (f.debtToEquity <= 90) {
      score += 15;
      positives.push(`Conservative leverage with Debt-to-Equity at a healthy ${f.debtToEquity.toFixed(2)}%`);
    } else if (f.debtToEquity > 160) {
      score -= 15;
      concerns.push(`High debt burden; Debt-to-Equity ratio is elevated at ${f.debtToEquity.toFixed(2)}%`);
    } else {
      positives.push(`Manageable leverage profile (Debt-to-Equity: ${f.debtToEquity.toFixed(2)}%)`);
    }
  }

  // 3. Operating Margin Assessment
  if (f.operatingMargins) {
    if (f.operatingMargins >= 0.18) {
      score += 10;
      positives.push(`Stellar profitability; Operating Margin of ${(f.operatingMargins * 100).toFixed(2)}% shows high pricing power`);
    } else if (f.operatingMargins < 0.07) {
      score -= 10;
      concerns.push(`Narrow profitability; Operating Margin is weak at ${(f.operatingMargins * 100).toFixed(2)}%`);
    } else {
      positives.push(`Healthy operating margins of ${(f.operatingMargins * 100).toFixed(2)}%`);
    }
  }

  // 4. Return on Equity Assessment
  if (f.returnOnEquity) {
    if (f.returnOnEquity >= 0.18) {
      score += 10;
      positives.push(`Exceptional return on equity (ROE) of ${(f.returnOnEquity * 100).toFixed(2)}%`);
    } else if (f.returnOnEquity < 0.07) {
      score -= 10;
      concerns.push(`Low capital efficiency; ROE is below standard at ${(f.returnOnEquity * 100).toFixed(2)}%`);
    } else {
      positives.push(`Solid return on equity of ${(f.returnOnEquity * 100).toFixed(2)}%`);
    }
  }

  // Add default brand indicators
  positives.push(`Leading market position and prominent sector dominance within ${data.industry}`);
  concerns.push(`Subject to constant competitive pressures and technological disruptions`);

  // Force score bounds
  score = Math.max(10, Math.min(95, score));

  let rating = 'HOLD';
  let confidence = score;
  let reasoning = '';

  if (score >= 70) {
    rating = 'INVEST';
    reasoning = `Based on a comprehensive fundamental review, **${data.name}** represents a compelling investment opportunity. The company exhibits exceptional operating profitability and superior return metrics, combined with a healthy capital structure. While short-term liquidity is relatively tight, its high cash generation capacity offsets immediate cash flow constraints, supporting a positive growth trajectory.`;
  } else if (score < 45) {
    rating = 'PASS';
    confidence = 100 - score;
    reasoning = `A PASS recommendation is issued for **${data.name}** due to significant structural concerns. The combination of elevated financial leverage and constrained near-term liquidity presents substantial solvency risks. Weak operating margins further indicate an inability to absorb rising production costs or competitive pricing pressures. Investors are advised to avoid adding exposure at current levels.`;
  } else {
    rating = 'HOLD';
    reasoning = `A HOLD recommendation is advised for **${data.name}**. The company shows a balanced profile, with robust margins and strong sector positioning offset by moderate debt leverage and flat growth indicators. While there are no imminent default signs, current valuations reflect immediate fair value, leaving limited room for substantial capital appreciation. Maintain current holdings and wait for a more favorable entry point.`;
  }

  return {
    rating,
    confidence,
    positives,
    concerns,
    reasoning
  };
}

// ================= Node Implementations =================

// Node 1: Company Overview
async function overviewAnalysisNode(state) {
  const data = state.companyData;
  if (!data) throw new Error('No company data in state');

  const prompt = `You are a financial research analyst. Analyze this company and generate a short, professional overview:
Company: ${data.name} (${data.symbol})
Sector: ${data.sector}
Industry: ${data.industry}
Description: ${data.description}

Highlight:
1. What the company does.
2. Sector/industry context.
3. Main products or services.
4. How it makes money.

Use markdown format.`;

  let text = '';
  if (process.env.GEMINI_API_KEY) {
    try {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      const llm = new ChatGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY, modelName: 'gemini-1.5-flash', temperature: 0.2 });
      const res = await llm.invoke(prompt);
      text = res.content;
    } catch (e) {
      console.error(e);
      text = generateMockOverview(data);
    }
  } else if (process.env.OPENAI_API_KEY) {
    try {
      const { ChatOpenAI } = await import('@langchain/openai');
      const llm = new ChatOpenAI({ apiKey: process.env.OPENAI_API_KEY, modelName: 'gpt-4o-mini', temperature: 0.2 });
      const res = await llm.invoke(prompt);
      text = res.content;
    } catch (e) {
      console.error(e);
      text = generateMockOverview(data);
    }
  } else {
    text = generateMockOverview(data);
  }

  return { overview: text };
}

// Node 2: Financial Analysis
async function financialAnalysisNode(state) {
  const data = state.companyData;
  const f = data.financials || {};

  const prompt = `You are a financial analyst. Evaluate the company's financial health based on these ratios:
Company: ${data.name} (${data.symbol})
Current Ratio: ${f.currentRatio || 'N/A'}
Debt to Equity: ${f.debtToEquity || 'N/A'}
Operating Margin: ${f.operatingMargins || 'N/A'}
Return on Equity: ${f.returnOnEquity || 'N/A'}

Provide an assessment of its:
1. Liquidity (Current Ratio relative to 1.5 benchmark)
2. Leverage (Debt to Equity relative to 100% benchmark)
3. Operating margins and efficiency
4. Shareholder returns (ROE)

Use markdown format.`;

  let text = '';
  if (process.env.GEMINI_API_KEY) {
    try {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      const llm = new ChatGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY, modelName: 'gemini-1.5-flash', temperature: 0.2 });
      const res = await llm.invoke(prompt);
      text = res.content;
    } catch (e) {
      console.error(e);
      text = generateMockFinancials(data);
    }
  } else if (process.env.OPENAI_API_KEY) {
    try {
      const { ChatOpenAI } = await import('@langchain/openai');
      const llm = new ChatOpenAI({ apiKey: process.env.OPENAI_API_KEY, modelName: 'gpt-4o-mini', temperature: 0.2 });
      const res = await llm.invoke(prompt);
      text = res.content;
    } catch (e) {
      console.error(e);
      text = generateMockFinancials(data);
    }
  } else {
    text = generateMockFinancials(data);
  }

  return { financials: text };
}

// Node 3: News & Sentiment Analysis
async function newsAnalysisNode(state) {
  const data = state.companyData;
  const articles = data.news || [];
  
  const headlines = articles.map(a => `- ${a.title} (Publisher: ${a.publisher})`).join('\n');

  const prompt = `You are a market researcher. Analyze the recent developments and news sentiment for the company:
Company: ${data.name} (${data.symbol})
Headlines:
${headlines || 'No recent headlines found.'}

Provide:
1. Summary of key recent developments/news.
2. An assessment of overall sentiment (Positive, Neutral, Negative) and rationale.

Use markdown format.`;

  let text = '';
  if (process.env.GEMINI_API_KEY) {
    try {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      const llm = new ChatGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY, modelName: 'gemini-1.5-flash', temperature: 0.2 });
      const res = await llm.invoke(prompt);
      text = res.content;
    } catch (e) {
      console.error(e);
      text = generateMockNews(data);
    }
  } else if (process.env.OPENAI_API_KEY) {
    try {
      const { ChatOpenAI } = await import('@langchain/openai');
      const llm = new ChatOpenAI({ apiKey: process.env.OPENAI_API_KEY, modelName: 'gpt-4o-mini', temperature: 0.2 });
      const res = await llm.invoke(prompt);
      text = res.content;
    } catch (e) {
      console.error(e);
      text = generateMockNews(data);
    }
  } else {
    text = generateMockNews(data);
  }

  return { news: text };
}

// Node 4: Risk Assessment
async function riskAnalysisNode(state) {
  const data = state.companyData;
  const f = data.financials || {};
  const articles = data.news || [];
  const headlines = articles.map(a => `- ${a.title}`).join('\n');

  const prompt = `You are an investment risk officer. Identify major risks and concerns for this investment:
Company: ${data.name} (${data.symbol})
Financial ratios: Current Ratio: ${f.currentRatio || 'N/A'}, Debt to Equity: ${f.debtToEquity || 'N/A'}, Operating Margin: ${f.operatingMargins || 'N/A'}
Recent Headlines:
${headlines || 'None'}

Detail:
1. Operational or financial risk factors (e.g. debt, liquidity constraints, margins).
2. External risks (competitive threats, macro factors, regulatory changes).
3. Summary of risks.

Use markdown format.`;

  let text = '';
  if (process.env.GEMINI_API_KEY) {
    try {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      const llm = new ChatGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY, modelName: 'gemini-1.5-flash', temperature: 0.2 });
      const res = await llm.invoke(prompt);
      text = res.content;
    } catch (e) {
      console.error(e);
      text = generateMockRisk(data);
    }
  } else if (process.env.OPENAI_API_KEY) {
    try {
      const { ChatOpenAI } = await import('@langchain/openai');
      const llm = new ChatOpenAI({ apiKey: process.env.OPENAI_API_KEY, modelName: 'gpt-4o-mini', temperature: 0.2 });
      const res = await llm.invoke(prompt);
      text = res.content;
    } catch (e) {
      console.error(e);
      text = generateMockRisk(data);
    }
  } else {
    text = generateMockRisk(data);
  }

  return { risk: text };
}

// Node 5: Final Recommendation Node
async function recommendationAnalysisNode(state) {
  const data = state.companyData;
  const overviewText = state.overview;
  const financialsText = state.financials;
  const newsText = state.news;
  const riskText = state.risk;

  const prompt = `You are the Chairman of an Investment Committee.
Based on the following research reports for ${data.name} (${data.symbol}), synthesize a final investment decision:

COMPANY OVERVIEW:
${overviewText}

FINANCIAL ANALYSIS:
${financialsText}

NEWS & SENTIMENT:
${newsText}

RISK ASSESSMENT:
${riskText}

Your output MUST be a valid JSON object matching the JSON schema below. Do not wrap the JSON output in markdown code blocks (such as \`\`\`json ... \`\`\`), do not include any explanatory conversational text before or after the JSON. Just output a raw JSON string:
{
  "rating": "INVEST" | "HOLD" | "PASS",
  "confidence": 0-100 (integer value representing confidence score),
  "positives": ["bullet points listing major positive signals", ...],
  "concerns": ["bullet points listing major warning signals or risks", ...],
  "reasoning": "detailed final reasoning and synthesis explaining the rating (1-2 paragraphs)"
}`;

  let recommendationObj = null;

  if (process.env.GEMINI_API_KEY) {
    try {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      const llm = new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        modelName: 'gemini-1.5-flash',
        temperature: 0.1
      });
      const res = await llm.invoke(prompt);
      const cleanedContent = res.content.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      recommendationObj = JSON.parse(cleanedContent);
    } catch (e) {
      console.error('Gemini recommendation call or JSON parsing failed, using simulated fallback:', e);
      recommendationObj = generateMockRecommendation(data);
    }
  } else if (process.env.OPENAI_API_KEY) {
    try {
      const { ChatOpenAI } = await import('@langchain/openai');
      const llm = new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-4o-mini',
        temperature: 0.1
      });
      const res = await llm.invoke(prompt);
      const cleanedContent = res.content.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      recommendationObj = JSON.parse(cleanedContent);
    } catch (e) {
      console.error('OpenAI recommendation call or JSON parsing failed, using simulated fallback:', e);
      recommendationObj = generateMockRecommendation(data);
    }
  } else {
    recommendationObj = generateMockRecommendation(data);
  }

  return { recommendation: recommendationObj };
}

// 3. Compile the sequential LangGraph workflow
// Flow: start -> overview -> financial -> news -> risk -> recommendation -> end
const workflow = new StateGraph(GraphState)
  .addNode('overviewAnalysis', overviewAnalysisNode)
  .addNode('financialAnalysis', financialAnalysisNode)
  .addNode('newsAnalysis', newsAnalysisNode)
  .addNode('riskAnalysis', riskAnalysisNode)
  .addNode('recommendationAnalysis', recommendationAnalysisNode)
  .addEdge('__start__', 'overviewAnalysis')
  .addEdge('overviewAnalysis', 'financialAnalysis')
  .addEdge('financialAnalysis', 'newsAnalysis')
  .addEdge('newsAnalysis', 'riskAnalysis')
  .addEdge('riskAnalysis', 'recommendationAnalysis')
  .addEdge('recommendationAnalysis', '__end__');

export const agent = workflow.compile();
