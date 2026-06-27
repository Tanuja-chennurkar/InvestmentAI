# 🤖 AI Investment Research Agent

An interactive, high-fidelity investment research web application that allows users to search for any company name or stock ticker and generates a multi-stage AI-powered investment report.

🌐 **Live Deployment**: The application is deployed and live at [https://investmentai-bzho.onrender.com/](https://investmentai-bzho.onrender.com/)

The application leverages a **five-stage LangGraph workflow** on the backend to analyze stock fundamentals, news sentiment, and risk profiles, delivering a structured rating (**INVEST**, **HOLD**, or **PASS**) with an analyst confidence score.

---

## 🔍 Overview — What It Does

The **AI Investment Research Agent** is a full-stack dashboard designed to automate the process of fundamental equity research. 

### Core Features:
- **Lookup & Discovery**: Search for a company name or ticker (e.g., "Apple" or "TSLA") and receive real-time autocomplete results sourced directly from Yahoo Finance.
- **My Watchlist**: Save and quickly revisit favorite stocks in the sidebar. Persisted locally via browser `localStorage` for quick loading.
- **Interactive Stock Chart**: Review historical stock price movements (6 Months / 1 Year ranges) rendered in an interactive line chart using Chart.js.
- **Key Financial Metrics Grid**: Inspect valuation and safety metrics at a glance, including P/E Ratio, EPS (TTM), ROE, Current Ratio, Debt-to-Equity, Operating Margin, and the 52-Week High/Low.
- **Multi-Stage AI Analysis**: Spawns an agentic workflow that gathers financial statistics, news reports, analyzes risks, and compiles a comprehensive investment memo.
- **Improved News Feed**: View recent stock headlines with source publisher, publication date/time, and clickable direct article hyperlinks.
- **Download PDF Report**: Click to generate a clean, professionally formatted PDF vector document of the entire research report.

---

## 🚀 How to Run It — Setup & Run Steps

Choose between running the application locally via Node.js or containerized using Docker.

### Option A: Running via Docker (Recommended)

Start the entire application (frontend and backend) with a single command:

1. Ensure **Docker** and **Docker Compose** are installed and running.
2. From the **root directory**, run:
   ```bash
   docker compose up --build
   ```
3. Open the services:
   - **React Frontend**: Ready at [http://localhost:5172/](http://localhost:5172/)
   - **Express Backend**: Listening at [http://localhost:5000/](http://localhost:5000/)

---

### Option B: Running Locally

#### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher (tested on `v24.14.0`)
- **npm**: `v9.0.0` or higher

#### 2. Install Dependencies
Run the command below from the **root directory** of the project to automatically install dependencies for the root concurrently manager, backend, and frontend packages:
```bash
npm run install-all
```

#### 3. Configure Environment Variables
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

#### 4. Run the Application
From the **root directory**, start both the Express backend and Vite React dev server concurrently by running:
```bash
npm run dev
```

---

## 🏗️ How It Works — Approach & Architecture

The application is split into a modern client-server architecture with an agentic processing pipeline:

```text
InvestmentPlanner/
├── package.json          # Root scripts for concurrently running frontend & backend
├── docker-compose.yml    # Docker orchestration file mapping ports 5172 & 5000
├── frontend/             # React (Vite) client application
│   ├── src/
│   │   ├── App.jsx       # Main dashboard component, state manager, & charts
│   │   ├── App.css       # Layout styles, glows, & print-media CSS rules
│   │   ├── index.css     # Global theme variables & animations
│   │   └── main.jsx      # Entrypoint
│   ├── Dockerfile        # Container recipe exposing port 5172
│   └── package.json      # Dependencies (React 19, Chart.js, react-chartjs-2)
└── backend/              # Express.js Node server
    ├── server.js         # API Router & Yahoo Finance controller
    ├── Dockerfile        # Container recipe exposing port 5000
    ├── package.json      # Dependencies (Express, LangGraph, LangChain)
    ├── .env              # Local environment configs (API keys)
    └── agents/
        └── workflow.js   # Compiled LangGraph sequential pipeline
```

### 1. Frontend (React 19 + Vite)
- **SaaS Layout UI**: A modern dashboard containing search lookup inputs, result listings, interactive financial stats cards, and glowing call-to-action blocks.
- **Dynamic Routing**: Built with `react-router-dom` to support sharing links directly to stock reports (e.g. `/report/AAPL`).
- **Real-Time Connection Hook**: Polls the backend health status every 10 seconds, showing a connection state indicator at the top right.
- **Chart.js Line Graph**: Renders price movements smoothly using `@langchain`-compatible `chart.js` and `react-chartjs-2`.

### 2. Backend (Express.js + Yahoo Finance)
- **API Router**: Exposes endpoints for connection check (`GET /api/status`), stock search (`GET /api/search`), raw company details (`GET /api/company`), historical stock data (`GET /api/historical`), and AI workflow research (`POST /api/analyze`).
- **Hybrid Scraper/API Fetcher**: Leverages `yahoo-finance2` for primary fetches. If blocked by Cloudflare or crumb errors, it falls back to a direct HTTPS JSON scraper parsing raw financial quotes and charts.

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

During the design and implementation of the enhancements, several critical choices were made:

### 1. Vector Print Stylesheets vs. html2canvas Libraries
- **Decision**: Implemented native browser `window.print()` with a print-specific CSS stylesheet (`@media print`) instead of `html2canvas`/`jsPDF` screenshot engines.
- **Rationale**: Screenshot-based PDF generators render canvas images, which result in blurry, pixelated text, fail to scale chart lines, and clip content across multi-page documents. Native print stylesheets keep text selectable, preserve vector chart scales, render high-contrast colors, and cleanly handle page breaks natively.
- **Trade-off**: The user is presented with the browser print dialog where they must select "Save as PDF" instead of a direct headless download link, but the resulting document quality is significantly superior.

### 2. Client-Persisted Watchlist (localStorage)
- **Decision**: Stored watchlist data directly in `localStorage` in the browser.
- **Rationale**: Eliminates the need for a database, keeping the backend entirely stateless, lightweight, and fast.
- **Trade-off**: The watchlist does not sync across different devices or browsers, but it provides instant response times with zero configuration overhead.

### 3. React 19 Compatible Charting
- **Decision**: Used the latest version of `chart.js` and `react-chartjs-2` to render the interactive stock price chart.
- **Rationale**: Under React 19, many graphing libraries run into peer-dependency conflicts. The chosen libraries have native React 19 support, are lightweight, and render responsive, interactive charts.

---

## 📊 Example Runs

Below are real, raw outputs generated by the agent workflow (running in rule-backed fallback mode using real-time stock ratios):

### 1. Apple Inc. (AAPL)
- **Investment Decision**: `INVEST`
- **Confidence Score**: `70%`
- **Positive Indicators**:
  - Conservative leverage with Debt-to-Equity at a healthy `79.55%`.
  - Operating Margin of `32.27%` shows high pricing power.
  - Return on Equity (ROE) of `141.47%`.
- **Key Concerns**:
  - Tight liquidity; Current Ratio is restricted at `1.07x` (below 1.5 benchmark).
- **Reasoning Synthesis**:
  > Based on a comprehensive review, Apple Inc. represents a compelling investment opportunity. The company exhibits exceptional operating profitability and superior return metrics, combined with a healthy capital structure. While short-term liquidity is relatively tight, its high cash generation capacity offsets immediate cash flow constraints.

---

## 🔮 What We Would Improve With More Time

If we had more time to expand this project, we would prioritize the following enhancements:

1. **Parallel Node Execution**:
   - *Current*: The LangGraph pipeline runs nodes sequentially.
   - *Improvement*: Overview, Financials, and News analysis nodes do not depend on each other. We would redesign the graph to run these in parallel, reducing latency by **50% to 70%** (saving roughly 6-10 seconds per run).

2. **Historical Ratio Analysis**:
   - *Current*: Ratios reflect a single, present-day quarterly snapshot.
   - *Improvement*: Fetch the last 4 years of annual financial statements, plot the trend of Debt-to-Equity and Operating Margins, and feed the delta (slopes) into the LLM to capture trend-based insights.

3. **Conversational Q&A Widget**:
   - *Current*: The report is a static document.
   - *Improvement*: Add a floating chat window at the bottom of the generated report, letting users query a chatbot using the generated report and the source financials as context (e.g., *"Why does the agent worry about Apple's current ratio?"*).
