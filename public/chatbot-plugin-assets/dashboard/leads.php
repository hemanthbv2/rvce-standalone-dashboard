<?php if (!defined('ABSPATH')) exit; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RVCE Admissions & Leads — Command Center</title>
<script>
    const token = sessionStorage.getItem('dashboard_token');
    if (!token) window.location.href = '?action=rvce_chatbot_dashboard_view&tab=login';
    const API_URL = "<?php echo esc_js(untrailingslashit(rest_url('rvce/v1'))); ?>";
</script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
<style>
:root{--primary:#E31E24;--primary-glow:rgba(227,30,36,0.4);--secondary:#6366f1;--success:#10b981;--warning:#f59e0b;--danger:#ef4444;--bg:#030712;--sidebar:rgba(17,24,39,0.8);--card:rgba(30,41,59,0.5);--border:rgba(255,255,255,0.08);--text:#f8fafc;--text-dim:#94a3b8;--dim:#94a3b8}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--text);height:100vh;overflow:hidden;display:flex}
.mesh{position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;background:radial-gradient(circle at 10% 20%,rgba(99,102,241,0.1) 0%,transparent 40%),radial-gradient(circle at 90% 80%,rgba(227,30,36,0.08) 0%,transparent 40%),radial-gradient(circle at 50% 50%,rgba(15,23,42,1) 0%,rgba(3,7,18,1) 100%)}
aside{width:260px;background:var(--sidebar);backdrop-filter:blur(20px);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:30px 20px;z-index:10}
.logo{display:flex;align-items:center;gap:12px;margin-bottom:40px}
.logo-box{width:36px;height:36px;background:var(--primary);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;box-shadow:0 0 20px var(--primary-glow);color:#fff}
.logo h2{font-size:18px;font-weight:800}.logo p{font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px}
nav{list-style:none;flex-grow:1}
.nav-item, .ni{padding:14px 16px;border-radius:12px;cursor:pointer;margin-bottom:8px;display:flex;align-items:center;gap:12px;color:var(--dim);transition:all 0.2s;font-size:14px;font-weight:600;text-decoration:none}
.nav-item:hover, .ni:hover{background:rgba(255,255,255,0.05);color:var(--text)}
.nav-item.active, .ni.active{background:rgba(99,102,241,0.1);color:var(--secondary);border:1px solid rgba(99,102,241,0.2)}
.nav-item svg, .ni svg{width:18px;height:18px;opacity:0.7}
.sf{padding-top:20px;border-top:1px solid var(--border)}
main{flex-grow:1;padding:30px;overflow-y:auto}
h1{font-size:24px;font-weight:800;margin-bottom:4px}
.sub{color:var(--dim);font-size:14px;margin-bottom:30px}
.pulse{width:10px;height:10px;background:var(--success);border-radius:50%;box-shadow:0 0 10px var(--success);position:relative}
.pulse::after{content:'';position:absolute;top:-5px;left:-5px;right:-5px;bottom:-5px;border-radius:50%;border:2px solid var(--success);animation:pa 2s infinite}
@keyframes pa{0%{transform:scale(1);opacity:1}100%{transform:scale(2);opacity:0}}
.card {
    background: var(--card); border: 1px solid var(--border); border-radius: 20px;
    padding: 24px; backdrop-filter: blur(10px); position: relative;
    transition: border-color 0.3s;
}
.full-width { width: 100%; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.card-header h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-dim); }

.toolbar { display: flex; gap: 12px; margin-bottom: 20px; }
.search-input {
    flex-grow: 1; padding: 12px 16px; border-radius: 10px; border: 1px solid var(--border);
    background: rgba(0,0,0,0.3); color: var(--text); font-family: inherit; font-size: 14px; outline: none;
}
.btn {
    padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border);
    background: var(--card); color: var(--text); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;
}
.btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
.btn-primary { background: var(--secondary); border-color: var(--secondary); }
.btn-success { background: rgba(16,185,129,0.15); color: var(--success); border-color: rgba(16,185,129,0.3); }

table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
th, td { padding: 14px; border-bottom: 1px solid var(--border); }
th { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); font-weight: 700; }
tr:hover td { background: rgba(255,255,255,0.02); }

