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
<title>RVCE — Interaction Analytics</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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
.sub{color:var(--dim);font-size:14px;margin-bottom:24px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:24px}
.card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:24px;backdrop-filter:blur(10px);transition:border-color 0.3s}
.card:hover{border-color:rgba(255,255,255,0.15)}
.card h3{font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:15px}
.span2{grid-column:span 2}.span3{grid-column:span 3}

/* Topic chips */
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chip{display:flex;align-items:center;gap:8px;padding:12px 18px;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.25s;border:1px solid var(--border);background:rgba(255,255,255,0.03)}
.chip:hover{transform:translateY(-3px);box-shadow:0 8px 20px rgba(0,0,0,0.3)}
.chip .emoji{font-size:20px}
.chip .cnt{background:rgba(255,255,255,0.1);padding:3px 9px;border-radius:8px;font-size:11px;font-weight:800;margin-left:4px}
.chip.active{transform:translateY(-2px)}

/* Drill-down panel */
.drill{display:none;animation:fadeIn 0.3s}
.drill.open{display:block}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.drill-header{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.drill-header .emoji{font-size:28px}
.drill-header h2{font-size:20px;font-weight:800}
.drill-header .close-btn{margin-left:auto;padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--dim);font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s}
.drill-header .close-btn:hover{color:var(--text);background:rgba(255,255,255,0.1)}
.drill-stats{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap}
.d-stat{padding:10px 16px;border-radius:10px;font-size:12px;font-weight:700}
.d-stat.s1{background:rgba(99,102,241,0.12);color:#818cf8}.d-stat.s2{background:rgba(16,185,129,0.12);color:#34d399}
.d-stat.s3{background:rgba(244,114,182,0.12);color:#f472b6}.d-stat.s4{background:rgba(167,139,250,0.12);color:#a78bfa}

/* Event rows in drill */
.evt-list{display:flex;flex-direction:column;gap:10px;max-height:500px;overflow-y:auto;padding-right:6px}
.evt{display:flex;gap:12px;align-items:flex-start;padding:14px;background:rgba(255,255,255,0.03);border-radius:12px;border-left:3px solid var(--secondary);transition:all 0.2s}
.evt:hover{background:rgba(255,255,255,0.06);transform:translateX(4px)}
.evt .ic{font-size:16px;width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.evt .info{flex-grow:1}.evt .info .q{font-size:13px;font-weight:600}.evt .info .meta{font-size:11px;color:var(--dim);margin-top:2px}
.evt.click{border-left-color:var(--success)}.evt.hover{border-left-color:#a78bfa}.evt.copy{border-left-color:#f472b6}.evt.message{border-left-color:var(--secondary)}

/* Ranking rows */
.rk{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
.rk:last-child{border:none}
.rk-n{width:26px;height:26px;border-radius:7px;background:rgba(99,102,241,0.15);color:var(--secondary);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}
.rk-label{flex-grow:1;font-size:13px;font-weight:600}
.rk-bar{width:100px;height:7px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;flex-shrink:0}
.rk-bar div{height:100%;border-radius:4px}
.rk-cnt{font-size:11px;color:var(--dim);width:30px;text-align:right;flex-shrink:0}

.empty{text-align:center;color:var(--dim);padding:40px;font-style:italic}
.pulse{width:10px;height:10px;background:var(--success);border-radius:50%;box-shadow:0 0 10px var(--success);position:relative}
.pulse::after{content:'';position:absolute;top:-5px;left:-5px;right:-5px;bottom:-5px;border-radius:50%;border:2px solid var(--success);animation:pa 2s infinite}
@keyframes pa{0%{transform:scale(1);opacity:1}100%{transform:scale(2);opacity:0}}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:10px}
</style>
</head>
<body>
<div class="mesh"></div>
<aside>
<div class="logo"><div class="logo-box">R</div><div><h2>COMMAND</h2><p>Chatbot Intelligence</p></div></div>
<nav>
<a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=index"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Overview</a>
<a class="ni active" href="?action=rvce_chatbot_dashboard_view&tab=interactions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Interactions</a>
<a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=sessions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>Sessions</a>
<a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=leads"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>Leads</a>
<a class="ni" href="?action=rvce_chatbot_dashboard_view&tab=analytics"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>Analytics</a>
</nav>
<div class="sf"><div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--dim)"><div class="pulse"></div>SYSTEM ONLINE</div></div>
</aside>
<main>
<h1>🔍 Interaction Deep Dive</h1>
<p class="sub">Click any keyword below to see every related search, click, hover and copy</p>

<!-- Search & Quick Filters -->
<div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:24px; align-items:center;">
    <input type="text" id="globalSearch" placeholder="Search any keyword, intent, or message..." onkeyup="handleGlobalSearch()" style="padding:10px 16px; font-size:13px; background:var(--card); color:var(--text); border:1px solid var(--border); border-radius:10px; outline:none; min-width: 300px; flex-grow:1;">
    <div style="display:flex; gap:8px;">
        <button class="btn quick-btn active" data-filter="all" onclick="setQuickFilter('all')" style="padding:6px 12px; border-radius:8px; font-size:12px; background:var(--secondary); color:#fff; border:none; cursor:pointer;">All Events</button>
        <button class="btn quick-btn" data-filter="msg" onclick="setQuickFilter('msg')" style="padding:6px 12px; border-radius:8px; font-size:12px; background:var(--card); color:var(--text); border:1px solid var(--border); cursor:pointer;">Messages Only</button>
        <button class="btn quick-btn" data-filter="action" onclick="setQuickFilter('action')" style="padding:6px 12px; border-radius:8px; font-size:12px; background:var(--card); color:var(--text); border:1px solid var(--border); cursor:pointer;">Actions/Clicks</button>
        <button class="btn quick-btn" data-filter="unanswered" onclick="setQuickFilter('unanswered')" style="padding:6px 12px; border-radius:8px; font-size:12px; background:var(--card); color:var(--text); border:1px solid var(--border); cursor:pointer;">Unanswered/Mod</button>
    </div>
</div>

<!-- Global Search Results Panel -->
<div class="card" id="searchResultPanel" style="display:none; margin-bottom:24px;">
    <div class="drill-header" style="margin-bottom:15px;">
        <h2>Global Search Results</h2>
        <button class="close-btn" onclick="closeSearch()">✕ Clear Search</button>
    </div>
    <div class="evt-list" id="searchEvents"></div>
</div>

<!-- Keyword Chips -->
<div class="card" style="margin-bottom:24px">
<h3>🎯 Detected User Interest Keywords</h3>
<div class="chips" id="topicChips"><div class="empty">No data yet — generate mock data from Overview page</div></div>
</div>

<!-- Drill-down Panel (hidden until a chip is clicked) -->
<div class="drill" id="drillPanel">
<div class="card">
    <div class="drill-header">
        <span class="emoji" id="drillEmoji"></span>
        <h2 id="drillTitle"></h2>
        <button class="close-btn" onclick="closeDrill()">✕ Back to all keywords</button>
    </div>
    <div class="drill-stats" id="drillStats"></div>
    <h3 style="margin-bottom:12px">All related events</h3>
    <div class="evt-list" id="drillEvents"></div>
</div>
</div>

<!-- Default view (visible when no chip selected) -->
<div id="defaultView">
<div class="grid">
<div class="card span2">
<h3>🏆 Topic Ranking</h3>
<div id="topicRanking"><div class="empty">No data</div></div>
</div>
<div class="card">
<h3>📊 Interest Distribution</h3>
<div style="height:280px"><canvas id="topicChart"></canvas></div>
</div>
</div>
<div class="grid">
<div class="card span2">
<h3>🖱️ Most Clicked Buttons & Links</h3>
<div id="clickRanking"><div class="empty">No click data</div></div>
</div>
<div class="card">
<h3>📋 Copied Content</h3>
<div id="copyList"><div class="empty">No copies</div></div>
</div>
</div>
</div>

</main>
<script>
let currentQuickFilter = 'all';

function setQuickFilter(filterType) {
    currentQuickFilter = filterType;
    document.querySelectorAll('.quick-btn').forEach(b => {
        if(b.dataset.filter === filterType) {
            b.style.background = 'var(--secondary)';
            b.style.color = '#fff';
            b.style.border = 'none';
        } else {
            b.style.background = 'var(--card)';
            b.style.color = 'var(--text)';
            b.style.border = '1px solid var(--border)';
        }
    });
    handleGlobalSearch();
}

function handleGlobalSearch() {
    const q = document.getElementById('globalSearch').value.toLowerCase().trim();
    if (!q && currentQuickFilter === 'all') {
        closeSearch();
        return;
    }
    
    document.getElementById('defaultView').style.display='none';
    document.getElementById('drillPanel').classList.remove('open');
    document.getElementById('searchResultPanel').style.display='block';
    
    const logs = getLogs();
    let filtered = logs;
    
    if (currentQuickFilter === 'msg') {
        filtered = filtered.filter(l => l.t === 'message');
    } else if (currentQuickFilter === 'action') {
        filtered = filtered.filter(l => l.i && (l.i.startsWith('click:') || l.i.startsWith('hover:') || l.i.startsWith('copy:')));
    } else if (currentQuickFilter === 'unanswered') {
        filtered = filtered.filter(l => l.t === 'message' && (l.i === 'unmatched' || (l.i && l.i.startsWith('moderated'))));
    }
    
    if (q) {
        filtered = filtered.filter(l => 
            (l.q && l.q.toLowerCase().includes(q)) || 
            (l.i && l.i.toLowerCase().includes(q))
        );
    }
    
    const el = document.getElementById('searchEvents');
    if (!filtered.length) {
        el.innerHTML = '<div class="empty">No matching events found</div>';
        return;
    }
    
    el.innerHTML = filtered.reverse().map(l=>{
        const evtType = l.i ? l.i.split(':')[0] : 'unknown';
        const icon = IC[evtType]||IC[l.t]||'⚡';
        const time = new Date(l.d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
        const date = new Date(l.d).toLocaleDateString();
        let meta = `Session ${(l.s||'').split('_')[1]||'?'} · ${date} ${time}`;
        if(l.m && Object.keys(l.m).length) meta += ' · '+Object.entries(l.m).map(([k,v])=>`${k}: ${v}`).join(' · ');
        return `<div class="evt ${evtType}"><div class="ic">${icon}</div><div class="info"><div class="q">${l.q}</div><div class="meta">${meta}</div></div></div>`;
    }).join('');
}

function closeSearch() {
    document.getElementById('globalSearch').value = '';
    currentQuickFilter = 'all';
    document.querySelectorAll('.quick-btn').forEach(b => {
        b.style.background = b.dataset.filter === 'all' ? 'var(--secondary)' : 'var(--card)';
        b.style.color = b.dataset.filter === 'all' ? '#fff' : 'var(--text)';
        b.style.border = b.dataset.filter === 'all' ? 'none' : '1px solid var(--border)';
    });
    
    document.getElementById('searchResultPanel').style.display='none';
    if (!activeDrill) document.getElementById('defaultView').style.display='block';
    else document.getElementById('drillPanel').classList.add('open');
}

const TOPICS = {
    placements:{emoji:'💼',color:'#6366f1',kw:['placement','placements','package','lpa','salary','recruit','job','offer','placed','company','companies','highest']},
    admissions:{emoji:'🎓',color:'#10b981',kw:['admission','admissions','apply','kcet','comedk','comed-k','cutoff','eligibility','fee','seat','quota','management']},
    hostels:{emoji:'🏠',color:'#f59e0b',kw:['hostel','hostels','mess','food court','room','warden','boys hostel','girls hostel','hostel fee']},
    departments:{emoji:'📚',color:'#a78bfa',kw:['department','cse','ece','mech','civil','ise','eee','aiml','branch','course','program']},
    campus:{emoji:'🏕️',color:'#34d399',kw:['campus','club','fest','sports','library','wifi','canteen','life','ncc','nss','cultural']},
    faculty:{emoji:'👨‍🏫',color:'#38bdf8',kw:['faculty','professor','hod','teacher','dean','principal','staff','fac_']},
    rankings:{emoji:'🏆',color:'#fbbf24',kw:['ranking','nirf','naac','autonomous','accreditation','rating']},
    innovation:{emoji:'🚀',color:'#f472b6',kw:['team','ashwa','antariksh','vyoma','chimera','astra','innovation','robot','drone','satellite']},
    research:{emoji:'🔬',color:'#ec4899',kw:['research','coe','centre of excellence','center of excellence','phd','boston','cocs','patent']},
    contact:{emoji:'📞',color:'#fb923c',kw:['contact','phone','email','address','location','map','reach','transport']},
};
const IC = {message:'💬',click:'🖱️',ui:'⚙️',hover:'👆',copy:'📋',typing:'⌨️',scroll:'📜',dwell:'⏱️',focus:'🎯',blur:'💤',visibility:'👁️',session:'🔌'};

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

function classify(l){
    let text = ((l.q||'')+ ' '+(l.i||'')).toLowerCase();
    if(l.m) text += ' ' + Object.values(l.m).join(' ').toLowerCase();
    
    for(const [t,cfg] of Object.entries(TOPICS)){
        for(const kw of cfg.kw){ if(text.includes(kw)) return t; }
    }
    return null;
}

async function render(){
    const logs = await fetchLogs();
    renderChips(logs);
    renderRanking(logs);
    renderChart(logs);
    renderClicks(logs);
    renderCopies(logs);
}

let activeDrill = null;

function renderChips(logs){
    const el = document.getElementById('topicChips');
    const counts = {};
    logs.forEach(l=>{ const t=classify(l); if(t) counts[t]=(counts[t]||0)+1; });
    const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    if(!sorted.length){ el.innerHTML='<div class="empty">No keywords detected yet</div>'; return; }
    el.innerHTML = sorted.map(([topic,count])=>{
        const cfg = TOPICS[topic];
        const isActive = activeDrill === topic;
        return `<div class="chip ${isActive?'active':''}" data-topic="${topic}" style="${isActive ? 'background:'+cfg.color+'15;border-color:'+cfg.color+';box-shadow:0 4px 15px '+cfg.color+'30' : 'border-color:'+cfg.color+'30'}" onclick="openDrill('${topic}')">
            <span class="emoji">${cfg.emoji}</span>${topic.charAt(0).toUpperCase()+topic.slice(1)}<span class="cnt" style="background:${cfg.color}20;color:${cfg.color}">${count}</span>
        </div>`;
    }).join('');
}

function openDrill(topic){
    activeDrill = topic;
    const cfg = TOPICS[topic];
    const logs = getLogs();
    const related = logs.filter(l=> classify(l)===topic);

    document.getElementById('defaultView').style.display='none';
    document.getElementById('drillPanel').classList.add('open');
    document.getElementById('drillEmoji').textContent = cfg.emoji;
    document.getElementById('drillTitle').textContent = topic.charAt(0).toUpperCase()+topic.slice(1)+' — '+related.length+' events';

    const msgs = related.filter(l=>l.t==='message');
    const clicks = related.filter(l=>l.i&&l.i.startsWith('click:'));
    const hovers = related.filter(l=>l.i&&l.i.startsWith('hover:'));
    const copies = related.filter(l=>l.i&&l.i.startsWith('copy:'));
    document.getElementById('drillStats').innerHTML = `
        <span class="d-stat s1">💬 ${msgs.length} searches</span>
        <span class="d-stat s2">🖱️ ${clicks.length} clicks</span>
        <span class="d-stat s4">👆 ${hovers.length} hovers</span>
        <span class="d-stat s3">📋 ${copies.length} copies</span>
    `;

    // Update chip highlights
    renderChips(logs);

    let extraHtml = '';
    if (topic === 'faculty') {
        const facSearches = {};
        const facViews = {};
        related.forEach(l => {
            if (l.i && l.i.startsWith('fac_')) {
                if (l.i === 'fac_multi') {
                    if (l.q) {
                        const name = l.q.trim().toLowerCase();
                        facSearches[name] = (facSearches[name] || 0) + 1;
                    }
                } else {
                    const name = l.i.replace('fac_', '').replace(/_/g, ' ');
                    facViews[name] = (facViews[name] || 0) + 1;
                }
            } else if (l.i && l.i.includes('Button:')) {
                let btnLabel = l.i.split('Button:')[1].trim();
                // Remove leading emojis or non-text characters
                btnLabel = btnLabel.replace(/^[^a-zA-Z0-9]+/, '');
                
                const lowerClick = btnLabel.toLowerCase();
                // Check if it's a faculty button
                if (lowerClick.includes('dr.') || lowerClick.includes('dr ') || lowerClick.includes('prof.') || lowerClick.match(/\([a-z_]+\)$/)) {
                    facViews[btnLabel] = (facViews[btnLabel] || 0) + 1;
                }
            }
        });

        const sortedSearches = Object.entries(facSearches).sort((a,b)=>b[1]-a[1]);
        const sortedViews = Object.entries(facViews).sort((a,b)=>b[1]-a[1]);

        if (sortedSearches.length > 0 || sortedViews.length > 0) {
            extraHtml = '<div style="margin-bottom: 20px; background: rgba(56, 189, 248, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.2);">';
            
            if (sortedViews.length > 0) {
                extraHtml += '<h4 style="margin: 0 0 10px 0; color: #10b981; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Profiles Viewed</h4>' +
                    '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;">' +
                    sortedViews.map(([n,c]) => `<span style="background: rgba(16, 185, 129, 0.15); color: #6ee7b7; padding: 4px 10px; border-radius: 16px; font-size: 12px; border: 1px solid rgba(16,185,129,0.3);"><strong>${n.replace(/\\b\\w/g, char => char.toUpperCase())}</strong>: ${c} clicks</span>`).join('') +
                    '</div>';
            }
            
            if (sortedSearches.length > 0) {
                extraHtml += '<h4 style="margin: 0 0 10px 0; color: #38bdf8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Searched Names</h4>' +
                    '<div style="display: flex; flex-wrap: wrap; gap: 8px;">' +
                    sortedSearches.map(([n,c]) => `<span style="background: rgba(56, 189, 248, 0.15); color: #e0f2fe; padding: 4px 10px; border-radius: 16px; font-size: 12px;"><strong>${n.replace(/\\b\\w/g, char => char.toUpperCase())}</strong>: ${c} searches</span>`).join('') +
                    '</div>';
            }
            
            extraHtml += '</div>';
        }
    }

    const el = document.getElementById('drillEvents');
    el.innerHTML = extraHtml + related.reverse().map(l=>{
        const evtType = l.i ? l.i.split(':')[0] : 'unknown';
        const icon = IC[evtType]||IC[l.t]||'⚡';
        const time = new Date(l.d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
        const date = new Date(l.d).toLocaleDateString();
        let meta = `Session ${(l.s||'').split('_')[1]||'?'} · ${date} ${time}`;
        if(l.m && Object.keys(l.m).length) meta += ' · '+Object.entries(l.m).map(([k,v])=>`${k}: ${v}`).join(' · ');
        return `<div class="evt ${evtType}"><div class="ic">${icon}</div><div class="info"><div class="q">${l.q}</div><div class="meta">${meta}</div></div></div>`;
    }).join('');
}

function closeDrill(){
    activeDrill = null;
    document.getElementById('drillPanel').classList.remove('open');
    document.getElementById('defaultView').style.display='block';
    renderChips(getLogs());
}

function renderRanking(logs){
    const el = document.getElementById('topicRanking');
    const counts = {};
    logs.forEach(l=>{ const t=classify(l); if(t) counts[t]=(counts[t]||0)+1; });
    const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    if(!sorted.length){ el.innerHTML='<div class="empty">No data</div>'; return; }
    const max = sorted[0][1];
    el.innerHTML = sorted.map(([topic,count],i)=>{
        const cfg = TOPICS[topic];
        const pct = Math.round((count/max)*100);
        return `<div class="rk" style="cursor:pointer" onclick="openDrill('${topic}')">
            <div class="rk-n">${i+1}</div>
            <span style="font-size:16px">${cfg.emoji}</span>
            <div class="rk-label">${topic.charAt(0).toUpperCase()+topic.slice(1)}</div>
            <div class="rk-bar"><div style="width:${pct}%;background:${cfg.color}"></div></div>
            <div class="rk-cnt">${count}</div>
        </div>`;
    }).join('');
}

let topicChart = null;
function renderChart(logs){
    const counts = {};
    logs.forEach(l=>{ const t=classify(l); if(t) counts[t]=(counts[t]||0)+1; });
    const labels = Object.keys(counts).map(t=>t.charAt(0).toUpperCase()+t.slice(1));
    const colors = Object.keys(counts).map(t=>TOPICS[t].color);
    if(topicChart) topicChart.destroy();
    if(!labels.length) return;
    topicChart = new Chart(document.getElementById('topicChart'),{
        type:'doughnut',
        data:{labels,datasets:[{data:Object.values(counts),backgroundColor:colors.map(c=>c+'cc'),borderWidth:0,hoverOffset:8}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'bottom',labels:{color:'#94a3b8',font:{family:'Plus Jakarta Sans',weight:'600',size:11},padding:10}}}}
    });
}

function renderClicks(logs){
    const el = document.getElementById('clickRanking');
    const clicks = {};
    logs.filter(l=>l.i&&l.i.startsWith('click:')).forEach(l=>{
        const label = l.i.replace('click:','').trim();
        if(label.length>1) clicks[label]=(clicks[label]||0)+1;
    });
    const sorted = Object.entries(clicks).sort((a,b)=>b[1]-a[1]).slice(0,8);
    if(!sorted.length){ el.innerHTML='<div class="empty">No clicks recorded</div>'; return; }
    const max = sorted[0][1];
    el.innerHTML = sorted.map(([label,count],i)=>{
        const pct = Math.round((count/max)*100);
        return `<div class="rk"><div class="rk-n">${i+1}</div><span>🖱️</span><div class="rk-label" style="font-size:12px">${label}</div><div class="rk-bar"><div style="width:${pct}%;background:var(--success)"></div></div><div class="rk-cnt">${count}</div></div>`;
    }).join('');
}

function renderCopies(logs){
    const el = document.getElementById('copyList');
    const copies = logs.filter(l=>l.i&&l.i.startsWith('copy:')).slice(-6).reverse();
    if(!copies.length){ el.innerHTML='<div class="empty">No copies</div>'; return; }
    el.innerHTML = copies.map(c=>{
        const text = c.i.replace('copy:','').trim();
        const time = new Date(c.d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        return `<div class="rk"><span>📋</span><div class="rk-label" style="font-size:11px">"${text}"</div><div class="rk-cnt">${time}</div></div>`;
    }).join('');
}

setInterval(()=>{
    if(!activeDrill) render();
}, 60000);
render();
</script>
</body>
</html>
