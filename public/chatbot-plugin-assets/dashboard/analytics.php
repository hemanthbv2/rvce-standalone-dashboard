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
<title>RVCE — Keyword Analytics</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<style>
:root{--primary:#E31E24;--secondary:#6366f1;--success:#10b981;--warning:#f59e0b;--danger:#ef4444;--bg:#030712;--sidebar:rgba(17,24,39,0.8);--card:rgba(30,41,59,0.5);--border:rgba(255,255,255,0.08);--text:#f8fafc;--dim:#94a3b8}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--text);height:100vh;overflow:hidden;display:flex}
.mesh{position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;background:radial-gradient(circle at 10% 20%,rgba(99,102,241,0.1) 0%,transparent 40%),radial-gradient(circle at 90% 80%,rgba(227,30,36,0.08) 0%,transparent 40%),radial-gradient(circle at 50% 50%,rgba(15,23,42,1) 0%,rgba(3,7,18,1) 100%)}
aside{width:260px;background:var(--sidebar);backdrop-filter:blur(20px);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:30px 20px;z-index:10}
.logo{display:flex;align-items:center;gap:12px;margin-bottom:40px}
.logo-box{width:36px;height:36px;background:var(--primary);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;box-shadow:0 0 20px rgba(227,30,36,0.4)}
.logo h2{font-size:18px;font-weight:800}.logo p{font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px}
nav{list-style:none;flex-grow:1}
.ni{padding:14px 16px;border-radius:12px;cursor:pointer;margin-bottom:8px;display:flex;align-items:center;gap:12px;color:var(--dim);transition:all 0.2s;font-size:14px;font-weight:600;text-decoration:none}
.ni:hover{background:rgba(255,255,255,0.05);color:var(--text)}
.ni.active{background:rgba(99,102,241,0.1);color:var(--secondary);border:1px solid rgba(99,102,241,0.2)}
.ni svg{width:18px;height:18px;opacity:0.7}
.sf{padding-top:20px;border-top:1px solid var(--border)}
main{flex-grow:1;padding:30px;overflow-y:auto;display:flex;flex-direction:column}
h1{font-size:24px;font-weight:800;margin-bottom:4px}
.sub{color:var(--dim);font-size:14px;margin-bottom:24px}

.toolbar { display:flex; gap:16px; align-items:center; margin-bottom:24px; flex-wrap:wrap; background:var(--card); padding:16px; border-radius:16px; border:1px solid var(--border); backdrop-filter:blur(10px); }
.filters { display:flex; gap:8px; flex-grow:1 }
.f-select { padding:10px 16px; border-radius:10px; border:1px solid var(--border); background:rgba(0,0,0,0.3); color:var(--text); font-family:inherit; font-size:14px; outline:none; cursor:pointer; flex-grow:1; max-width:250px; transition:border-color 0.2s; }
.f-select:focus { border-color:var(--secondary); }
.f-select option { background:var(--bg); color:var(--text); }

.search-box { position:relative; flex-grow:2; min-width:200px; }
.search-box input { width:100%; padding:10px 16px 10px 40px; border-radius:10px; border:1px solid var(--border); background:rgba(0,0,0,0.3); color:var(--text); font-family:inherit; font-size:14px; outline:none; transition:border-color 0.2s; }
.search-box input:focus { border-color:var(--secondary); }
.search-box svg { position:absolute; left:12px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--dim); }

