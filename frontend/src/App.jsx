import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import './App.css';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ================= SVG Icons for SaaS Layout =================

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 0, top: '4px' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 0, top: '4px' }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const ShieldAlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="16" />
    <line x1="15" y1="16" x2="15" y2="22" />
    <line x1="9" y1="16" x2="15" y2="16" />
    <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M12 6h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707" />
  </svg>
);

// ================= Standalone Helper Utilities =================

// Utility to format large market caps
const formatMarketCap = (num) => {
  if (!num) return 'N/A';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
};

// Custom Inline Markdown Parser
const parseInlineMarkdown = (text) => {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

// Custom block Markdown renderer for AI outputs
const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, index) => {
    // Headers: ### Header
    if (line.startsWith('### ')) {
      return (
        <h4 key={index} style={{ margin: '18px 0 8px', fontSize: '14.5px', fontWeight: '700', color: 'var(--text-primary)', borderBottom: '1px solid rgba(15,23,42,0.05)', paddingBottom: '4px' }}>
          {line.replace('### ', '')}
        </h4>
      );
    }
    // Sub-headers: **header**
    if (line.startsWith('**') && line.endsWith('**')) {
      return (
        <strong key={index} style={{ display: 'block', margin: '14px 0 4px', color: 'var(--primary)', fontSize: '13.5px' }}>
          {line.replace(/\*\*/g, '')}
        </strong>
      );
    }
    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const cleanItem = line.replace(/^[\s-*]+/, '');
      return (
        <li key={index} style={{ marginLeft: '16px', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.55' }}>
          {parseInlineMarkdown(cleanItem)}
        </li>
      );
    }
    // Numbered lists
    if (/^\d+\.\s/.test(line.trim())) {
      const cleanItem = line.replace(/^\d+\.\s+/, '');
      const number = line.trim().match(/^\d+/)[0];
      return (
        <div key={index} style={{ marginLeft: '12px', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', lineHeight: '1.55' }}>
          <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{number}.</span>
          <span>{parseInlineMarkdown(cleanItem)}</span>
        </div>
      );
    }
    // Blank line spacers
    if (line.trim() === '') {
      return <div key={index} style={{ height: '6px' }} />;
    }
    // Standard paragraph text
    return (
      <p key={index} style={{ marginBottom: '8px', fontSize: '13px', lineHeight: '1.55', color: 'var(--text-secondary)' }}>
        {parseInlineMarkdown(line)}
      </p>
    );
  });
};

// Reusable Company Info Card Component
function CompanyInfoCard({ companyDetails }) {
  if (!companyDetails) return null;
  return (
    <div className="report-card company-info-card">
      {/* Header section with ticker, name, price */}
      <div className="company-profile-header">
        <div className="company-title-area" style={{ textAlign: 'left' }}>
          <div className="company-profile-title">
            <span className="ticker-badge" style={{ fontSize: '14px', padding: '4px 10px' }}>
              {companyDetails.symbol}
            </span>
            <h2>{companyDetails.name}</h2>
          </div>
          <div className="company-industry-tags">
            <span className="profile-tag">Sector: {companyDetails.sector}</span>
            <span className="profile-tag">Industry: {companyDetails.industry}</span>
          </div>
        </div>
        <div className="company-market-price">
          <div className="price-text">
            {companyDetails.price ? `$${companyDetails.price.toFixed(2)}` : 'N/A'}
            <span className="price-unit">{companyDetails.currency}</span>
          </div>
          <div className="price-sub">Real-Time Price</div>
        </div>
      </div>

      {/* Fundamentals Stats Grid */}
      <div className="company-stats-grid">
        <div className="stat-item">
          <div className="stat-item-label">Market Capitalization</div>
          <div className="stat-item-value">{formatMarketCap(companyDetails.marketCap)}</div>
        </div>
        <div className="stat-item">
          <div className="stat-item-label">Current Ratio</div>
          <div className="stat-item-value">
            {companyDetails.financials?.currentRatio 
              ? companyDetails.financials.currentRatio.toFixed(2) 
              : 'N/A'}
          </div>
          <div className="stat-item-sub">Liquidity Benchmark (1.5x)</div>
        </div>
        <div className="stat-item">
          <div className="stat-item-label">Debt-to-Equity (D/E)</div>
          <div className="stat-item-value">
            {companyDetails.financials?.debtToEquity 
              ? `${companyDetails.financials.debtToEquity.toFixed(2)}%` 
              : 'N/A'}
          </div>
          <div className="stat-item-sub">Capital Solvency Ratio</div>
        </div>
        <div className="stat-item">
          <div className="stat-item-label">Operating Margin</div>
          <div className="stat-item-value">
            {companyDetails.financials?.operatingMargins 
              ? `${(companyDetails.financials.operatingMargins * 100).toFixed(2)}%` 
              : 'N/A'}
          </div>
          <div className="stat-item-sub">Operating Efficiency</div>
        </div>
      </div>

      {/* Business summary description */}
      <div className="company-description-section" style={{ borderTop: '1px solid rgba(15,23,42,0.06)', paddingTop: '16px', textAlign: 'left' }}>
        <h3 className="company-desc-title" style={{ display: 'flex', alignItems: 'center', fontSize: '14.5px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
          <BuildingIcon /> Business Description
        </h3>
        <p className="company-description" style={{ fontSize: '12.5px', lineHeight: '1.65', color: 'var(--text-secondary)' }}>
          {companyDetails.description}
        </p>
      </div>
    </div>
  );
}

// ================= Standalone Interactive Stock Price Chart =================
function StockChart({ ticker }) {
  const [chartData, setChartData] = useState([]);
  const [range, setRange] = useState('6m'); // '6m' or '1y'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/historical?ticker=${encodeURIComponent(ticker)}&range=${range}`);
        if (response.ok) {
          const data = await response.json();
          setChartData(data);
        }
      } catch (error) {
        console.error('Error fetching historical data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistoricalData();
  }, [ticker, range]);

  if (loading) {
    return (
      <div className="report-card chart-container" style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <div className="spinner"></div>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading stock price history...</span>
      </div>
    );
  }

  const dates = chartData.map(d => d.date);
  const prices = chartData.map(d => d.close);

  const data = {
    labels: dates,
    datasets: [
      {
        label: `${ticker} Close Price`,
        data: prices,
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.04)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.15,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 6,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 6,
          font: {
            size: 10
          },
          color: 'var(--text-secondary)'
        }
      },
      y: {
        grid: {
          color: 'rgba(15, 23, 42, 0.05)'
        },
        ticks: {
          font: {
            size: 10
          },
          color: 'var(--text-secondary)'
        }
      }
    }
  };

  return (
    <div className="report-card chart-card">
      <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          Stock Price Chart
        </h3>
        <div className="chart-range-selector" style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`range-btn ${range === '6m' ? 'active' : ''}`} 
            onClick={() => setRange('6m')}
          >
            6 Months
          </button>
          <button 
            className={`range-btn ${range === '1y' ? 'active' : ''}`} 
            onClick={() => setRange('1y')}
          >
            1 Year
          </button>
        </div>
      </div>
      <div style={{ height: '240px', position: 'relative' }}>
        {chartData.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            No price history available.
          </div>
        ) : (
          <Line data={data} options={options} />
        )}
      </div>
    </div>
  );
}

