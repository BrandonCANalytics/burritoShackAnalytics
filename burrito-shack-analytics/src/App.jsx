import React, { useState, useEffect, useMemo } from "react";
import * as d3 from "d3";

/**
 * Burrito Shack – Executive Dashboard (React + D3 + Vite)
 * - Single data source: /public/cleaned.csv
 * - Global filters: Market, Channel, Date range (apply to ALL tabs)
 * - Tabs: Overview / Markets / Channels / Details / Insights
 * - Legend + tooltips on charts
 */

export default function App() {
  // ---------------- State ----------------
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState("overview");
  const [selectedMarket, setSelectedMarket] = useState("All");
  const [selectedChannel, setSelectedChannel] = useState("All");
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, html: "" });
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // ---------------- Load CSV ----------------
  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}burrito_shack_digital_performance_cleaned.csv`;
    d3.csv(url, parseRow)
      .then((data) => setRows(data || []))
      .catch((err) => console.error("Failed to load csv", err));
  }, []);

  // Initialize date range once data loads
  useEffect(() => {
    if (!rows.length) return;
    const [minD, maxD] = d3.extent(rows, (d) => d.date);
    setStartDate((s) => s ?? minD);
    setEndDate((e) => e ?? maxD);
  }, [rows]);

  const theme = {
    salsa: "#e63946",
    tortilla: "#f7efe1",
    avocado: "#2a9d8f",
    cilantro: "#1b8a6b",
    beans: "#3d2b1f",
    crema: "#fffaf3",
    charcoal: "#2b2b2b",
  };

  // ---------------- Global Filtering ----------------
  const rowsFiltered = useMemo(() => {
    return rows.filter((r) => {
      const inDate = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate);
      const inMarket = selectedMarket === "All" ? true : `${r.city}, ${r.state}` === selectedMarket;
      return inDate && inMarket;
    });
  }, [rows, startDate, endDate, selectedMarket]);

  const markets = useMemo(
    () => ["All", ...Array.from(new Set(rows.map((r) => `${r.city}, ${r.state}`))).sort()],
    [rows]
  ); // show all markets that exist in file

  const channels = ["All", "social", "search", "display"];
  const channelFocus = selectedChannel === "All" ? null : selectedChannel;

  const metrics = useMemo(() => derive(rowsFiltered, channelFocus), [rowsFiltered, channelFocus]);

  // ---------------- Render ----------------
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(180deg, ${theme.crema}, ${theme.tortilla})`,
        color: theme.charcoal,
      }}
    >
      <Topbar theme={theme} />

      <main style={{ flex: 1, padding: 16, position: "relative" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto" }}>
          <Tabs tab={tab} setTab={setTab} theme={theme} />

          {/* Global filters (apply across all tabs) */}
          <FilterBar
            rows={rows}
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            markets={markets}
            selectedMarket={selectedMarket}
            setSelectedMarket={setSelectedMarket}
            channels={channels}
            selectedChannel={selectedChannel}
            setSelectedChannel={setSelectedChannel}
          />
        </div>

        {/* ----- OVERVIEW ----- */}
        <div style={{ maxWidth: 1600, margin: "0 auto", display: tab === "overview" ? "block" : "none" }}>
          <KPIRow m={metrics} />
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, minHeight: 360, marginTop: 16 }}>
            <Panel title="Revenue & ROAS Over Time" theme={theme}>
              <RevenueRoasChart data={metrics.byDate} setTooltip={setTooltip} />
            </Panel>
            <Panel title="ROAS by Channel" theme={theme}>
              <ROASByChannel data={metrics.channelArr} setTooltip={setTooltip} highlight={channelFocus} />
            </Panel>
          </div>

          <Panel title="Top Markets" theme={theme} style={{ minHeight: 360, marginTop: 16 }}>
            <MarketsTable data={metrics.byMarket} />
          </Panel>
        </div>

        {/* ----- MARKETS ----- */}
        <div style={{ maxWidth: 1600, margin: "0 auto", display: tab === "markets" ? "block" : "none" }}>
          <Panel title="Markets" theme={theme}>
            <MarketsTable data={metrics.byMarket} />
          </Panel>
        </div>

        {/* ----- CHANNELS ----- */}
        <div style={{ maxWidth: 1600, margin: "0 auto", display: tab === "channels" ? "block" : "none" }}>
          <Panel title="Channels" theme={theme}>
            <ROASByChannel data={metrics.channelArr} setTooltip={setTooltip} highlight={channelFocus} />
          </Panel>
        </div>

        {/* ----- DETAILS ----- */}
        <div style={{ maxWidth: 1600, margin: "0 auto", display: tab === "details" ? "block" : "none" }}>
          <Panel title="Details – KPIs" theme={theme}>
            <KPIRow m={metrics} />
          </Panel>
          <Panel title="Details – Row-level Data" theme={theme} style={{ marginTop: 16 }}>
            <RowTable rows={rowsFiltered} />
          </Panel>
        </div>

        {/* ----- INSIGHTS ----- */}
        <div style={{ maxWidth: 1600, margin: "0 auto", display: tab === "insights" ? "block" : "none" }}>
          <InsightsPanel rows={rowsFiltered} channelFocus={channelFocus} />
        </div>

        {/* Tooltip */}
        {tooltip.show && (
          <div
            style={{
              position: "fixed",
              left: tooltip.x + 12,
              top: tooltip.y + 12,
              background: "rgba(255,255,255,.96)",
              border: "1px solid #e5e5e5",
              padding: "8px 10px",
              borderRadius: 8,
              boxShadow: "0 6px 18px rgba(0,0,0,.08)",
              pointerEvents: "none",
              zIndex: 50,
            }}
            dangerouslySetInnerHTML={{ __html: tooltip.html }}
          />
        )}
      </main>

      <footer style={{ textAlign: "center", color: "#6a6a6a", padding: 16 }}>
        Data source: <code>public/cleaned.csv</code>
      </footer>
    </div>
  );
}