.export-btns { display:flex; gap:8px; }
.e-btn { padding:10px 16px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; border:none; transition:all 0.2s; }
.e-btn.pdf { background:#ef4444; color:#fff; }
.e-btn.pdf:hover { background:#dc2626; transform:translateY(-2px); }
.e-btn.excel { background:#10b981; color:#fff; }
.e-btn.excel:hover { background:#059669; transform:translateY(-2px); }

.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:24px}
.card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:24px;backdrop-filter:blur(10px);}
.card h3{font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:15px}
.span2{grid-column:span 2}.span3{grid-column:span 3}
.stat-val{font-size:36px;font-weight:800;margin-bottom:4px;}
.stat-sub{font-size:13px;color:var(--dim);}

.evt-list{display:flex;flex-direction:column;gap:10px;max-height:400px;overflow-y:auto;padding-right:6px}
.evt{display:flex;gap:12px;align-items:flex-start;padding:14px;background:rgba(255,255,255,0.03);border-radius:12px;border-left:3px solid var(--secondary);}
.evt .ic{font-size:16px;width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.evt .info{flex-grow:1}.evt .info .q{font-size:13px;font-weight:600;line-height:1.4;margin-bottom:4px;word-break:break-word;}.evt .info .meta{font-size:11px;color:var(--dim);}

.empty{text-align:center;color:var(--dim);padding:40px;font-style:italic}
.pulse{width:10px;height:10px;background:var(--success);border-radius:50%;box-shadow:0 0 10px var(--success);position:relative}
.pulse::after{content:'';position:absolute;top:-5px;left:-5px;right:-5px;bottom:-5px;border-radius:50%;border:2px solid var(--success);animation:pa 2s infinite}
@keyframes pa{0%{transform:scale(1);opacity:1}100%{transform:scale(2);opacity:0}}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:10px}

/* Table styles */
table { width:100%; border-collapse:collapse; font-size:13px; }
th, td { padding:12px; text-align:left; border-bottom:1px solid var(--border); }
th { font-size:11px; text-transform:uppercase; color:var(--dim); font-weight:700; letter-spacing:1px; }
tr:last-child td { border-bottom:none; }
</style>
</head>
<body>
<div class="mesh"></div>
<aside>
<div class="logo"><div class="logo-box">R</div><div><h2>COMMAND</h2><p>Chatbot Intelligence</p></div></div>
<nav>
<a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=index"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Overview</a>
<a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=interactions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Interactions</a>
<a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=sessions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>Sessions</a>
<a class="ni active" href="?action=rvce_chatbot_dashboard_view&tab=analytics"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>Analytics</a>
</nav>
<div class="sf"><div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--dim)"><div class="pulse"></div>SYSTEM ONLINE</div></div>
</aside>
<main>
<h1>📊 Keyword Analytics</h1>
<p class="sub">Filter, search, and export deep metrics on specific keywords</p>

<div class="toolbar">
    <div class="filters">
        <select id="keywordSelect" class="f-select" onchange="if(this.value) applyFilter(this.value)">
            <option value="" disabled selected>Filter by Main Keyword...</option>
            <option value="admission">Admissions</option>
            <option value="placement">Placements</option>
            <option value="faculty">Faculty</option>
            <option value="research">Research</option>
            <option value="department">Departments</option>
            <option value="hostel">Hostels</option>
            <option value="campus">Campus Life</option>
            <option value="ranking">Rankings</option>
            <option value="contact">Contact</option>
            <option value="innovation">Innovation Teams</option>
        </select>
    </div>
    
    <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="searchInput" placeholder="Search any keyword..." onkeyup="handleSearch(event)">
    </div>

    <div class="export-btns">
        <button class="e-btn pdf" onclick="exportPDF()">📄 Export PDF</button>
        <button class="e-btn excel" onclick="exportExcel()">📊 Export Excel</button>
    </div>
</div>

<div id="resultsArea" style="display:none;">
    <!-- Top Stats Row -->
    <div class="grid">
        <div class="card">
            <h3>Total Mentions</h3>
            <div class="stat-val" id="totalCount">0</div>
            <div class="stat-sub">across all sessions</div>
        </div>
        <div class="card">
            <h3>Detailed Keyword Associations</h3>
            <div style="height:120px; overflow-y:auto;">
                <table id="contextTable">
                    <thead><tr><th>Keyword</th><th>Count</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
        <div class="card">
            <h3>Session Context (Other Topics)</h3>
            <div style="height:120px; overflow-y:auto;">
                <table id="sessionContextTable">
                    <thead><tr><th>Action / Intent</th><th>Count</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Flow Header -->
    <div class="card" style="margin-bottom:20px; text-align:center;">
        <h3 style="margin:0 0 10px 0; color:var(--text);">User Journey Flow for: <strong style="color:var(--primary); font-size:24px;" id="kwDisplay"></strong></h3>
        <p style="color:var(--dim); font-size:13px;">Tracking the exact path users take before and after this topic.</p>
    </div>

    <!-- Journey Flowchart -->
    <div style="display:flex; gap:20px; margin-bottom:24px; align-items:stretch;">
        
        <!-- Preceding -->
        <div class="card" style="flex:1;">
            <h3>🔙 Entry Points (Before)</h3>
            <div style="font-size:11px; color:var(--dim); margin-bottom:10px;">What users did right BEFORE asking about this</div>
            <div style="height:150px; overflow-y:auto; padding-right:8px;" id="precedingList"></div>
        </div>

        <!-- Arrow -->
        <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; color:var(--dim);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </div>

        <!-- Subsequent -->
        <div class="card" style="flex:1; border-color:var(--secondary);">
            <h3 style="color:var(--secondary);">⏭️ Next Steps (After)</h3>
            <div style="font-size:11px; color:var(--dim); margin-bottom:10px;">What users clicked or asked right AFTER this</div>
            <div style="height:150px; overflow-y:auto; padding-right:8px;" id="subsequentList"></div>
        </div>

    </div>

    <div class="card">
        <h3>Raw Event Logs</h3>
        <div class="evt-list" id="eventList"></div>
    </div>
</div>

<div id="emptyArea" class="card">
    <div class="empty">Type a keyword or select a filter above to begin analysis.</div>
</div>

</main>

<script>
let currentData = [];
let currentKeyword = '';

const API_BASE = (window.location.hostname === 'localhost' || window.location.protocol === 'file:') 
    ? 'http://localhost:5000/api/logs' 
    : '/api/logs';
let currentLogsCache = [];

async function fetchLogs() {
    try {
        const res = await fetch(API_BASE);
        const data = await res.json();
        if (data.ok) {
            currentLogsCache = data.logs;
            return data.logs;
        }
    } catch(e) { console.warn('API fetch failed, falling back to local storage', e); }
    currentLogsCache = JSON.parse(localStorage.getItem('rvce_standalone_logs')||'[]');
    return currentLogsCache;
}

function getLogs(){ return currentLogsCache; }

// Fetch once on load
fetchLogs();

async function applyFilter(kw) {
    document.getElementById('searchInput').value = kw;
    await analyzeKeyword(kw);
}

async function handleSearch(e) {
    if (e.key === 'Enter') {
        await analyzeKeyword(e.target.value.trim());
    }
}

async function analyzeKeyword(kw) {
    kw = kw.toLowerCase().trim();
    if (!kw) {
        document.getElementById('resultsArea').style.display = 'none';
        document.getElementById('emptyArea').style.display = 'block';
        return;
    }
    
    currentKeyword = kw;
    // Always fetch fresh logs before analyzing
    await fetchLogs();
    const rawLogs = getLogs();
    
    // Consider only valid keywords (messages with a known intent) and clicks
    const logs = rawLogs.filter(l => {
        if (l.t === 'message' && l.i && l.i !== 'unmatched' && !l.i.startsWith('moderated')) return true;
        if (l.i && l.i.startsWith('click:')) return true;
        return false;
    });
    
    // Filter logs that contain the keyword in query (q) or intent (i) or message (m)
    currentData = logs.filter(l => {
        let text = ((l.q||'')+ ' '+(l.i||'')).toLowerCase();
        if(l.m) text += ' ' + Object.values(l.m).join(' ').toLowerCase();
        return text.includes(kw);
    });

    document.getElementById('emptyArea').style.display = 'none';
    document.getElementById('resultsArea').style.display = 'block';
    document.getElementById('kwDisplay').textContent = kw;
    document.getElementById('totalCount').textContent = currentData.length;

    // Analyze Context (e.g. departments, UG/PG for admissions)
    const contextCounts = {};
    const subTopics = ['ug', 'pg', 'kcet', 'comedk', 'management quota', 'phd', 'btech', 'mtech', 'snq', 'dcet', 'pgcet', 'cse', 'ece', 'mech', 'civil', 'ise', 'eee', 'aiml', 'aerospace', 'biotech', 'chemical', 'hostel', 'mess', 'canteen', 'bus', 'transport', 'scholarship', 'fees', 'cutoff', 'ranking', 'placement', 'highest package', 'average package', 'recruiter', 'company', 'internship', 'faculty', 'hod', 'dean', 'principal', 'sports', 'fest', 'club', 'ncc', 'nss', 'wifi', 'library'];
    
    currentData.forEach(l => {
        let text = (l.q || '').toLowerCase();
        subTopics.forEach(sub => {
            if (text.includes(sub) && sub !== kw) {
                contextCounts[sub] = (contextCounts[sub] || 0) + 1;
            }
        });
    });

    const sortedCtx = Object.entries(contextCounts).sort((a,b)=>b[1]-a[1]);
    const ctxTbody = document.querySelector('#contextTable tbody');
    if (sortedCtx.length > 0) {
        ctxTbody.innerHTML = sortedCtx.map(([ctx, count]) => `<tr><td>${ctx.toUpperCase()}</td><td>${count}</td></tr>`).join('');
    } else {
        ctxTbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#94a3b8;font-style:italic">No associated keywords</td></tr>';
    }

    // Session Context (What else did they do in these sessions?)
    const sessionIds = [...new Set(currentData.map(l => l.s))];
    const sessionEvents = logs.filter(l => sessionIds.includes(l.s) && !currentData.includes(l) && l.i && l.i !== 'unmatched' && !l.i.startsWith('moderated'));
    
    const intentCounts = {};
    sessionEvents.forEach(l => {
        let label = l.i;
        if (label.startsWith('click:')) label = label.replace('click:Button: ', 'Clicked: ');
        else if (label.startsWith('dept_')) label = 'Dept: ' + label.replace('dept_', '').toUpperCase();
        else label = 'Asked: ' + label.charAt(0).toUpperCase() + label.slice(1);
        intentCounts[label] = (intentCounts[label] || 0) + 1;
    });

    const sortedIntents = Object.entries(intentCounts).sort((a,b)=>b[1]-a[1]);
    const sessTbody = document.querySelector('#sessionContextTable tbody');
    if (sortedIntents.length > 0) {
        sessTbody.innerHTML = sortedIntents.map(([ctx, count]) => `<tr><td>${ctx}</td><td>${count}</td></tr>`).join('');
    } else {
        sessTbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#94a3b8;font-style:italic">No other context recorded</td></tr>';
    }

    // Extract Journey Data
    const sessions = {};
    logs.forEach(l => {
        if (!sessions[l.s]) sessions[l.s] = [];
        sessions[l.s].push(l);
    });

    // Extract Journey Data
    const preCounts = {};
    const subCounts = {};

    currentData.forEach(evt => {
        const sLogs = sessions[evt.s];
        // Ensure chronological order
        sLogs.sort((a,b) => new Date(a.d) - new Date(b.d));
        
        const idx = sLogs.findIndex(l => l === evt);
        
        if (idx > 0) {
            const pre = sLogs[idx - 1];
            let label = pre.i || 'Unknown';
            if (label.startsWith('click:')) label = label.replace('click:Button: ', 'Clicked: ');
            else if (label === 'unmatched') label = `Typed: "${pre.q}"`;
            else if (pre.t === 'message') label = `Asked: ${label.charAt(0).toUpperCase() + label.slice(1)}`;
            preCounts[label] = (preCounts[label] || 0) + 1;
        }

        if (idx < sLogs.length - 1) {
            const sub = sLogs[idx + 1];
            let label = sub.i || 'Unknown';
            if (label.startsWith('click:')) label = label.replace('click:Button: ', 'Clicked: ');
            else if (label === 'unmatched') label = `Typed: "${sub.q}"`;
            else if (sub.t === 'message') label = `Asked: ${label.charAt(0).toUpperCase() + label.slice(1)}`;
            subCounts[label] = (subCounts[label] || 0) + 1;
        }
    });

    const formatList = (counts, containerId) => {
        const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0, 10);
        const el = document.getElementById(containerId);
        if (sorted.length === 0) {
            el.innerHTML = '<div style="color:var(--dim); font-style:italic; font-size:12px; text-align:center; padding:10px;">No specific flow data recorded.</div>';
            return;
        }
        
        const total = sorted.reduce((sum, item) => sum + item[1], 0);
        
        el.innerHTML = sorted.map(([label, count]) => {
            const pct = Math.round((count / total) * 100);
            return `<div style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600; margin-bottom:4px;">
                    <span>${label.replace(/_/g, ' ')}</span>
                    <span style="color:var(--dim);">${pct}% (${count})</span>
                </div>
                <div style="width:100%; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:var(--secondary); border-radius:3px;"></div>
                </div>
            </div>`;
        }).join('');
    };

    formatList(preCounts, 'precedingList');
    formatList(subCounts, 'subsequentList');

    // Render Event List
    const el = document.getElementById('eventList');
    if (!currentData.length) {
        el.innerHTML = '<div class="empty">No events found for this keyword.</div>';
    } else {
        el.innerHTML = currentData.reverse().map(l => {
            const time = new Date(l.d).toLocaleString();
            let highlightQ = (l.q||'').replace(new RegExp(`(${kw})`, 'gi'), '<span style="background:rgba(227, 30, 36, 0.3);padding:0 2px;border-radius:3px">$1</span>');
            return `<div class="evt">
                <div class="ic">💬</div>
                <div class="info">
                    <div class="q">${highlightQ}</div>
                    <div class="meta">Session: ${(l.s||'').split('_')[1]||l.s} · ${time} · Intent: ${l.i||'N/A'}</div>
                </div>
            </div>`;
        }).join('');
    }
}