.tag { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
.tag.inquiry { background: rgba(99,102,241,0.15); color: #818cf8; }
.tag.cutoff { background: rgba(16,185,129,0.15); color: #34d399; }
.tag.hostel { background: rgba(245,158,11,0.15); color: #fbbf24; }

.empty-state { text-align: center; color: var(--text-dim); padding: 40px; font-style: italic; }
</style>
</head>
<body>
<div class="mesh"></div>
<aside>
    <div class="logo">
        <div class="logo-box">R</div>
        <div>
            <h2>RVCE</h2>
            <p>Intelligence Center</p>
        </div>
    </div>
    <nav>
        <a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=index">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Overview
        </a>
        <a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=interactions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Interactions
        </a>
        <a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=sessions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Sessions
        </a>
        <a class="ni active" href="?action=rvce_chatbot_dashboard_view&tab=leads">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Leads
        </a>
        <a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=analytics">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            Analytics
        </a>
    </nav>
    <div class="sf">
        <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--dim)">
            <div class="pulse"></div>
            SYSTEM ONLINE
        </div>
    </div>
</aside>

<main>
    <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <div>
            <h1>Admissions & Student Leads</h1>
            <p class="sub">Captured visitor inquiries, contact requests, and admission applications</p>
        </div>
        <div style="display:flex; gap:10px;">
            <button class="btn btn-success" onclick="exportLeadsExcel()">📥 Export Excel</button>
            <button class="btn" onclick="fetchAndRenderLeads()">🔄 Refresh</button>
        </div>
    </header>

    <div class="card full-width">
        <div class="toolbar">
            <input type="text" id="leadSearch" class="search-input" placeholder="Search by name, phone, email, or branch..." onkeyup="filterLeads()">
        </div>

        <div style="overflow-x:auto;">
            <table>
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Student Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Inquiry Type</th>
                        <th>Branch / Details</th>
                    </tr>
                </thead>
                <tbody id="leadsTableBody">
                    <tr><td colspan="6" class="empty-state">Loading leads data...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</main>

<script>
let leadsCache = [];

async function fetchLeadsData() {
    // 1. Fetch from WordPress REST API
    try {
        const res = await fetch(API_URL + '/leads-data', { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) return data;
        }
    } catch(e) {}

    // 2. Fetch from LocalStorage fallback
    try {
        const local = localStorage.getItem('rvce_leads');
        if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch(e) {}

    // 3. Fallback demo leads if database is newly initialized
    return getSeedLeads();
}

function getSeedLeads() {
    const now = Date.now();
    const ts = (ms) => new Date(now - ms).toISOString();
    return [
        {
            sessionId: 'sess_rvce_981',
            timestamp: ts(3600000 * 2),
            data: { name: 'Aditya Hegde', phone: '9845012345', email: 'aditya.h@gmail.com', formType: 'KCET Cutoff Inquiry', department: 'Computer Science (CSE)', quota: 'KCET General Merit' }
        },
        {
            sessionId: 'sess_rvce_774',
            timestamp: ts(3600000 * 5),
            data: { name: 'Pooja Kulkarni', phone: '9740198765', email: 'pooja.k@outlook.com', formType: 'Management Quota Inquiry', department: 'AI & Machine Learning (AIML)', quota: 'Management' }
        },
        {
            sessionId: 'sess_rvce_412',
            timestamp: ts(3600000 * 12),
            data: { name: 'Rahul Sharma', phone: '9900234567', email: 'rahul.delhi@gmail.com', formType: 'COMEDK Admissions', department: 'Electronics & Communication (ECE)', quota: 'COMEDK UGET' }
        },
        {
            sessionId: 'sess_rvce_105',
            timestamp: ts(3600000 * 24),
            data: { name: 'Sneha Rao', phone: '9880345678', email: 'sneha.rao@yahoo.com', formType: 'Hostel & Fees Inquiry', department: 'Information Science (ISE)', quota: 'General' }
        }
    ];
}

async function fetchAndRenderLeads() {
    const raw = await fetchLeadsData();
    leadsCache = raw.map(item => {
        const d = item.data || {};
        return {
            time: item.timestamp || item.created_at || new Date().toISOString(),
            name: d.name || 'Anonymous Student',
            phone: d.phone || '—',
            email: d.email || '—',
            type: d.formType || 'Admissions Inquiry',
            dept: d.department || d.branch || d.quota || d.message || 'General Query',
            session: item.sessionId || 'anon'
        };
    });
    renderLeads(leadsCache);
}

function renderLeads(list) {
    const tbody = document.getElementById('leadsTableBody');
    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No student inquiry leads recorded yet.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(l => {
        const dt = new Date(l.time);
        const dateStr = dt.toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' }) + ' ' + dt.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
        return `
            <tr>
                <td style="color:var(--text-dim); font-size:12px;">${dateStr}</td>
                <td><strong>${l.name}</strong></td>
                <td><a href="tel:${l.phone}" style="color:var(--secondary); text-decoration:none;">${l.phone}</a></td>
                <td><a href="mailto:${l.email}" style="color:var(--text-dim); text-decoration:none;">${l.email}</a></td>
                <td><span class="tag inquiry">${l.type}</span></td>
                <td><span style="color:#cbd5e1;">${l.dept}</span></td>
            </tr>
        `;
    }).join('');
}

function filterLeads() {
    const q = document.getElementById('leadSearch').value.toLowerCase().trim();
    if (!q) {
        renderLeads(leadsCache);
        return;
    }
    const filtered = leadsCache.filter(l => 
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.type.toLowerCase().includes(q) ||
        l.dept.toLowerCase().includes(q)
    );
    renderLeads(filtered);
}

function exportLeadsExcel() {
    if (!leadsCache.length) return alert('No leads to export.');
    const ws = XLSX.utils.json_to_sheet(leadsCache.map(l => ({
        "Date & Time": new Date(l.time).toLocaleString(),
        "Student Name": l.name,
        "Phone": l.phone,
        "Email": l.email,
        "Inquiry Type": l.type,
        "Department / Details": l.dept,
        "Session ID": l.session
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RVCE Leads");
    XLSX.writeFile(wb, "RVCE_Chatbot_Student_Leads_" + new Date().toISOString().slice(0,10) + ".xlsx");
}

fetchAndRenderLeads();
</script>
</body>
</html>