/* ---------------- UI CHROME ---------------- */

function Topbar({ theme }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: `linear-gradient(90deg, ${theme.salsa}, ${theme.avocado})`,
        color: "white",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 10px 30px rgba(0,0,0,.08)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: theme.crema,
          color: theme.beans,
          display: "grid",
          placeItems: "center",
          fontSize: 22,
          fontWeight: 800,
          transform: "rotate(-8deg)",
        }}
      >
        🌯
      </div>
      <div>
        <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>
          J Jeong's Burrito Shack 
        </div>
        <div style={{ opacity: 0.85, fontWeight: 500 }}>
          Marketing Performance Dashboard
        </div>
      </div>
    </div>
  );
}

function Tabs({ tab, setTab, theme }) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "markets", label: "Markets" },
    { id: "channels", label: "Channels" },
    { id: "details", label: "Details" },
    { id: "insights", label: "Insights" },
  ];
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 16px" }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          style={{
            cursor: "pointer",
            border: `1px solid ${tab === t.id ? theme.avocado : "rgba(0,0,0,.08)"}`,
            background: tab === t.id ? theme.crema : "white",
            padding: "8px 12px",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,.08)",
            fontWeight: 600,
            color: tab === t.id ? theme.cilantro : theme.charcoal,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function FilterBar({
  rows,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  markets,
  selectedMarket,
  setSelectedMarket,
  channels,
  selectedChannel,
  setSelectedChannel,
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        margin: "10px 0 16px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <strong>Date range:</strong>
        <DateInput value={startDate} onChange={setStartDate} />
        <span>→</span>
        <DateInput value={endDate} onChange={setEndDate} minDate={startDate} />
        <button
          style={{ marginLeft: 8 }}
          onClick={() => {
            if (rows.length) {
              const [minD, maxD] = d3.extent(rows, (d) => d.date);
              setStartDate(minD);
              setEndDate(maxD);
            }
            setSelectedMarket("All");
            setSelectedChannel("All");
          }}
        >
          Reset
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          <strong>Market:</strong>
        </label>
        <select value={selectedMarket} onChange={(e) => setSelectedMarket(e.target.value)}>
          {markets.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <label style={{ marginLeft: 12 }}>
          <strong>Channel:</strong>
        </label>
        <select value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)}>
          {channels.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Panel({ title, children, theme, style }) {
  return (
    <section
      className="panel"
      style={{
        background: "white",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,.08)",
        ...style,
      }}
    >
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </section>
  );
}

function DateInput({ value, onChange, minDate }) {
  const toVal = (d) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "");
  const handle = (e) => {
    const v = e.target.value;
    onChange(v ? new Date(v + "T00:00:00") : null);
  };
  return <input type="date" value={toVal(value)} min={minDate ? toVal(minDate) : undefined} onChange={handle} />;
}