// ================= Key Financial Metrics Dashboard =================
function KeyMetricsDashboard({ financials, price }) {
  if (!financials) return null;

  const metrics = [
    {
      label: 'P/E Ratio',
      value: financials.peRatio ? financials.peRatio.toFixed(2) : 'N/A',
      sub: 'Price-to-Earnings Valuation',
      status: financials.peRatio && financials.peRatio < 20 ? 'positive' : financials.peRatio > 40 ? 'warning' : 'neutral'
    },
    {
      label: 'EPS (TTM)',
      value: financials.eps ? `${financials.eps.toFixed(2)}` : 'N/A',
      sub: 'Earnings Per Share',
      status: financials.eps && financials.eps > 0 ? 'positive' : 'neutral'
    },
    {
      label: 'Return on Equity (ROE)',
      value: financials.returnOnEquity ? `${(financials.returnOnEquity * 100).toFixed(2)}%` : 'N/A',
      sub: 'Capital Efficiency (Bench: 15%)',
      status: financials.returnOnEquity && financials.returnOnEquity >= 0.15 ? 'positive' : 'neutral'
    },
    {
      label: 'Current Ratio',
      value: financials.currentRatio ? `${financials.currentRatio.toFixed(2)}x` : 'N/A',
      sub: 'Liquidity Margin (Bench: 1.5x)',
      status: financials.currentRatio && financials.currentRatio >= 1.5 ? 'positive' : 'warning'
    },
    {
      label: 'Debt-to-Equity',
      value: financials.debtToEquity ? `${financials.debtToEquity.toFixed(2)}%` : 'N/A',
      sub: 'Leverage Debt (Bench: 100%)',
      status: financials.debtToEquity && financials.debtToEquity <= 100 ? 'positive' : financials.debtToEquity > 150 ? 'danger' : 'neutral'
    },
    {
      label: 'Operating Margin',
      value: financials.operatingMargins ? `${(financials.operatingMargins * 100).toFixed(2)}%` : 'N/A',
      sub: 'Operating Profit Efficiency',
      status: financials.operatingMargins && financials.operatingMargins >= 0.15 ? 'positive' : 'neutral'
    },
    {
      label: '52-Week Range',
      value: financials.fiftyTwoWeekLow && financials.fiftyTwoWeekHigh 
        ? `$${financials.fiftyTwoWeekLow.toFixed(2)} - $${financials.fiftyTwoWeekHigh.toFixed(2)}`
        : 'N/A',
      sub: `Current Price: $${price ? price.toFixed(2) : 'N/A'}`,
      status: 'neutral'
    }
  ];

  return (
    <div className="report-card metrics-dashboard-card">
      <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid rgba(15,23,42,0.05)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
        Key Financial Metrics
      </h3>
      <div className="metrics-dashboard-grid">
        {metrics.map((m, idx) => (
          <div key={idx} className="metric-box">
            <div className="metric-label">{m.label}</div>
            <div className={`metric-value ${m.status}`}>{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================= Recent News Feed Component =================
function RecentNewsFeed({ news }) {
  if (!news || news.length === 0) return null;

  const formatNewsDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="report-card news-feed-card">
      <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid rgba(15,23,42,0.05)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        Recent News Headlines
      </h3>
      <div className="news-articles-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {news.slice(0, 5).map((article, idx) => (
          <div key={idx} className="news-article-item" style={{ padding: '8px 0', borderBottom: idx < news.slice(0, 5).length - 1 ? '1px solid rgba(15,23,42,0.05)' : 'none', textAlign: 'left' }}>
            <a 
              href={article.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="news-article-title"
              style={{ display: 'block', fontSize: '13.5px', fontWeight: '600', color: 'var(--primary)', textDecoration: 'none', marginBottom: '4px', lineHeight: '1.4' }}
            >
              {article.title}
            </a>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              <span>Source: <strong style={{ color: 'var(--text-primary)' }}>{article.publisher}</strong></span>
              <span>•</span>
              <span>{formatNewsDate(article.time)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================= 1. PAGE COMPONENT: SearchPage =================
function SearchPage({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  handleSearch,
  selectedTicker,
  handleSelectCompany,
  companyDetails,
  isLoadingDetails,
  watchlist,
  handleRemoveFromWatchlist,
  handleAddToWatchlist
}) {
  const navigate = useNavigate();

  const handleRunAnalysisClick = () => {
    if (selectedTicker) {
      navigate(`/report/${selectedTicker}`);
    }
  };

  return (
    <div className="dashboard-grid">
      {/* Left column: Search and listings */}
      <aside className="sidebar">
        <div className="search-panel">
          <h2 className="search-title">Company Ticker Lookup</h2>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Enter stock name or ticker symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SearchIcon /> Search
            </button>
          </form>

          <div className="results-container">
            {isSearching ? (
              <div className="loading-container" style={{ padding: '30px 0' }}>
                <div className="spinner" style={{ width: '20px', height: '20px', margin: '0 auto 10px' }}></div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Searching ticker list...</span>
              </div>
            ) : (
              searchResults.map((result) => (
                <div
                  key={result.symbol}
                  onClick={() => handleSelectCompany(result.symbol)}
                  className={`result-card ${selectedTicker === result.symbol ? 'selected' : ''}`}
                >
                  <div className="result-info">
                    <span className="result-name">{result.name}</span>
                    <span className="result-meta">
                      {result.exchange} | {result.sector || 'N/A'}
                    </span>
                  </div>
                  <span className="ticker-badge">{result.symbol}</span>
                </div>
              ))
            )}

            {!isSearching && searchResults.length === 0 && searchQuery && (
              <p className="no-results">Use the search box above to find companies.</p>
            )}
          </div>

          {/* Watchlist Panel */}
          <div className="watchlist-panel" style={{ marginTop: '24px', textAlign: 'left', borderTop: '1px solid rgba(15,23,42,0.06)', paddingTop: '20px' }}>
            <h3 className="watchlist-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" style={{ color: '#f59e0b' }}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              My Watchlist
            </h3>
            {watchlist.length === 0 ? (
              <p className="no-watchlist" style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                No watchlisted tickers.
              </p>
            ) : (
              <div className="watchlist-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {watchlist.map((symbol) => (
                  <div
                    key={symbol}
                    onClick={() => handleSelectCompany(symbol)}
                    className="watchlist-item"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'white',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      cursor: 'pointer'
                    }}
                  >
                    <span className="watchlist-symbol" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {symbol}
                    </span>
                    <button 
                      className="watchlist-remove" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromWatchlist(symbol);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '16px',
                        cursor: 'pointer',
                        padding: '0 4px',
                        lineHeight: 1
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Right column: Preview Details dashboard */}
      <main className="detail-panel">
        {isLoadingDetails ? (
          <div className="loading-container report-card" style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            <div className="spinner-large" style={{ width: '40px', height: '40px' }}></div>
            <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              Connecting to Yahoo Finance API and retrieving details...
            </span>
          </div>
        ) : !selectedTicker ? (
          <div className="empty-dashboard">
            <h2>No Ticker Selected</h2>
            <p>
              Search for an asset on the left lookup panel and select it to inspect fundamental metrics and generate AI research reports.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Company Info preview */}
            <CompanyInfoCard companyDetails={companyDetails} />

            {/* Run AI Analysis Action Banner */}
            <div className="run-ai-banner">
              <div className="run-ai-banner-content" style={{ textAlign: 'left' }}>
                <h3>AI Research Pipeline</h3>
                <p>
                  Trigger the sequential agent workflow to calculate a final rating based on fundamentals, financials, news, and risks.
                </p>
              </div>
              <div className="banner-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {watchlist.includes(selectedTicker.toUpperCase()) ? (
                  <button 
                    onClick={() => handleRemoveFromWatchlist(selectedTicker)}
                    className="watchlist-toggle-btn active"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: '#f1f5f9',
                      color: 'var(--text-primary)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    ★ Saved
                  </button>
                ) : (
                  <button 
                    onClick={() => handleAddToWatchlist(selectedTicker)}
                    className="watchlist-toggle-btn"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'white',
                      color: 'var(--text-secondary)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    ☆ Watchlist
                  </button>
                )}
                <button onClick={handleRunAnalysisClick} className="run-ai-banner-btn">
                  Run AI Analysis
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ================= 2. PAGE COMPONENT: ReportPage =================
function ReportPage() {
  const { ticker } = useParams();
  const navigate = useNavigate();

  const [companyDetails, setCompanyDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [aiReport, setAiReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [llmUnconfigured, setLlmUnconfigured] = useState(false);

  const [isWatchlisted, setIsWatchlisted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('investai_watchlist');
    const list = saved ? JSON.parse(saved) : [];
    setIsWatchlisted(list.includes(ticker.toUpperCase()));
  }, [ticker]);

  const toggleWatchlist = () => {
    const saved = localStorage.getItem('investai_watchlist');
    let list = saved ? JSON.parse(saved) : [];
    const sym = ticker.toUpperCase();
    if (list.includes(sym)) {
      list = list.filter(s => s !== sym);
      setIsWatchlisted(false);
    } else {
      list.push(sym);
      setIsWatchlisted(true);
    }
    localStorage.setItem('investai_watchlist', JSON.stringify(list));
  };

  const runAnalysis = useCallback(async () => {
    if (!ticker) return;

    setIsAnalyzing(true);
    setAnalysisError('');
    setLlmUnconfigured(false);
    setAiReport(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticker: ticker }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (errData.code === 'LLM_UNCONFIGURED') {
          setLlmUnconfigured(true);
          throw new Error(errData.error || 'LLM provider is not configured.');
        }
        throw new Error(errData.error || 'Analysis workflow failed on server');
      }

      const data = await response.json();
      setAiReport({
        recommendation: data.recommendation,
        overview: data.overview,
        financials: data.financials,
        news: data.news,
        risk: data.risk
      });
    } catch (error) {
      console.error('AI Analysis failed:', error);
      setAnalysisError(error.message || 'AI Analysis workflow failed.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [ticker]);

  useEffect(() => {
    if (!ticker) return;

    const fetchDetailsAndAnalyze = async () => {
      setIsLoadingDetails(true);
      setErrorMessage('');
      setCompanyDetails(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/company?ticker=${encodeURIComponent(ticker)}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || `Failed to load details for ${ticker.toUpperCase()}`);
        }
        const data = await response.json();
        setCompanyDetails(data);
        // Trigger analysis after successfully loading company details
        setIsLoadingDetails(false);
        runAnalysis();
      } catch (error) {
        console.error('Error fetching company details:', error);
        setErrorMessage(`Failed to fetch company details for ${ticker.toUpperCase()}.`);
        setIsLoadingDetails(false);
      }
    };

    fetchDetailsAndAnalyze();
  }, [ticker, runAnalysis]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="report-page-container">
      {/* Top row with Back Button, Watchlist toggle and Print PDF action */}
      <div className="report-action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/')} className="back-btn" style={{ display: 'flex', alignItems: 'center' }}>
          <ArrowLeftIcon /> Back to Search
        </button>
        <div className="action-buttons-group" style={{ display: 'flex', gap: '10px' }}>
          {isWatchlisted ? (
            <button onClick={toggleWatchlist} className="watchlist-btn active-watchlist" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: '#f59e0b', color: 'white', fontWeight: '600', fontSize: '12.5px' }}>
              ★ Watchlisted
            </button>
          ) : (
            <button onClick={toggleWatchlist} className="watchlist-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '12.5px' }}>
              ☆ Watchlist
            </button>
          )}
          <button onClick={() => window.print()} className="print-report-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--primary)', color: 'white', fontWeight: '600', fontSize: '12.5px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Main content area */}
      {errorMessage && (
        <div className="error-banner">
          <ShieldAlertIcon />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoadingDetails ? (
        <div className="loading-container report-card" style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
          <div className="spinner-large" style={{ width: '40px', height: '40px' }}></div>
          <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Retrieving Yahoo Finance metrics for {ticker.toUpperCase()}...
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ================= 1. Investment Recommendation (TOP) ================= */}
          {aiReport && aiReport.recommendation && (
            <div className={`recommendation-dashboard-card rating-${aiReport.recommendation.rating.toLowerCase()}`}>
              <div className="rec-header-row">
                <div className="rec-badge-area">
                  <div className={`rec-badge ${aiReport.recommendation.rating.toLowerCase()}`}>
                    {aiReport.recommendation.rating}
                  </div>
                  <span className="rec-badge-label">Investment Decision</span>
                </div>
                
                <div className="rec-confidence-area">
                  <div className="confidence-title">Confidence Score</div>
                  <div className="confidence-score-wrapper">
                    <span className="confidence-score">{aiReport.recommendation.confidence}%</span>
                    <div className="confidence-bar-outer">
                      <div 
                        className={`confidence-bar-inner ${aiReport.recommendation.rating.toLowerCase()}`}
                        style={{ width: `${aiReport.recommendation.confidence}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Positives & Concerns */}
              <div className="rec-grid-columns">
                <div className="rec-column positives">
                  <h4>Positive Indicators</h4>
                  <ul>
                    {(aiReport.recommendation.positives || []).map((p, i) => (
                      <li key={i} style={{ position: 'relative', paddingLeft: '22px', textAlign: 'left' }}>
                        <CheckIcon />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rec-column concerns">
                  <h4>Key Concerns</h4>
                  <ul>
                    {(aiReport.recommendation.concerns || []).map((c, i) => (
                      <li key={i} style={{ position: 'relative', paddingLeft: '22px', textAlign: 'left' }}>
                        <WarningIcon />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Reasoning block */}
              <div className="rec-reasoning-area">
                <h4>Synthesis & Reasoning</h4>
                <p>{aiReport.recommendation.reasoning}</p>
              </div>
            </div>
          )}

          {/* ================= 2. Company Information Card (MIDDLE) ================= */}
          {companyDetails && <CompanyInfoCard companyDetails={companyDetails} />}

          {/* Historical Stock Price Line Chart */}
          {companyDetails && <StockChart ticker={ticker} />}

          {/* Valuation & Financial Metrics Dashboard */}
          {companyDetails && companyDetails.financials && (
            <KeyMetricsDashboard financials={companyDetails.financials} price={companyDetails.price} />
          )}

          {/* ================= 3. Skeleton Loading (Analysis In Progress) ================= */}
          {isAnalyzing && (
            <div className="skeleton-report">
              <div className="report-card skeleton-card skeleton" style={{ height: '220px' }}>
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-line short"></div>
              </div>
              <div className="report-card skeleton-card skeleton" style={{ height: '300px' }}>
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-line short"></div>
              </div>
            </div>
          )}

          {/* ================= 4. Analysis failed ================= */}
          {analysisError && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="error-banner" style={{ margin: '0' }}>
                <ShieldAlertIcon />
                <span>AI Workflow Error: {analysisError}</span>
              </div>

              {llmUnconfigured ? (
                <div className="llm-config-guide-card">
                  <h3 className="llm-config-title" style={{ display: 'flex', alignItems: 'center' }}>
                    <ShieldAlertIcon /> LLM Configuration Required
                  </h3>
                  <p className="llm-config-desc">
                    To activate the investment research workflow, you must link an LLM provider. No active keys were found in the environment.
                  </p>
                  <div className="llm-config-code">
                    <div># Append either line to your backend/.env file:</div>
                    <div style={{ color: '#4f46e5', marginTop: '6px' }}>GEMINI_API_KEY=your_gemini_api_key_here</div>
                    <div style={{ color: 'var(--text-secondary)', margin: '4px 0' }}># or</div>
                    <div style={{ color: '#4f46e5' }}>OPENAI_API_KEY=your_openai_api_key_here</div>
                  </div>
                  <p className="llm-config-footer">
                    Need to edit? Open the <a href="file:///d:/BTECH/project/InvestmentPlanner/backend/.env" target="_blank" rel="noopener noreferrer">backend/.env</a> configuration file. Save changes, restart the servers, and click below to try again.
                  </p>
                </div>
              ) : (
                <div className="report-card" style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    An unexpected runtime issue occurred during LangGraph agent execution. Ensure your server endpoints are running.
                  </p>
                </div>
              )}

              <button 
                onClick={runAnalysis} 
                className="run-ai-banner-btn"
                style={{ background: 'var(--primary)', width: 'fit-content', alignSelf: 'center' }}
              >
                Retry AI Analysis
              </button>
            </div>
          )}

          {/* ================= 5. AI Research Sections (BOTTOM) ================= */}
          {aiReport && (
            <div className="ai-report-sections">
              <h2 className="ai-report-header" style={{ display: 'flex', alignItems: 'center' }}>
                <SparklesIcon /> AI Research Report
              </h2>

              <div className="ai-report-card card-overview">
                <h3 className="ai-card-title">Company Overview</h3>
                <div className="ai-card-body">{renderMarkdown(aiReport.overview)}</div>
              </div>

              <div className="ai-report-card card-financials">
                <h3 className="ai-card-title">Financial Analysis</h3>
                <div className="ai-card-body">{renderMarkdown(aiReport.financials)}</div>
              </div>

              <div className="ai-report-card card-news">
                <h3 className="ai-card-title">News & Sentiment</h3>
                <div className="ai-card-body">{renderMarkdown(aiReport.news)}</div>
              </div>

              <div className="ai-report-card card-risk">
                <h3 className="ai-card-title">Risk Assessment</h3>
                <div className="ai-card-body">{renderMarkdown(aiReport.risk)}</div>
              </div>
            </div>
          )}

          {/* Recent News Headlines Feed */}
          {companyDetails && companyDetails.news && (
            <RecentNewsFeed news={companyDetails.news} />
          )}
        </div>
      )}
    </div>
  );
}

// ================= 3. MAIN COMPONENT: App =================
function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('investai_watchlist');
    return saved ? JSON.parse(saved) : [];
  });

  const handleAddToWatchlist = (symbol) => {
    const sym = symbol.toUpperCase();
    if (!watchlist.includes(sym)) {
      const updated = [...watchlist, sym];
      setWatchlist(updated);
      localStorage.setItem('investai_watchlist', JSON.stringify(updated));
    }
  };

  const handleRemoveFromWatchlist = (symbol) => {
    const sym = symbol.toUpperCase();
    const updated = watchlist.filter(s => s !== sym);
    setWatchlist(updated);
    localStorage.setItem('investai_watchlist', JSON.stringify(updated));
  };

  // 1. Verify backend health check on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/status`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.status === 'ok') {
            setIsConnected(true);
          }
        }
      } catch (error) {
        console.error('Backend server connection check failed:', error);
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  // 2. Search for companies
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMessage('');
    setSearchResults([]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Failed to retrieve search results');
      }
      const data = await response.json();
      setSearchResults(data);
      if (data.length === 0) {
        setErrorMessage('No matching companies found.');
      }
    } catch (error) {
      console.error('Company search error:', error);
      setErrorMessage('Search request failed. Please check the backend connection.');
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Fetch details for selected company
  const handleSelectCompany = async (ticker) => {
    setSelectedTicker(ticker);
    setIsLoadingDetails(true);
    setErrorMessage('');
    setCompanyDetails(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/company?ticker=${encodeURIComponent(ticker)}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Failed to load details for ${ticker.toUpperCase()}`);
      }
      const data = await response.json();
      setCompanyDetails(data);
    } catch (error) {
      console.error('Error fetching company details:', error);
      setErrorMessage(`Failed to fetch company details for ${ticker.toUpperCase()}.`);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <div className="app-container">
      {/* Global Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', background: 'linear-gradient(135deg, #4f46e5, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '22px' }}>
            InvestAI
          </div>
          <h1 className="app-title">
            Investment Research Agent
            <span>v2.1 (SaaS Layout)</span>
          </h1>
        </div>
        <div className="connection-indicator">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </header>

      {/* Connection error banner */}
      {errorMessage && (
        <div className="error-banner">
          <ShieldAlertIcon />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Routing Switch */}
      <Routes>
        <Route 
          path="/" 
          element={
            <SearchPage
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              isSearching={isSearching}
              handleSearch={handleSearch}
              selectedTicker={selectedTicker}
              handleSelectCompany={handleSelectCompany}
              companyDetails={companyDetails}
              isLoadingDetails={isLoadingDetails}
              watchlist={watchlist}
              handleRemoveFromWatchlist={handleRemoveFromWatchlist}
              handleAddToWatchlist={handleAddToWatchlist}
            />
          } 
        />
        <Route 
          path="/report/:ticker" 
          element={
            <ReportPage />
          } 
        />
      </Routes>
    </div>
  );
}

export default App;
