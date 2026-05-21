import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, PieChart, Pie, Cell } from "recharts";

// ─── SpaceX Brand Colors ───
const C = {
  bg: "#0C0816", card: "#16112A", cardAlt: "#1E1735",
  blue: "#1E90FF", blueLight: "#5DAEFF", blueDark: "#003A5C",
  steel: "#8CA0B3", accent: "#A8D0E6",
  green: "#34D399", greenDark: "#059669",
  red: "#F87171", redDark: "#DC2626",
  amber: "#FBBF24",
  text: "#F3F0FF", textMuted: "#9B8FC7", textDim: "#6B5F8A",
  border: "#2D2548", borderLight: "#3D3360",
  spaceColor: "#FBBF24", connColor: "#1E90FF", aiColor: "#A78BFA",
};

// ─── Historical Anchors from S-1 ($M) ───
const HIST = {
  FY23: { rev: 10387, space: 3557, conn: 3869, ai: 2961, adjEbitda: 3821, spaceEbitda: 997, connEbitda: 1602, aiEbitda: 1222, capex: 4415, spaceCapex: 1497, connCapex: 2455, aiCapex: 463 },
  FY24: { rev: 14015, space: 3796, conn: 7599, ai: 2620, adjEbitda: 5350, spaceEbitda: 1154, connEbitda: 3849, aiEbitda: 347, capex: 11163, spaceCapex: 2032, connCapex: 3498, aiCapex: 5633 },
  FY25: { rev: 18674, space: 4086, conn: 11387, ai: 3201, adjEbitda: 6584, spaceEbitda: 653, connEbitda: 7168, aiEbitda: -1237, capex: 20737, spaceCapex: 3832, connCapex: 4178, aiCapex: 12727 },
};

// FY25 baseline values used for projection start
const FY25 = {
  totalRev: 18674,
  // Space
  spaceRev: 4086, launchServicesShare: 0.63, launchDevShare: 0.37,
  spaceAdjEbitda: 653, spaceCapex: 3832,
  // Connectivity
  connRev: 11387, connConsumerShare: 0.62, connEntGovtShare: 0.38,
  connAdjEbitda: 7168, connCapex: 4178,
  starlinkSubs: 8500, // approx EOP'25 — interpolated between Q1'25 (5.0M) and Q1'26 (10.3M)
  starlinkArpu: 81, // FY25 monthly
  // AI
  aiRev: 3201, aiAdjEbitda: -1237, aiCapex: 12727,
  // Corporate
  cash: 23675, // Q1'26 cash + marketables ($15.85B + $7.82B)
  debt: 30265, // Q1'26 total debt
  sbcPct: 0.104, // FY25 SBC / revenue
};

// Capital structure constants
const SHARES = {
  proformaBase: 12520, // pro-forma post preferred conversion + Class C reclass (millions)
  optionsOut: 496,     // outstanding stock options
  optionsAvgEx: 10.18, // weighted-avg exercise
  rsuOut: 109 + 34,    // RSUs + RSAs (no meaningful exercise price)
  echostarShares: 262, // shares to be issued for EchoStar spectrum
  echostarCash: 8500,  // $M cash component, closing Nov 2027
  echostarFY: 2028,    // model the outflow in FY28
};