/* ---------------- Viz Components ---------------- */

function InsightsPanel({ rows, channelFocus }){
  const i = React.useMemo(() => buildInsights(rows, channelFocus), [rows, channelFocus]);
  if (!i) return <EmptyChart note="Not enough data for insights"/>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
      <Panel title={`MoM (${i.labels.currLabel} vs ${i.labels.prevLabel})`}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
          <DeltaCard label="Revenue" curr={i.curr.revenue} prev={i.prev.revenue} fmt={v=>"$"+d3.format(",.0f")(v)} />
          <DeltaCard label="Orders" curr={i.curr.orders} prev={i.prev.orders} fmt={v=>d3.format(",")(v)} />
          <DeltaCard label="ROAS" curr={i.curr.roas} prev={i.prev.roas} fmt={v=>d3.format(".2f")(v)} />
          <DeltaCard label="CVR" curr={i.curr.cvr} prev={i.prev.cvr} fmt={v=>d3.format(".1%")(v)} />
        </div>
      </Panel>
      <Panel title={`YoY (${i.labels.currLabel} vs ${i.labels.yoyLabel})`}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
          <DeltaCard label="Revenue" curr={i.curr.revenue} prev={i.yoy.revenue} fmt={v=>"$"+d3.format(",.0f")(v)} />
          <DeltaCard label="Orders" curr={i.curr.orders} prev={i.yoy.orders} fmt={v=>d3.format(",")(v)} />
          <DeltaCard label="ROAS" curr={i.curr.roas} prev={i.yoy.roas} fmt={v=>d3.format(".2f")(v)} />
          <DeltaCard label="CVR" curr={i.curr.cvr} prev={i.yoy.cvr} fmt={v=>d3.format(".1%")(v)} />
        </div>
      </Panel>
      <Panel title="Auto Insights (last month)">
        <ul style={{ marginTop: 0 }}>
          <li>{i.narratives.topChannel}</li>
          <li>{i.narratives.bestMarket}</li>
          <li>{i.narratives.watchMetric}</li>
        </ul>
      </Panel>
    </div>
  );
}

function DeltaCard({ label, curr, prev, fmt }){
  const pct = prev ? (curr - prev) / prev : (curr ? 1 : 0);
  const up = pct >= 0;
  return (
    <div style={{ background:'white', borderRadius:16, padding:14, boxShadow:'0 10px 30px rgba(0,0,0,.08)'}}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <h4 style={{ margin:0, opacity:.7, textTransform:'uppercase', fontSize:12 }}>{label}</h4>
        <span style={{ fontWeight:700, color: up? '#1b5e20' : '#c62828' }}>{(up? '▲' : '▼')} {d3.format('.1%')(Math.abs(pct))}</span>
      </div>
      <div style={{ fontSize:22, fontWeight:800 }}>{fmt(curr||0)}</div>
      <svg width={220} height={36} style={{ width:'100%', maxWidth:220 }}>
        {(() => {
          const w=200, h=16; const gmax=Math.max(curr||0, prev||0, 1);
          const x = d3.scaleLinear().domain([0, gmax]).range([0,w]);
          return (
            <g transform={`translate(${(220-w)/2},10)`}>
              <rect x={0} y={0} width={x(prev||0)} height={h} fill="#d9e9e6"/>
              <rect x={0} y={0} width={x(curr||0)} height={h} fill="#2a9d8f" opacity={0.9}/>
            </g>
          );
        })()}
      </svg>
      <div style={{ display:'flex', gap:12, fontSize:12, color:'#666' }}>
        <span>Prev: <b>{fmt(prev||0)}</b></span>
        <span>Curr: <b>{fmt(curr||0)}</b></span>
      </div>
    </div>
  );
}


