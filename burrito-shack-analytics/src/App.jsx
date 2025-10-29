import React, { useMemo, useRef, useState } from "react";
import * as d3 from "d3";

/**
 * Burrito Shack – Executive Marketing Dashboard (React + D3)
 * ---------------------------------------------------------
 */

export default function App() {
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState("");

  const theme = {
    salsa: "#e63946",
    tortilla: "#f7efe1",
    avocado: "#2a9d8f",
    cilantro: "#1b8a6b",
    beans: "#3d2b1f",
    crema: "#fffaf3",
    charcoal: "#2b2b2b",
  };

  // ---- CSV loader ----
  useEffect(() => {
  const url = `${import.meta.env.BASE_URL}burrito_shack_digital_performance_cleaned.csv`; // put file in /public
  d3.csv(url, parseRow)
    .then(setRows)
    .catch(console.error);
}, []);

  function parseCsv(text) {
    const parsed = d3.csvParse(text, (d) => ({
      date: new Date(d.date),
      location_id: d.location_id,
      city: d.city,
      state: d.state,
      region: d.region,
      sessions: +d.sessions,
      page_views: +d.page_views,
      bounce_rate: +d.bounce_rate, // 0..1 expected. 
      conversion_rate: +d.conversion_rate, // 0..1 expected
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
    }));
    return parsed;
  }

  async function handleFile(e) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setRows(parsed);
    } catch (err) {
      setError("Could not parse file. Ensure it is a CSV with the documented headers.");
      console.error(err);
    }
  }

  // ---- Helpers ----
  const sum = (arr, key) => d3.sum(arr, (d) => d[key] || 0);

  function weightedBounceRate(arr) {
    const s = sum(arr, "sessions");
    const w = d3.sum(arr, (d) => (d.sessions || 0) * (d.bounce_rate || 0));
    return s ? w / s : 0;
  }

  const derived = useMemo(() => {
    if (!rows.length) return null;
    const totalRevenue = sum(rows, "revenue");
    const totalOrders = sum(rows, "online_orders");
    const totalSessions = sum(rows, "sessions");
    const spend = sum(rows, "ad_spend_social") + sum(rows, "ad_spend_search") + sum(rows, "ad_spend_display");
    const aov = totalOrders ? totalRevenue / totalOrders : 0;
    const cvr = totalSessions ? totalOrders / totalSessions : 0;
    const roas = spend ? totalRevenue / spend : 0;
    const clicks = sum(rows, "clicks_social") + sum(rows, "clicks_search") + sum(rows, "clicks_display");
    const cpc = clicks ? spend / clicks : 0;
    const br = weightedBounceRate(rows);

    // by date aggregates
    const byDateMap = d3.rollup(
      rows,
      (v) => ({
        revenue: d3.sum(v, (d) => d.revenue),
        spend: d3.sum(v, (d) => d.ad_spend_social + d.ad_spend_search + d.ad_spend_display),
        orders: d3.sum(v, (d) => d.online_orders),
      }),
      (d) => +d.date
    );
    const byDate = Array.from(byDateMap, ([k, v]) => ({
      date: new Date(+k),
      revenue: v.revenue,
      spend: v.spend,
      roas: v.spend ? v.revenue / v.spend : 0,
      orders: v.orders,
    })).sort((a, b) => a.date - b.date);

    // by channel
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
    }));

    // by market (city/state)
    const byMarket = Array.from(
      d3.group(rows, (d) => `${d.city}, ${d.state}`),
      ([k, v]) => ({
        market: k,
        city: v[0].city,
        state: v[0].state,
        revenue: sum(v, "revenue"),
        orders: sum(v, "online_orders"),
        sessions: sum(v, "sessions"),
        spend: sum(v, "ad_spend_social") + sum(v, "ad_spend_search") + sum(v, "ad_spend_display"),
      })
    )
      .map((r) => ({ ...r, roas: r.spend ? r.revenue / r.spend : 0, cvr: r.sessions ? r.orders / r.sessions : 0 }))
      .sort((a, b) => d3.descending(a.revenue, b.revenue));

    return { totalRevenue, totalOrders, totalSessions, aov, cvr, roas, cpc, br, spend, clicks, byDate, channelArr, byMarket };
  }, [rows]);

  // ---- Presentational bits ----
  function KPI({ label, value }) {
    return (
      <div style={{ background: "white", borderRadius: 16, padding: 14, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
        <h4 style={{ margin: 0, marginBottom: 4, fontSize: 12, letterSpacing: 0.8, opacity: 0.7, textTransform: "uppercase" }}>{label}</h4>
        <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
      </div>
    );
  }

  function KPIRow() {
    if (!derived) return null;
    const fMoney0 = (n) => "$" + d3.format(",.0f")(n);
    const pct1 = d3.format(".1%"), num0 = d3.format(",");
    const cards = [
      { label: "Revenue", value: fMoney0(derived.totalRevenue) },
      { label: "Orders", value: num0(derived.totalOrders) },
      { label: "AOV", value: fMoney0(derived.aov) },
      { label: "ROAS", value: d3.format(".2f")(derived.roas) },
      { label: "CVR", value: pct1(derived.cvr) },
    ];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {cards.map((c) => (
          <KPI key={c.label} label={c.label} value={c.value} />
        ))}
      </div>
    );
  }

  function Topbar() {
    return (
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: `linear-gradient(90deg, ${theme.salsa}, ${theme.avocado})`, color: "white", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: theme.crema, color: theme.beans, display: "grid", placeItems: "center", fontSize: 22, fontWeight: 800, transform: "rotate(-8deg)" }}>🌯</div>
        <div>
          <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>Burrito Shack – Growth Kitchen</div>
          <div style={{ opacity: 0.85, fontWeight: 500 }}>Executive Marketing Performance</div>
        </div>
        <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#fff", borderRadius: 999, boxShadow: "0 10px 30px rgba(0,0,0,.08)", border: "1px solid rgba(0,0,0,.06)" }}>
          <span>Seasoning:</span> <strong>Spicy</strong>
        </div>
      </div>
    );
  }

  function Tabs() {
    const t = [
      { id: "overview", label: "Overview" },
      { id: "channels", label: "Channels" },
      { id: "markets", label: "Markets" },
      { id: "data", label: "Data" },
    ];
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 20px" }}>
        {t.map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            style={{ cursor: "pointer", border: `1px solid ${tab === x.id ? theme.avocado : "rgba(0,0,0,.08)"}`, background: tab === x.id ? theme.crema : "white", padding: "8px 12px", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,.08)", fontWeight: 600, color: tab === x.id ? theme.cilantro : theme.charcoal }}
          >
            {x.label}
          </button>
        ))}
      </div>
    );
  }

  // ---- Charts (React renders SVG; D3 does scales & paths) ----
  function RevenueRoasChart() {
    if (!derived) return null;
    const data = derived.byDate;
    if (!data.length) return null;

    const w = 760, h = 320, m = { t: 20, r: 40, b: 30, l: 54 };
    const innerW = w - m.l - m.r, innerH = h - m.t - m.b;

    const x = d3.scaleUtc().domain(d3.extent(data, (d) => d.date)).range([0, innerW]);
    const y1 = d3.scaleLinear().domain([0, d3.max(data, (d) => d.revenue) || 1]).nice().range([innerH, 0]);
    const y2 = d3.scaleLinear().domain([0, d3.max(data, (d) => d.roas) || 1]).nice().range([innerH, 0]);

    const lineRev = d3.line().x((d) => x(d.date)).y((d) => y1(d.revenue));
    const lineRoas = d3.line().x((d) => x(d.date)).y((d) => y2(d.roas));

    const fmtMoney = (d) => "$" + d3.format(",.0f")(d);

    return (
      <div className="chart" style={{ background: "white", borderRadius: 16, padding: 16, marginTop: 14, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
        <h3 style={{ marginTop: 0 }}>Revenue & ROAS Over Time</h3>
        <svg width={w} height={h}>
          <g transform={`translate(${m.l},${m.t})`}>
            {/* axes */}
            <g transform={`translate(0,${innerH})`}>
              {x.ticks(6).map((t, i) => (
                <g key={i} transform={`translate(${x(t)},0)`}>
                  <line y2={6} stroke="#000" />
                  <text y={18} textAnchor="middle" fontSize={10}>{d3.timeFormat("%b %d, %Y")(t)}</text>
                </g>
              ))}
              <line x1={0} x2={innerW} y1={0} y2={0} stroke="#ccc" />
            </g>
            <g>
              {y1.ticks(5).map((t, i) => (
                <g key={i} transform={`translate(0,${y1(t)})`}>
                  <line x2={-6} stroke="#000" />
                  <text x={-9} y={4} textAnchor="end" fontSize={10}>{fmtMoney(t)}</text>
                  <line x1={0} x2={innerW} y1={0} y2={0} stroke="#eee" />
                </g>
              ))}
            </g>
            <g transform={`translate(${innerW},0)`}>
              {y2.ticks(5).map((t, i) => (
                <g key={i} transform={`translate(0,${y2(t)})`}>
                  <line x2={6} stroke="#000" />
                  <text x={9} y={4} fontSize={10}>{d3.format(".1f")(t)}</text>
                </g>
              ))}
            </g>

            {/* lines */}
            <path d={lineRev(data)} fill="none" stroke="#c62828" strokeWidth={2.5} />
            <path d={lineRoas(data)} fill="none" stroke="#1b5e20" strokeWidth={2.5} strokeDasharray="4 4" />

            {/* legend */}
            <g>
              <rect width={180} height={22} fill="white" opacity={0.9} rx={8} />
              <line x1={8} x2={28} y1={11} y2={11} stroke="#c62828" strokeWidth={3} />
              <text x={32} y={14} fontSize={12}>Revenue</text>
              <line x1={88} x2={108} y1={11} y2={11} stroke="#1b5e20" strokeWidth={3} strokeDasharray="4 4" />
              <text x={112} y={14} fontSize={12}>ROAS</text>
            </g>
          </g>
        </svg>
      </div>
    );
  }

  function ROASByChannel() {
    if (!derived) return null;
    const data = derived.channelArr;
    const w = 760, h = 360, m = { t: 20, r: 20, b: 40, l: 46 };
    const innerW = w - m.l - m.r, innerH = h - m.t - m.b;

    const x = d3.scaleBand().domain(data.map((d) => d.channel)).range([0, innerW]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => (d.spend ? derived.totalRevenue / d.spend : 0)) || 1]).nice().range([innerH, 0]);

    return (
      <div className="chart" style={{ background: "white", borderRadius: 16, padding: 16, marginTop: 14, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
        <h3 style={{ marginTop: 0 }}>ROAS by Channel</h3>
        <svg width={w} height={h}>
          <g transform={`translate(${m.l},${m.t})`}>
            {/* x-axis */}
            <g transform={`translate(0,${innerH})`}>
              {data.map((d) => (
                <text key={d.channel} x={x(d.channel) + x.bandwidth() / 2} y={28} textAnchor="middle" fontSize={11}>
                  {d.channel}
                </text>
              ))}
              <line x1={0} x2={innerW} y1={0} y2={0} stroke="#ccc" />
            </g>
            {/* y-axis */}
            <g>
              {y.ticks(5).map((t) => (
                <g key={t} transform={`translate(0,${y(t)})`}>
                  <line x2={-6} stroke="#000" />
                  <text x={-9} y={4} fontSize={10} textAnchor="end">{d3.format(".2f")(t)}</text>
                  <line x1={0} x2={innerW} y1={0} y2={0} stroke="#eee" />
                </g>
              ))}
            </g>

            {/* bars */}
            {data.map((d) => {
              const roas = d.spend ? derived.totalRevenue / d.spend : 0;
              return (
                <rect key={d.channel} x={x(d.channel)} y={y(roas)} width={x.bandwidth()} height={innerH - y(roas)} fill={theme.avocado} />
              );
            })}
          </g>
        </svg>
      </div>
    );
  }

  function MarketsTable() {
    if (!derived) return null;
    const top = derived.byMarket.slice(0, 20);
    const money0 = (n) => "$" + d3.format(",.0f")(n);
    return (
      <div className="chart" style={{ background: "white", borderRadius: 16, padding: 16, marginTop: 14, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
        <h3 style={{ marginTop: 0 }}>Top Markets</h3>
        <div style={{ overflow: "auto", maxHeight: 380 }}>
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
                  <td style={{ padding: 10 }}>{d3.format(".1%")((r.sessions ? r.orders / r.sessions : 0))}</td>
                  <td style={{ padding: 10 }}>{d3.format(",")(r.orders)}</td>
                  <td style={{ padding: 10 }}>{money0(r.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---- Panels ----
  function PanelOverview() {
    return (
      <section style={{ display: tab === "overview" ? "block" : "none" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 12 }}>
          <RevenueRoasChart />
          {/* Mini funnel: sessions -> clicks -> orders */}
          <div className="chart" style={{ background: "white", borderRadius: 16, padding: 16, marginTop: 14, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
            <h3 style={{ marginTop: 0 }}>Funnel Snapshot</h3>
            {derived && (
              <div style={{ display: "grid", gap: 10 }}>
                <FunnelRow label="Sessions" value={d3.format(",")(derived.totalSessions)} color="#9e9e9e" />
                <FunnelRow label="Clicks" value={d3.format(",")(derived.clicks)} color={theme.avocado} />
                <FunnelRow label="Orders" value={d3.format(",")(derived.totalOrders)} color={theme.salsa} />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  function FunnelRow({ label, value, color }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>{label}</div>
        <div style={{ height: 12, background: "#f0f0f0", borderRadius: 999 }}>
          <div style={{ width: "100%", height: 12, background: color, opacity: 0.25, borderRadius: 999 }} />
        </div>
        <div style={{ fontVariantNumeric: "tabular-nums" }}>{value}</div>
      </div>
    );
  }

  function PanelChannels() {
    return (
      <section style={{ display: tab === "channels" ? "block" : "none" }}>
        <ROASByChannel />
      </section>
    );
  }

  function PanelMarkets() {
    return (
      <section style={{ display: tab === "markets" ? "block" : "none" }}>
        <MarketsTable />
      </section>
    );
  }

  function PanelData() {
    return (
      <section style={{ display: tab === "data" ? "block" : "none" }}>
        <div className="chart" style={{ background: "white", borderRadius: 16, padding: 16, marginTop: 14, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
          <h3 style={{ marginTop: 0 }}>Load Your CSV</h3>
          <p>
            Headers expected: <code>date,location_id,city,state,region,sessions,page_views,bounce_rate,conversion_rate,online_orders,avg_order_value,revenue,ad_spend_social,ad_spend_search,ad_spend_display,impressions_social,impressions_search,impressions_display,clicks_social,clicks_search,clicks_display</code>
          </p>
          <input type="file" accept=".csv" onChange={handleFile} />
          {error && <p style={{ color: theme.salsa, fontWeight: 700 }}>{error}</p>}
        </div>
      </section>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${theme.crema}, ${theme.tortilla})`, color: theme.charcoal }}>
      <Topbar />

      <div style={{ maxWidth: 1200, margin: "24px auto 80px", padding: "0 16px" }}>
        <Tabs />
        <KPIRow />
        <PanelOverview />
        <PanelChannels />
        <PanelMarkets />
        <PanelData />
      </div>

      <div style={{ textAlign: "center", color: "#6a6a6a", padding: "40px 0" }}>Made with 🌶️ + 📈 by Burrito Shack Analytics</div>
    </div>
  );
}
