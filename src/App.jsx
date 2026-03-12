import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import WealthfrontDCF from "./pages/WealthfrontDCF";

const C = {
  bg: "#0C0816", card: "#16112A", cardHover: "#1E1735",
  purple: "#4B2AAD", purpleLight: "#7C5CDB", purpleDark: "#2A1064",
  lavender: "#A78BFA", accent: "#C4B5FD",
  green: "#34D399",
  text: "#F3F0FF", textMuted: "#9B8FC7", textDim: "#6B5F8A",
  border: "#2D2548",
};

const companies = [
  {
    ticker: "WLTH",
    name: "Wealthfront",
    path: "/wealthfront",
    description: "10-Year DCF · Gordon Growth · Interactive",
    color: C.purple,
  },
  // Future: add more companies here
  // { ticker: "SOFI", name: "SoFi Technologies", path: "/sofi", description: "Coming soon", color: "#5B21B6" },
];

function CompanyCard({ ticker, name, description, path, color }) {
  return (
    <Link to={path} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 24,
          width: 300,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseOver={e => {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.background = C.cardHover;
        }}
        onMouseOut={e => {
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.background = C.card;
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{
            background: color, color: "#fff", padding: "3px 8px",
            borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 1,
          }}>{ticker}</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 6 }}>{name}</div>
        <div style={{ fontSize: 13, color: C.textMuted }}>{description}</div>
      </div>
    </Link>
  );
}

function Home() {
  return (
    <div style={{
      background: C.bg, color: C.text, minHeight: "100vh",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "60px 40px",
    }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 8, letterSpacing: -1 }}>
          IPO DCF
        </h1>
        <p style={{ color: C.textDim, fontSize: 16, marginBottom: 48, maxWidth: 500 }}>
          Interactive DCF models for recently public companies.
          Adjust assumptions and see how valuation changes in real time.
        </p>

        <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 16 }}>
          Models
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {companies.map(c => (
            <CompanyCard key={c.ticker} {...c} />
          ))}
        </div>

        <div style={{ marginTop: 80, fontSize: 11, color: C.textDim }}>
          Independent analysis. Not affiliated with any company featured.
          All projections are estimates and not financial advice.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/wealthfront" element={<WealthfrontDCF />} />
      </Routes>
    </BrowserRouter>
  );
}
