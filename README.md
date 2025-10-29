# 🌯 Burrito Shack – Executive Marketing Dashboard

React + D3.js + Vite — an interactive analytics experience designed for executives to track marketing performance and uncover growth opportunities.

---

## ✅ Data Cleaning & Validation

The dataset (`burrito_shack_digital_performance_cleaned.csv`) was prepared from the raw (`burrito_shack_digital_performance.csv`) in Jupyter using Pandas with these steps:

- Standardized inconsistent date formats (`YYYY-MM-DD`, `MM/DD/YYYY`, `YYYY/MM/DD`) using explicit parsing rules
- Converted numerical fields from strings → numeric types
- Investigated nulls in spend & bounce rate:
  - Missing spend values interpreted as reporting gaps → imputed as `0` and flagged in the dataset for further remediation/investigation
  - Missing bounce rate  and average order values imputed as the median to avoid broken/misleading metrics
- Removed duplicate rows & ensured valid ranges (no negative spend/revenue)

🎯 Goal: clean, analytics-ready inputs with traceability for data quality issues.

---

## 📊 KPIs & Engineered Metrics

Core metrics displayed across the dashboard include:

- **Revenue**
- **Online Orders**
- **Conversion Rate (CVR)**
- **Average Order Value (AOV)**
- **Sessions** & **Bounce Rate**
- **Ad Spend** by:
  - Social / Search / Display
- **Return on Ad Spend (ROAS)**
  - Adjusts dynamically to selected channel filters
- **CTR / CPC** for channel efficiency

📈 Metrics roll up by date, market, and channel for multi-level insight.

---

## 🧭 Dashboard Layout & UX Design

Structure is optimized for strategic consumption:

### 🌐 Global filters (apply everywhere)
- Market (City, State)
- Channel (All / Social / Search / Display)
- Date Range selector + Reset

### 📂 Tabbed navigation
| Tab | Purpose |
|-----|---------|
| **Overview** | High-level KPIs, Revenue & ROAS time series, channel ROI, top markets |
| **Markets** | Geographic performance — revenue, ROAS, demand concentration |
| **Channels** | Paid media efficiency & mix effectiveness |
| **Details** | Row-level table for investigative analysis |
| **Insights** | MoM + YoY growth cards & automatically generated insights |

🎯 Executives get a quick story, analysts get depth when needed.

---

## 🎨 Visual Design Choices

- Burrito-inspired color theme (warm reds, avocados, tortillas 🌯)
- Card-style layout with shadows and rounded corners for hierarchy
- SVG charts built with D3.js for clarity and responsive interactions:
  - Tooltips on hover
  - Legends and callouts
  - Channel highlighting
  - KPI deltas with red/green indicators

💡 Designed to help decision-makers instantly spot movement and outliers.

---

## 🛠 Tech Stack

- **React + Vite**
- **D3.js**
- Client-only deployment (just place CSV in `public/cleaned.csv`)

---

## ▶️ Run Locally

```sh
npm install
npm run dev
```

Then visit the local server printed in your terminal.

---

## 📌 Current Status

✅ MVP complete  
✅ Insights tab with MoM and YoY analytics  
✅ Full drill-down filtering


