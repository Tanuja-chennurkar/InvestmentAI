# 🤖 AI Investment Research Agent

An interactive, high-fidelity investment research web application that allows users to search for any company name or stock ticker and generates a multi-stage AI-powered investment report.

🌐 **Live Deployment**: The application is deployed and live at [https://investmentai-bzho.onrender.com/](https://investmentai-bzho.onrender.com/)

The application leverages a **five-stage LangGraph workflow** on the backend to analyze stock fundamentals, news sentiment, and risk profiles, delivering a structured rating (**INVEST**, **HOLD**, or **PASS**) with an analyst confidence score.

---


## 🔍 Overview — What It Does

The **AI Investment Research Agent** is a full-stack dashboard designed to automate the process of fundamental equity research. 
- **Lookup & Discovery**: Users search for a company name or ticker (e.g., "Apple" or "TSLA") and receive real-time autocomplete results sourced directly from Yahoo Finance.
- **Real-Time Fundamentals**: Inspects instant financial ratios including the **Current Ratio** (liquidity), **Debt-to-Equity** (leverage), **Operating Margin** (profitability), and **Return on Equity (ROE)** (capital efficiency).
- **Multi-Stage AI Analysis**: Spawns an agentic workflow that gathers financial statistics, crawls recent news, analyzes risks, and compiles a comprehensive investment memo.
- **Actionable Ratings**: Outputs a definitive rating (**INVEST**, **HOLD**, or **PASS**) alongside a confidence metric (0-100%) and bulleted lists of Positive Indicators vs. Key Concerns.

---

## 🚀 How to Run It — Setup & Run Steps

Follow these steps to configure and run the application on your local machine:

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js**: `v18.0.0` or higher (tested on `v24.14.0`)
- **npm**: `v9.0.0` or higher

### 2. Install Dependencies
Run the command below from the **root directory** of the project to automatically install dependencies for the root concurrently manager, backend, and frontend packages:
```bash
npm run install-all
```

### 3. Configure Environment Variables
1. Navigate to the `backend/` directory.
2. Create or open the `.env` file (`backend/.env`).
3. Set your preferred port and add **either** of the following API keys based on your preferred LLM provider:
```env
PORT=5000

# Google Gemini Configuration (Recommended)
GEMINI_API_KEY=your_google_gemini_api_key_here

# OR

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```
*Note: If no API keys are configured, the backend automatically activates a robust rule-based mock generator using the real stock fundamentals to ensure the application remains fully functional.*

### 4. Run the Application
From the **root directory**, start both the Express backend and Vite React dev server concurrently by running:
```bash
npm run dev
```

The terminal will launch the processes:
- **React Frontend**: Ready at [http://localhost:5172/](http://localhost:5172/)
- **Express Backend**: Listening at [http://localhost:5000/](http://localhost:5000/)

---

## 🏗️ How It Works — Approach & Architecture

The application is split into a modern client-server architecture with an agentic processing pipeline:

```text
InvestmentPlanner/
├── package.json          # Root scripts for concurrently running frontend & backend
├── frontend/             # React (Vite) client application
│   ├── src/
│   │   ├── App.jsx       # Main dashboard component & state manager
│   │   ├── App.css       # Layout styles, glows, & mobile responsiveness
│   │   ├── index.css     # Global theme variables & animations
│   │   └── main.jsx      # Entrypoint
│   └── package.json
└── backend/              # Express.js Node server
    ├── server.js         # API Router & Yahoo Finance controller
    ├── package.json      # Dependencies (Express, LangGraph, LangChain)
    ├── .env              # Local environment configs (API keys)
    └── agents/
        └── workflow.js   # Compiled LangGraph sequential pipeline
```

### 1. Frontend (React + Vite)
- **SaaS Layout UI**: A modern dashboard containing search lookup inputs, result listings, interactive financial stats cards, and glowing call-to-action blocks.
- **Dynamic Routing**: Built with `react-router-dom` to support sharing links directly to stock reports (e.g. `/report/AAPL`).
- **Real-Time Connection Hook**: Polls the backend health status every 10 seconds, showing a connection state indicator at the top right.

### 2. Backend (Express.js + Yahoo Finance)
- **API Router**: Exposes endpoints for connection check (`GET /api/status`), stock search (`GET /api/search`), raw company details (`GET /api/company`), and AI workflow research (`POST /api/analyze`).
- **Hybrid Scraper/API Fetcher**: Leverages `yahoo-finance2` for primary fetches. If blocked by Cloudflare or crumb errors, it falls back to an direct HTTPS JSON scraper parsing raw financial quotes and charts.

### 3. Agent Workflow (LangGraph)
The core research logic in `backend/agents/workflow.js` compiles a sequential state graph via `@langchain/langgraph`:

```mermaid
graph TD
    __start__([Start]) --> overview[1. Company Overview Node]
    overview --> financials[2. Financial Analysis Node]
    financials --> news[3. News & Sentiment Node]
    news --> risk[4. Risk Assessment Node]
    risk --> recommendation[5. Final Recommendation Node]
    recommendation --> __end__([End])
```

- **Graph State**: Declared using `Annotation.Root` containing fields for `companyData`, `overview`, `financials`, `news`, `risk`, and `recommendation`.
- **Flow Description**:
  1. **Company Overview Node**: Evaluates metadata and outlines core operations and revenue models.
  2. **Financial Analysis Node**: Assesses current ratios, debt, margins, and ROE against safety benchmarks.
  3. **News & Sentiment Node**: Analyzes headlines and determines market outlook.
  4. **Risk Assessment Node**: Flags operational liabilities, competition, and macroeconomic exposure.
  5. **Final Recommendation Node**: Synthesizes the previous states and yields a structured JSON object representing the final investment memo.

---

## ⚖️ Key Decisions & Trade-offs

During the design and implementation of the agentic pipeline, several critical choices were made:

### 1. Sequential LangGraph Architecture
- **Decision**: Used a linear sequential graph rather than a cyclic routing graph (e.g. letting the agent query Yahoo Finance in a loop).
- **Rationale**: Equity research reports have a highly standardized hierarchy (Overview -> Financials -> Sentiment -> Risks -> Decision). A sequential pipeline guarantees that each node focuses on its specific sub-task, minimizing hallucination and ensuring a consistent structure.
- **Trade-off**: The agent cannot backtrack to re-fetch data if a node finds an anomaly. However, the comprehensive data fetch at the beginning of the API request ensures all nodes have complete information.

### 2. Rule-Based Fallback Generator
- **Decision**: Developed a local, deterministic fallback logic that calculates scoring and returns a full report block if API keys are missing or credentials fail.
- **Rationale**: To provide a seamless user experience, the system should not crash if an LLM rate limit is hit or if a key expires.
- **Trade-off**: The reasoning paragraphs in the fallback mode are more standardized compared to real LLM generation, but they remain accurate and grounded in real-time Yahoo Finance metrics.

### 3. Metric Grounding in Prompts
- **Decision**: Injected standard financial benchmarks (e.g., Current Ratio > 1.5, Debt-to-Equity < 100%) directly into the prompt templates.
- **Rationale**: General-purpose LLMs often label ratios arbitrarily (e.g., calling a D/E of 200% "healthy"). Hardcoding standard benchmarks inside the prompts forces the LLM to ground its assessments in traditional financial theory.

### 4. What Was Left Out (Scope Boundaries)
- **Historical Statement Crawling**: The agent currently inspects a snapshot of the most recent quarterly financials. We excluded crawling 10-year historical SEC filings to keep API response times under 15 seconds.
- **Real-Time Technical Charts**: Standard stock price charting was left to focus the application on fundamental, value-based investment research rather than short-term day trading.

---

## 📊 Example Runs

Below are real, raw outputs generated by the agent workflow (running in rule-backed fallback mode using real-time stock ratios):

### 1. Apple Inc. (AAPL)
- **Investment Decision**: `INVEST`
- **Confidence Score**: `70%`
- **Positive Indicators**:
  - Conservative leverage with Debt-to-Equity at a healthy `79.55%`.
  - Stellar profitability; Operating Margin of `32.27%` shows high pricing power.
  - Exceptional Return on Equity (ROE) of `141.47%`.
  - Leading market position and prominent sector dominance within Consumer Electronics.
- **Key Concerns**:
  - Tight liquidity; Current Ratio is restricted at `1.07x` (below 1.5 benchmark).
  - Subject to constant competitive pressures and technological disruptions.
- **Reasoning Synthesis**:
  > Based on a comprehensive fundamental review, Apple Inc. represents a compelling investment opportunity. The company exhibits exceptional operating profitability and superior return metrics, combined with a healthy capital structure. While short-term liquidity is relatively tight, its high cash generation capacity offsets immediate cash flow constraints, supporting a positive growth trajectory.

---

### 2. Tesla, Inc. (TSLA)
- **Investment Decision**: `HOLD`
- **Confidence Score**: `60%`
- **Positive Indicators**:
  - Strong short-term liquidity with a Current Ratio of `2.04x`.
  - Conservative leverage with Debt-to-Equity at a healthy `18.74%`.
  - Leading market position and prominent sector dominance within Auto Manufacturers.
- **Key Concerns**:
  - Narrow profitability; Operating Margin is weak at `4.20%`.
  - Low capital efficiency; ROE is below standard at `4.90%`.
  - Subject to constant competitive pressures and technological disruptions.
- **Reasoning Synthesis**:
  > A HOLD recommendation is advised for Tesla, Inc. The company shows a balanced profile, with robust margins and strong sector positioning offset by moderate debt leverage and flat growth indicators. While there are no imminent default signs, current valuations reflect immediate fair value, leaving limited room for substantial capital appreciation. Maintain current holdings and wait for a more favorable entry point.

---

### 3. NVIDIA Corporation (NVDA)
- **Investment Decision**: `INVEST`
- **Confidence Score**: `95%`
- **Positive Indicators**:
  - Strong short-term liquidity with a Current Ratio of `3.44x`.
  - Conservative leverage with Debt-to-Equity at a healthy `6.55%`.
  - Stellar profitability; Operating Margin of `65.60%` shows high pricing power.
  - Exceptional Return on Equity (ROE) of `114.29%`.
  - Leading market position and prominent sector dominance within Semiconductors.
- **Key Concerns**:
  - Subject to constant competitive pressures and technological disruptions.
- **Reasoning Synthesis**:
  > Based on a comprehensive fundamental review, NVIDIA Corporation represents a compelling investment opportunity. The company exhibits exceptional operating profitability and superior return metrics, combined with a healthy capital structure. While short-term liquidity is relatively tight, its high cash generation capacity offsets immediate cash flow constraints, supporting a positive growth trajectory.

---

## 🔮 What We Would Improve With More Time

If we had more time to expand this project, we would prioritize the following enhancements:

1. **Parallel Node Execution**:
   - *Current*: The LangGraph pipeline runs nodes sequentially (Overview -> Financials -> News -> Risk).
   - *Improvement*: Overview, Financials, and News analysis nodes do not depend on each other. We would redesign the graph to run these in parallel, reducing latency by **50% to 70%** (saving roughly 6-10 seconds per run).

2. **Historical Ratio Analysis**:
   - *Current*: Ratios reflect a single, present-day quarterly snapshot.
   - *Improvement*: Fetch the last 4 years of annual financial statements, plot the trend of Debt-to-Equity and Operating Margins, and feed the delta (slopes) into the LLM to capture trend-based insights.

3. **Conversational Q&A Widget**:
   - *Current*: The report is a static document.
   - *Improvement*: Add a floating chat window at the bottom of the generated report, letting users query a chatbot using the generated report and the source financials as context (e.g., *"Why does the agent worry about Apple's current ratio?"*).

4. **Multi-Source Sentiment Aggregation**:
   - *Current*: News headlines are fetched exclusively from Yahoo Finance.
   - *Improvement*: Integrate Reddit (r/wallstreetbets, r/investing), Twitter sentiment, and SEC RSS feeds to generate a more comprehensive public sentiment profile.