// ─── Helpers ───
const fmt$B = (v, d = 1) => {
  if (v == null || isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${v < 0 ? "-" : ""}$${(abs / 1e6).toFixed(d)}T`;
  if (abs >= 1000) return `${v < 0 ? "-" : ""}$${(abs / 1000).toFixed(d)}B`;
  return `${v < 0 ? "-" : ""}$${abs.toFixed(0)}M`;
};
const fmtPct = (v, d = 1) => v == null || isNaN(v) ? "—" : `${(v * 100).toFixed(d)}%`;
const fmtDollar = (v, d = 2) => v == null || isNaN(v) ? "—" : `$${v.toFixed(d)}`;

// ─── Info Tooltip ───
function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  if (!text) return null;
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 4, cursor: "help" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ fontSize: 11, color: C.textDim }}>ⓘ</span>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: C.cardAlt, border: `1px solid ${C.borderLight}`, borderRadius: 8,
          padding: "10px 14px", width: 280, zIndex: 999,
          fontSize: 12, lineHeight: 1.5, color: C.text, fontWeight: 400,
          textTransform: "none", letterSpacing: 0,
          boxShadow: `0 4px 20px rgba(0,0,0,0.5)`, pointerEvents: "none",
        }}>
          {text}
          <div style={{
            position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)",
            width: 10, height: 10, background: C.cardAlt, borderRight: `1px solid ${C.borderLight}`,
            borderBottom: `1px solid ${C.borderLight}`,
          }} />
        </div>
      )}
    </span>
  );
}

// ─── Slider ───
function Slider({ label, value, onChange, min, max, step, format = "pct", suffix = "", prefix = "", tooltip = "" }) {
  const displayVal = format === "pct" ? fmtPct(value)
    : format === "dollar" ? fmtDollar(value)
    : format === "$B" ? `$${value.toFixed(1)}B`
    : format === "year" ? `FY${value}`
    : format === "x" ? `${value.toFixed(1)}x`
    : format === "number" ? `${prefix}${value.toFixed(step < 1 ? 1 : 0)}${suffix}`
    : `${value}`;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{label}<InfoTooltip text={tooltip} /></span>
        <span style={{ fontSize: 13, color: C.blueLight, fontWeight: 700, fontFamily: "monospace" }}>{displayVal}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: C.blue, height: 6, WebkitAppearance: "none", background: `linear-gradient(to right, ${C.blue} ${pct}%, ${C.border} ${pct}%)`, borderRadius: 3, outline: "none", cursor: "pointer" }}
      />
    </div>
  );
}

// ─── Toggle ───
function Toggle({ label, value, onChange, tooltip = "" }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <span style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
        {label}<InfoTooltip text={tooltip} />
      </span>
      <button onClick={() => onChange(!value)}
        style={{
          width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
          background: value ? C.blue : C.border, position: "relative", transition: "all 0.2s",
        }}>
        <span style={{
          position: "absolute", top: 2, left: value ? 20 : 2, width: 18, height: 18,
          background: "#fff", borderRadius: 9, transition: "all 0.2s",
        }} />
      </button>
    </div>
  );
}

function NumberInput({ label, value, onChange, prefix = "$", suffix = "", tooltip = "" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>
        {label}<InfoTooltip text={tooltip} />
      </div>
      <div style={{ display: "flex", alignItems: "center", background: C.cardAlt, borderRadius: 6, border: `1px solid ${C.border}`, padding: "6px 10px" }}>
        {prefix && <span style={{ color: C.textDim, marginRight: 4, fontSize: 14 }}>{prefix}</span>}
        <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)}
          style={{ flex: 1, background: "transparent", border: "none", color: C.blueLight, fontSize: 16, fontWeight: 700, fontFamily: "monospace", outline: "none", width: "100%" }}
        />
        {suffix && <span style={{ color: C.textDim, marginLeft: 4, fontSize: 12 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function KPICard({ title, value, subtitle, color = C.blueLight, small = false }) {
  return (
    <div style={{ background: C.card, borderRadius: 10, padding: small ? "12px 14px" : "16px 20px", border: `1px solid ${C.border}`, flex: 1, minWidth: small ? 120 : 150 }}>
      <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: small ? 20 : 28, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

// ─── Chart tooltips ───
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.text }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {p.name.includes("Margin") || p.name.includes("Growth") ? fmtPct(p.value, 1) : `$${p.value.toFixed(1)}B`}
        </div>
      ))}
    </div>
  );
}

function SubsTooltip({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.text }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {p.name === "ARPU" ? `$${p.value.toFixed(0)}/mo` : `${p.value.toFixed(1)}M`}
        </div>
      ))}
    </div>
  );
}

// ─── URL hash helpers ───
function getHashParam(key, fallback) {
  try {
    const hash = window.location.hash.slice(1);
    if (!hash) return fallback;
    const params = new URLSearchParams(hash);
    const val = params.get(key);
    if (val === null) return fallback;
    if (val === "true") return true;
    if (val === "false") return false;
    const num = parseFloat(val);
    return isNaN(num) ? fallback : num;
  } catch { return fallback; }
}

const PARAM_MAP = {
  sp: "stockPrice", ipo: "ipoShares", w: "wacc", tg: "termGrowth", tax: "taxRate", sbc: "sbcRatio",
  na: "starlinkNetAdds", nad: "netAddsDecay", af: "arpuFloor", adr: "arpuDecay",
  eg: "entGovtGrowth", ctm: "connTermMargin", ccr: "connCapexRatio",
  lsg: "launchServGrowth", ldg: "launchDevGrowth", stm: "spaceTermMargin", scr: "spaceCapexRatio",
  ss: "starshipOn", ssy: "starshipStartYear", ssc: "starshipFY32",
  ar: "aiCAGR", ad: "aiCAGRDecay", abe: "aiBreakeven", atm: "aiTermMargin", acr: "aiCapexRatio",
  oc: "orbitalOn", ocy: "orbitalStartYear", occ: "orbitalFY36",
  es: "echostarOn",
  // Anthropic deal (compute-as-a-service anchor tenant)
  an: "anthropicOn", anm: "anthropicMonthly", any: "anthropicEndYear", anmg: "anthropicMargin",
  // Terminal value methodology
  tm: "termMethod", emc: "exitMultConn", ems: "exitMultSpace", ema: "exitMultAi",
};

// ─── Scenarios ───
// Anthropic deal: $1.25B/mo through May 2029 = ~$15B/yr × ~3 years = ~$45B contracted (S-1 disclosure)
// Terminal value default = Exit EV/EBITDA multiples (Gordon Growth structurally undervalues high-growth tech)
//   Conn (mature subs): 12x  |  Space (defense/aerospace): 15x  |  AI (high-growth tech): 22x
const SCENARIOS = {
  bull: {
    label: "Bull", stockPrice: 150, wacc: 0.10, termGrowth: 0.035, taxRate: 0.21, sbcRatio: 0.08, ipoShares: 333,
    starlinkNetAdds: 8, netAddsDecay: 0.10, arpuFloor: 60, arpuDecay: 0.06,
    entGovtGrowth: 0.40, connTermMargin: 0.65, connCapexRatio: 0.20,
    launchServGrowth: 0.05, launchDevGrowth: 0.20, spaceTermMargin: 0.40, spaceCapexRatio: 0.15,
    starshipOn: true, starshipStartYear: 2027, starshipFY32: 8.0,
    aiCAGR: 0.55, aiCAGRDecay: 0.06, aiBreakeven: 2028, aiTermMargin: 0.40, aiCapexRatio: 0.15,
    orbitalOn: true, orbitalStartYear: 2029, orbitalFY36: 12.0,
    echostarOn: true,
    anthropicOn: true, anthropicMonthly: 1.25, anthropicEndYear: 2032, anthropicMargin: 0.30,
    termMethod: "exit", exitMultConn: 14, exitMultSpace: 18, exitMultAi: 28,
  },
  base: {
    label: "Base", stockPrice: 150, wacc: 0.11, termGrowth: 0.03, taxRate: 0.21, sbcRatio: 0.10, ipoShares: 333,
    starlinkNetAdds: 6, netAddsDecay: 0.15, arpuFloor: 55, arpuDecay: 0.10,
    entGovtGrowth: 0.30, connTermMargin: 0.60, connCapexRatio: 0.22,
    launchServGrowth: 0.00, launchDevGrowth: 0.15, spaceTermMargin: 0.32, spaceCapexRatio: 0.20,
    starshipOn: true, starshipStartYear: 2028, starshipFY32: 6.0,
    aiCAGR: 0.40, aiCAGRDecay: 0.07, aiBreakeven: 2030, aiTermMargin: 0.30, aiCapexRatio: 0.18,
    orbitalOn: true, orbitalStartYear: 2030, orbitalFY36: 6.0,
    echostarOn: true,
    anthropicOn: true, anthropicMonthly: 1.25, anthropicEndYear: 2032, anthropicMargin: 0.25,
    termMethod: "exit", exitMultConn: 12, exitMultSpace: 15, exitMultAi: 22,
  },
  bear: {
    label: "Bear", stockPrice: 150, wacc: 0.13, termGrowth: 0.025, taxRate: 0.23, sbcRatio: 0.12, ipoShares: 333,
    starlinkNetAdds: 4, netAddsDecay: 0.22, arpuFloor: 45, arpuDecay: 0.14,
    entGovtGrowth: 0.20, connTermMargin: 0.50, connCapexRatio: 0.28,
    launchServGrowth: -0.05, launchDevGrowth: 0.08, spaceTermMargin: 0.22, spaceCapexRatio: 0.28,
    starshipOn: true, starshipStartYear: 2030, starshipFY32: 2.0,
    aiCAGR: 0.25, aiCAGRDecay: 0.08, aiBreakeven: 2032, aiTermMargin: 0.18, aiCapexRatio: 0.25,
    orbitalOn: false, orbitalStartYear: 2031, orbitalFY36: 3.0,
    echostarOn: true,
    anthropicOn: true, anthropicMonthly: 1.25, anthropicEndYear: 2029, anthropicMargin: 0.18,
    termMethod: "gordon", exitMultConn: 9, exitMultSpace: 11, exitMultAi: 15,
  },
  statusQuo: {
    label: "Status Quo", stockPrice: 150, wacc: 0.12, termGrowth: 0.03, taxRate: 0.21, sbcRatio: 0.10, ipoShares: 333,
    starlinkNetAdds: 5, netAddsDecay: 0.18, arpuFloor: 50, arpuDecay: 0.12,
    entGovtGrowth: 0.25, connTermMargin: 0.55, connCapexRatio: 0.25,
    launchServGrowth: 0.02, launchDevGrowth: 0.12, spaceTermMargin: 0.27, spaceCapexRatio: 0.22,
    starshipOn: false, starshipStartYear: 2028, starshipFY32: 4.0,
    aiCAGR: 0.30, aiCAGRDecay: 0.07, aiBreakeven: 2031, aiTermMargin: 0.25, aiCapexRatio: 0.22,
    orbitalOn: false, orbitalStartYear: 2030, orbitalFY36: 5.0,
    echostarOn: true,
    anthropicOn: true, anthropicMonthly: 1.25, anthropicEndYear: 2029, anthropicMargin: 0.22,
    termMethod: "exit", exitMultConn: 10, exitMultSpace: 12, exitMultAi: 18,
  },
};

// ─── Main Component ───
export default function SpaceXDCF() {
  // ── State ──
  const [stockPrice, setStockPrice] = useState(() => getHashParam("sp", 150));
  const [ipoShares, setIpoShares] = useState(() => getHashParam("ipo", 333));
  const [wacc, setWacc] = useState(() => getHashParam("w", 0.11));
  const [termGrowth, setTermGrowth] = useState(() => getHashParam("tg", 0.03));
  const [taxRate, setTaxRate] = useState(() => getHashParam("tax", 0.21));
  const [sbcRatio, setSbcRatio] = useState(() => getHashParam("sbc", 0.10));

  // Connectivity
  const [starlinkNetAdds, setStarlinkNetAdds] = useState(() => getHashParam("na", 6));
  const [netAddsDecay, setNetAddsDecay] = useState(() => getHashParam("nad", 0.15));
  const [arpuFloor, setArpuFloor] = useState(() => getHashParam("af", 55));
  const [arpuDecay, setArpuDecay] = useState(() => getHashParam("adr", 0.10));
  const [entGovtGrowth, setEntGovtGrowth] = useState(() => getHashParam("eg", 0.30));
  const [connTermMargin, setConnTermMargin] = useState(() => getHashParam("ctm", 0.60));
  const [connCapexRatio, setConnCapexRatio] = useState(() => getHashParam("ccr", 0.22));

  // Space
  const [launchServGrowth, setLaunchServGrowth] = useState(() => getHashParam("lsg", 0.00));
  const [launchDevGrowth, setLaunchDevGrowth] = useState(() => getHashParam("ldg", 0.15));
  const [spaceTermMargin, setSpaceTermMargin] = useState(() => getHashParam("stm", 0.32));
  const [spaceCapexRatio, setSpaceCapexRatio] = useState(() => getHashParam("scr", 0.20));
  const [starshipOn, setStarshipOn] = useState(() => getHashParam("ss", true));
  const [starshipStartYear, setStarshipStartYear] = useState(() => getHashParam("ssy", 2028));
  const [starshipFY32, setStarshipFY32] = useState(() => getHashParam("ssc", 4.0));

  // AI
  const [aiCAGR, setAiCAGR] = useState(() => getHashParam("ar", 0.40));
  const [aiCAGRDecay, setAiCAGRDecay] = useState(() => getHashParam("ad", 0.07));
  const [aiBreakeven, setAiBreakeven] = useState(() => getHashParam("abe", 2030));
  const [aiTermMargin, setAiTermMargin] = useState(() => getHashParam("atm", 0.30));
  const [aiCapexRatio, setAiCapexRatio] = useState(() => getHashParam("acr", 0.18));
  const [orbitalOn, setOrbitalOn] = useState(() => getHashParam("oc", false));
  const [orbitalStartYear, setOrbitalStartYear] = useState(() => getHashParam("ocy", 2030));
  const [orbitalFY36, setOrbitalFY36] = useState(() => getHashParam("occ", 5.0));

  // EchoStar
  const [echostarOn, setEchostarOn] = useState(() => getHashParam("es", true));

  // Anthropic deal — locked compute-as-a-service contract
  const [anthropicOn, setAnthropicOn] = useState(() => getHashParam("an", true));
  const [anthropicMonthly, setAnthropicMonthly] = useState(() => getHashParam("anm", 1.25));
  const [anthropicEndYear, setAnthropicEndYear] = useState(() => getHashParam("any", 2032));
  const [anthropicMargin, setAnthropicMargin] = useState(() => getHashParam("anmg", 0.25));

  // Terminal value methodology
  const [termMethod, setTermMethod] = useState(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return "exit";
    const params = new URLSearchParams(hash);
    return params.get("tm") || "exit";
  });
  const [exitMultConn, setExitMultConn] = useState(() => getHashParam("emc", 12));
  const [exitMultSpace, setExitMultSpace] = useState(() => getHashParam("ems", 15));
  const [exitMultAi, setExitMultAi] = useState(() => getHashParam("ema", 22));

  // UI state
  const [showSecondary, setShowSecondary] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);
  const [copied, setCopied] = useState(false);

  const applyScenario = (key) => {
    const s = SCENARIOS[key];
    setActiveScenario(key);
    setStockPrice(s.stockPrice); setIpoShares(s.ipoShares); setWacc(s.wacc);
    setTermGrowth(s.termGrowth); setTaxRate(s.taxRate); setSbcRatio(s.sbcRatio);
    setStarlinkNetAdds(s.starlinkNetAdds); setNetAddsDecay(s.netAddsDecay);
    setArpuFloor(s.arpuFloor); setArpuDecay(s.arpuDecay);
    setEntGovtGrowth(s.entGovtGrowth); setConnTermMargin(s.connTermMargin); setConnCapexRatio(s.connCapexRatio);
    setLaunchServGrowth(s.launchServGrowth); setLaunchDevGrowth(s.launchDevGrowth);
    setSpaceTermMargin(s.spaceTermMargin); setSpaceCapexRatio(s.spaceCapexRatio);
    setStarshipOn(s.starshipOn); setStarshipStartYear(s.starshipStartYear); setStarshipFY32(s.starshipFY32);
    setAiCAGR(s.aiCAGR); setAiCAGRDecay(s.aiCAGRDecay); setAiBreakeven(s.aiBreakeven);
    setAiTermMargin(s.aiTermMargin); setAiCapexRatio(s.aiCapexRatio);
    setOrbitalOn(s.orbitalOn); setOrbitalStartYear(s.orbitalStartYear); setOrbitalFY36(s.orbitalFY36);
    setEchostarOn(s.echostarOn);
    setAnthropicOn(s.anthropicOn); setAnthropicMonthly(s.anthropicMonthly);
    setAnthropicEndYear(s.anthropicEndYear); setAnthropicMargin(s.anthropicMargin);
    setTermMethod(s.termMethod); setExitMultConn(s.exitMultConn);
    setExitMultSpace(s.exitMultSpace); setExitMultAi(s.exitMultAi);
  };

  const handleShare = () => {
    const p = {
      sp: stockPrice, ipo: ipoShares, w: wacc, tg: termGrowth, tax: taxRate, sbc: sbcRatio,
      na: starlinkNetAdds, nad: netAddsDecay, af: arpuFloor, adr: arpuDecay,
      eg: entGovtGrowth, ctm: connTermMargin, ccr: connCapexRatio,
      lsg: launchServGrowth, ldg: launchDevGrowth, stm: spaceTermMargin, scr: spaceCapexRatio,
      ss: starshipOn, ssy: starshipStartYear, ssc: starshipFY32,
      ar: aiCAGR, ad: aiCAGRDecay, abe: aiBreakeven, atm: aiTermMargin, acr: aiCapexRatio,
      oc: orbitalOn, ocy: orbitalStartYear, occ: orbitalFY36, es: echostarOn,
      an: anthropicOn, anm: anthropicMonthly, any: anthropicEndYear, anmg: anthropicMargin,
      tm: termMethod, emc: exitMultConn, ems: exitMultSpace, ema: exitMultAi,
    };
    const params = new URLSearchParams(p);
    const url = `${window.location.origin}${window.location.pathname}#${params}`;
    window.history.replaceState(null, "", url);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }
  };

  // ─── Model computation ───
  const model = useMemo(() => {
    const years = 10; // FY26-FY35
    const startFY = 2026;
    const projYears = [];

    // Starting balances
    let cash = FY25.cash;
    let debt = FY25.debt;

    // Year-by-year track variables
    let launchServPrev = FY25.spaceRev * FY25.launchServicesShare;
    let launchDevPrev = FY25.spaceRev * FY25.launchDevShare;
    let connEntGovtPrev = FY25.connRev * FY25.connEntGovtShare;
    let aiBaselinePrev = FY25.aiRev;
    let starlinkSubs = FY25.starlinkSubs / 1000; // millions
    let starlinkArpu = FY25.starlinkArpu;
    let prevTotalRev = FY25.totalRev;

    for (let i = 0; i < years; i++) {
      const fy = startFY + i;
      const t = i + 1; // years from FY25

      // ── Space ──
      const launchServ = launchServPrev * (1 + launchServGrowth);
      const launchDev = launchDevPrev * (1 + Math.max(launchDevGrowth - i * 0.01, 0.03));
      let starshipRev = 0;
      if (starshipOn && fy >= starshipStartYear) {
        const yearsIn = fy - starshipStartYear;
        const rampYears = 4;
        if (yearsIn <= rampYears) {
          // Linear ramp from 0 to FY32 contribution (or whatever year is starshipStartYear + 4)
          starshipRev = starshipFY32 * 1000 * (yearsIn + 1) / (rampYears + 1);
        } else {
          starshipRev = starshipFY32 * 1000 * Math.pow(1.20, yearsIn - rampYears);
        }
      }
      const spaceRev = launchServ + launchDev + starshipRev;
      // Space margin: -16% FY25 → terminal, recovers as Starship R&D burn eases post-commercialization
      const starshipRecoveryT = starshipOn ? Math.max(0, fy - starshipStartYear) / 5 : 1;
      const spaceMarginStart = FY25.spaceAdjEbitda / FY25.spaceRev; // -16%
      const spaceMarginInterp = starshipOn
        ? spaceMarginStart + (spaceTermMargin - spaceMarginStart) * Math.min(1, starshipRecoveryT + (t / 10) * 0.5)
        : spaceMarginStart + (spaceTermMargin - spaceMarginStart) * (t / 8);
      const spaceMargin = Math.min(spaceTermMargin, Math.max(spaceMarginStart, spaceMarginInterp));
      const spaceAdjEbitda = spaceRev * spaceMargin;
      // Space capex/sales: 94% FY25 → terminal ratio, glide path
      const spaceCxStart = FY25.spaceCapex / FY25.spaceRev;
      const spaceCxRatio = spaceCxStart + (spaceCapexRatio - spaceCxStart) * Math.min(1, t / 6);
      const spaceCapex = spaceRev * spaceCxRatio;

      // ── Connectivity ──
      // Starlink subs: net adds decelerate
      const yearNetAdds = starlinkNetAdds * Math.pow(1 - netAddsDecay, i);
      const newSubs = starlinkSubs + yearNetAdds;
      const avgSubs = (starlinkSubs + newSubs) / 2;
      starlinkSubs = newSubs;
      // ARPU declines toward floor
      const newArpu = starlinkArpu - (starlinkArpu - arpuFloor) * arpuDecay;
      const avgArpu = (starlinkArpu + newArpu) / 2;
      starlinkArpu = newArpu;
      const connConsumer = avgSubs * avgArpu * 12; // $M
      // Enterprise + Govt
      const entGovtGr = Math.max(entGovtGrowth - i * 0.025, 0.08);
      const connEntGovt = connEntGovtPrev * (1 + entGovtGr);
      const connRev = connConsumer + connEntGovt;
      const connMarginStart = FY25.connAdjEbitda / FY25.connRev; // 63%
      const connMargin = connMarginStart + (connTermMargin - connMarginStart) * Math.min(1, t / 7);
      const connAdjEbitda = connRev * connMargin;
      // Connectivity capex/sales: 37% FY25 → terminal
      const connCxStart = FY25.connCapex / FY25.connRev;
      const connCxRatio = connCxStart + (connCapexRatio - connCxStart) * Math.min(1, t / 6);
      const connCapex = connRev * connCxRatio;

      // ── AI ──
      // Baseline AI (Grok subs + X advertising + data licensing + small API)
      const yearCAGR = Math.max(aiCAGR - i * aiCAGRDecay, 0.05);
      const aiBaseline = aiBaselinePrev * (1 + yearCAGR);

      // Anthropic deal — locked compute-as-a-service revenue line ($1.25B/mo through 2029 per S-1)
      // FY26 assumed full year (deal already active per filing)
      let anthropicRev = 0;
      if (anthropicOn && fy <= anthropicEndYear) {
        anthropicRev = anthropicMonthly * 12 * 1000; // $M
      }

      // Orbital AI compute (toggleable optionality)
      let orbitalRev = 0;
      if (orbitalOn && fy >= orbitalStartYear) {
        const yearsIn = fy - orbitalStartYear;
        const rampYears = 5;
        if (yearsIn <= rampYears) {
          orbitalRev = orbitalFY36 * 1000 * (yearsIn + 1) / (rampYears + 1);
        } else {
          orbitalRev = orbitalFY36 * 1000 * Math.pow(1.25, yearsIn - rampYears);
        }
      }
      const aiRev = aiBaseline + anthropicRev + orbitalRev;

      // Margin curve for the BASELINE AI business: -39% FY25 → 0 at breakeven → terminal
      const aiMarginStart = FY25.aiAdjEbitda / FY25.aiRev; // -39%
      let aiBaselineMargin;
      if (fy <= aiBreakeven) {
        const phaseT = (fy - 2025) / Math.max(1, aiBreakeven - 2025);
        aiBaselineMargin = aiMarginStart + (0 - aiMarginStart) * phaseT;
      } else {
        const phaseT = Math.min(1, (fy - aiBreakeven) / Math.max(1, 2035 - aiBreakeven));
        aiBaselineMargin = 0 + (aiTermMargin - 0) * phaseT;
      }
      // Anthropic margin = compute-as-a-service economics (lower than software, structurally positive)
      // Orbital AI assumed to hit terminal margin once commercialized (higher-quality compute)
      const aiAdjEbitda = aiBaseline * aiBaselineMargin
        + anthropicRev * anthropicMargin
        + orbitalRev * aiTermMargin;
      const aiMargin = aiRev > 0 ? aiAdjEbitda / aiRev : 0;

      // AI capex: driven by gigawatt build-out plan (absolute dollars), not revenue-following.
      // Anthropic + Orbital revenue are the MONETIZATION of that buildout — capex is the same whether
      // they exist or not. Modeled as: ratio applied to the BASELINE (non-locked-contract) AI revenue,
      // plus a small incremental capex per dollar of compute-services revenue to capture growth.
      const aiCxStart = FY25.aiCapex / FY25.aiRev; // 3.98x
      const aiCxRatio = aiCxStart * Math.pow(0.55, i) + aiCapexRatio * (1 - Math.pow(0.55, i));
      const baselineCapex = aiBaseline * aiCxRatio;
      // Compute-services capex burden — incremental capacity to serve new contracts (~30c per $)
      const computeServiceCapex = (anthropicRev + orbitalRev) * 0.30;
      const aiCapex = baselineCapex + computeServiceCapex;

      // ── Consolidated ──
      const totalRev = spaceRev + connRev + aiRev;
      const totalAdjEbitda = spaceAdjEbitda + connAdjEbitda + aiAdjEbitda;
      const totalCapex = spaceCapex + connCapex + aiCapex;

      // Segment UFCF (Adj EBITDA × (1-tax) - CapEx)
      const spaceUFCF = spaceAdjEbitda * (1 - taxRate) - spaceCapex;
      const connUFCF = connAdjEbitda * (1 - taxRate) - connCapex;
      const aiUFCF = aiAdjEbitda * (1 - taxRate) - aiCapex;
      const totalUFCF = spaceUFCF + connUFCF + aiUFCF;

      // EchoStar cash outflow
      const echostarOut = (echostarOn && fy === SHARES.echostarFY) ? SHARES.echostarCash : 0;

      // Track cash & debt
      const interestExp = debt * 0.06;
      const interestInc = cash * 0.04;
      const sbc = totalRev * sbcRatio;
      cash = cash + totalUFCF + interestInc - interestExp - echostarOut;
      // Cap debt rough — assume held flat post-IPO refinancing; bridge term goes away with IPO proceeds
      if (i === 0) {
        // IPO raises ~$50B at $150 × 333M shares baseline; assume Bridge Loan repaid
        const ipoProceeds = ipoShares * stockPrice;
        cash += ipoProceeds;
        debt = Math.max(0, debt - 20000); // bridge loan paid off
      }

      const yoyRev = (totalRev - prevTotalRev) / prevTotalRev;
      prevTotalRev = totalRev;

      projYears.push({
        fy, yr: t,
        // Space
        launchServ, launchDev, starshipRev, spaceRev, spaceMargin, spaceAdjEbitda, spaceCapex, spaceUFCF,
        // Connectivity
        starlinkSubs: newSubs, starlinkArpu: newArpu, connConsumer, connEntGovt, connRev,
        connMargin, connAdjEbitda, connCapex, connUFCF,
        // AI (now includes Anthropic contract revenue)
        aiBaseline, anthropicRev, orbitalRev, aiRev, aiMargin, aiAdjEbitda, aiCapex, aiUFCF,
        // Total
        totalRev, totalAdjEbitda, totalCapex, totalUFCF, yoyRev,
        sbc, interestExp, interestInc, echostarOut, cash, debt,
        ebitdaMargin: totalAdjEbitda / totalRev,
      });

      // Roll
      launchServPrev = launchServ;
      launchDevPrev = launchDev;
      connEntGovtPrev = connEntGovt;
      aiBaselinePrev = aiBaseline;
    }

    // ── SOTP DCF ──
    const lastYr = projYears[years - 1];

    // Per-segment terminal value — either Gordon Growth on UFCF OR Exit EV/EBITDA
    let spaceTerm, connTerm, aiTerm;
    if (termMethod === "exit") {
      // Apply segment-specific exit multiples to terminal Adj EBITDA
      spaceTerm = Math.max(0, lastYr.spaceAdjEbitda) * exitMultSpace;
      connTerm = Math.max(0, lastYr.connAdjEbitda) * exitMultConn;
      aiTerm = Math.max(0, lastYr.aiAdjEbitda) * exitMultAi;
    } else {
      // Gordon Growth on terminal UFCF
      spaceTerm = lastYr.spaceUFCF > 0 ? (lastYr.spaceUFCF * (1 + termGrowth)) / (wacc - termGrowth) : 0;
      connTerm = lastYr.connUFCF > 0 ? (lastYr.connUFCF * (1 + termGrowth)) / (wacc - termGrowth) : 0;
      aiTerm = lastYr.aiUFCF > 0 ? (lastYr.aiUFCF * (1 + termGrowth)) / (wacc - termGrowth) : 0;
    }

    // PV of UFCF streams
    const pvSpace = projYears.reduce((sum, y, i) => sum + y.spaceUFCF / Math.pow(1 + wacc, i + 1), 0);
    const pvConn = projYears.reduce((sum, y, i) => sum + y.connUFCF / Math.pow(1 + wacc, i + 1), 0);
    const pvAi = projYears.reduce((sum, y, i) => sum + y.aiUFCF / Math.pow(1 + wacc, i + 1), 0);

    const pvSpaceTerm = spaceTerm / Math.pow(1 + wacc, years);
    const pvConnTerm = connTerm / Math.pow(1 + wacc, years);
    const pvAiTerm = aiTerm / Math.pow(1 + wacc, years);

    const evSpace = pvSpace + pvSpaceTerm;
    const evConn = pvConn + pvConnTerm;
    const evAi = pvAi + pvAiTerm;
    const totalEV = evSpace + evConn + evAi;

    // EchoStar PV adjustment (cash outflow in FY28)
    const echostarYearsOut = SHARES.echostarFY - 2025;
    const pvEchostarCash = echostarOn ? SHARES.echostarCash / Math.pow(1 + wacc, echostarYearsOut) : 0;

    // Net debt: current cash - debt
    const netCash = FY25.cash - FY25.debt;

    // IPO proceeds add cash
    const ipoProceeds = ipoShares * stockPrice;

    // Equity bridge
    const equity = totalEV + netCash + ipoProceeds - pvEchostarCash;

    // FDSO (treasury-stock method)
    const optionDilution = stockPrice > SHARES.optionsAvgEx
      ? SHARES.optionsOut * (1 - SHARES.optionsAvgEx / stockPrice)
      : 0;
    const rsuDilution = SHARES.rsuOut;
    const echostarSh = echostarOn ? SHARES.echostarShares : 0;
    const fdso = SHARES.proformaBase + ipoShares + echostarSh + optionDilution + rsuDilution;

    const impliedPrice = equity / fdso;
    const upside = impliedPrice / stockPrice - 1;
    const impliedMktCap = stockPrice * fdso;

    // Implied multiples (FY27 = projYears[1])
    const fy27 = projYears[1];
    const fy28 = projYears[2];
    const fy30 = projYears[4];
    const impliedEvFY27Rev = totalEV / fy27.totalRev;
    const impliedEvFY28Ebitda = fy28.totalAdjEbitda > 0 ? totalEV / fy28.totalAdjEbitda : null;
    const impliedEvFY30Ebitda = fy30.totalAdjEbitda > 0 ? totalEV / fy30.totalAdjEbitda : null;

    // IRR estimate (~4yr hold to FY30)
    const moic = impliedPrice / stockPrice;
    const impliedIrr = Math.pow(Math.max(moic, 0.01), 1 / 4) - 1;

    return {
      projYears, totalEV, evSpace, evConn, evAi, pvEchostarCash,
      pvSpace, pvConn, pvAi, pvSpaceTerm, pvConnTerm, pvAiTerm,
      equity, fdso, impliedPrice, impliedMktCap, upside, moic, impliedIrr,
      ipoProceeds, netCash, optionDilution, rsuDilution, echostarSh,
      fy27, fy28, fy30, impliedEvFY27Rev, impliedEvFY28Ebitda, impliedEvFY30Ebitda,
    };
  }, [stockPrice, ipoShares, wacc, termGrowth, taxRate, sbcRatio,
      starlinkNetAdds, netAddsDecay, arpuFloor, arpuDecay, entGovtGrowth, connTermMargin, connCapexRatio,
      launchServGrowth, launchDevGrowth, spaceTermMargin, spaceCapexRatio, starshipOn, starshipStartYear, starshipFY32,
      aiCAGR, aiCAGRDecay, aiBreakeven, aiTermMargin, aiCapexRatio, orbitalOn, orbitalStartYear, orbitalFY36,
      echostarOn,
      anthropicOn, anthropicMonthly, anthropicEndYear, anthropicMargin,
      termMethod, exitMultConn, exitMultSpace, exitMultAi]);

  // ─── Chart data ───
  const chartData = useMemo(() => {
    const hist = [
      { fy: "FY23", space: HIST.FY23.space / 1000, conn: HIST.FY23.conn / 1000, ai: HIST.FY23.ai / 1000, total: HIST.FY23.rev / 1000, ebitda: HIST.FY23.adjEbitda / 1000, margin: HIST.FY23.adjEbitda / HIST.FY23.rev, yoy: null, capex: HIST.FY23.capex / 1000 },
      { fy: "FY24", space: HIST.FY24.space / 1000, conn: HIST.FY24.conn / 1000, ai: HIST.FY24.ai / 1000, total: HIST.FY24.rev / 1000, ebitda: HIST.FY24.adjEbitda / 1000, margin: HIST.FY24.adjEbitda / HIST.FY24.rev, yoy: (HIST.FY24.rev - HIST.FY23.rev) / HIST.FY23.rev, capex: HIST.FY24.capex / 1000 },
      { fy: "FY25", space: HIST.FY25.space / 1000, conn: HIST.FY25.conn / 1000, ai: HIST.FY25.ai / 1000, total: HIST.FY25.rev / 1000, ebitda: HIST.FY25.adjEbitda / 1000, margin: HIST.FY25.adjEbitda / HIST.FY25.rev, yoy: (HIST.FY25.rev - HIST.FY24.rev) / HIST.FY24.rev, capex: HIST.FY25.capex / 1000 },
    ];
    const proj = model.projYears.map(y => ({
      fy: `FY${String(y.fy).slice(2)}`,
      space: +(y.spaceRev / 1000).toFixed(2),
      conn: +(y.connRev / 1000).toFixed(2),
      ai: +(y.aiRev / 1000).toFixed(2),
      total: +(y.totalRev / 1000).toFixed(2),
      ebitda: +(y.totalAdjEbitda / 1000).toFixed(2),
      margin: y.ebitdaMargin,
      yoy: y.yoyRev,
      capex: +(y.totalCapex / 1000).toFixed(2),
      spaceCapex: +(y.spaceCapex / 1000).toFixed(2),
      connCapex: +(y.connCapex / 1000).toFixed(2),
      aiCapex: +(y.aiCapex / 1000).toFixed(2),
      projected: true,
    }));
    return [...hist, ...proj];
  }, [model]);

  const subsData = useMemo(() => {
    const hist = [
      { fy: "FY24", subs: 4.6, arpu: 91 },  // approx EOP'24
      { fy: "FY25", subs: FY25.starlinkSubs / 1000, arpu: FY25.starlinkArpu },
    ];
    const proj = model.projYears.map(y => ({
      fy: `FY${String(y.fy).slice(2)}`,
      subs: +y.starlinkSubs.toFixed(1),
      arpu: Math.round(y.starlinkArpu),
    }));
    return [...hist, ...proj];
  }, [model]);

  const ufcfData = useMemo(() =>
    model.projYears.map(y => ({
      fy: `FY${String(y.fy).slice(2)}`,
      ufcf: +(y.totalUFCF / 1000).toFixed(2),
      space: +(y.spaceUFCF / 1000).toFixed(2),
      conn: +(y.connUFCF / 1000).toFixed(2),
      ai: +(y.aiUFCF / 1000).toFixed(2),
    })), [model]);

  const evBreakdown = useMemo(() => [
    { name: "Space", value: model.evSpace / 1000, color: C.spaceColor },
    { name: "Connectivity", value: model.evConn / 1000, color: C.connColor },
    { name: "AI", value: model.evAi / 1000, color: C.aiColor },
  ], [model]);

  // ─── Sensitivity table ───
  const sensitivity = useMemo(() => {
    const waccVals = [0.09, 0.10, 0.11, 0.12, 0.13, 0.14];
    const tgVals = [0.02, 0.025, 0.03, 0.035, 0.04];
    return tgVals.map(tg => ({
      tg,
      values: waccVals.map(w => {
        const ufcfs = model.projYears.map(y => y.totalUFCF);
        const pvFcfs = ufcfs.reduce((sum, u, i) => sum + u / Math.pow(1 + w, i + 1), 0);
        const term = (ufcfs[9] * (1 + tg)) / (w - tg);
        const pvTerm = term / Math.pow(1 + w, 10);
        const ev = pvFcfs + pvTerm;
        const eq = ev + model.netCash + model.ipoProceeds - (model.pvEchostarCash * (wacc - 0) / (w - 0));
        return eq / model.fdso;
      }),
    }));
  }, [model, wacc]);

  // ─── Input Panel ───
  const inputPanel = (
    <div style={{ width: 320, flexShrink: 0, background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 16 }}>Market Inputs</div>
      <NumberInput label="Stock Price" value={stockPrice} onChange={setStockPrice} tooltip="Reference share price on pro-forma 12.52B base. $150 ≈ $1.9T equity (midpoint of reported $1.5–2T IPO target). Private-market $600 marks are on a much smaller pre-conversion base." />
      <NumberInput label="IPO Shares Issued (M)" value={ipoShares} onChange={setIpoShares} prefix="" suffix="M" tooltip="New Class A shares sold in the IPO. Default 333M at $150 raises ~$50B. Press reports suggest a $50–75B raise." />

      <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>Valuation</div>
      <Slider label="WACC" value={wacc} onChange={setWacc} min={0.07} max={0.18} step={0.005} format="pct" tooltip="Weighted-average cost of capital used to discount each segment's UFCF. Single rate across segments (SOTP comes from segment-specific terminal margins + capex tracks)." />

      {/* Terminal method toggle */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>
          Terminal Value Method<InfoTooltip text="Exit Multiple applies segment-specific EV/EBITDA to terminal year EBITDA (better for high-growth tech). Gordon Growth uses UFCF × (1+g)/(WACC-g) — tends to understate value when terminal year hasn't reached steady-state margins." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <button onClick={() => setTermMethod("exit")}
            style={{ padding: "6px 4px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700,
              background: termMethod === "exit" ? C.blueDark : C.cardAlt,
              border: `1px solid ${termMethod === "exit" ? C.blue : C.border}`,
              color: termMethod === "exit" ? C.blueLight : C.textMuted }}>Exit Multiple</button>
          <button onClick={() => setTermMethod("gordon")}
            style={{ padding: "6px 4px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700,
              background: termMethod === "gordon" ? C.blueDark : C.cardAlt,
              border: `1px solid ${termMethod === "gordon" ? C.blue : C.border}`,
              color: termMethod === "gordon" ? C.blueLight : C.textMuted }}>Gordon Growth</button>
        </div>
      </div>

      {termMethod === "gordon" && (
        <Slider label="Terminal Growth" value={termGrowth} onChange={setTermGrowth} min={0.015} max={0.045} step={0.0025} format="pct" tooltip="Perpetual growth rate in the Gordon Growth terminal value calc. Should not exceed long-run nominal GDP (~3–4%)." />
      )}
      {termMethod === "exit" && (
        <>
          <Slider label="Conn Exit EV/EBITDA" value={exitMultConn} onChange={setExitMultConn} min={5} max={25} step={0.5} format="x" tooltip="Connectivity exit multiple — mature subscription comms peers (cable/wireless) trade 7–12x; high-growth wireless 12–18x. Applied to FY35 Conn Adj EBITDA." />
          <Slider label="Space Exit EV/EBITDA" value={exitMultSpace} onChange={setExitMultSpace} min={5} max={30} step={0.5} format="x" tooltip="Space exit multiple — defense/aerospace peers trade 10–15x; high-growth specialty 15–22x. Applied to FY35 Space Adj EBITDA." />
          <Slider label="AI Exit EV/EBITDA" value={exitMultAi} onChange={setExitMultAi} min={8} max={40} step={1} format="x" tooltip="AI exit multiple — high-growth frontier-model/compute peers trade 18–35x. Applied to FY35 AI Adj EBITDA. The biggest terminal-value lever in the model." />
        </>
      )}

      <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
      <div style={{ fontSize: 11, color: C.connColor, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>Connectivity (Starlink)</div>
      <Slider label="Starlink Net Adds Y1 (M)" value={starlinkNetAdds} onChange={setStarlinkNetAdds} min={2} max={15} step={0.5} format="number" suffix="M" tooltip="Starlink subscriber net additions in FY26. Subs grew 5.0M → 10.3M from Q1'25 to Q1'26 (+5.3M)." />
      <Slider label="Net Adds Decay /yr" value={netAddsDecay} onChange={setNetAddsDecay} min={0.05} max={0.30} step={0.01} format="pct" tooltip="How quickly net add velocity decelerates — net adds × (1 - decay) each year. Higher = faster maturation." />
      <Slider label="ARPU Floor ($/mo)" value={arpuFloor} onChange={setArpuFloor} min={30} max={90} step={1} format="number" prefix="$" suffix="/mo" tooltip="Long-run monthly ARPU floor as international mix grows and low-priced plans expand. FY26 Q1 was $66; FY25 was $81; FY24 was $91." />
      <Slider label="ARPU Decay /yr" value={arpuDecay} onChange={setArpuDecay} min={0.03} max={0.20} step={0.01} format="pct" tooltip="Each year ARPU moves this fraction of the gap toward the floor." />

      <button onClick={() => setShowSecondary(!showSecondary)}
        style={{ width: "100%", background: C.cardAlt, border: `1px solid ${C.border}`, color: C.textMuted, padding: "8px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginTop: 8 }}>
        {showSecondary ? "▾ Hide" : "▸ Show"} Detailed Inputs
      </button>

      {showSecondary && (
        <div style={{ marginTop: 16 }}>
          <Slider label="Enterprise+Govt Growth Y1" value={entGovtGrowth} onChange={setEntGovtGrowth} min={0.05} max={0.60} step={0.01} format="pct" tooltip="FY26 growth rate for Connectivity enterprise + government revenue. Decelerates ~2.5pp/year." />
          <Slider label="Conn Terminal EBITDA Margin" value={connTermMargin} onChange={setConnTermMargin} min={0.35} max={0.75} step={0.01} format="pct" tooltip="Steady-state Connectivity segment Adj EBITDA margin. FY25 was 63%; mature scaled comms operators do 50–65%." />
          <Slider label="Conn CapEx/Sales (term)" value={connCapexRatio} onChange={setConnCapexRatio} min={0.10} max={0.45} step={0.01} format="pct" tooltip="Long-run Connectivity capex as % of revenue. FY25 was 37%; settles to satellite refresh + ground equipment maintenance. Mature comms/cable ~20–25%." />

          <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
          <div style={{ fontSize: 11, color: C.spaceColor, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>Space (Falcon + Starship)</div>
          <Slider label="Launch Services Growth" value={launchServGrowth} onChange={setLaunchServGrowth} min={-0.15} max={0.20} step={0.01} format="pct" tooltip="Annual growth in Falcon customer launch revenue. Q1'26 was down 28%; FY25 Launch Services was ~flat. Will compress as customers migrate to Starship." />
          <Slider label="Launch & Development Growth" value={launchDevGrowth} onChange={setLaunchDevGrowth} min={0.00} max={0.30} step={0.01} format="pct" tooltip="Growth in NASA CRS, DoW, and other long-term govt contracts. Grew 25% in FY25. Decelerates 1pp/year." />
          <Slider label="Space Terminal Margin" value={spaceTermMargin} onChange={setSpaceTermMargin} min={0.10} max={0.50} step={0.01} format="pct" tooltip="Steady-state Space Adj EBITDA margin once Starship R&D ramps down. FY24 was 30% pre-Starship surge. Mature reusable launch should drive margin higher as cost/kg drops." />
          <Slider label="Space CapEx/Sales (term)" value={spaceCapexRatio} onChange={setSpaceCapexRatio} min={0.08} max={0.50} step={0.01} format="pct" tooltip="Long-run Space capex/sales ratio. FY25 was 94% during Starship infrastructure buildout. Mature ratio ~15–25% covers vehicle refresh, R&D capitalized, range/launch facilities." />
          <Toggle label="Starship Commercial" value={starshipOn} onChange={setStarshipOn} tooltip="Turn on to model Starship as a separate revenue line ramping from start year to FY32 contribution. Off = Falcon-only world." />
          {starshipOn && (
            <>
              <Slider label="Starship Commercial Year" value={starshipStartYear} onChange={setStarshipStartYear} min={2027} max={2032} step={1} format="year" tooltip="First year of commercial Starship revenue. S-1 says payload delivery 'commences 2H 2026' but commercial customer revenue takes longer." />
              <Slider label="Starship Year+4 Revenue" value={starshipFY32} onChange={setStarshipFY32} min={0.5} max={15} step={0.5} format="$B" tooltip="Revenue contribution 4 years after commercial start (linear ramp). Beyond that, grows 20%/yr." />
            </>
          )}

          <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
          <div style={{ fontSize: 11, color: C.aiColor, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>AI (xAI + X + Compute)</div>
          <Toggle label="Anthropic Contract" value={anthropicOn} onChange={setAnthropicOn} tooltip="S-1 discloses Anthropic compute-as-a-service contract at $1.25B/month through May 2029 (~$15B/yr, ~$45B total). 90-day terminable. Modeled as a separate AI revenue line with its own margin." />
          {anthropicOn && (
            <>
              <Slider label="Anthropic Monthly Rev" value={anthropicMonthly} onChange={setAnthropicMonthly} min={0.25} max={3.0} step={0.05} format="$B" tooltip="Monthly compute revenue from Anthropic contract. S-1 baseline is $1.25B/mo. Slider lets you stress-test partial-quarter or follow-on contract scenarios." />
              <Slider label="Compute Services End Year" value={anthropicEndYear} onChange={setAnthropicEndYear} min={2027} max={2034} step={1} format="year" tooltip="Last year of compute-services revenue at this run rate. S-1 discloses the Anthropic contract through May 2029, but real-world: SpaceX is building gigawatt capacity; if Anthropic doesn't renew, the capacity gets re-sold. Base default 2032 assumes renewal or capacity backfill. Set to 2029 to model the S-1 disclosure cliff." />
              <Slider label="Anthropic Margin" value={anthropicMargin} onChange={setAnthropicMargin} min={0.05} max={0.45} step={0.01} format="pct" tooltip="Adj EBITDA margin on Anthropic revenue. Compute-as-a-service economics — between hyperscaler infra (~30%) and pure pass-through (~10%). Default 25%." />
            </>
          )}
          <Slider label="AI Baseline CAGR Y1" value={aiCAGR} onChange={setAiCAGR} min={0.05} max={0.80} step={0.01} format="pct" tooltip="Growth rate for the BASELINE AI business (Grok subs + X advertising + data licensing), excluding the Anthropic contract and orbital compute lines. FY25 grew 22%. Decelerates by 'decay' per year." />
          <Slider label="AI CAGR Decay /yr" value={aiCAGRDecay} onChange={setAiCAGRDecay} min={0.02} max={0.15} step={0.01} format="pct" tooltip="Yearly deceleration applied to AI growth rate." />
          <Slider label="AI Breakeven Year" value={aiBreakeven} onChange={setAiBreakeven} min={2027} max={2034} step={1} format="year" tooltip="First year AI Adj EBITDA reaches zero. FY25 was -39% margin ($1.2B loss). Margin interpolates linearly from FY25 to breakeven, then from breakeven to terminal." />
          <Slider label="AI Terminal Margin" value={aiTermMargin} onChange={setAiTermMargin} min={0.05} max={0.50} step={0.01} format="pct" tooltip="Long-run AI segment Adj EBITDA margin. Reached by FY35. Frontier model + ads + compute services blend." />
          <Slider label="AI CapEx/Sales (term)" value={aiCapexRatio} onChange={setAiCapexRatio} min={0.08} max={0.50} step={0.01} format="pct" tooltip="Steady-state AI capex/sales. FY25 was 398% during gigawatt buildout. Mature hyperscaler peers run 15–25% (Meta, Google, Microsoft). Decays geometrically from FY25 toward this terminal." />
          <Toggle label="Orbital AI Compute" value={orbitalOn} onChange={setOrbitalOn} tooltip="Model orbital AI compute as a separate revenue line. Highly speculative — S-1 says 100GW/yr aspirational target. Off by default in base case." />
          {orbitalOn && (
            <>
              <Slider label="Orbital Commercial Year" value={orbitalStartYear} onChange={setOrbitalStartYear} min={2028} max={2034} step={1} format="year" tooltip="First year orbital AI compute generates revenue. Pre-revenue today." />
              <Slider label="Orbital Year+5 Revenue" value={orbitalFY36} onChange={setOrbitalFY36} min={0.5} max={20} step={0.5} format="$B" tooltip="Orbital revenue contribution 5 years after commercial start (linear ramp). Grows 25%/yr beyond." />
            </>
          )}

          <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>Corporate</div>
          <Slider label="Effective Tax Rate" value={taxRate} onChange={setTaxRate} min={0.15} max={0.30} step={0.01} format="pct" tooltip="Blended federal + state tax rate on segment EBITDA. 21% = federal statutory; OBBBA reversal of NOL benefits affects near-term cash tax." />
          <Slider label="SBC % of Revenue" value={sbcRatio} onChange={setSbcRatio} min={0.04} max={0.18} step={0.005} format="pct" tooltip="Stock-based compensation as % of revenue. FY25 was 10.4% ($1.95B). xAI-segment SBC pushed higher." />
          <Toggle label="EchoStar Spectrum Close" value={echostarOn} onChange={setEchostarOn} tooltip="If on, model EchoStar spectrum acquisition: $8.5B cash outflow in FY28 + 262M new shares (valued at $42.40 = $11.1B). Currently expected to close Nov 2027." />
        </div>
      )}

      <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 10, textAlign: "center" }}>Scenarios</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {Object.entries(SCENARIOS).map(([key, s]) => (
          <button key={key} onClick={() => applyScenario(key)}
            style={{
              padding: "8px 4px", borderRadius: 6, cursor: "pointer",
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5, transition: "all 0.2s ease",
              background: activeScenario === key ? C.blueDark : C.cardAlt,
              border: `1px solid ${activeScenario === key ? C.blue : C.border}`,
              color: activeScenario === key ? C.blueLight : C.textMuted,
            }}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
      <button onClick={handleShare}
        style={{
          width: "100%", padding: "10px", borderRadius: 6, cursor: "pointer",
          background: copied ? C.greenDark : C.cardAlt, border: `1px solid ${copied ? C.green : C.border}`,
          color: copied ? C.green : C.textMuted, fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: 1.5,
        }}>
        {copied ? "✓ Copied" : "Share Model URL"}
      </button>
    </div>
  );

  // ─── Render ───
  return (
    <div style={{
      background: C.bg, color: C.text, minHeight: "100vh",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "32px 24px",
    }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Link to="/" style={{ color: C.textDim, textDecoration: "none", fontSize: 13 }}>← Home</Link>
          <span style={{ color: C.textDim }}>·</span>
          <span style={{
            background: C.blue, color: "#fff", padding: "3px 8px",
            borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 1,
          }}>SPACEX</span>
          <span style={{ color: C.textDim, fontSize: 11 }}>IPO model · sum-of-the-parts DCF</span>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4, letterSpacing: -0.5 }}>
          SpaceX — Interactive DCF
        </h1>
        <p style={{ color: C.textDim, fontSize: 13, marginBottom: 24, maxWidth: 900 }}>
          Sum-of-the-parts DCF on the three reported segments (Space / Connectivity / AI). Anchored to FY23–FY25 S-1 actuals.
          Starship and orbital AI compute modeled as toggleable optionality lines with commercialization-year inputs.
        </p>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {inputPanel}

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* KPI strip */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <KPICard title="Implied Price" value={fmtDollar(model.impliedPrice)} subtitle={`Upside: ${model.upside > 0 ? "+" : ""}${(model.upside * 100).toFixed(1)}%`} color={model.upside > 0 ? C.green : C.red} />
              <KPICard title="Implied Equity" value={fmt$B(model.equity, 2)} subtitle={`@ ${fmtDollar(model.impliedPrice)} × ${(model.fdso / 1000).toFixed(2)}B FDSO`} />
              <KPICard title="Total EV (SOTP)" value={fmt$B(model.totalEV, 2)} subtitle={`Space + Conn + AI`} color={C.blueLight} />
              <KPICard title="Implied IRR (4yr)" value={fmtPct(model.impliedIrr, 1)} subtitle={`MOIC: ${model.moic.toFixed(2)}x`} color={C.amber} small />
              <KPICard title="Current Mkt Cap" value={fmt$B(model.impliedMktCap, 2)} subtitle={`@ stock price input`} color={C.steel} small />
            </div>

            {/* Segment EV Breakdown */}
            <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Sum-of-the-Parts EV Breakdown</div>
                <div style={{ fontSize: 11, color: C.textDim }}>Each segment's PV(UFCF) + PV(Terminal Value) at WACC = {fmtPct(wacc)}</div>
              </div>
              <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                <div style={{ width: 240, height: 240 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={evBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} stroke={C.bg}>
                        {evBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `$${v.toFixed(0)}B`} contentStyle={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1 }}>
                  <table style={{ width: "100%", fontSize: 12 }}>
                    <thead>
                      <tr style={{ color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>
                        <th style={{ textAlign: "left", padding: "8px 4px", fontWeight: 600 }}>Segment</th>
                        <th style={{ textAlign: "right", padding: "8px 4px", fontWeight: 600 }}>PV(UFCF)</th>
                        <th style={{ textAlign: "right", padding: "8px 4px", fontWeight: 600 }}>PV(Term)</th>
                        <th style={{ textAlign: "right", padding: "8px 4px", fontWeight: 600 }}>Total EV</th>
                        <th style={{ textAlign: "right", padding: "8px 4px", fontWeight: 600 }}>% of Total</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontFamily: "monospace" }}>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "8px 4px", color: C.spaceColor, fontWeight: 700 }}>● Space</td>
                        <td style={{ textAlign: "right", padding: "8px 4px" }}>{fmt$B(model.pvSpace, 1)}</td>
                        <td style={{ textAlign: "right", padding: "8px 4px" }}>{fmt$B(model.pvSpaceTerm, 1)}</td>
                        <td style={{ textAlign: "right", padding: "8px 4px", color: C.text, fontWeight: 700 }}>{fmt$B(model.evSpace, 1)}</td>
                        <td style={{ textAlign: "right", padding: "8px 4px", color: C.textMuted }}>{fmtPct(model.evSpace / model.totalEV)}</td>
                      </tr>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "8px 4px", color: C.connColor, fontWeight: 700 }}>● Connectivity</td>
                        <td style={{ textAlign: "right", padding: "8px 4px" }}>{fmt$B(model.pvConn, 1)}</td>
                        <td style={{ textAlign: "right", padding: "8px 4px" }}>{fmt$B(model.pvConnTerm, 1)}</td>
                        <td style={{ textAlign: "right", padding: "8px 4px", color: C.text, fontWeight: 700 }}>{fmt$B(model.evConn, 1)}</td>
                        <td style={{ textAlign: "right", padding: "8px 4px", color: C.textMuted }}>{fmtPct(model.evConn / model.totalEV)}</td>
                      </tr>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "8px 4px", color: C.aiColor, fontWeight: 700 }}>● AI</td>
                        <td style={{ textAlign: "right", padding: "8px 4px" }}>{fmt$B(model.pvAi, 1)}</td>
                        <td style={{ textAlign: "right", padding: "8px 4px" }}>{fmt$B(model.pvAiTerm, 1)}</td>
                        <td style={{ textAlign: "right", padding: "8px 4px", color: C.text, fontWeight: 700 }}>{fmt$B(model.evAi, 1)}</td>
                        <td style={{ textAlign: "right", padding: "8px 4px", color: C.textMuted }}>{fmtPct(model.evAi / model.totalEV)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "10px 4px", fontWeight: 700 }}>Total EV</td>
                        <td colSpan={2}></td>
                        <td style={{ textAlign: "right", padding: "10px 4px", color: C.blueLight, fontWeight: 800, fontSize: 14 }}>{fmt$B(model.totalEV, 2)}</td>
                        <td></td>
                      </tr>
                      <tr style={{ color: C.textMuted, fontSize: 11 }}>
                        <td style={{ padding: "4px" }}>+ Cash − Debt</td>
                        <td colSpan={2}></td>
                        <td style={{ textAlign: "right", padding: "4px" }}>{fmt$B(model.netCash, 1)}</td>
                        <td></td>
                      </tr>
                      <tr style={{ color: C.textMuted, fontSize: 11 }}>
                        <td style={{ padding: "4px" }}>+ IPO Proceeds</td>
                        <td colSpan={2}></td>
                        <td style={{ textAlign: "right", padding: "4px" }}>{fmt$B(model.ipoProceeds, 1)}</td>
                        <td></td>
                      </tr>
                      <tr style={{ color: C.textMuted, fontSize: 11 }}>
                        <td style={{ padding: "4px" }}>− PV EchoStar Cash</td>
                        <td colSpan={2}></td>
                        <td style={{ textAlign: "right", padding: "4px" }}>{model.pvEchostarCash > 0 ? `(${fmt$B(model.pvEchostarCash, 1)})` : "—"}</td>
                        <td></td>
                      </tr>
                      <tr style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: "10px 4px", fontWeight: 700 }}>= Equity Value</td>
                        <td colSpan={2}></td>
                        <td style={{ textAlign: "right", padding: "10px 4px", color: C.green, fontWeight: 800, fontSize: 14 }}>{fmt$B(model.equity, 2)}</td>
                        <td></td>
                      </tr>
                      <tr style={{ color: C.textMuted, fontSize: 11 }}>
                        <td style={{ padding: "4px" }}>÷ FDSO ({(model.fdso / 1000).toFixed(2)}B sh)</td>
                        <td colSpan={2}></td>
                        <td style={{ textAlign: "right", padding: "4px", color: C.green, fontWeight: 700 }}>{fmtDollar(model.impliedPrice)} / share</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Revenue + EBITDA chart */}
            <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Segment Revenue & Adj. EBITDA Margin</div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>Stacked bars: revenue by segment ($B). Line: consolidated Adj. EBITDA margin.</div>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="fy" tick={{ fill: C.textMuted, fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fill: C.textMuted, fontSize: 11 }} label={{ value: "Revenue ($B)", angle: -90, position: "insideLeft", fill: C.textMuted, fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: C.textMuted, fontSize: 11 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={[-0.4, 0.6]} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="space" stackId="a" name="Space" fill={C.spaceColor} />
                    <Bar yAxisId="left" dataKey="conn" stackId="a" name="Connectivity" fill={C.connColor} />
                    <Bar yAxisId="left" dataKey="ai" stackId="a" name="AI" fill={C.aiColor} />
                    <Line yAxisId="right" type="monotone" dataKey="margin" name="EBITDA Margin" stroke={C.green} strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CapEx by segment */}
            <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>CapEx by Segment</div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>AI capex was 398% of AI revenue in FY25 ($12.7B vs $3.2B). Glide path is critical to FCF.</div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="fy" tick={{ fill: C.textMuted, fontSize: 11 }} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} label={{ value: "CapEx ($B)", angle: -90, position: "insideLeft", fill: C.textMuted, fontSize: 11 }} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="spaceCapex" stackId="x" name="Space" fill={C.spaceColor} />
                    <Bar dataKey="connCapex" stackId="x" name="Connectivity" fill={C.connColor} />
                    <Bar dataKey="aiCapex" stackId="x" name="AI" fill={C.aiColor} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Starlink Subs vs ARPU */}
            <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Starlink Subscribers vs. ARPU</div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>Subscribers grew 5.0M → 10.3M from Q1'25 to Q1'26. ARPU compressed from $91 (FY24) to $66 (Q1'26) as international mix grew.</div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <ComposedChart data={subsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="fy" tick={{ fill: C.textMuted, fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fill: C.textMuted, fontSize: 11 }} label={{ value: "Subscribers (M)", angle: -90, position: "insideLeft", fill: C.textMuted, fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: C.textMuted, fontSize: 11 }} label={{ value: "ARPU ($/mo)", angle: 90, position: "insideRight", fill: C.textMuted, fontSize: 11 }} />
                    <Tooltip content={<SubsTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="subs" name="Subscribers" fill={C.connColor} />
                    <Line yAxisId="right" type="monotone" dataKey="arpu" name="ARPU" stroke={C.amber} strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* UFCF Bridge */}
            <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Unlevered Free Cash Flow by Segment</div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>UFCF = Segment Adj EBITDA × (1 − tax) − Segment CapEx. AI typically negative until capex normalizes.</div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={ufcfData} stackOffset="sign">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="fy" tick={{ fill: C.textMuted, fontSize: 11 }} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} label={{ value: "UFCF ($B)", angle: -90, position: "insideLeft", fill: C.textMuted, fontSize: 11 }} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="space" stackId="u" name="Space" fill={C.spaceColor} />
                    <Bar dataKey="conn" stackId="u" name="Connectivity" fill={C.connColor} />
                    <Bar dataKey="ai" stackId="u" name="AI" fill={C.aiColor} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Projection Table */}
            <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20, overflowX: "auto" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>10-Year Projection Detail</div>
              <table style={{ width: "100%", fontSize: 11, fontFamily: "monospace", minWidth: 900 }}>
                <thead>
                  <tr style={{ color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ textAlign: "left", padding: "6px 4px" }}>FY</th>
                    <th style={{ textAlign: "right", padding: "6px 4px" }}>Space Rev</th>
                    <th style={{ textAlign: "right", padding: "6px 4px" }}>Conn Rev</th>
                    <th style={{ textAlign: "right", padding: "6px 4px" }}>AI Rev</th>
                    <th style={{ textAlign: "right", padding: "6px 4px" }}>Total Rev</th>
                    <th style={{ textAlign: "right", padding: "6px 4px" }}>YoY</th>
                    <th style={{ textAlign: "right", padding: "6px 4px" }}>Adj EBITDA</th>
                    <th style={{ textAlign: "right", padding: "6px 4px" }}>Margin</th>
                    <th style={{ textAlign: "right", padding: "6px 4px" }}>CapEx</th>
                    <th style={{ textAlign: "right", padding: "6px 4px" }}>UFCF</th>
                  </tr>
                </thead>
                <tbody>
                  {model.projYears.map((y, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, color: C.text }}>
                      <td style={{ padding: "6px 4px", color: C.textMuted, fontWeight: 700 }}>FY{String(y.fy).slice(2)}</td>
                      <td style={{ textAlign: "right", padding: "6px 4px", color: C.spaceColor }}>{fmt$B(y.spaceRev, 1)}</td>
                      <td style={{ textAlign: "right", padding: "6px 4px", color: C.connColor }}>{fmt$B(y.connRev, 1)}</td>
                      <td style={{ textAlign: "right", padding: "6px 4px", color: C.aiColor }}>{fmt$B(y.aiRev, 1)}</td>
                      <td style={{ textAlign: "right", padding: "6px 4px", fontWeight: 700 }}>{fmt$B(y.totalRev, 1)}</td>
                      <td style={{ textAlign: "right", padding: "6px 4px", color: y.yoyRev >= 0 ? C.green : C.red }}>{fmtPct(y.yoyRev)}</td>
                      <td style={{ textAlign: "right", padding: "6px 4px" }}>{fmt$B(y.totalAdjEbitda, 1)}</td>
                      <td style={{ textAlign: "right", padding: "6px 4px", color: y.ebitdaMargin >= 0.2 ? C.green : y.ebitdaMargin >= 0 ? C.amber : C.red }}>{fmtPct(y.ebitdaMargin)}</td>
                      <td style={{ textAlign: "right", padding: "6px 4px", color: C.textMuted }}>({fmt$B(y.totalCapex, 1).replace("$", "$")})</td>
                      <td style={{ textAlign: "right", padding: "6px 4px", color: y.totalUFCF >= 0 ? C.green : C.red, fontWeight: 700 }}>{fmt$B(y.totalUFCF, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sensitivity */}
            <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Sensitivity: WACC × Terminal Growth</div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>Implied price per share at varying WACC (columns) and terminal growth (rows). Current inputs: WACC {fmtPct(wacc)} / g {fmtPct(termGrowth)}.</div>
              <table style={{ width: "100%", fontSize: 12, fontFamily: "monospace" }}>
                <thead>
                  <tr style={{ color: C.textMuted }}>
                    <th style={{ textAlign: "left", padding: 8 }}>g \ WACC</th>
                    {[0.09, 0.10, 0.11, 0.12, 0.13, 0.14].map(w => (
                      <th key={w} style={{ textAlign: "right", padding: 8, color: Math.abs(w - wacc) < 0.005 ? C.blueLight : C.textMuted }}>{fmtPct(w, 1)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sensitivity.map((row, ri) => (
                    <tr key={ri} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: 8, color: Math.abs(row.tg - termGrowth) < 0.003 ? C.blueLight : C.textMuted, fontWeight: 700 }}>{fmtPct(row.tg, 1)}</td>
                      {row.values.map((v, ci) => {
                        const waccVal = [0.09, 0.10, 0.11, 0.12, 0.13, 0.14][ci];
                        const isCurrent = Math.abs(waccVal - wacc) < 0.005 && Math.abs(row.tg - termGrowth) < 0.003;
                        return (
                          <td key={ci} style={{
                            textAlign: "right", padding: 8,
                            background: isCurrent ? C.blueDark : "transparent",
                            color: isCurrent ? C.blueLight : v > stockPrice ? C.green : C.red,
                            fontWeight: isCurrent ? 800 : 500,
                          }}>{fmtDollar(v, 0)}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Share count reconciliation */}
            <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>FDSO — Treasury-Stock Method Build</div>
              <table style={{ width: "100%", fontSize: 12, fontFamily: "monospace" }}>
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: 8, color: C.textMuted }}>Pro-forma base (post preferred conversion + Class C reclass)</td>
                    <td style={{ textAlign: "right", padding: 8 }}>{SHARES.proformaBase.toLocaleString()}M</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: 8, color: C.textMuted }}>+ IPO shares issued</td>
                    <td style={{ textAlign: "right", padding: 8, color: C.blueLight }}>+{ipoShares.toLocaleString()}M</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: 8, color: C.textMuted }}>+ EchoStar spectrum shares {echostarOn ? "" : "(off)"}</td>
                    <td style={{ textAlign: "right", padding: 8, color: echostarOn ? C.blueLight : C.textDim }}>+{model.echostarSh}M</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: 8, color: C.textMuted }}>+ Options (TSM at ${stockPrice.toFixed(0)} stock vs ${SHARES.optionsAvgEx} avg strike)</td>
                    <td style={{ textAlign: "right", padding: 8, color: C.blueLight }}>+{model.optionDilution.toFixed(0)}M</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: 8, color: C.textMuted }}>+ RSUs + RSAs (fully dilutive)</td>
                    <td style={{ textAlign: "right", padding: 8, color: C.blueLight }}>+{model.rsuDilution}M</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 10, fontWeight: 700 }}>= Fully Diluted Shares Outstanding</td>
                    <td style={{ textAlign: "right", padding: 10, color: C.green, fontWeight: 800, fontSize: 14 }}>{model.fdso.toFixed(0)}M</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.6, padding: "16px 4px" }}>
              <div style={{ marginBottom: 6, color: C.textMuted, fontWeight: 700, fontSize: 12 }}>Methodology & Data Sources</div>
              Historical anchors: SpaceX S-1 (Form S-1) filed 2026, segment results FY23–FY25 and Q1'26.
              SOTP DCF projects 10 years (FY26–FY35); each segment discounted at single WACC with segment-specific terminal margin + capex track.
              Terminal value via Gordon Growth on terminal UFCF.
              FDSO uses treasury-stock method for options ({SHARES.optionsOut}M outstanding @ ${SHARES.optionsAvgEx} avg strike) and fully dilutes RSUs/RSAs ({SHARES.rsuOut}M).
              EchoStar spectrum closing modeled in FY28 as $8.5B cash outflow + 262M shares (toggleable).
              <br /><br />
              <em>Independent analysis. Not affiliated with SpaceX. All projections are estimates and not financial advice.</em>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
