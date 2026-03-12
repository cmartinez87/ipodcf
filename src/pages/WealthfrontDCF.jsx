import { useState, useMemo, useCallback, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area } from "recharts";

// ─── Wealthfront Brand Colors ───
const C = {
  bg: "#0C0816", card: "#16112A", cardAlt: "#1E1735",
  purple: "#4B2AAD", purpleLight: "#7C5CDB", purpleDark: "#2A1064",
  lavender: "#A78BFA", accent: "#C4B5FD",
  green: "#34D399", greenDark: "#059669",
  red: "#F87171", redDark: "#DC2626",
  amber: "#FBBF24",
  text: "#F3F0FF", textMuted: "#9B8FC7", textDim: "#6B5F8A",
  border: "#2D2548", borderLight: "#3D3360",
  gradient1: "#4B2AAD", gradient2: "#7C5CDB",
};

// ─── FY26 Actuals (from v7 model) ───
const FY26 = {
  platformAssets: 94089, cmAssets: 45361, iaAssets: 48728,
  revenue: 365.0, cmRevenue: 271.7, iaRevenue: 91.9,
  adjEbitda: 170.4, netIncome: -42.1, cash: 440.8,
  fdso: 187.08, fundedClients: 1417, // thousands
  grossMargin: 0.896, cmYield: 0.00619, iaYield: 0.002125,
  sbc: 259.8, da: 7.4, interest: 0.891, otherIncome: 10.813,
  netDeposits: 6659, expansionRate: 0.035, cmMix: 0.204,
};

const HIST = {
  FY24: { revenue: 216.7, ebitda: 98.6, assets: 57601, cm: 29361, ia: 28240, clients: 854 },
  FY25: { revenue: 309.0, ebitda: 142.8, assets: 80175, cm: 42411, ia: 37764, clients: 1212 },
  FY26: { revenue: 365.0, ebitda: 170.4, assets: 94089, cm: 45361, ia: 48728, clients: 1417 },
};

// ─── Helpers ───
const fmt = (v, d = 1) => v >= 1000 ? `$${(v/1000).toFixed(1)}T` : v >= 1 ? `$${v.toFixed(d)}B` : `$${(v*1000).toFixed(0)}M`;
const fmtM = (v, d = 0) => `$${v.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}M`;
const fmtPct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
const fmtDollar = (v, d = 2) => `$${v.toFixed(d)}`;
const fmtK = (v) => `${v.toFixed(0)}K`;
const fmtX = (v, d = 1) => `${v.toFixed(d)}x`;

// ─── Slider Component ───
function Slider({ label, value, onChange, min, max, step, format = "pct", suffix = "", prefix = "" }) {
  const displayVal = format === "pct" ? fmtPct(value)
    : format === "dollar" ? fmtDollar(value)
    : format === "dollarK" ? `$${(value/1000).toFixed(0)}K`
    : format === "K" ? `${value.toFixed(0)}K`
    : format === "x" ? fmtX(value)
    : format === "number" ? `${prefix}${value.toFixed(step < 1 ? 1 : 0)}${suffix}`
    : `${value}`;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, color: C.lavender, fontWeight: 700, fontFamily: "monospace" }}>{displayVal}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: C.purple, height: 6, WebkitAppearance: "none", background: `linear-gradient(to right, ${C.purple} ${pct}%, ${C.border} ${pct}%)`, borderRadius: 3, outline: "none", cursor: "pointer" }}
      />
    </div>
  );
}

function NumberInput({ label, value, onChange, prefix = "$", suffix = "" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", background: C.cardAlt, borderRadius: 6, border: `1px solid ${C.border}`, padding: "6px 10px" }}>
        {prefix && <span style={{ color: C.textDim, marginRight: 4, fontSize: 14 }}>{prefix}</span>}
        <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)}
          style={{ flex: 1, background: "transparent", border: "none", color: C.lavender, fontSize: 16, fontWeight: 700, fontFamily: "monospace", outline: "none", width: "100%" }}
        />
        {suffix && <span style={{ color: C.textDim, marginLeft: 4, fontSize: 12 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function KPICard({ title, value, subtitle, color = C.lavender, small = false }) {
  return (
    <div style={{ background: C.card, borderRadius: 10, padding: small ? "12px 14px" : "16px 20px", border: `1px solid ${C.border}`, flex: 1, minWidth: small ? 120 : 150 }}>
      <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: small ? 20 : 28, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

// ─── Custom Tooltips ───
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.text }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {p.name === "EBITDA Margin" ? fmtPct(p.value, 1) : `$${p.value.toFixed(0)}M`}
        </div>
      ))}
    </div>
  );
}

function AUMTooltip({ active, payload, label }) {
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload;
  const total = (d.cm + d.ia).toFixed(1);
  return (
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.text }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ color: C.purpleLight, marginBottom: 2 }}>Cash Mgmt: ${d.cm}B</div>
      <div style={{ color: C.lavender, marginBottom: 2 }}>Investment Advisory: ${d.ia}B</div>
      <div style={{ color: C.accent, fontWeight: 700 }}>Total AUM: ${total}B</div>
      {d.aumGrowth != null && <div style={{ color: C.green, marginTop: 2 }}>YoY Growth: {fmtPct(d.aumGrowth, 1)}</div>}
    </div>
  );
}

function ClientsTooltip({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.text }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {p.name === "YoY Growth" ? fmtPct(p.value, 1) : `${typeof p.value === 'number' ? p.value.toLocaleString() : p.value}K`}
        </div>
      ))}
    </div>
  );
}

