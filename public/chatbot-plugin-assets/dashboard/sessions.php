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
<title>RVCE — Session Explorer</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
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
main{flex-grow:1;padding:30px;overflow-y:auto}
h1{font-size:24px;font-weight:800;margin-bottom:4px}
.sub{color:var(--dim);font-size:14px;margin-bottom:30px}
.sessions-list{display:flex;flex-direction:column;gap:16px}
.s-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;cursor:pointer;transition:all 0.2s}
.s-card:hover{border-color:var(--secondary);transform:translateX(4px)}
.s-card.expanded{border-color:var(--secondary)}
.s-head{display:flex;justify-content:space-between;align-items:center}
.s-id{font-size:16px;font-weight:700}.s-time{font-size:12px;color:var(--dim)}
.s-stats{display:flex;gap:16px;margin-top:10px;flex-wrap:wrap}
.s-stat{font-size:11px;padding:4px 10px;border-radius:6px;font-weight:700}
.s-stat.msg{background:rgba(99,102,241,0.15);color:#6366f1}.s-stat.clk{background:rgba(16,185,129,0.15);color:#10b981}
.s-stat.hov{background:rgba(167,139,250,0.15);color:#a78bfa}.s-stat.cpy{background:rgba(244,114,182,0.15);color:#f472b6}
.s-stat.dw{background:rgba(251,191,36,0.15);color:#fbbf24}
.s-timeline{margin-top:16px;padding-top:16px;border-top:1px solid var(--border);display:none;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto}
.s-card.expanded .s-timeline{display:flex}
.t-step{display:flex;gap:10px;align-items:flex-start;padding:8px 12px;background:rgba(255,255,255,0.02);border-radius:8px;font-size:13px}
.t-step .ic{font-size:14px;width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.t-step .tx{flex-grow:1;font-weight:500}.t-step .tm{font-size:10px;color:var(--dim);flex-shrink:0}
.pulse{width:10px;height:10px;background:var(--success);border-radius:50%;box-shadow:0 0 10px var(--success);position:relative}
.pulse::after{content:'';position:absolute;top:-5px;left:-5px;right:-5px;bottom:-5px;border-radius:50%;border:2px solid var(--success);animation:pa 2s infinite}
@keyframes pa{0%{transform:scale(1);opacity:1}100%{transform:scale(2);opacity:0}}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:10px}
.empty{text-align:center;color:var(--dim);padding:40px;font-style:italic}
.day-group { margin-bottom: 20px; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; }
.day-header { padding: 16px 20px; background: rgba(0,0,0,0.2); cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
.day-header:hover { background: rgba(0,0,0,0.4); }
.day-title { font-weight: 700; font-size: 16px; color: var(--secondary); }
.day-count { font-size: 12px; color: var(--dim); background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 20px; }
.day-sessions { display: none; padding: 20px; flex-direction: column; gap: 16px; border-top: 1px solid var(--border); }
.day-group.expanded .day-sessions { display: flex; }
@media print {
    aside, .sf, .mesh, button { display: none !important; }
    body { background: #fff; color: #000; overflow: visible; height: auto; display: block; }
    main { padding: 0; overflow: visible; }
    .day-group, .s-card { background: none; border-color: #ccc; break-inside: avoid; }
    .day-header { background: #f0f0f0; color: #000; }
    .day-sessions { display: flex !important; }
    .s-timeline { display: flex !important; max-height: none; }
    .t-step { border: 1px solid #eee; background: none; }
    .s-stat { border: 1px solid #ddd; background: none !important; color: #000 !important; }
    body.print-single h1 { display: none; }
    body.print-single .sub { display: none; }
    body.print-single .day-group { display: none !important; }
    body.print-single .day-group.print-active { display: block !important; }
    body.print-single .s-card { display: none !important; }
    body.print-single .s-card.print-active { display: block !important; }
}
</style>
</head>
<body>
<div class="mesh"></div>
<aside>
<div class="logo"><div class="logo-box">R</div><div><h2>COMMAND</h2><p>Chatbot Intelligence</p></div></div>
<nav>
<a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=index"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Overview</a>
<a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=interactions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Interactions</a>
<a class="ni active" href="?action=rvce_chatbot_dashboard_view&tab=sessions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>Sessions</a>
<a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=leads"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>Leads</a>
<a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=analytics"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>Analytics</a>
</nav>
<div class="sf"><div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--dim)"><div class="pulse"></div>SYSTEM ONLINE</div></div>
</aside>
<main>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
    <h1>👥 Session Explorer</h1>
    <div style="display:flex; gap:8px;">
        <input type="text" id="sessionSearch" placeholder="Search sessions..." onkeyup="render()" style="padding:6px 12px; font-size:12px; background:var(--card); color:var(--text); border:1px solid var(--border); border-radius:8px; outline:none; min-width: 200px;">
        <button style="padding:6px 12px; font-size:12px; background:var(--card); color:var(--text); border:1px solid var(--border); border-radius:8px; cursor:pointer;" onclick="downloadPDF()" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='var(--card)'">📄 PDF</button>
        <button style="padding:6px 12px; font-size:12px; background:var(--card); color:var(--text); border:1px solid var(--border); border-radius:8px; cursor:pointer;" onclick="render()" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='var(--card)'">🔄 Refresh</button>
    </div>
</div>
<p class="sub" style="margin-bottom:30px; margin-top:0;">Click any session to replay the user's complete journey step by step</p>
<div class="sessions-list" id="sessionsList"><div class="empty">No sessions recorded yet</div></div>
</main>
<script>
const IC={message:'💬',click:'🖱️',ui:'⚙️',hover:'👆',copy:'📋',typing:'⌨️',scroll:'📜',dwell:'⏱️',focus:'🎯',blur:'💤',visibility:'👁️',session:'🔌'};


function downloadPDF() {
    document.querySelectorAll('.day-group').forEach(el => el.classList.add('expanded'));
    document.querySelectorAll('.s-card').forEach(el => el.classList.add('expanded'));
    window.print();
}

function downloadSessionPDF(event, btn) {
    event.stopPropagation();
    const card = btn.closest('.s-card');
    const dayGroup = btn.closest('.day-group');
    
    document.body.classList.add('print-single');
    card.classList.add('print-active');
    dayGroup.classList.add('print-active');
    
    card.classList.add('expanded');
    dayGroup.classList.add('expanded');
    
    window.print();
    
    setTimeout(() => {
        document.body.classList.remove('print-single');
        card.classList.remove('print-active');
        dayGroup.classList.remove('print-active');
    }, 100);
}

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

async function render(){
const logs = await fetchLogs();
const sessions={};
logs.forEach(l=>{if(!l.s)return;if(!sessions[l.s])sessions[l.s]=[];sessions[l.s].push(l);});

const searchQ = document.getElementById('sessionSearch') ? document.getElementById('sessionSearch').value.toLowerCase().trim() : '';
if (searchQ) {
    Object.keys(sessions).forEach(sid => {
        const match = sessions[sid].some(e => 
            (e.q && e.q.toLowerCase().includes(searchQ)) || 
            (e.i && e.i.toLowerCase().includes(searchQ)) ||
            sid.toLowerCase().includes(searchQ)
        );
        if (!match) delete sessions[sid];
    });
}

const el=document.getElementById('sessionsList');

const days = {};
Object.keys(sessions).forEach(sid => {
    const evts = sessions[sid];
    const first = new Date(evts[0].d);
    const y = first.getFullYear();
    const m = String(first.getMonth()+1).padStart(2,'0');
    const d = String(first.getDate()).padStart(2,'0');
    const dayKey = `${y}-${m}-${d}`;
    const displayDate = first.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    if(!days[dayKey]) {
        days[dayKey] = {
            dateObj: first,
            displayDate: displayDate,
            month: first.toLocaleString('default', { month: 'long', year: 'numeric' }),
            sessions: {}
        };
    }
    days[dayKey].sessions[sid] = evts;
});

const sortedDays = Object.keys(days).sort((a,b) => new Date(b) - new Date(a));
if(!sortedDays.length){el.innerHTML='<div class="empty">No sessions yet. Use the chatbot first or generate mock data from the Overview page.</div>';return;}

el.innerHTML=sortedDays.map(dayKey => {
    const dayData = days[dayKey];
    const sids = Object.keys(dayData.sessions).sort((a,b) => new Date(dayData.sessions[b][0].d) - new Date(dayData.sessions[a][0].d));
    
    const sessionsHtml = sids.map(sid => {
        const evts=dayData.sessions[sid];
        const msgs=evts.filter(e=>e.t==='message').length;
        const clicks=evts.filter(e=>e.i&&e.i.startsWith('click:')).length;
        const hovers=evts.filter(e=>e.i&&e.i.startsWith('hover:')).length;
        const copies=evts.filter(e=>e.i&&e.i.startsWith('copy:')).length;
        const dwellEvt=evts.find(e=>e.i&&e.i.startsWith('dwell:'));
        const dwell=dwellEvt&&dwellEvt.m?dwellEvt.m.seconds+'s':'—';
        const timeStr=new Date(evts[0].d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        
        let timeline = `<div class="t-step" style="border-left: 2px solid var(--success);"><div class="ic" style="background:rgba(16,185,129,0.2);color:#10b981;">🟢</div><div class="tx" style="color:#10b981;">Session Started</div><div class="tm">${new Date(evts[0].d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</div></div>`;
        
        timeline += evts.map(e=>{
            const t=e.i?e.i.split(':')[0]:'unknown';
            const icon=IC[t]||IC[e.t]||'⚡';
            const tm=new Date(e.d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
            return `<div class="t-step"><div class="ic">${icon}</div><div class="tx">${e.q}</div><div class="tm">${tm}</div></div>`;
        }).join('');

        const lastEvt = evts[evts.length-1];
        let dropIntent = lastEvt.i || 'Unknown';
        if(dropIntent.startsWith('click:')) dropIntent = dropIntent.split(':')[1];
        
        timeline += `<div class="t-step" style="border-left: 2px solid var(--danger); margin-top:8px;"><div class="ic" style="background:rgba(239,68,68,0.2);color:#ef4444;">🔴</div><div class="tx" style="color:#ef4444;">User Dropped Off <span style="font-size:10px; opacity:0.7;">(Last intent: ${dropIntent})</span></div><div class="tm">${new Date(lastEvt.d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</div></div>`;
        
        const os = evts[0].os || 'Unknown OS';
        const city = evts[0].city || 'Unknown';
        const country = evts[0].country || 'Unknown';
        const browser = evts[0].browserName || 'Unknown Browser';
        
        const locStr = (city !== 'Unknown' && country !== 'Unknown') ? `📍 ${city}, ${country}` : '📍 Unknown Location';
        const devStr = `💻 ${os} (${browser})`;

        return `<div class="s-card" onclick="event.stopPropagation(); this.classList.toggle('expanded')">
        <div class="s-head">
            <div style="display:flex; flex-direction:column; gap:4px;">
                <div class="s-id">🔗 Session ${sid.split('_')[1]||sid}</div>
                <div style="font-size:11px; color:var(--dim);">${locStr} &nbsp;|&nbsp; ${devStr}</div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
                <div class="s-time">${timeStr} · ${evts.length} events</div>
                <button style="padding:4px 8px; font-size:11px; background:var(--card); color:var(--text); border:1px solid var(--border); border-radius:6px; cursor:pointer;" onclick="downloadSessionPDF(event, this)">📄 Export PDF</button>
            </div>
        </div>
        <div class="s-stats">
        <span class="s-stat msg">💬 ${msgs} msgs</span>
        <span class="s-stat clk">🖱️ ${clicks} clicks</span>
        <span class="s-stat hov">👆 ${hovers} hovers</span>
        <span class="s-stat cpy">📋 ${copies} copies</span>
        <span class="s-stat dw">⏱️ ${dwell}</span>
        </div>
        <div class="s-timeline">${timeline}</div>
        </div>`;
    }).join('');
    
    const isFirst = sortedDays.indexOf(dayKey) === 0;
    
    return `<div class="day-group ${isFirst ? 'expanded' : ''}">
        <div class="day-header" onclick="this.parentElement.classList.toggle('expanded')">
            <div class="day-title">📅 ${dayData.displayDate}</div>
            <div class="day-count">${sids.length} Sessions</div>
        </div>
        <div class="day-sessions">${sessionsHtml}</div>
    </div>`;
}).join('');
}
setInterval(render,60000);render();
</script>
</body>
</html>
