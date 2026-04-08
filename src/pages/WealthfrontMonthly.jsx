import { useMemo } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from "recharts";
import { Link } from "react-router-dom";

const C = {
  bg: "#0C0816", card: "#16112A", cardAlt: "#1E1735",
  purple: "#4B2AAD", purpleLight: "#7C5CDB", purpleDark: "#2A1064",
  lavender: "#A78BFA", accent: "#C4B5FD",
  green: "#34D399", greenDark: "#059669",
  red: "#F87171", redDark: "#DC2626",
  amber: "#FBBF24",
  text: "#F3F0FF", textMuted: "#9B8FC7", textDim: "#6B5F8A",
  border: "#2D2548", borderLight: "#3D3360",
};

// Monthly metrics — trailing 16 months through March 2026
// cmDep/iaDep: CM/IA deposit splits where reported in monthly metrics releases
const MONTHLY = [
  { month: "Dec '24", platform: 78487, cm: 42088, ia: 36400, deposits: 874,  clients: 1189, newClients: null, cmDep: null, iaDep: null },
  { month: "Jan '25", platform: 80175, cm: 42411, ia: 37764, deposits: 782,  clients: 1212, newClients: 23, cmDep: null, iaDep: null },
  { month: "Feb '25", platform: 81251, cm: 43281, ia: 37970, deposits: 1090, clients: 1229, newClients: 17, cmDep: null, iaDep: null },
  { month: "Mar '25", platform: 81355, cm: 44311, ia: 37044, deposits: 1203, clients: 1246, newClients: 17, cmDep: 1030, iaDep: 173 },
  { month: "Apr '25", platform: 80858, cm: 43774, ia: 37085, deposits: -503, clients: 1264, newClients: 18, cmDep: null, iaDep: null },
  { month: "May '25", platform: 83904, cm: 44935, ia: 38969, deposits: 1412, clients: 1279, newClients: 15, cmDep: null, iaDep: null },
  { month: "Jun '25", platform: 86483, cm: 45706, ia: 40777, deposits: 1004, clients: 1295, newClients: 16, cmDep: null, iaDep: null },
  { month: "Jul '25", platform: 88175, cm: 46579, ia: 41596, deposits: 1246, clients: 1318, newClients: 23, cmDep: null, iaDep: null },
  { month: "Aug '25", platform: 90192, cm: 47243, ia: 42949, deposits: 1006, clients: 1342, newClients: 24, cmDep: null, iaDep: null },
  { month: "Sep '25", platform: 92025, cm: 47381, ia: 44644, deposits: 513,  clients: 1364, newClients: 22, cmDep: null, iaDep: null },
  { month: "Oct '25", platform: 92821, cm: 47011, ia: 45811, deposits: 49,   clients: 1378, newClients: 14, cmDep: null, iaDep: null },
  { month: "Nov '25", platform: 93010, cm: 46802, ia: 46208, deposits: 95,   clients: 1390, newClients: 12, cmDep: null, iaDep: null },
  { month: "Dec '25", platform: 93040, cm: 46200, ia: 46840, deposits: -208, clients: 1402, newClients: 12, cmDep: null, iaDep: null },
  { month: "Jan '26", platform: 94106, cm: 45361, ia: 48745, deposits: -247, clients: 1417, newClients: 15, cmDep: null, iaDep: null },
  { month: "Feb '26", platform: 95213, cm: 45215, ia: 49998, deposits: 271,  clients: 1429, newClients: 12, cmDep: -145, iaDep: 416 },
  { month: "Mar '26", platform: 93187, cm: 45459, ia: 47728, deposits: 596,  clients: 1443, newClients: 14, cmDep: 244, iaDep: 352 },
];

const fmtM = (v) => `$${v.toLocaleString()}M`;