function KPIRow({ m }) {
  const fMoney0 = (n) => "$" + d3.format(",.0f")(n);
  const pct1 = d3.format(".1%"),
    num0 = d3.format(",");
  const cards = [
    { label: "Revenue", value: fMoney0(m.totalRevenue) },
    { label: "Orders", value: num0(m.totalOrders) },
    { label: "AOV", value: fMoney0(m.aov) },
    { label: "ROAS", value: d3.format(".2f")(m.roas) },
    { label: "CVR", value: pct1(m.cvr) },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            background: "white",
            borderRadius: 16,
            padding: 14,
            boxShadow: "0 10px 30px rgba(0,0,0,.08)",
          }}
        >
          <h4
            style={{
              margin: 0,
              marginBottom: 4,
              fontSize: 12,
              letterSpacing: 0.8,
              opacity: 0.7,
              textTransform: "uppercase",
            }}
          >
            {c.label}
          </h4>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function RevenueRoasChart({ data, setTooltip }) {
  if (!data?.length) return <EmptyChart note="No data" />;
  const w = 900,
    h = 340,
    m = { t: 24, r: 60, b: 36, l: 60 };
  const innerW = w - m.l - m.r,
    innerH = h - m.t - m.b;

  const x = d3.scaleUtc().domain(d3.extent(data, (d) => d.date)).range([0, innerW]);
  const y1 = d3.scaleLinear().domain([0, d3.max(data, (d) => d.revenue) || 1]).nice().range([innerH, 0]);
  const y2 = d3.scaleLinear().domain([0, d3.max(data, (d) => d.roas) || 1]).nice().range([innerH, 0]);

  const lineRev = d3.line().x((d) => x(d.date)).y((d) => y1(d.revenue));
  const lineRoas = d3.line().x((d) => x(d.date)).y((d) => y2(d.roas));
  const fmtMoney = (d) => "$" + d3.format(",.0f")(d);
  const fmtDate = d3.timeFormat("%b %d, %Y");

  // bisector for tooltip
  const bisect = d3.bisector((d) => d.date).center;

  const handleMove = (evt) => {
    const { left } = evt.currentTarget.getBoundingClientRect();
    const mx = evt.clientX - left - m.l;
    const date = x.invert(Math.max(0, Math.min(innerW, mx)));
    const idx = bisect(data, date);
    const d = data[Math.max(0, Math.min(data.length - 1, idx))];
    setTooltip({
      show: true,
      x: evt.clientX,
      y: evt.clientY,
      html: `<div style="font-weight:700; margin-bottom:4px">${fmtDate(d.date)}</div>
             <div>Revenue: <b>${fmtMoney(d.revenue)}</b></div>
             <div>ROAS: <b>${d3.format(".2f")(d.roas)}</b></div>`,
    });
  };
  const handleLeave = () => setTooltip((t) => ({ ...t, show: false }));

  return (
    <svg width={w} height={h} style={{ width: "100%" }} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <g transform={`translate(${m.l},${m.t})`}>
        {/* axes */}
        <g transform={`translate(0,${innerH})`}>
          {x.ticks(6).map((t, i) => (
            <g key={i} transform={`translate(${x(t)},0)`}>
              <line y2={6} stroke="#000" />
              <text y={18} textAnchor="middle" fontSize={10}>
                {d3.timeFormat("%b %d")(t)}
              </text>
            </g>
          ))}
          <line x1={0} x2={innerW} y1={0} y2={0} stroke="#ccc" />
        </g>
        <g>
          {y1.ticks(5).map((t, i) => (
            <g key={i} transform={`translate(0,${y1(t)})`}>
              <line x2={-6} stroke="#000" />
              <text x={-9} y={4} textAnchor="end" fontSize={10}>
                {fmtMoney(t)}
              </text>
              <line x1={0} x2={innerW} y1={0} y2={0} stroke="#eee" />
            </g>
          ))}
        </g>
        <g transform={`translate(${innerW},0)`}>
          {y2.ticks(5).map((t, i) => (
            <g key={i} transform={`translate(0,${y2(t)})`}>
              <line x2={6} stroke="#000" />
              <text x={9} y={4} fontSize={10}>
                {d3.format(".1f")(t)}
              </text>
            </g>
          ))}
        </g>

        {/* lines */}
        <path d={lineRev(data)} fill="none" stroke="#c62828" strokeWidth={2.5} />
        <path d={lineRoas(data)} fill="none" stroke="#1b5e20" strokeWidth={2.5} strokeDasharray="4 4" />

        {/* legend */}
        <g transform={`translate(0,-8)`}>
          <rect width={190} height={24} fill="white" opacity={0.9} rx={8} />
          <line x1={8} x2={28} y1={12} y2={12} stroke="#c62828" strokeWidth={3} />
          <text x={32} y={15} fontSize={12}>
            Revenue
          </text>
          <line x1={96} x2={116} y1={12} y2={12} stroke="#1b5e20" strokeWidth={3} strokeDasharray="4 4" />
          <text x={120} y={15} fontSize={12}>
            ROAS
          </text>
        </g>
      </g>
    </svg>
  );
}