// ─── URL State Sharing ───
// Reads a numeric param from the URL hash. Returns fallback if not present.
function getHashParam(key, fallback) {
  try {
    const hash = window.location.hash.slice(1);
    if (!hash) return fallback;
    const params = new URLSearchParams(hash);
    const val = params.get(key);
    if (val === null) return fallback;
    const num = parseFloat(val);
    return isNaN(num) ? fallback : num;
  } catch { return fallback; }
}

// Short keys for URL compactness
const PARAM_MAP = {
  sp: "stockPrice", effr: "effr", fy29: "fy29Effr", w: "wacc", tg: "termGrowth",
  cm: "cmYieldBps", mix: "cmMix", exp: "expansionRate", tm: "termEbitdaMargin",
  dep: "newCustDeposits", ia: "iaReturn", dil: "dilution", pay: "payoutRate",
  opex: "opexExMktg", sm: "smEfficiency", gm: "grossMargin", tax: "taxRate", fcf: "fcfConversion",
};

// ─── Main Component ───
export default function WealthfrontDCF() {
  // Primary inputs — initialized from URL hash if present
  const [stockPrice, setStockPrice] = useState(() => getHashParam("sp", 8.00));
  const [effr, setEffr] = useState(() => getHashParam("effr", 3.64));
  const [fy29Effr, setFy29Effr] = useState(() => getHashParam("fy29", 3.60));
  const [wacc, setWacc] = useState(() => getHashParam("w", 0.13));
  const [termGrowth, setTermGrowth] = useState(() => getHashParam("tg", 0.03));
  const [cmYieldBps, setCmYieldBps] = useState(() => getHashParam("cm", 62));
  const [cmMix, setCmMix] = useState(() => getHashParam("mix", 0.35));
  const [expansionRate, setExpansionRate] = useState(() => getHashParam("exp", 0.055));
  const [termEbitdaMargin, setTermEbitdaMargin] = useState(() => getHashParam("tm", 0.63));

  // Secondary inputs — initialized from URL hash if present
  const hasHashParams = window.location.hash.length > 1;
  const [showSecondary, setShowSecondary] = useState(false);
  const [newCustDeposits, setNewCustDeposits] = useState(() => getHashParam("dep", 4000));
  const [iaReturn, setIaReturn] = useState(() => getHashParam("ia", 0.07));
  const [dilution, setDilution] = useState(() => getHashParam("dil", 0.01));
  const [payoutRate, setPayoutRate] = useState(() => getHashParam("pay", 0.50));
  const [opexExMktg, setOpexExMktg] = useState(() => getHashParam("opex", 0.35));
  const [smEfficiency, setSmEfficiency] = useState(() => getHashParam("sm", 125));
  const [grossMargin, setGrossMargin] = useState(() => getHashParam("gm", 0.90));
  const [taxRate, setTaxRate] = useState(() => getHashParam("tax", 0.21));
  const [fcfConversion, setFcfConversion] = useState(() => getHashParam("fcf", 0.85));

  // Share state: copied feedback
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const params = new URLSearchParams({
      sp: stockPrice, effr, fy29: fy29Effr, w: wacc, tg: termGrowth,
      cm: cmYieldBps, mix: cmMix, exp: expansionRate, tm: termEbitdaMargin,
      dep: newCustDeposits, ia: iaReturn, dil: dilution, pay: payoutRate,
      opex: opexExMktg, sm: smEfficiency, gm: grossMargin, tax: taxRate, fcf: fcfConversion,
    });
    const url = `${window.location.origin}${window.location.pathname}#${params}`;
    window.history.replaceState(null, "", url);
    // Clipboard: try modern API first, fall back to execCommand
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopy(url);
      });
    } else {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = (text) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Full Model Computation ───
  const model = useMemo(() => {
    const years = 10;
    const projYears = [];

    // Build EFFR curve: current → FY29 target, then hold
    const currentEffr = effr / 100;
    const targetEffr = fy29Effr / 100;
    const effrCurve = [];
    for (let i = 0; i < years; i++) {
      if (i < 3) {
        effrCurve.push(currentEffr + (targetEffr - currentEffr) * ((i + 1) / 3));
      } else {
        effrCurve.push(targetEffr);
      }
    }

    // CM yield: direct bps input, constant across projection
    const cmYield = cmYieldBps / 10000;
    const cmYields = effrCurve.map(() => cmYield);
    // CM market return ≈ EFFR (cash earns the risk-free rate)
    const cmReturns = effrCurve.map(e => e);
    const iaYield = 0.002125;

    // Revenue growth deceleration schedule for extended years (FY31-36, i=4..9)
    // Mirrors v8 Flat scenario: 12% → 9% → 7% → 5% → 3.5% → 3%
    const extendedGrowthRates = [0.12, 0.09, 0.07, 0.05, 0.035, 0.03];
    // Extended EBITDA margins ramp toward terminal
    const extendedEbitdaMargins = [0.60, 0.61, 0.62, 0.625, 0.63, 0.63];
    // Extended FCF conversion ramps
    const extendedFcfConversion = [0.82, 0.83, 0.84, 0.84, 0.85, 0.85];

    // Starting values from FY26
    let cmAssets = FY26.cmAssets;
    let iaAssets = FY26.iaAssets;
    let totalAssets = cmAssets + iaAssets;
    let clients = FY26.fundedClients;
    let fdso = FY26.fdso;
    let cash = FY26.cash;
    let prevRevenue = FY26.revenue;
    let prevClients = FY26.fundedClients;
    let sbc = 20; // normalized post-IPO

    for (let i = 0; i < years; i++) {
      const fy = `FY${27 + i}`;
      const isDetailed = i < 4; // FY27-30: bottom-up; FY31-36: top-down

      if (isDetailed) {
        // ─── Bottom-up projection (FY27-FY30) ───

        // CM mix: gradually moves from input toward stabilized
        const curCmMix = cmMix * (1 - i * 0.02);
        const iaMix = 1 - Math.max(curCmMix, 0.15);
        const actualCmMix = 1 - iaMix;

        // Client growth (approximate from new customer deposits)
        const impliedNewAccounts = newCustDeposits / 20; // assume ~$20K avg deposit for client count
        const newAccounts = impliedNewAccounts * (1 + i * 0.02);
        clients += newAccounts;

        // Existing customer deposits
        const existingDeposits = totalAssets * expansionRate;

        // New customer deposits: direct $ input
        const newDeposits = newCustDeposits;

        // Total net deposits
        const totalNetDeposits = existingDeposits + newDeposits;

        // Split by CM/IA
        const cmDeposits = totalNetDeposits * actualCmMix;
        const iaDeposits = totalNetDeposits * iaMix;

        // Market movement
        const cmMktMove = cmAssets * cmReturns[i];
        const iaMktMove = iaAssets * iaReturn;

        // New asset levels
        cmAssets = cmAssets + cmDeposits + cmMktMove;
        iaAssets = iaAssets + iaDeposits + iaMktMove;
        totalAssets = cmAssets + iaAssets;

        // Revenue
        const avgCm = (cmAssets + (cmAssets - cmDeposits - cmMktMove)) / 2;
        const avgIa = (iaAssets + (iaAssets - iaDeposits - iaMktMove)) / 2;
        const cmRevenue = avgCm * cmYields[i];
        const iaRevenue = avgIa * iaYield;
        const totalRevenue = cmRevenue + iaRevenue;

        // Blended yield
        const blendedYield = totalRevenue / ((totalAssets + (totalAssets - totalNetDeposits - cmMktMove - iaMktMove)) / 2);

        // Sales & Marketing: derived from deposit efficiency
        const salesMarketing = totalNetDeposits / smEfficiency;

        // OpEx: declines 1% per year from starting level through FY30
        const yearOpexExMktg = Math.max(opexExMktg - i * 0.01, 0.20);
        const opexExMktgAbs = totalRevenue * yearOpexExMktg;
        const grossProfit = totalRevenue * grossMargin;
        const totalOpex = opexExMktgAbs + salesMarketing;

        // EBIT
        const ebit = grossProfit - totalOpex;

        // Below the line
        const interestExpense = 0.891;
        const otherIncome = 10.813; // carried through all years per v8
        const interestIncome = cash > 0 ? cash * currentEffr : 0; // interest on cash balance
        const preTax = ebit - interestExpense + otherIncome + interestIncome;
        const tax = Math.max(0, preTax * taxRate);
        const netIncome = preTax - tax;

        // FDSO with dilution
        fdso = fdso * (1 + dilution);

        // EPS
        const eps = netIncome / fdso;

        // D&A and SBC (SBC scales with dilution: base 1% → ~$20M yr1)
        const da = 7.4 * Math.pow(1.10, i);
        const sbcScale = dilution > 0 ? dilution / 0.01 : 0;
        sbc = (20 + i * 2) * sbcScale;

        // Adj EBITDA (for display — adds back SBC and D&A)
        const adjEbitda = netIncome + interestExpense + tax + da + sbc;
        const ebitdaMargin = adjEbitda / totalRevenue;

        // UFCF: Adj. EBITDA × FCF conversion (standard sell-side convention)
        const ufcf = adjEbitda * fcfConversion;

        // Dividends
        const dividend = i >= 1 && netIncome > 0 ? netIncome * payoutRate / fdso : 0;

        // Cash balance: UFCF + interest income - dividends
        const divsPaid = i >= 1 && netIncome > 0 ? netIncome * payoutRate : 0;
        cash = cash + ufcf + interestIncome - divsPaid;

        const cashPerShare = cash / fdso;

        // Client growth YoY
        const clientGrowth = (clients - prevClients) / prevClients;

        projYears.push({
          fy, yr: i + 1,
          effr: effrCurve[i], cmYield: cmYields[i],
          cmAssets, iaAssets, totalAssets,
          clients: Math.round(clients), clientGrowth,
          totalRevenue, cmRevenue, iaRevenue, blendedYield,
          grossProfit, salesMarketing, totalOpex,
          ebit, netIncome, eps, fdso,
          adjEbitda, ebitdaMargin, da, sbc,
          ufcf, cash, cashPerShare, dividend, interestIncome,
          revenueGrowth: (totalRevenue - prevRevenue) / prevRevenue,
        });

        prevRevenue = totalRevenue;
        prevClients = clients;
      } else {
        // ─── Top-down extended projection (FY31-FY36) ───
        const extIdx = i - 4; // 0..5
        const revGrowth = extendedGrowthRates[extIdx];
        const totalRevenue = prevRevenue * (1 + revGrowth);
        const ebitdaMargin = extendedEbitdaMargins[extIdx];
        const adjEbitda = totalRevenue * ebitdaMargin;
        // Keep D&A, SBC growing
        const da = 7.4 * Math.pow(1.10, i);
        const sbcScale = dilution > 0 ? dilution / 0.01 : 0;
        sbc = (20 + i * 2) * sbcScale;

        // EBIT from EBITDA
        const ebit = adjEbitda - da - sbc;

        // UFCF: Adj. EBITDA × FCF conversion (consistent with detailed years)
        const ufcf = adjEbitda * fcfConversion;
        const interestExpense = 0.891;
        const otherIncome = 10.813;
        const interestIncome = cash > 0 ? cash * currentEffr : 0;
        const preTax = ebit - interestExpense + otherIncome + interestIncome;
        const tax = Math.max(0, preTax * taxRate);
        const netIncome = preTax - tax;

        fdso = fdso * (1 + dilution);
        const eps = netIncome / fdso;
        const dividend = netIncome > 0 ? netIncome * payoutRate / fdso : 0;
        const divsPaid = netIncome > 0 ? netIncome * payoutRate : 0;
        cash = cash + ufcf + interestIncome - divsPaid;
        const cashPerShare = cash / fdso;

        // Approximate asset growth using revenue growth as proxy
        totalAssets = totalAssets * (1 + revGrowth);
        cmAssets = totalAssets * 0.42; // approximate split
        iaAssets = totalAssets * 0.58;

        // Back into client count: grow at ~60% of revenue growth (deposits per client increase over time)
        const clientGrowthRate = revGrowth * 0.6;
        clients = clients * (1 + clientGrowthRate);

        const cmRevenue = totalRevenue * 0.65; // approximate split
        const iaRevenue = totalRevenue * 0.35;
        const blendedYield = totalRevenue / totalAssets;
        const grossProfit = totalRevenue * grossMargin;

        projYears.push({
          fy, yr: i + 1,
          effr: effrCurve[i], cmYield: cmYields[i],
          cmAssets, iaAssets, totalAssets,
          clients: Math.round(clients), clientGrowth: clientGrowthRate,
          totalRevenue, cmRevenue, iaRevenue, blendedYield,
          grossProfit, salesMarketing: 0, totalOpex: 0,
          ebit, netIncome, eps, fdso,
          adjEbitda, ebitdaMargin, da, sbc,
          ufcf, cash, cashPerShare, dividend, interestIncome,
          revenueGrowth: revGrowth,
        });

        prevRevenue = totalRevenue;
      }
    }

    // ─── DCF Calculation ───
    const pvFcfs = projYears.map((y, i) => y.ufcf / Math.pow(1 + wacc, i + 1));
    const sumPvFcf = pvFcfs.reduce((a, b) => a + b, 0);

    // Terminal value: Adj. EBITDA × FCF% (consistent with projection UFCF)
    const lastRevenue = projYears[years - 1].totalRevenue;
    const termRevenue = lastRevenue * (1 + termGrowth);
    const termEbitda = termRevenue * termEbitdaMargin;
    const termUfcf = termEbitda * fcfConversion;

    // Gordon Growth
    const gordonTV = termUfcf / (wacc - termGrowth);
    const pvGordonTV = gordonTV / Math.pow(1 + wacc, years);
    const gordonEV = sumPvFcf + pvGordonTV;
    const totalPvSbc = 0; // SBC handled within EBITDA bridge, no separate deduction

    const gordonEquity = gordonEV + FY26.cash;
    const gordonPrice = gordonEquity / FY26.fdso;

    // Implied multiples from Gordon
    const gordonImpliedPE = gordonPrice > 0 && projYears[3].eps > 0
      ? (gordonPrice - projYears[3].cashPerShare) / projYears[3].eps : 0;
    const gordonImpliedEvEbitda = gordonEV / projYears[3].adjEbitda;

    // Upside
    const upside = (gordonPrice / stockPrice - 1);

    // IRR: include cumulative dividends received over ~4yr hold
    const cumDivPerShare = projYears.slice(0, 4).reduce((sum, y) => sum + y.dividend, 0);
    const moic = (gordonPrice + cumDivPerShare) / stockPrice;
    const impliedIrr = Math.pow(Math.max(moic, 0.01), 1 / 4) - 1; // ~4yr hold

    // FY30 metrics for display
    const fy30 = projYears[3];

    // Valuation at current price
    const mktCap = stockPrice * FY26.fdso; // $M
    const tev = mktCap - FY26.cash; // TEV = mkt cap - cash (no debt)
    const fy27 = projYears[0];
    const fy28 = projYears[1];

    // FY26A multiples (from actuals)
    const fy26PE = FY26.netIncome > 0 ? (stockPrice - FY26.cash / FY26.fdso) / (FY26.netIncome / FY26.fdso) : null;
    const fy26EvEbitda = tev / FY26.adjEbitda;
    const fy26UfcfYield = (FY26.adjEbitda * 0.85) / tev; // approximate FY26 UFCF

    // FY27E multiples
    const fy27PE = fy27.eps > 0 ? (stockPrice - fy27.cashPerShare) / fy27.eps : null;
    const fy27EvEbitda = tev / fy27.adjEbitda;
    const fy27UfcfYield = fy27.ufcf / tev;

    // FY28E multiples
    const fy28PE = fy28.eps > 0 ? (stockPrice - fy28.cashPerShare) / fy28.eps : null;
    const fy28EvEbitda = tev / fy28.adjEbitda;
    const fy28UfcfYield = fy28.ufcf / tev;

    const valuation = {
      fdso: FY26.fdso, mktCap, cash: FY26.cash, tev,
      fy26: { pe: fy26PE, evEbitda: fy26EvEbitda, ufcfYield: fy26UfcfYield },
      fy27: { pe: fy27PE, evEbitda: fy27EvEbitda, ufcfYield: fy27UfcfYield },
      fy28: { pe: fy28PE, evEbitda: fy28EvEbitda, ufcfYield: fy28UfcfYield },
    };

    return {
      projYears,
      gordonPrice, gordonEV, gordonEquity, gordonTV, pvGordonTV, sumPvFcf, totalPvSbc,
      gordonImpliedPE, gordonImpliedEvEbitda,
      upside, moic, impliedIrr, fy30, cumDivPerShare, valuation,
    };
  }, [stockPrice, effr, fy29Effr, wacc, termGrowth, cmYieldBps, cmMix, expansionRate,
      termEbitdaMargin, newCustDeposits, iaReturn, dilution, payoutRate,
      opexExMktg, smEfficiency, grossMargin, taxRate, fcfConversion]);

  // ─── Chart Data ───
  const chartData = useMemo(() => {
    const hist = [
      { fy: "FY24", revenue: 216.7, ebitda: 98.6, margin: 0.455, revGrowth: null, assets: 57.6, cm: 29.4, ia: 28.2, clients: 854, clientGrowth: null, aumGrowth: null },
      { fy: "FY25", revenue: 309.0, ebitda: 142.8, margin: 0.462, revGrowth: (309.0 - 216.7) / 216.7, assets: 80.2, cm: 42.4, ia: 37.8, clients: 1212, clientGrowth: (1212 - 854) / 854, aumGrowth: (80.2 - 57.6) / 57.6 },
      { fy: "FY26", revenue: 365.0, ebitda: 170.4, margin: 0.467, revGrowth: (365.0 - 309.0) / 309.0, assets: 94.1, cm: 45.4, ia: 48.7, clients: 1417, clientGrowth: (1417 - 1212) / 1212, aumGrowth: (94.1 - 80.2) / 80.2 },
    ];
    const proj = model.projYears.map((y, idx) => {
      const prevAssets = idx === 0 ? 94089 : model.projYears[idx - 1].totalAssets;
      const aumGrowth = (y.totalAssets - prevAssets) / prevAssets;
      return {
        fy: y.fy, revenue: +y.totalRevenue.toFixed(1), ebitda: +y.adjEbitda.toFixed(1),
        margin: y.ebitdaMargin, revGrowth: y.revenueGrowth,
        assets: +(y.totalAssets / 1000).toFixed(1),
        cm: +(y.cmAssets / 1000).toFixed(1), ia: +(y.iaAssets / 1000).toFixed(1),
        clients: y.clients, clientGrowth: y.clientGrowth, aumGrowth, projected: true,
      };
    });
    return [...hist, ...proj];
  }, [model]);

  const rateData = useMemo(() => {
    return model.projYears.map(y => ({
      fy: y.fy,
      effr: +(y.effr * 100).toFixed(2),
      cmPayout: +((y.effr - y.cmYield) * 100).toFixed(2),
    }));
  }, [model]);

  // ─── Sensitivity Table ───
  const sensitivity = useMemo(() => {
    const waccVals = [0.10, 0.11, 0.12, 0.13, 0.14, 0.15];
    const tgVals = [0.02, 0.025, 0.03, 0.035, 0.04];
    return tgVals.map(tg => ({
      tg,
      values: waccVals.map(w => {
        const pvFcfs = model.projYears.map((y, i) => y.ufcf / Math.pow(1 + w, i + 1));
        const sum = pvFcfs.reduce((a, b) => a + b, 0);
        const tv = model.projYears[9].ufcf * (1 + tg) / (w - tg);
        const pvTv = tv / Math.pow(1 + w, 10);
        return ((sum + pvTv + FY26.cash) / FY26.fdso);
      })
    }));
  }, [model]);

  const inputPanel = (
    <div style={{ width: 300, flexShrink: 0, background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 16 }}>Market Inputs</div>
      <NumberInput label="Stock Price" value={stockPrice} onChange={setStockPrice} />
      <NumberInput label="Current EFFR" value={effr} onChange={setEffr} suffix="%" prefix="" />
      <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 16 }}>Primary Assumptions</div>
      <Slider label="FY29 EFFR Target" value={fy29Effr} onChange={setFy29Effr} min={1.0} max={6.0} step={0.1} format="number" suffix="%" />
      <Slider label="CM Yield on Avg Assets" value={cmYieldBps} onChange={setCmYieldBps} min={20} max={100} step={1} format="number" suffix=" bps" />
      <Slider label="CM Deposit Mix" value={cmMix} onChange={setCmMix} min={0.10} max={0.65} step={0.01} format="pct" />
      <Slider label="Expansion Rate" value={expansionRate} onChange={setExpansionRate} min={0.02} max={0.12} step={0.005} format="pct" />
      <Slider label="Terminal EBITDA Margin" value={termEbitdaMargin} onChange={setTermEbitdaMargin} min={0.45} max={0.75} step={0.01} format="pct" />
      <Slider label="WACC" value={wacc} onChange={setWacc} min={0.08} max={0.18} step={0.005} format="pct" />
      <Slider label="Terminal Growth" value={termGrowth} onChange={setTermGrowth} min={0.01} max={0.05} step={0.005} format="pct" />

      <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
      <button onClick={() => setShowSecondary(!showSecondary)}
        style={{ width: "100%", background: C.cardAlt, border: `1px solid ${C.border}`, color: C.textMuted, padding: "8px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>
        {showSecondary ? "▾ Hide" : "▸ Show"} Secondary Inputs
      </button>

      {showSecondary && (
        <div style={{ marginTop: 16 }}>
          <Slider label="New Customer Deposits/Yr" value={newCustDeposits} onChange={setNewCustDeposits} min={0} max={10000} step={100} format="number" prefix="$" suffix="M" />
          <Slider label="IA Market Return" value={iaReturn} onChange={setIaReturn} min={0.03} max={0.12} step={0.005} format="pct" />
          <Slider label="Annual FDSO Dilution" value={dilution} onChange={setDilution} min={0} max={0.03} step={0.001} format="pct" />
          <Slider label="Dividend Payout Rate" value={payoutRate} onChange={setPayoutRate} min={0} max={1.0} step={0.05} format="pct" />
          <Slider label="OpEx ex-Mktg FY27 (% Rev)" value={opexExMktg} onChange={setOpexExMktg} min={0.25} max={0.50} step={0.01} format="pct" />
          <Slider label="S&M Efficiency (Net Dep/$M)" value={smEfficiency} onChange={setSmEfficiency} min={50} max={350} step={5} format="number" prefix="$" suffix="M" />
          <Slider label="Gross Margin" value={grossMargin} onChange={setGrossMargin} min={0.80} max={0.95} step={0.01} format="pct" />
          <Slider label="Effective Tax Rate" value={taxRate} onChange={setTaxRate} min={0.15} max={0.30} step={0.01} format="pct" />
          <Slider label="FCF Conversion %" value={fcfConversion} onChange={setFcfConversion} min={0.65} max={0.95} step={0.01} format="pct" />
        </div>
      )}
    </div>
  );

  const waccVals = [0.10, 0.11, 0.12, 0.13, 0.14, 0.15];

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>Wealthfront DCF Model</div>
        <span style={{ background: C.purpleDark, color: C.lavender, padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>WLTH · INTERNAL</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: C.textDim }}>10-Year DCF with Gordon Growth Terminal Value · FY Ends Jan 31</div>
            <div style={{ fontSize: 10, color: C.textDim, fontStyle: "italic", marginTop: 2 }}>Independent analysis, not affiliated with Wealthfront.</div>
          </div>
          <button onClick={handleShare}
            style={{ background: copied ? C.greenDark : C.purpleDark, border: `1px solid ${copied ? C.green : C.purple}`, color: copied ? C.green : C.lavender, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, whiteSpace: "nowrap", transition: "all 0.2s ease" }}>
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {inputPanel}

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* KPI Row */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <KPICard title="DCF Implied Price" value={fmtDollar(model.gordonPrice)} subtitle="Gordon Growth method" color={model.gordonPrice > stockPrice ? C.green : C.red} />
            <KPICard title="Upside / Downside" value={`${model.upside >= 0 ? "+" : ""}${(model.upside * 100).toFixed(0)}%`} subtitle={`vs ${fmtDollar(stockPrice)} entry`} color={model.upside >= 0 ? C.green : C.red} />
            <KPICard title="Implied P/E (Ex-Cash)" value={model.gordonImpliedPE > 0 ? fmtX(model.gordonImpliedPE) : "N/M"} subtitle="FY30E earnings" color={C.lavender} />
            <KPICard title="Implied EV/EBITDA" value={fmtX(model.gordonImpliedEvEbitda)} subtitle="FY30E adj. EBITDA" color={C.lavender} />
            <KPICard title="~4Yr IRR" value={fmtPct(model.impliedIrr)} subtitle={`${fmtX(model.moic)} MOIC incl. divs`} color={model.impliedIrr > 0 ? C.green : C.red} />
            <KPICard title="Implied Take Rate" value={fmtPct(model.fy30.blendedYield, 2)} subtitle="FY30E Rev / Avg AUM" color={C.amber} />
          </div>

          {/* FY30 Snapshot */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <KPICard small title="FY30 Revenue" value={fmtM(model.fy30.totalRevenue)} color={C.accent} />
            <KPICard small title="FY30 EBITDA" value={fmtM(model.fy30.adjEbitda)} subtitle={fmtPct(model.fy30.ebitdaMargin) + " margin"} color={C.accent} />
            <KPICard small title="FY30 EPS" value={fmtDollar(model.fy30.eps)} color={C.accent} />
            <KPICard small title="FY30 AUM" value={`$${(model.fy30.totalAssets / 1000).toFixed(0)}B`} color={C.accent} />
            <KPICard small title="Cash/Share" value={fmtDollar(model.fy30.cashPerShare)} subtitle="as of Jan 31, 2031" color={C.accent} />
          </div>

          {/* Valuation Multiples */}
          <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Valuation at Current Price</div>
            <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 100 }}>
                <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Shares (FDSO)</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{model.valuation.fdso.toFixed(1)}M</div>
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Market Cap</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{fmtM(model.valuation.mktCap)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Cash Balance</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{fmtM(model.valuation.cash)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>TEV</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{fmtM(model.valuation.tev)}</div>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: "6px 10px", color: C.textDim, textAlign: "left", fontSize: 10, fontWeight: 600 }}>Multiple</th>
                    <th style={{ padding: "6px 10px", color: C.textMuted, textAlign: "center", fontSize: 10, fontWeight: 600 }}>FY26A</th>
                    <th style={{ padding: "6px 10px", color: C.textMuted, textAlign: "center", fontSize: 10, fontWeight: 600 }}>FY27E</th>
                    <th style={{ padding: "6px 10px", color: C.textMuted, textAlign: "center", fontSize: 10, fontWeight: 600 }}>FY28E</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${C.bg}` }}>
                    <td style={{ padding: "5px 10px", color: C.textMuted, fontSize: 11, fontWeight: 600 }}>P/E (Ex-Cash)</td>
                    <td style={{ padding: "5px 10px", color: C.accent, textAlign: "center", fontFamily: "monospace", fontSize: 12 }}>{model.valuation.fy26.pe !== null ? fmtX(model.valuation.fy26.pe) : "N/M"}</td>
                    <td style={{ padding: "5px 10px", color: C.accent, textAlign: "center", fontFamily: "monospace", fontSize: 12 }}>{model.valuation.fy27.pe !== null ? fmtX(model.valuation.fy27.pe) : "N/M"}</td>
                    <td style={{ padding: "5px 10px", color: C.accent, textAlign: "center", fontFamily: "monospace", fontSize: 12 }}>{model.valuation.fy28.pe !== null ? fmtX(model.valuation.fy28.pe) : "N/M"}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${C.bg}` }}>
                    <td style={{ padding: "5px 10px", color: C.textMuted, fontSize: 11, fontWeight: 600 }}>EV / Adj. EBITDA</td>
                    <td style={{ padding: "5px 10px", color: C.accent, textAlign: "center", fontFamily: "monospace", fontSize: 12 }}>{fmtX(model.valuation.fy26.evEbitda)}</td>
                    <td style={{ padding: "5px 10px", color: C.accent, textAlign: "center", fontFamily: "monospace", fontSize: 12 }}>{fmtX(model.valuation.fy27.evEbitda)}</td>
                    <td style={{ padding: "5px 10px", color: C.accent, textAlign: "center", fontFamily: "monospace", fontSize: 12 }}>{fmtX(model.valuation.fy28.evEbitda)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "5px 10px", color: C.textMuted, fontSize: 11, fontWeight: 600 }}>UFCF Yield</td>
                    <td style={{ padding: "5px 10px", color: C.accent, textAlign: "center", fontFamily: "monospace", fontSize: 12 }}>{fmtPct(model.valuation.fy26.ufcfYield, 1)}</td>
                    <td style={{ padding: "5px 10px", color: C.accent, textAlign: "center", fontFamily: "monospace", fontSize: 12 }}>{fmtPct(model.valuation.fy27.ufcfYield, 1)}</td>
                    <td style={{ padding: "5px 10px", color: C.accent, textAlign: "center", fontFamily: "monospace", fontSize: 12 }}>{fmtPct(model.valuation.fy28.ufcfYield, 1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart: Revenue & YoY Growth */}
          <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Revenue ($M) & YoY Growth</div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="fy" tick={{ fontSize: 10, fill: C.textDim }} />
                <YAxis tick={{ fontSize: 10, fill: C.textDim }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.textDim }} tickFormatter={v => fmtPct(v, 0)} domain={[0, 0.6]} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload) return null;
                  return (
                    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.text }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                      {payload.map((p, i) => (
                        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
                          {p.name}: {p.name === "YoY Growth" ? fmtPct(p.value, 1) : `$${p.value.toFixed(0)}M`}
                        </div>
                      ))}
                    </div>
                  );
                }} />
                <Bar dataKey="revenue" name="Revenue" fill={C.purpleLight} radius={[2,2,0,0]} />
                <Line dataKey="revGrowth" name="YoY Growth" yAxisId="right" stroke={C.green} strokeWidth={2} dot={{ r: 3, fill: C.green }} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Chart: Adj. EBITDA & Margin */}
          <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Adj. EBITDA ($M) & Margin</div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="fy" tick={{ fontSize: 10, fill: C.textDim }} />
                <YAxis tick={{ fontSize: 10, fill: C.textDim }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.textDim }} tickFormatter={v => fmtPct(v, 0)} domain={[0, 0.8]} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload) return null;
                  return (
                    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.text }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                      {payload.map((p, i) => (
                        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
                          {p.name}: {p.name === "EBITDA Margin" ? fmtPct(p.value, 1) : `$${p.value.toFixed(0)}M`}
                        </div>
                      ))}
                    </div>
                  );
                }} />
                <Bar dataKey="ebitda" name="Adj. EBITDA" fill={C.purple} radius={[2,2,0,0]} />
                <Line dataKey="margin" name="EBITDA Margin" yAxisId="right" stroke={C.green} strokeWidth={2} dot={{ r: 3, fill: C.green }} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Chart: Platform AUM */}
          <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Platform AUM ($B) — CM vs IA & YoY Growth</div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="fy" tick={{ fontSize: 10, fill: C.textDim }} />
                <YAxis tick={{ fontSize: 10, fill: C.textDim }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.textDim }} tickFormatter={v => fmtPct(v, 0)} domain={[0, 0.5]} />
                <Tooltip content={<AUMTooltip />} />
                <Bar dataKey="cm" name="Cash Mgmt" stackId="a" fill={C.purpleDark} radius={[0,0,0,0]} />
                <Bar dataKey="ia" name="Investment Advisory" stackId="a" fill={C.purpleLight} radius={[2,2,0,0]} />
                <Line dataKey="aumGrowth" name="AUM Growth" yAxisId="right" stroke={C.green} strokeWidth={2} dot={{ r: 3, fill: C.green }} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Chart: Funded Clients with Growth % */}
          <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Funded Clients (K) & YoY Growth</div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="fy" tick={{ fontSize: 10, fill: C.textDim }} />
                <YAxis tick={{ fontSize: 10, fill: C.textDim }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.textDim }} tickFormatter={v => fmtPct(v, 0)} domain={[0, 0.5]} />
                <Tooltip content={<ClientsTooltip />} />
                <Bar dataKey="clients" name="Funded Clients" fill={C.lavender} radius={[2,2,0,0]} />
                <Line dataKey="clientGrowth" name="YoY Growth" yAxisId="right" stroke={C.amber} strokeWidth={2} dot={{ r: 3, fill: C.amber }} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Chart: EFFR & Implied CM Payout Rate */}
          <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>EFFR & Implied CM Payout Rate (%)</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={rateData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="fy" tick={{ fontSize: 10, fill: C.textDim }} />
                <YAxis tick={{ fontSize: 10, fill: C.textDim }} tickFormatter={v => `${v}%`} domain={['dataMin - 0.2', 'dataMax + 0.2']} />
                <Tooltip contentStyle={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, color: C.text }}
                  formatter={(v) => [`${v}%`]} />
                <Line dataKey="effr" name="EFFR" stroke={C.amber} strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Line dataKey="cmPayout" name="CM Payout Rate" stroke={C.green} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* DCF Waterfall */}
          <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>DCF Value Bridge</div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", justifyContent: "center", height: 120 }}>
              {[
                { label: "PV of FCFs", value: model.sumPvFcf, color: C.purple },
                { label: "PV of Terminal", value: model.pvGordonTV, color: C.purpleLight },
                { label: "= Enterprise Value", value: model.gordonEV, color: C.lavender },
                { label: "+ Cash", value: FY26.cash, color: C.green },
                { label: "= Equity Value", value: model.gordonEquity, color: C.accent },
                { label: `÷ ${FY26.fdso.toFixed(0)}M sh`, value: model.gordonPrice, isPrice: true, color: C.green },
              ].map((item, i) => {
                const maxVal = model.gordonEV + FY26.cash;
                const h = item.isPrice ? 100 : Math.max(20, (Math.abs(item.value) / maxVal) * 100);
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: item.color, marginBottom: 4 }}>
                      {item.negative ? `-${fmtM(item.value)}` : item.isPrice ? fmtDollar(item.value) : fmtM(item.value)}
                    </div>
                    <div style={{ width: "100%", height: h, background: `linear-gradient(180deg, ${item.color}88, ${item.color}44)`, borderRadius: "4px 4px 0 0", border: `1px solid ${item.color}66` }} />
                    <div style={{ fontSize: 9, color: C.textDim, marginTop: 4, textAlign: "center" }}>{item.label}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: C.textDim, textAlign: "center", marginTop: 8 }}>
              Terminal Value = {fmtPct(model.pvGordonTV / model.gordonEV)} of Enterprise Value
            </div>
          </div>

          {/* Sensitivity Table */}
          <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>WACC vs Terminal Growth Sensitivity (Implied Price)</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "6px 8px", color: C.textDim, textAlign: "left", fontSize: 10 }}>TG ↓ / WACC →</th>
                    {waccVals.map(w => (
                      <th key={w} style={{ padding: "6px 8px", color: w === wacc ? C.lavender : C.textDim, textAlign: "center", fontSize: 10, fontWeight: w === wacc ? 700 : 400 }}>{fmtPct(w, 0)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sensitivity.map((row, ri) => (
                    <tr key={ri}>
                      <td style={{ padding: "5px 8px", color: row.tg === termGrowth ? C.lavender : C.textDim, fontWeight: row.tg === termGrowth ? 700 : 400, fontSize: 11 }}>{fmtPct(row.tg, 1)}</td>
                      {row.values.map((v, ci) => {
                        const isBase = waccVals[ci] === wacc && row.tg === termGrowth;
                        const isAbove = v > stockPrice;
                        return (
                          <td key={ci} style={{
                            padding: "5px 8px", textAlign: "center", fontFamily: "monospace", fontSize: 12, fontWeight: isBase ? 800 : 500,
                            color: isBase ? C.text : isAbove ? C.green : C.red,
                            background: isBase ? C.purpleDark + "88" : "transparent",
                            borderRadius: isBase ? 4 : 0,
                          }}>
                            {fmtDollar(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Projection Table */}
          <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Projection Summary</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: "6px 8px", color: C.textDim, textAlign: "left", fontSize: 10 }}>Metric</th>
                    <th style={{ padding: "6px 8px", color: C.textDim, textAlign: "center", fontSize: 10, borderRight: `1px solid ${C.border}` }}>FY26A</th>
                    {model.projYears.slice(0, 8).map(y => (
                      <th key={y.fy} style={{ padding: "6px 8px", color: C.textMuted, textAlign: "center", fontSize: 10 }}>{y.fy}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "AUM ($B)", fy26: "94.1", fn: y => (y.totalAssets / 1000).toFixed(0) },
                    { label: "Revenue ($M)", fy26: "365", fn: y => y.totalRevenue.toFixed(0) },
                    { label: "  % Growth", fy26: "18%", fn: y => fmtPct(y.revenueGrowth, 1), dim: true },
                    { label: "Adj. EBITDA ($M)", fy26: "170", fn: y => y.adjEbitda.toFixed(0) },
                    { label: "  % Margin", fy26: "47%", fn: y => fmtPct(y.ebitdaMargin, 1), dim: true },
                    { label: "EPS", fy26: "($0.22)", fn: y => y.eps >= 0 ? fmtDollar(y.eps) : `(${fmtDollar(-y.eps)})` },
                    { label: "UFCF ($M)", fy26: "151", fn: y => y.ufcf.toFixed(0) },
                    { label: "Cash ($M)", fy26: "441", fn: y => y.cash.toFixed(0) },
                    { label: "Take Rate (Rev/AUM)", fy26: "0.42%", fn: y => fmtPct(y.blendedYield, 2), dim: true },
                    { label: "Clients (K)", fy26: "1,417", fn: y => y.clients.toLocaleString() },
                  ].map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: `1px solid ${C.bg}` }}>
                      <td style={{ padding: "4px 8px", color: row.dim ? C.textDim : C.textMuted, fontSize: 10, fontWeight: row.dim ? 400 : 600 }}>{row.label}</td>
                      <td style={{ padding: "4px 8px", color: C.textDim, textAlign: "center", fontSize: 10, fontFamily: "monospace", borderRight: `1px solid ${C.border}` }}>{row.fy26}</td>
                      {model.projYears.slice(0, 8).map(y => (
                        <td key={y.fy} style={{ padding: "4px 8px", color: row.dim ? C.textDim : C.accent, textAlign: "center", fontSize: 10, fontFamily: "monospace" }}>{row.fn(y)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ fontSize: 10, color: C.textDim, marginTop: 12, textAlign: "center" }}>
            Model based on Wealthfront FY26 10-K actuals. All projections are estimates. Not financial advice. · Built with data from v7 model.
          </div>
        </div>
      </div>
    </div>
  );
}
