# RVCE Standalone Command Center & Microsoft Clarity Telemetry

A dedicated, high-performance standalone chatbot command center and visitor intelligence dashboard for **RV College of Engineering (RVCE)**.

---

## 🌟 Key Features

1. **Microsoft Clarity-Grade Visitor Intelligence**:
   - **Entry Page Tracking**: Exact landing URL where visitors arrive on the RVCE website.
   - **Exit / Drop-off Page Tracking**: The last page a visitor viewed before leaving.
   - **Referrer & UTM Attribution**: Detects traffic sources (Google Search, Direct, Instagram, LinkedIn, YouTube, UTM campaigns).
   - **IP-based Geo-Location**: Detects City, State/Region, Country, and ISP without annoying user permission popups.
   - **Device & Environment Fingerprint**: Mobile vs. Desktop vs. Tablet, OS (iOS/Android/Windows/macOS), Browser (Chrome/Safari/Edge), Screen resolution, and Viewport size.
   - **Rage Click Detection**: Automatically detects when users furiously click 3+ times on unresponsive elements or broken buttons.
   - **Scroll Depth & Copy Events**: Tracks 25%, 50%, 75%, 100% scroll depth and what exact text visitors copy (phone numbers, cutoff ranks, fees).
   - **Step-by-Step Session Replay Drawer**: Inspect complete chronological user timelines with exact time offsets (e.g., `00:00 Landed on /admissions` -> `00:25 Opened Chatbot` -> `01:30 Rage clicked #submit` -> `02:20 Exited on /fees`).

2. **Standalone Architecture**:
   - Completely independent from the 10 other institution dashboards.
   - Dedicated authentication (`rvceadmin` / `rvce123`).
   - Clean, isolated API endpoints.

3. **Supabase-Ready**:
   - PostgreSQL schema and RLS policies ready in `supabase_setup.sql`.

---

## 🚀 How to Run Locally

```bash
cd rvce-standalone
npm install
npm start
```

* **Dashboard URL**: [http://localhost:3001](http://localhost:3001)
* **Default Admin Credentials**:
  * **Username**: `rvceadmin`
  * **Password**: `rvce123`

---

## 📡 Integrating with WordPress or Website

Include the standalone tracker script in your RVCE website or chatbot widget:

```html
<script>
  window.RVCE_TELEMETRY_URL = "http://localhost:3001"; // or your Vercel URL
</script>
<script src="http://localhost:3001/clarity-telemetry.js"></script>
```

---

## 🗄️ Step 2: Supabase Migration

When you are ready to switch the database to Supabase:
1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Run the SQL script found in `supabase_setup.sql`.
3. Set your Supabase URL and Key in `.env`.