function ROASByChannel({ data, setTooltip, highlight = null }) {
  if (!data?.length) return <EmptyChart note="No data" />;
  const w = 900,
    h = 320,
    m = { t: 20, r: 20, b: 40, l: 60 };
  const innerW = w - m.l - m.r,
    innerH = h - m.t - m.b;
  const x = d3.scaleBand().domain(data.map((d) => d.channel)).range([0, innerW]).padding(0.25);
  const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.roas) || 1]).nice().range([innerH, 0]);

  return (
    <svg width={w} height={h} style={{ width: "100%" }}>
      <g transform={`translate(${m.l},${m.t})`}>
        <g transform={`translate(0,${innerH})`}>
          {data.map((d) => (
            <text key={d.channel} x={x(d.channel) + x.bandwidth() / 2} y={28} textAnchor="middle" fontSize={11}>
              {d.channel}
            </text>
          ))}
          <line x1={0} x2={innerW} y1={0} y2={0} stroke="#ccc" />
        </g>
        <g>
          {y.ticks(5).map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x2={-6} stroke="#000" />
              <text x={-9} y={4} fontSize={10} textAnchor="end">
                {d3.format(".2f")(t)}
              </text>
              <line x1={0} x2={innerW} y1={0} y2={0} stroke="#eee" />
            </g>
          ))}
        </g>
        {data.map((d) => {
          const dim = highlight && d.channel !== highlight;
          const fill = dim ? "#d9e9e6" : "#2a9d8f";
          return (
            <rect
              key={d.channel}
              x={x(d.channel)}
              y={y(d.roas)}
              width={x.bandwidth()}
              height={innerH - y(d.roas)}
              fill={fill}
              onMouseEnter={(e) =>
                setTooltip({
                  show: true,
                  x: e.clientX,
                  y: e.clientY,
                  html: `<b>${d.channel}</b><br/>ROAS: ${d3.format(".2f")(d.roas)}<br/>CPC: $${d3.format(",.2f")(d.cpc)}<br/>CTR: ${d3.format(".1%")(
                    d.ctr
                  )}`,
                })
              }
              onMouseMove={(e) => setTooltip((t) => ({ ...t, x: e.clientX, y: e.clientY }))}
              onMouseLeave={() => setTooltip((t) => ({ ...t, show: false }))}
            />
          );
        })}
      </g>
    </svg>
  );
}

