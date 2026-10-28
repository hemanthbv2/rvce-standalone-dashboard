<?php if (!defined('ABSPATH')) exit; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<script>
    const token = sessionStorage.getItem('dashboard_token');
    if (!token) window.location.href = '?action=rvce_chatbot_dashboard_view&tab=login';
    const API_URL = "<?php echo esc_js(untrailingslashit(rest_url('rvce/v1'))); ?>";
</script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RVCE Chatbot — Command Center</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
    <style>
        :root {
            --primary: #E31E24;
            --primary-glow: rgba(227, 30, 36, 0.4);
            --secondary: #6366f1;
            --secondary-glow: rgba(99, 102, 241, 0.3);
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --bg: #030712;
            --sidebar: rgba(17, 24, 39, 0.8);
            --card: rgba(30, 41, 59, 0.5);
            --border: rgba(255, 255, 255, 0.08);
            --text: #f8fafc;
            --text-dim: #94a3b8;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: var(--bg);
            color: var(--text);
            height: 100vh;
            overflow: hidden;
            display: flex;
        }

        /* --- Dynamic Mesh Background --- */
        .mesh-bg {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1;
            background: 
                radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(227, 30, 36, 0.08) 0%, transparent 40%),
                radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 1) 0%, rgba(3, 7, 18, 1) 100%);
        }

        /* --- Sidebar --- */
        aside {
            width: 260px;
            background: var(--sidebar);
            backdrop-filter: blur(20px);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            padding: 30px 20px;
            z-index: 10;
        }
        .logo-area {
            display: flex; align-items: center; gap: 12px; margin-bottom: 40px;
        }
        .logo-box {
            width: 36px; height: 36px; background: var(--primary); border-radius: 10px;
            display: flex; align-items: center; justify-content: center; font-weight: 800;
            box-shadow: 0 0 20px var(--primary-glow);
        }
        .logo-text h2 { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
        .logo-text p { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; }

        .nav-links { list-style: none; flex-grow: 1; }
        .nav-item {
            padding: 14px 16px; border-radius: 12px; cursor: pointer;
            margin-bottom: 8px; display: flex; align-items: center; gap: 12px;
            color: var(--text-dim); transition: all 0.2s; font-size: 14px; font-weight: 600;
        }
        .nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text); }
        .nav-item.active { background: rgba(99, 102, 241, 0.1); color: var(--secondary); border: 1px solid rgba(99, 102, 241, 0.2); }
        .nav-item svg { width: 18px; height: 18px; opacity: 0.7; }

        .sidebar-footer { padding-top: 20px; border-top: 1px solid var(--border); }

        /* --- Main Content --- */
        main {
            flex-grow: 1; padding: 30px; overflow-y: auto; position: relative;
        }
        header {
            display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;
        }
        .header-title h1 { font-size: 24px; font-weight: 800; }
        .header-title p { color: var(--text-dim); font-size: 14px; }

        .actions { display: flex; gap: 12px; }
        .btn {
            padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border);
            background: var(--card); color: var(--text); font-size: 13px; font-weight: 600;
            cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;
        }
        .btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
        .btn-primary { background: var(--secondary); border-color: var(--secondary); }
        .btn-primary:hover { background: #4f46e5; box-shadow: 0 0 15px var(--secondary-glow); }

        /* --- Grid Layout --- */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            grid-template-rows: auto auto;
            gap: 20px;
        }

        .card {
            background: var(--card); border: 1px solid var(--border); border-radius: 20px;
            padding: 24px; backdrop-filter: blur(10px); position: relative;
            transition: border-color 0.3s;
        }
        .card:hover { border-color: rgba(255,255,255,0.2); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .card-header h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-dim); }
        .card-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; }

        .stat-val { font-size: 36px; font-weight: 800; margin-bottom: 4px; }
        .stat-trend { font-size: 12px; display: flex; align-items: center; gap: 4px; }
        .trend-up { color: var(--success); }
        .trend-down { color: var(--danger); }

        /* --- Large Visuals --- */
        .chart-card { grid-column: span 2; }
        .logs-card { grid-column: span 2; grid-row: span 2; }

        /* --- Interaction Stream --- */
        .stream { display: flex; flex-direction: column; gap: 12px; height: 500px; overflow-y: auto; padding-right: 8px; }
        .uq-list { display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow-y: auto; padding-right: 6px; }
        .uq-item { padding: 12px 16px; background: rgba(239,68,68,0.06); border-radius: 10px; border-left: 3px solid var(--danger); font-size: 13px; font-weight: 500; display: flex; justify-content: space-between; align-items: center; }
        .uq-item .uq-time { font-size: 10px; color: var(--text-dim); flex-shrink: 0; margin-left: 12px; }
        .mod-item { padding: 12px 16px; background: rgba(245,158,11,0.06); border-radius: 10px; border-left: 3px solid var(--warning); font-size: 13px; font-weight: 500; display: flex; justify-content: space-between; align-items: center; }
        .mod-item .mod-type { font-size: 10px; padding: 2px 8px; border-radius: 6px; background: rgba(245,158,11,0.15); color: var(--warning); font-weight: 700; flex-shrink: 0; margin-left: 12px; }
        .stream-item {
            padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px;
            border-left: 3px solid transparent; transition: all 0.2s;
            display: flex; align-items: flex-start; gap: 14px;
        }
        .stream-item:hover { background: rgba(255,255,255,0.06); transform: translateX(5px); }
        .stream-item.message { border-left-color: var(--secondary); }
        .stream-item.click { border-left-color: var(--success); }
        .stream-item.interaction { border-left-color: var(--success); }
        .stream-item.ui { border-left-color: var(--warning); }
        .stream-item.moderated { border-left-color: var(--danger); }
        .stream-item.hover { border-left-color: #a78bfa; }
        .stream-item.copy { border-left-color: #f472b6; }
        .stream-item.typing { border-left-color: #38bdf8; }
        .stream-item.scroll { border-left-color: #67e8f9; }
        .stream-item.dwell { border-left-color: #fbbf24; }
        .stream-item.visibility { border-left-color: #818cf8; }
        .stream-item.session { border-left-color: #fb923c; }
        .stream-item.focus { border-left-color: #34d399; }
        .stream-item.blur { border-left-color: #94a3b8; }

        .item-icon { 
            font-size: 18px; width: 36px; height: 36px; border-radius: 10px; 
            background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;
        }
        .item-content { flex-grow: 1; }
        .item-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .item-session { font-size: 11px; color: var(--text-dim); font-weight: 700; opacity: 0.6; }
        .item-time { font-size: 10px; color: var(--text-dim); }
        .item-text { font-size: 14px; color: var(--text); font-weight: 500; }
        .item-sub { font-size: 11px; color: var(--text-dim); margin-top: 4px; }

        /* --- Pulse Effect --- */
        .pulse { width: 10px; height: 10px; background: var(--success); border-radius: 50%; box-shadow: 0 0 10px var(--success); position: relative; }
        .pulse::after { content: ''; position: absolute; top: -5px; left: -5px; right: -5px; bottom: -5px; border-radius: 50%; border: 2px solid var(--success); animation: pulse-anim 2s infinite; }
        @keyframes pulse-anim { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }

        /* --- Custom Scrollbar --- */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        .empty-state { text-align: center; color: var(--text-dim); padding: 50px 0; font-style: italic; }

        #dateFilter { background: transparent; border: none; color: var(--text); font-family: inherit; font-size: 13px; cursor: pointer; outline: none; }

        /* --- Behavior Tags --- */
        .behavior-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; margin: 2px; }
        .behavior-tag.high { background: rgba(16,185,129,0.15); color: #10b981; }
        .behavior-tag.medium { background: rgba(245,158,11,0.15); color: #f59e0b; }
        .behavior-tag.low { background: rgba(239,68,68,0.15); color: #ef4444; }

        /* --- Mini stat in card --- */
        .mini-stat { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 6px; }
        .mini-stat .label { font-size: 12px; color: var(--text-dim); flex-grow: 1; }
        .mini-stat .value { font-size: 14px; font-weight: 700; }

        .full-width { grid-column: span 5; }
        .span-3 { grid-column: span 3; }
        .span-2 { grid-column: span 2; }
        .span-1 { grid-column: span 1; }
    </style>
</head>
<body>
    <div class="mesh-bg"></div>

    <aside>
        <div class="logo-area">
            <div class="logo-box">R</div>
            <div class="logo-text">
                <h2>COMMAND</h2>
                <p>Chatbot Intelligence</p>
            </div>
        </div>

        <nav class="nav-links">
            <a class="nav-item active" href="?action=rvce_chatbot_dashboard_view&tab=index" style="text-decoration:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Overview
            </a>
            <a class="nav-item" href="?action=rvce_chatbot_dashboard_view&tab=interactions" style="text-decoration:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                Interactions
            </a>
            <a class="nav-item" href="?action=rvce_chatbot_dashboard_view&tab=sessions" style="text-decoration:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                Sessions
            </a>
            <a class="nav-item" href="?action=rvce_chatbot_dashboard_view&tab=leads" style="text-decoration:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>Leads</a>
<a class="nav-item" href="?action=rvce_chatbot_dashboard_view&tab=analytics" style="text-decoration:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                Analytics
            </a>
        </nav>

        <div class="sidebar-footer">
            <div style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-dim);">
                <div class="pulse"></div>
                SYSTEM ONLINE
            </div>
        </div>
    </aside>

    <main>
        <header>
            <div class="header-title">
                <h1>Intelligence Dashboard</h1>
                <p>Tracking full user journey & micro-interactions</p>
            </div>
            <div class="actions">
                <div class="btn">
                    📅 <input type="date" id="dateFilter" onchange="render()">
                </div>
                <button class="btn" onclick="render()">🔄 Sync</button>
                <button class="btn" style="color: var(--success); border-color: rgba(16,185,129,0.2);" onclick="exportCSV()">📥 Export Excel</button>
                <button class="btn btn-primary" onclick="generateTestData()">🧪 Mock Data</button>
                <button class="btn" style="color: var(--danger); border-color: rgba(239,68,68,0.2);" onclick="clearAllData()">🗑️ Reset</button>
            </div>
        </header>

        <div class="dashboard-grid">
            <!-- Summary Stats -->
            <div class="card">
                <div class="card-header">
                    <h3>Total Events</h3>
                    <div class="card-icon">📈</div>
                </div>
                <div class="stat-val" id="totalEvents">0</div>
                <div class="stat-trend trend-up">+0.0% <small>since last session</small></div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Active Users</h3>
                    <div class="card-icon">👥</div>
                </div>
                <div class="stat-val" id="activeUsers">1</div>
                <div class="stat-trend">Live connections</div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Click Rate</h3>
                    <div class="card-icon">🖱️</div>
                </div>
                <div class="stat-val" id="clickRate">0%</div>
                <div class="stat-trend trend-up">Interactivity index</div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Success Score</h3>
                    <div class="card-icon">✨</div>
                </div>
                <div class="stat-val" id="successScore">0%</div>
                <div class="stat-trend">Intent accuracy</div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Time to Resolution</h3>
                    <div class="card-icon">⚡</div>
                </div>
                <div class="stat-val" id="avgTTR">0s</div>
                <div class="stat-trend">Avg time to action</div>
            </div>


            <div class="card">
                <div class="card-header">
                    <h3>Typos Auto-Fixed</h3>
                    <div class="card-icon">✍️</div>
                </div>
                <div class="stat-val" id="typosFixed">0</div>
                <div class="stat-trend">Fuzzy matches</div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Ghost Rate</h3>
                    <div class="card-icon">👻</div>
                </div>
                <div class="stat-val" id="ghostRate">0%</div>
                <div class="stat-trend">Zero interaction</div>
            </div>

            <div class="card" style="border-color: rgba(239,68,68,0.3);">
                <div class="card-header">
                    <h3 style="color:var(--danger);">Frustration Index</h3>
                    <div class="card-icon" style="background:rgba(239,68,68,0.1);">😡</div>
                </div>
                <div class="stat-val" id="frustrationIndex" style="color:var(--danger);">0%</div>
                <div class="stat-trend trend-down">Negative experiences</div>
            </div>

            <!-- Main Visuals -->
            <div class="card chart-card span-2">
                <div class="card-header">
                    <h3>User Journey Funnel</h3>
                </div>
                <div style="height: 300px;">
                    <canvas id="funnelChart"></canvas>
                </div>
            </div>

            <div class="card chart-card span-2">
                <div class="card-header">
                    <h3>Topic Popularity (Top 10)</h3>
                </div>
                <div style="height: 300px;">
                    <canvas id="topicChart"></canvas>
                </div>
            </div>

            <div class="card chart-card span-2">
                <div class="card-header">
                    <h3>Peak Activity (Time of Day)</h3>
                </div>
                <div style="height: 300px;">
                    <canvas id="flowChart"></canvas>
                </div>
            </div>

            <!-- Deep Analytics Lists -->
            <div class="card chart-card">
                <div class="card-header">
                    <h3>🚪 Top Exit Points</h3>
                </div>
                <div class="uq-list" id="exitList">
                    <div class="empty-state">No drop-offs detected</div>
                </div>
            </div>

            <div class="card chart-card">
                <div class="card-header">
                    <h3>🔗 Frequently Combined</h3>
                </div>
                <div class="uq-list" id="combinationList">
                    <div class="empty-state">No multi-intents detected</div>
                </div>
            </div>
            
            <div class="card chart-card">
                <div class="card-header">
                    <h3>✍️ Typos & Slang Fixed</h3>
                </div>
                <div class="uq-list" id="typoList">
                    <div class="empty-state">No typos corrected</div>
                </div>
            </div>

            <!-- Unanswered & Moderated -->
            <div class="card chart-card">
                <div class="card-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <h3>❓ Unanswered Questions</h3>
                        <div class="card-icon" style="font-size:11px;color:var(--danger)" id="uqCount">0</div>
                    </div>
                </div>
                <div class="uq-list" id="unansweredList">
                    <div class="empty-state">No unanswered questions — great! 🎉</div>
                </div>
            </div>

            <div class="card chart-card">
                <div class="card-header">
                    <h3>🛡️ Moderated Queries</h3>
                    <div class="card-icon" style="font-size:11px;color:var(--warning)" id="modCount">0</div>
                </div>
                <div class="uq-list" id="moderatedList">
                    <div class="empty-state">No moderated queries</div>
                </div>
            </div>

        </div>
    </main>

    <script>
        let mainChart = null;
        let flowChart = null;
        let selectedSession = null;

        const ICONS = {
            'message': '💬',
            'click': '🖱️',
            'ui': '⚙️',
            'interaction': '🖱️',
            'moderated': '🛡️',
            'hover': '👆',
            'copy': '📋',
            'typing': '⌨️',
            'scroll': '📜',
            'dwell': '⏱️',
            'focus': '🎯',
            'blur': '💤',
            'visibility': '👁️',
            'session': '🔌'
        };

        const API_BASE = (window.location.hostname === 'localhost' || window.location.protocol === 'file:') 
            ? 'http://localhost:5000/api/logs' 
            : '/api/logs';

                async function fetchLogs() {
            // 1. Fetch from WordPress REST API
            try {
                if (typeof API_URL !== 'undefined' && API_URL) {
                    const res = await fetch(API_URL + '/overview-data', { signal: AbortSignal.timeout(2500) });
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data) && data.length > 0) return data;
                    }
                }
            } catch(e) {}

            // 2. Fetch from Central Node.js API
            try {
                const res = await fetch('/api/logs?instituteId=rvce', { signal: AbortSignal.timeout(2500) });
                if (res.ok) {
                    const data = await res.json();
                    if (data.ok && Array.isArray(data.logs) && data.logs.length > 0) return data.logs;
                }
            } catch(e) {}

            // 3. Fallback to LocalStorage
            try {
                const local = localStorage.getItem('rvce_standalone_logs');
                if (local) {
                    const parsed = JSON.parse(local);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            } catch(e) {}

            return [];
        }
            if (signalChart) signalChart.destroy();
            const ctx = document.getElementById('signalChart').getContext('2d');
            signalChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: Object.keys(signals),
                    datasets: [{
                        label: 'Behavior Signals',
                        data: Object.values(signals),
                        backgroundColor: 'rgba(99, 102, 241, 0.2)',
                        borderColor: '#6366f1',
                        borderWidth: 2,
                        pointBackgroundColor: '#6366f1'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { r: { grid: { color: 'rgba(255,255,255,0.05)' }, angleLines: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false }, pointLabels: { color: '#94a3b8', font: { size: 11, weight: '600' } } } }
                }
            });
        }

        function renderInterestMap(logs) {
            const container = document.getElementById('interestMap');
            // Count what content users interacted with
            const interestCounts = {};
            logs.forEach(l => {
                if (!l.i) return;
                // Extract meaningful labels
                let label = '';
                if (l.t === 'message' && l.i !== 'unmatched' && !l.i.startsWith('moderated')) {
                    label = l.i.replace(/_/g, ' ');
                } else if (l.i.startsWith('click:Button:')) {
                    label = l.i.replace('click:Button: ', '').replace(/[^a-zA-Z\s]/g, '').trim();
                } else if (l.i.startsWith('hover:')) {
                    label = l.i.replace('hover:', '').replace(/[^a-zA-Z\s]/g, '').trim();
                } else if (l.i.startsWith('copy:')) {
                    label = 'Copied: ' + l.i.replace('copy:', '').substring(0, 30);
                }
                if (label && label.length > 1) {
                    label = label.charAt(0).toUpperCase() + label.slice(1);
                    interestCounts[label] = (interestCounts[label] || 0) + 1;
                }
            });

            const sorted = Object.entries(interestCounts).sort((a,b) => b[1] - a[1]).slice(0, 20);
            if (sorted.length === 0) {
                container.innerHTML = '<div class="empty-state">No interest data yet.</div>';
                return;
            }
            const maxCount = sorted[0][1];
            container.innerHTML = sorted.map(([label, count]) => {
                const intensity = count / maxCount;
                const tagClass = intensity > 0.6 ? 'high' : intensity > 0.3 ? 'medium' : 'low';
                const size = Math.max(11, Math.min(16, 11 + intensity * 5));
                return `<span class="behavior-tag ${tagClass}" style="font-size:${size}px">${label} <strong>(${count})</strong></span>`;
            }).join('');
        }

        function renderUnanswered(logs) {
            const unanswered = logs.filter(l => l.t === 'message' && l.i === 'unmatched' && !l.resolved).reverse();
            const el = document.getElementById('unansweredList');
            document.getElementById('uqCount').textContent = unanswered.length;
            if (!unanswered.length) {
                el.innerHTML = '<div class="empty-state">No unanswered questions — great! 🎉</div>';
                return;
            }
            el.innerHTML = unanswered.slice(0, 30).map(l => {
                const time = new Date(l.d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return `<div class="uq-item">
                            <span style="flex-grow:1; margin-right:10px;">❓ "${l.q}"</span>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span class="uq-time" style="margin-left:0;">${time}</span>
                                <button class="btn" style="padding:4px 8px; font-size:10px; background:rgba(16,185,129,0.1); color:var(--success); border-color:var(--success);" onclick="resolveQuestion('${l.d}')">✅ Resolve</button>
                            </div>
                        </div>`;
            }).join('');
        }

        function resolveQuestion(timestamp) {
            const existing = JSON.parse(localStorage.getItem('rvce_standalone_logs') || '[]');
            const logIdx = existing.findIndex(l => l.d === timestamp);
            if (logIdx !== -1) {
                existing[logIdx].resolved = true;
                localStorage.setItem('rvce_standalone_logs', JSON.stringify(existing));
                render();
            }
        }

        function renderModerated(logs) {
            const moderated = logs.filter(l => l.t === 'message' && l.i && l.i.startsWith('moderated_')).reverse();
            const el = document.getElementById('moderatedList');
            document.getElementById('modCount').textContent = moderated.length;
            if (!moderated.length) {
                el.innerHTML = '<div class="empty-state">No moderated queries</div>';
                return;
            }
            el.innerHTML = moderated.slice(0, 30).map(l => {
                const type = l.i.replace('moderated_', '');
                const time = new Date(l.d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return `<div class="mod-item"><span>🛡️ "${l.q}"</span><span class="mod-type">${type} · ${time}</span></div>`;
            }).join('');
        }

        function renderTopicChart(logs) {
            const counts = {};
            logs.filter(l => l.t === 'message' && l.i !== 'unmatched' && !l.i.startsWith('moderated')).forEach(l => {
                counts[l.i] = (counts[l.i] || 0) + 1;
            });
            const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10);
            
            if (window.topicChartInst) window.topicChartInst.destroy();
            const ctx = document.getElementById('topicChart').getContext('2d');
            window.topicChartInst = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sorted.map(i => i[0].replace(/_/g, ' ')),
                    datasets: [{
                        label: 'Requests',
                        data: sorted.map(i => i[1]),
                        backgroundColor: '#6366f1',
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                        y: { grid: { display: false }, ticks: { color: '#f8fafc', font: { size: 11 } } }
                    }
                }
            });
        }




        function renderGhostRate(logs, sessions) {
            if (!sessions.length) return;
            let ghostCount = 0;
            sessions.forEach(sid => {
                const sLogs = logs.filter(l => l.s === sid);
                const hasInteraction = sLogs.some(l => l.t === 'message' || l.t === 'interaction' || l.t === 'feedback' || l.i === 'fuzzy_match');
                if (!hasInteraction) ghostCount++;
            });
            const rate = Math.round((ghostCount / sessions.length) * 100);
            document.getElementById('ghostRate').textContent = rate + '%';
        }

        function renderExitPoints(logs, sessions) {
            const exitCounts = {};
            sessions.forEach(sid => {
                const sLogs = logs.filter(l => l.s === sid && l.t === 'message' && l.i !== 'unmatched' && !l.i.startsWith('moderated'));
                if (sLogs.length > 0) {
                    const lastIntent = sLogs[sLogs.length - 1].i;
                    exitCounts[lastIntent] = (exitCounts[lastIntent] || 0) + 1;
                }
            });
            const sorted = Object.entries(exitCounts).sort((a,b) => b[1] - a[1]).slice(0, 10);
            const el = document.getElementById('exitList');
            if (!sorted.length) {
                el.innerHTML = '<div class="empty-state">No drop-offs detected</div>';
                return;
            }
            el.innerHTML = sorted.map(i => `<div class="uq-item"><span>🚪 ${i[0].replace(/_/g, ' ')}</span><span class="uq-time">${i[1]} sessions</span></div>`).join('');
        }

        function renderCombinations(logs) {
            const multiLogs = logs.filter(l => l.m && l.m.multi_part === true);
            const combos = {};
            // group by timestamp + session
            const groups = {};
            multiLogs.forEach(l => {
                const key = l.s + '_' + l.d;
                if (!groups[key]) groups[key] = [];
                groups[key].push(l.i);
            });
            
            Object.values(groups).forEach(arr => {
                if (arr.length > 1) {
                    arr.sort();
                    const pair = arr.join(' + ');
                    combos[pair] = (combos[pair] || 0) + 1;
                }
            });

            const sorted = Object.entries(combos).sort((a,b) => b[1] - a[1]).slice(0, 10);
            const el = document.getElementById('combinationList');
            if (!sorted.length) {
                el.innerHTML = '<div class="empty-state">No multi-intents detected</div>';
                return;
            }
            el.innerHTML = sorted.map(i => `<div class="uq-item"><span>🔗 ${i[0].replace(/_/g, ' ')}</span><span class="uq-time">${i[1]} occurrences</span></div>`).join('');
        }

        function renderTypos(logs) {
            const typos = logs.filter(l => l.i === 'fuzzy_match').reverse();
            document.getElementById('typosFixed').textContent = typos.length;
            
            const el = document.getElementById('typoList');
            if (!typos.length) {
                el.innerHTML = '<div class="empty-state">No typos corrected</div>';
                return;
            }
            el.innerHTML = typos.slice(0, 20).map(l => {
                const time = new Date(l.d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return `<div class="mod-item"><span>✍️ "${l.q}" → ${l.m?.suggestions || 'Unknown'}</span><span class="mod-type">${time}</span></div>`;
            }).join('');
        }


        // Auto-sync every 60 seconds
        setInterval(render, 60000);
        render();
    </script>

</body>
</html>
