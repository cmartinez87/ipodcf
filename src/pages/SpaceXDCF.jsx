import { Link } from "react-router-dom";

// ─── SpaceX Brand Colors ───
const C = {
  bg: "#0C0816", card: "#16112A", cardAlt: "#1E1735",
  blue: "#005288", blueLight: "#1E90FF", blueDark: "#003A5C",
  steel: "#8CA0B3", accent: "#A8D0E6",
  green: "#34D399", greenDark: "#059669",
  red: "#F87171", redDark: "#DC2626",
  amber: "#FBBF24",
  text: "#F3F0FF", textMuted: "#9B8FC7", textDim: "#6B5F8A",
  border: "#2D2548", borderLight: "#3D3360",
};

export default function SpaceXDCF() {
  return (
    <div style={{
      background: C.bg, color: C.text, minHeight: "100vh",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "40px 24px",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Link to="/" style={{ color: C.textDim, textDecoration: "none", fontSize: 13 }}>← Home</Link>
          <span style={{ color: C.textDim }}>·</span>
          <span style={{
            background: C.blue, color: "#fff", padding: "3px 8px",
            borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 1,
          }}>SPACEX</span>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4, letterSpacing: -0.5 }}>
          SpaceX — DCF Model
        </h1>
        <p style={{ color: C.textDim, fontSize: 14, marginBottom: 40 }}>
          Interactive valuation model — coming soon.
        </p>

        {/* Placeholder */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: 40, textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            Model Under Construction
          </div>
          <p style={{ color: C.textMuted, fontSize: 14, maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
            This page will house the SpaceX DCF model with interactive assumptions,
            segment breakouts, and scenario analysis. Check back soon.
          </p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 60, fontSize: 11, color: C.textDim }}>
          Independent analysis. Not affiliated with SpaceX.
          All projections are estimates and not financial advice.
        </div>
      </div>
    </div>
  );
}