function MarketsTable({ data }) {
  const top = (data || []).slice(0, 50);
  const money0 = (n) => "$" + d3.format(",.0f")(n);
  return (
    <div style={{ overflow: "auto", maxHeight: 480 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#faf8f4", position: "sticky", top: 0 }}>
            <th style={{ textAlign: "left", padding: 10 }}>City</th>
            <th style={{ textAlign: "left", padding: 10 }}>State</th>
            <th style={{ textAlign: "left", padding: 10 }}>Revenue</th>
            <th style={{ textAlign: "left", padding: 10 }}>ROAS</th>
            <th style={{ textAlign: "left", padding: 10 }}>Conv Rate</th>
            <th style={{ textAlign: "left", padding: 10 }}>Orders</th>
            <th style={{ textAlign: "left", padding: 10 }}>Spend</th>
          </tr>
        </thead>
        <tbody>
          {top.map((r) => (
            <tr key={r.market}>
              <td style={{ padding: 10 }}>{r.city}</td>
              <td style={{ padding: 10 }}>{r.state}</td>
              <td style={{ padding: 10 }}>{money0(r.revenue)}</td>
              <td style={{ padding: 10 }}>{d3.format(".2f")(r.roas)}</td>
              <td style={{ padding: 10 }}>
                {d3.format(".1%")(r.sessions ? r.orders / r.sessions : 0)}
              </td>
              <td style={{ padding: 10 }}>{d3.format(",")(r.orders)}</td>
              <td style={{ padding: 10 }}>{money0(r.spend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowTable({ rows }) {
  const money = (n) => "$" + d3.format(",.0f")(n);
  const pct = d3.format(".1%");
  return (
    <div style={{ overflow: "auto", maxHeight: 560 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#faf8f4", position: "sticky", top: 0 }}>
            <th style={{ textAlign: "left", padding: 10 }}>Date</th>
            <th style={{ textAlign: "left", padding: 10 }}>City</th>
            <th style={{ textAlign: "left", padding: 10 }}>State</th>
            <th style={{ textAlign: "right", padding: 10 }}>Sessions</th>
            <th style={{ textAlign: "right", padding: 10 }}>Page Views</th>
            <th style={{ textAlign: "right", padding: 10 }}>Bounce</th>
            <th style={{ textAlign: "right", padding: 10 }}>CVR</th>
            <th style={{ textAlign: "right", padding: 10 }}>Orders</th>
            <th style={{ textAlign: "right", padding: 10 }}>AOV</th>
            <th style={{ textAlign: "right", padding: 10 }}>Revenue</th>
            <th style={{ textAlign: "right", padding: 10 }}>Spend (Soc)</th>
            <th style={{ textAlign: "right", padding: 10 }}>Spend (Search)</th>
            <th style={{ textAlign: "right", padding: 10 }}>Spend (Disp)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ padding: 10 }}>{d3.timeFormat("%Y-%m-%d")(r.date)}</td>
              <td style={{ padding: 10 }}>{r.city}</td>
              <td style={{ padding: 10 }}>{r.state}</td>
              <td style={{ padding: 10, textAlign: "right" }}>{d3.format(",")(r.sessions)}</td>
              <td style={{ padding: 10, textAlign: "right" }}>{d3.format(",")(r.page_views)}</td>
              <td style={{ padding: 10, textAlign: "right" }}>{pct(r.bounce_rate)}</td>
              <td style={{ padding: 10, textAlign: "right" }}>{pct(r.conversion_rate)}</td>
              <td style={{ padding: 10, textAlign: "right" }}>{d3.format(",")(r.online_orders)}</td>
              <td style={{ padding: 10, textAlign: "right" }}>{money(r.avg_order_value)}</td>
              <td style={{ padding: 10, textAlign: "right" }}>{money(r.revenue)}</td>
              <td style={{ padding: 10, textAlign: "right" }}>{money(r.ad_spend_social)}</td>
              <td style={{ padding: 10, textAlign: "right" }}>{money(r.ad_spend_search)}</td>
              <td style={{ padding: 10, textAlign: "right" }}>{money(r.ad_spend_display)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyChart({ note }) {
  return (
    <div style={{ height: 320, display: "grid", placeItems: "center", color: "#777" }}>
      {note}
    </div>
  );
}

/* ---------------- Data shaping ---------------- */

function monthKey(d){ const dt = new Date(d.getFullYear(), d.getMonth(), 1); return +dt; }
function addMonths(d, n){ const dt = new Date(d); dt.setMonth(dt.getMonth()+n); return new Date(dt.getFullYear(), dt.getMonth(), 1); }

function buildInsights(rows, channelFocus){
  if (!rows?.length) return null;
  const monthly = d3.rollups(
    rows,
    (v)=>{
      const revenue = d3.sum(v, d=>d.revenue);
      const orders = d3.sum(v, d=>d.online_orders);
      const sessions = d3.sum(v, d=>d.sessions);
      const spendS = d3.sum(v, d=>d.ad_spend_social);
      const spendSe= d3.sum(v, d=>d.ad_spend_search);
      const spendD = d3.sum(v, d=>d.ad_spend_display);
      const spend = channelFocus==='social'?spendS:channelFocus==='search'?spendSe:channelFocus==='display'?spendD:(spendS+spendSe+spendD);
      const cvr = sessions? orders/sessions : 0;
      const roas = spend? revenue/spend : 0;
      return { revenue, orders, sessions, spend, cvr, roas };
    },
    d=> monthKey(d.date)
  ).map(([k,v])=>({ month:new Date(+k), ...v }))
   .sort((a,b)=>a.month-b.month);
  if (monthly.length<2) return null;
  const curr = monthly[monthly.length-1];
  const prev = monthly[monthly.length-2];
  const yoyMonthKey = +addMonths(curr.month, -12);
  const yoy = monthly.find(m=> +m.month===yoyMonthKey) || { revenue:0, orders:0, sessions:0, spend:0, cvr:0, roas:0 };

  const channels = ['social','search','display'];
  const channelStats = channels.map(ch=>{
    const series = d3.rollups(rows, v=>{
      const rev = d3.sum(v,d=>d.revenue);
      const sS = d3.sum(v,d=>d.ad_spend_social), sSe=d3.sum(v,d=>d.ad_spend_search), sD=d3.sum(v,d=>d.ad_spend_display);
      const spend = ch==='social'?sS:ch==='search'?sSe:sD;
      const orders = d3.sum(v,d=>d.online_orders), sessions = d3.sum(v,d=>d.sessions);
      const cvr = sessions? orders/sessions:0; const roas = spend? rev/spend:0;
      return { revenue: rev, roas, cvr };
    }, d=> monthKey(d.date)).map(([k,v])=>({month:new Date(+k), ...v})).sort((a,b)=>a.month-b.month);
    const c = series[series.length-1]||{}; const p=series[series.length-2]||{};
    const dRoas = p.roas? (c.roas-p.roas)/p.roas : (c.roas?1:0);
    const dRev  = p.revenue? (c.revenue-p.revenue)/p.revenue : (c.revenue?1:0);
    const dCvr  = p.cvr? (c.cvr-p.cvr)/p.cvr : (c.cvr?1:0);
    return { ch, dRoas, dRev, dCvr };
  });
  const topRoas = channelStats.reduce((a,b)=> (Math.abs(b.dRoas)>Math.abs(a.dRoas)? b:a), channelStats[0]);

  const marketMonthly = d3.rollups(rows, v=>({ revenue: d3.sum(v,d=>d.revenue) }), d=> `${d.city}, ${d.state}`, d=> monthKey(d.date));
  let bestMarketMsg = 'Not enough market data';
  if (marketMonthly.length){
    const growth = marketMonthly.map(([market, arr])=>{
      const series = arr.map(([k,v])=>({month:new Date(+k), ...v})).sort((a,b)=>a.month-b.month);
      const c = series[series.length-1]||{revenue:0};
      const p = series[series.length-2]||{revenue:0};
      const g = p.revenue? (c.revenue-p.revenue)/p.revenue : (c.revenue?1:0);
      return { market, g };
    });
    const best = growth.reduce((a,b)=> (b.g>a.g? b:a), growth[0]);
    bestMarketMsg = `${best.market} had the strongest MoM revenue growth (${d3.format('.1%')(best.g)}).`;
  }

  const labels = {
    currLabel: d3.timeFormat('%b %Y')(curr.month),
    prevLabel: d3.timeFormat('%b %Y')(prev.month),
    yoyLabel: d3.timeFormat('%b %Y')(addMonths(curr.month,-12)),
  };

  return {
    labels,
    curr: { revenue: curr.revenue, orders: curr.orders, roas: curr.roas, cvr: curr.cvr },
    prev: { revenue: prev.revenue, orders: prev.orders, roas: prev.roas, cvr: prev.cvr },
    yoy:  { revenue: yoy.revenue,  orders: yoy.orders,  roas: yoy.roas,  cvr: yoy.cvr },
    narratives: {
      topChannel: `${topRoas.ch} channel had the largest MoM ROAS change (${d3.format('.1%')(topRoas.dRoas)}).`,
      bestMarket: bestMarketMsg,
      watchMetric: `Watch CVR: ${labels.currLabel} vs ${labels.prevLabel} is ${d3.format('.1%')((curr.cvr - prev.cvr)/(prev.cvr||1))} change.`
    }
  };
}


function parseRow(d) {
  return {
    date: new Date(d.date),
    location_id: d.location_id,
    city: d.city,
    state: d.state,
    region: d.region,
    sessions: +d.sessions,
    page_views: +d.page_views,
    bounce_rate: +d.bounce_rate,
    conversion_rate: +d.conversion_rate,
    online_orders: +d.online_orders,
    avg_order_value: +d.avg_order_value,
    revenue: +d.revenue,
    ad_spend_social: +d.ad_spend_social,
    ad_spend_search: +d.ad_spend_search,
    ad_spend_display: +d.ad_spend_display,
    impressions_social: +d.impressions_social,
    impressions_search: +d.impressions_search,
    impressions_display: +d.impressions_display,
    clicks_social: +d.clicks_social,
    clicks_search: +d.clicks_search,
    clicks_display: +d.clicks_display,
  };
}

function derive(rows, channelFocus = null) {
  if (!rows?.length)
    return {
      totalRevenue: 0,
      totalOrders: 0,
      totalSessions: 0,
      aov: 0,
      cvr: 0,
      roas: 0,
      byDate: [],
      channelArr: [],
      byMarket: [],
    };

  const sum = (arr, key) => d3.sum(arr, (d) => d[key] || 0);

  const totalRevenue = sum(rows, "revenue");
  const totalOrders = sum(rows, "online_orders");
  const totalSessions = sum(rows, "sessions");
  const aov = totalOrders ? totalRevenue / totalOrders : 0;
  const spend_total =
    sum(rows, "ad_spend_social") +
    sum(rows, "ad_spend_search") +
    sum(rows, "ad_spend_display");
  const cvr = totalSessions ? totalOrders / totalSessions : 0;
  const roas_overall = spend_total ? totalRevenue / spend_total : 0;

  // Time series (optionally focus spend by channel)
  const byDate = d3
    .rollups(
      rows,
      (v) => {
        const revenue = d3.sum(v, (d) => d.revenue);
        const spend_social = d3.sum(v, (d) => d.ad_spend_social);
        const spend_search = d3.sum(v, (d) => d.ad_spend_search);
        const spend_display = d3.sum(v, (d) => d.ad_spend_display);
        const spend =
          channelFocus === "social"
            ? spend_social
            : channelFocus === "search"
            ? spend_search
            : channelFocus === "display"
            ? spend_display
            : spend_social + spend_search + spend_display;
        const orders = d3.sum(v, (d) => d.online_orders);
        const roas = spend ? revenue / spend : 0;
        return { revenue, spend, orders, roas };
      },
      (d) => +new Date(d.date)
    )
    .map(([k, v]) => ({
      date: new Date(+k),
      revenue: v.revenue,
      roas: v.roas,
      orders: v.orders,
    }))
    .sort((a, b) => a.date - b.date);

  const channel = {
    social: {
      spend: sum(rows, "ad_spend_social"),
      clicks: sum(rows, "clicks_social"),
      impressions: sum(rows, "impressions_social"),
    },
    search: {
      spend: sum(rows, "ad_spend_search"),
      clicks: sum(rows, "clicks_search"),
      impressions: sum(rows, "impressions_search"),
    },
    display: {
      spend: sum(rows, "ad_spend_display"),
      clicks: sum(rows, "clicks_display"),
      impressions: sum(rows, "impressions_display"),
    },
  };
  const channelArr = Object.entries(channel).map(([k, v]) => ({
    channel: k,
    spend: v.spend,
    clicks: v.clicks,
    impressions: v.impressions,
    cpc: v.clicks ? v.spend / v.clicks : 0,
    ctr: v.impressions ? v.clicks / v.impressions : 0,
    roas: v.spend ? totalRevenue / v.spend : 0,
  }));

  // Market aggregation – ROAS respects channel focus (spend side)
  const byMarket = Array.from(
    d3.group(rows, (d) => `${d.city}, ${d.state}`),
    ([k, v]) => {
      const spend_social = sum(v, "ad_spend_social");
      const spend_search = sum(v, "ad_spend_search");
      const spend_display = sum(v, "ad_spend_display");
      const spend =
        channelFocus === "social"
          ? spend_social
          : channelFocus === "search"
          ? spend_search
          : channelFocus === "display"
          ? spend_display
          : spend_social + spend_search + spend_display;
      const revenue = sum(v, "revenue");
      const orders = sum(v, "online_orders");
      const sessions = sum(v, "sessions");
      return {
        market: k,
        city: v[0].city,
        state: v[0].state,
        revenue,
        orders,
        sessions,
        spend,
      };
    }
  )
    .map((r) => ({ ...r, roas: r.spend ? r.revenue / r.spend : 0, cvr: r.sessions ? r.orders / r.sessions : 0 }))
    .sort((a, b) => d3.descending(a.revenue, b.revenue));

  return {
    totalRevenue,
    totalOrders,
    totalSessions,
    aov,
    cvr,
    roas: roas_overall,
    byDate,
    channelArr,
    byMarket,
  };
}