// Export functions
function exportPDF() {
    if (!currentData.length) return alert("No data to export!");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Keyword Analytics Report: "${currentKeyword}"`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Total Mentions: ${currentData.length}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38);

    const tableData = currentData.map(l => [
        new Date(l.d).toLocaleString(),
        (l.s||'').split('_')[1]||l.s,
        l.q || '',
        l.i || ''
    ]);

    doc.autoTable({
        startY: 45,
        head: [['Timestamp', 'Session', 'Query / Action', 'Intent']],
        body: tableData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [227, 30, 36] }
    });

    doc.save(`RVCE_Analytics_${currentKeyword}.pdf`);
}

function exportExcel() {
    if (!currentData.length) return alert("No data to export!");
    
    const wsData = currentData.map(l => ({
        Timestamp: new Date(l.d).toLocaleString(),
        SessionID: l.s,
        Query: l.q,
        Intent: l.i,
        Metadata: l.m ? JSON.stringify(l.m) : ''
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analytics");
    
    XLSX.writeFile(wb, `RVCE_Analytics_${currentKeyword}.xlsx`);
}

// Ensure local storage has some data if testing locally
window.onload = () => {
    // If no logs, prompt to go to overview to mock data
    if (!localStorage.getItem('rvce_standalone_logs')) {
        document.getElementById('emptyArea').innerHTML = '<div class="empty">No logs found. Go to the Overview page and click "Mock Data" to generate some test logs.</div>';
    }
};
</script>
</body>
</html>