export default function WealthfrontMonthly() {
  const latest = MONTHLY[MONTHLY.length - 1];
  const prev = MONTHLY[MONTHLY.length - 2];
  const recent3 = MONTHLY.slice(-3);
  const avg3mo = recent3.reduce((s, m) => s + m.deposits, 0) / 3;
  const annualized = avg3mo * 12;

  return (
    <div style={{
      background: C.bg, color: C.text, minHeight: "100vh",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 16 }}>
        <Link to="/wealthfront" style={{ color: C.textMuted, textDecoration: "none", fontSize: 13 }}>← DCF Model</Link>
        <div style={{ fontSize: 11, color: C.textDim }}>|</div>
        <span style={{ background: C.purple, color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>WLTH</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Monthly Metrics Tracker</span>
        <span style={{ fontSize: 11, color: C.textDim, marginLeft: "auto" }}>Updated through {latest.month}</span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>

        {/* KPI summary cards */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { label: "Platform AUM", value: `$${(latest.platform / 1000).toFixed(1)}B`, delta: `${((latest.platform / prev.platform - 1) * 100).toFixed(1)}% MoM`, neg: latest.platform < prev.platform },
            { label: "CM Assets", value: `$${(latest.cm / 1000).toFixed(1)}B`, delta: `${((latest.cm / prev.cm - 1) * 100).toFixed(1)}% MoM`, neg: latest.cm < prev.cm },
            { label: "IA Assets", value: `$${(latest.ia / 1000).toFixed(1)}B`, delta: `${((latest.ia / prev.ia - 1) * 100).toFixed(1)}% MoM`, neg: latest.ia < prev.ia },
            { label: "Net Deposits", value: fmtM(latest.deposits), delta: `vs ${fmtM(prev.deposits)} prior`, neg: latest.deposits < 0 },
            { label: "Funded Clients", value: `${(latest.clients / 1000).toFixed(2)}M`, delta: `+${latest.newClients}K net new`, neg: false },
            { label: "3-Mo Dep Run Rate", value: `$${(annualized / 1000).toFixed(1)}B/yr`, delta: `$${avg3mo.toFixed(0)}M/mo avg`, neg: annualized < 0 },
          ].map(({ label, value, delta, neg }) => (
            <div key={label} style={{ flex: "1 1 150px", padding: "10px 14px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{value}</div>
              <div style={{ fontSize: 10, color: neg ? C.red : C.green }}>{delta}</div>
            </div>
          ))}
        </div>

        {/* Chart 1: Monthly Platform Assets — CM/IA stacked */}
        <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Platform Assets ($B) — CM vs IA</div>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 12 }}>End-of-month balances · Stacked by product</div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={MONTHLY} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: C.textDim }} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: C.textDim }} tickFormatter={v => `$${(v / 1000).toFixed(0)}B`} domain={[0, 'auto']} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const d = MONTHLY.find(m => m.month === label);
                if (!d) return null;
                return (
                  <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.text }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                    <div style={{ color: C.green, fontWeight: 700 }}>Total: ${(d.platform / 1000).toFixed(1)}B</div>
                    <div style={{ color: C.accent, marginTop: 2 }}>CM: ${(d.cm / 1000).toFixed(1)}B</div>
                    <div style={{ color: C.purpleLight }}>IA: ${(d.ia / 1000).toFixed(1)}B</div>
                  </div>
                );
              }} />
              <Area dataKey="cm" stackId="1" fill={C.purpleDark} fillOpacity={0.7} stroke={C.purpleDark} strokeWidth={1.5} name="cm" />
              <Area dataKey="ia" stackId="1" fill={C.purpleLight} fillOpacity={0.5} stroke={C.purpleLight} strokeWidth={1.5} name="ia" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Monthly Net Deposits — total bars + CM/IA split */}
        <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Monthly Net Deposits ($M) — CM vs IA Split</div>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 12 }}>Solid bar = total · Stacked CM/IA where reported (Mar '25, Feb '26, Mar '26)</div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={MONTHLY.slice(1).map(m => m.cmDep !== null
              ? { month: m.month, cmDep: m.cmDep, iaDep: m.iaDep, deposits: null }
              : { month: m.month, cmDep: null, iaDep: null, deposits: m.deposits }
            )} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: C.textDim }} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: C.textDim }} tickFormatter={v => v.toLocaleString()} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const d = MONTHLY.find(m => m.month === label);
                if (!d) return null;
                return (
                  <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.text }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                    <div style={{ color: d.deposits >= 0 ? C.green : C.red, fontWeight: 700 }}>Total: {fmtM(d.deposits)}</div>
                    {d.cmDep !== null && (
                      <>
                        <div style={{ color: C.accent, marginTop: 2 }}>CM: {fmtM(d.cmDep)}</div>
                        <div style={{ color: C.purpleLight }}>IA: {fmtM(d.iaDep)}</div>
                      </>
                    )}
                  </div>
                );
              }} />
              {/* Total deposits bar — only for months without split data */}
              <Bar dataKey="deposits" name="Total Net Deposits" fill={C.lavender} fillOpacity={0.7} radius={[2, 2, 0, 0]} />
              {/* Stacked CM + IA for months with split data */}
              <Bar dataKey="cmDep" name="CM Deposits" stackId="split" fill={C.purpleDark} fillOpacity={0.9} radius={[0, 0, 0, 0]} />
              <Bar dataKey="iaDep" name="IA Deposits" stackId="split" fill={C.purpleLight} fillOpacity={0.9} radius={[2, 2, 0, 0]} />
              {/* Zero reference line */}
              <Line dataKey={() => 0} stroke={C.textDim} strokeWidth={1} dot={false} strokeDasharray="3 3" activeDot={false} legendType="none" />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Deposit summary cards */}
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px", padding: "10px 14px", background: C.cardAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>3-Mo Avg (Jan–Mar '26)</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>${avg3mo.toFixed(0)}M<span style={{ fontSize: 11, color: C.textDim, fontWeight: 400 }}>/mo</span></div>
              <div style={{ fontSize: 10, color: C.textMuted }}>Annualized: <span style={{ color: C.accent, fontWeight: 700 }}>${(annualized / 1000).toFixed(1)}B</span></div>
            </div>
            <div style={{ flex: "1 1 200px", padding: "10px 14px", background: C.cardAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Deposit Composition (Mar '26)</div>
              <div style={{ fontSize: 12, color: C.text, marginTop: 4 }}>
                <span style={{ fontWeight: 700, fontFamily: "monospace" }}>$244M</span> <span style={{ color: C.textMuted }}>CM</span>
                {" + "}
                <span style={{ fontWeight: 700, fontFamily: "monospace" }}>$352M</span> <span style={{ color: C.textMuted }}>IA</span>
                {" = "}
                <span style={{ fontWeight: 700, fontFamily: "monospace" }}>$596M</span>
              </div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>CM mix: 40.9% · IA mix: 59.1%</div>
            </div>
            <div style={{ flex: "1 1 200px", padding: "10px 14px", background: C.cardAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>YoY (Mar '26 vs Mar '25)</div>
              <div style={{ fontSize: 12, color: C.text, marginTop: 4 }}>
                <span style={{ fontWeight: 700, fontFamily: "monospace" }}>$596M</span> <span style={{ color: C.textMuted }}>vs</span> <span style={{ fontWeight: 700, fontFamily: "monospace" }}>$1,203M</span>
              </div>
              <div style={{ fontSize: 10, color: C.red, marginTop: 2 }}>-50.5% YoY · CM down from $1,030M to $244M</div>
            </div>
          </div>
        </div>

        {/* Chart 3: Funded Clients + Net New */}
        <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Funded Clients (K) & Net New Clients</div>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 12 }}>Total funded accounts (area) · Monthly net additions (bars)</div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={MONTHLY.slice(1)} margin={{ top: 5, right: 40, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: C.textDim }} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: C.textDim }} tickFormatter={v => `${(v / 1000).toFixed(1)}M`} domain={[1100, 'auto']} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.textDim }} tickFormatter={v => `${v}K`} domain={[0, 'auto']} />
              <Tooltip contentStyle={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, color: C.text }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = MONTHLY.find(m => m.month === label);
                  if (!d) return null;
                  const prevIdx = MONTHLY.indexOf(d) - 1;
                  const yoyMonth = MONTHLY.find(m => {
                    const [mName, mYr] = d.month.split(" '");
                    const yoyYr = String(parseInt(mYr) - 1);
                    return m.month === `${mName} '${yoyYr}`;
                  });
                  return (
                    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.text }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                      <div>Funded Clients: <span style={{ color: C.accent, fontWeight: 700 }}>{(d.clients / 1000).toFixed(3)}M</span></div>
                      {d.newClients !== null && <div style={{ color: C.amber }}>Net New: +{d.newClients}K</div>}
                      {yoyMonth && <div style={{ color: C.textMuted, marginTop: 2 }}>YoY: +{((d.clients / yoyMonth.clients - 1) * 100).toFixed(1)}%</div>}
                    </div>
                  );
                }} />
              <Area dataKey="clients" fill={C.lavender} fillOpacity={0.2} stroke={C.lavender} strokeWidth={2} name="Funded Clients" />
              <Bar yAxisId="right" dataKey="newClients" name="Net New Clients" fill={C.amber} fillOpacity={0.7} radius={[2, 2, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Client summary cards */}
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px", padding: "10px 14px", background: C.cardAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Total Funded Clients</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>1.443M</div>
              <div style={{ fontSize: 10, color: C.green }}>+15.8% YoY (vs 1.246M Mar '25)</div>
            </div>
            <div style={{ flex: "1 1 200px", padding: "10px 14px", background: C.cardAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Net New (Mar '26)</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>+14K</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>Annualized: ~168K · FY26 total: 205K</div>
            </div>
            <div style={{ flex: "1 1 200px", padding: "10px 14px", background: C.cardAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>3-Mo Avg Net New</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>+{(MONTHLY.slice(-3).reduce((s, m) => s + (m.newClients || 0), 0) / 3).toFixed(1)}K<span style={{ fontSize: 11, color: C.textDim, fontWeight: 400 }}>/mo</span></div>
              <div style={{ fontSize: 10, color: C.textMuted }}>Annualized: ~{(MONTHLY.slice(-3).reduce((s, m) => s + (m.newClients || 0), 0) / 3 * 12).toFixed(0)}K</div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 10, color: C.textDim, marginTop: 24, textAlign: "center" }}>
          Source: Wealthfront monthly metrics releases (ir.wealthfront.com) · CM/IA deposit split shown where reported · Not financial advice
        </div>
      </div>
    </div>
  );
}
