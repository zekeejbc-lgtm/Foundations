// ----------------------------------------------------
// 🔴 REPLACE THIS WITH YOUR NEW GOOGLE SCRIPT URL 🔴
const API_URL = "https://script.google.com/macros/s/AKfycbxe4e9qXtRv5caC_oMtcwZsdrkJc4oQ8aNrZWBvMAkOlFAtcLHUKyuhQ66uNLPz8wNE/exec"; 
// ----------------------------------------------------

let appData = {};
let playerName = "";
let currentDataHash = ""; 

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const cachedView = localStorage.getItem('currentView') || 'home';
  playerName = localStorage.getItem('playerName') || "";
  
  updateNavState(cachedView);
  console.log("Fetching data...");
  showToast("Connecting...");
  
  fetchData();
  setInterval(checkForDataUpdates, 30000);
});

window.addEventListener('beforeunload', () => localStorage.setItem('scrollPos', window.scrollY));

// --- FETCH ---
async function fetchData() {
  try {
    const response = await fetch(API_URL + "?t=" + new Date().getTime());
    const data = await response.json();

    if(data.status === 'success' || data.content) {
      currentDataHash = JSON.stringify(data);
      appData = data;
      
      // Update view immediately if first load
      const isInitial = document.getElementById('app-content').innerHTML.includes('sk-box') || document.getElementById('app-content').innerHTML.trim() === "";
      if(isInitial) {
        showToast("Loaded!");
        renderFooter(data.contacts);
        renderView(localStorage.getItem('currentView') || 'home');
        const scroll = localStorage.getItem('scrollPos');
        if(scroll) setTimeout(() => window.scrollTo(0, parseInt(scroll)), 50);
      }
    } else { throw new Error(data.message); }
  } catch (err) {
    console.error(err);
    showToast("Offline / Connection Failed");
    // If we have nothing, show error
    if(!appData.content) renderAppBackup();
  }
}

async function checkForDataUpdates() {
  try {
    const response = await fetch(API_URL + "?t=" + new Date().getTime());
    const newData = await response.json();
    if(newData.status === 'success') {
      if(JSON.stringify(newData) !== currentDataHash) {
        showActionToast("New content available!", "Refresh", () => window.location.reload());
      }
    }
  } catch (e) {}
}

// --- NAVIGATION ---
function renderView(view) {
  const container = document.getElementById('app-content');
  container.innerHTML = '';
  if(!appData.content) return;

  if(view === 'home') renderHome(container);
  else if(view === 'members') renderTeam(container);
  else if(view === 'games') renderGamesHub(container);
}

window.switchView = function(view) {
  localStorage.setItem('currentView', view);
  updateNavState(view);
  renderView(view);
  window.scrollTo(0, 0);
}

function updateNavState(view) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('nav-' + view);
  if(btn) btn.classList.add('active');
}

// --- RENDERERS ---
function renderHome(container) {
  let html = '';
  const videoItem = appData.content.find(i => i.type && i.type.toLowerCase() === 'advocacy');
  const cards = appData.content.filter(i => !i.type || i.type.toLowerCase() !== 'advocacy');

  if(videoItem) {
    const vidHtml = getMediaHtml(videoItem.url, 'video', false);
    html += `
      <div class="hero-section">
        <div class="hero-video">${vidHtml}</div>
        <h2 class="hero-title">${videoItem.title}</h2>
        <div class="hero-desc-card"><div class="hero-desc">${videoItem.desc}</div></div>
      </div>
      <div class="section-header"><h2 class="section-title">Awareness Materials</h2></div>
    `;
  }

  html += `<div class="group-card-holder"><div class="grid">`;
  cards.forEach(item => {
    const type = item.type ? item.type.toLowerCase() : 'image';
    const media = getMediaHtml(item.url, type, false);
    const overlay = type !== 'video' ? `<div class="img-overlay"></div>` : '';
    const itemData = encodeData(item);
    html += `
      <div class="card">
        <div class="card-media">${media}${overlay}</div>
        <div class="card-content">
          <h3 class="card-title" onclick='openModal(${itemData})'>${item.title}</h3>
          <div class="card-desc">${item.desc}</div>
          <button class="btn-details" onclick='openModal(${itemData})'>Read Details</button>
        </div>
      </div>`;
  });
  html += `</div></div>`;
  container.innerHTML = html;
  
  container.querySelectorAll('.img-overlay').forEach(el => {
    el.onclick = function() { this.parentElement.nextElementSibling.querySelector('button').click(); };
  });
}

function renderTeam(container) {
  if (!appData.profiles || appData.profiles.length === 0) { container.innerHTML = "<p>No profiles found.</p>"; return; }
  
  let html = '';
  const instructor = appData.profiles.find(p => p.role && p.role.toLowerCase() === 'instructor');
  const members = appData.profiles.filter(p => !p.role || p.role.toLowerCase() !== 'instructor');

  if(instructor) {
    const iImg = getSmartImg(instructor.imgUrl);
    const iData = encodeData(instructor);
    html += `
      <div class="instructor-card" onclick='openProfile(${iData})'>
        <img src="${iImg}" class="inst-img">
        <h3 class="inst-name">${instructor.name}</h3>
        <div class="inst-role">${instructor.program}</div>
        <p style="font-size:0.9rem; opacity:0.8;">${instructor.shortDesc}</p>
        <button class="btn-details" style="margin-top:10px;">View Profile</button>
      </div>
      <div class="section-header"><h2 class="section-title">Our Team</h2></div>
    `;
  }

  html += `<div class="group-card-holder"><div class="member-grid">`;
  members.forEach(m => {
    const mImg = getSmartImg(m.imgUrl);
    const mData = encodeData(m);
    html += `
      <div class="member-card" onclick='openProfile(${mData})'>
        <img src="${mImg}" class="mem-img">
        <h3 class="mem-name">${m.name}</h3>
        <div class="mem-program">${m.role}</div>
        <button class="btn-details" style="margin-top:auto;">Profile</button>
      </div>`;
  });
  html += `</div></div>`;
  container.innerHTML = html;
}

function renderGamesHub(container) {
  if(!playerName) {
    container.innerHTML = `
      <div style="text-align:center; padding:4rem 1rem;">
        <h2 class="hero-title">Enter Your Name</h2>
        <input type="text" id="p-name-input" placeholder="Your Name" style="padding:12px; border-radius:20px; border:1px solid #ccc; width:80%; margin-bottom:1rem;">
        <br><button class="btn-details" onclick="saveName()">Start Playing</button>
      </div>`;
    return;
  }
  
  let lbHtml = `<div class="leaderboard-box"><h3>🏆 Top 5 Leaderboard</h3>`;
  if(appData.leaderboard) appData.leaderboard.forEach(p => { lbHtml += `<div class="lb-row"><span class="lb-name">${p.name}</span><span>${p.score} pts <small>(${p.game})</small></span></div>`; });
  lbHtml += `</div>`;

  container.innerHTML = `
    <div class="game-container">
      <h2 class="section-title">Learning Games</h2>
      <p style="margin-bottom:2rem;">Welcome, <b>${playerName}</b>! <a href="#" onclick="clearName()" style="color:var(--primary); font-size:0.8rem;">(Change)</a></p>
      ${lbHtml}
      <div class="game-menu">
        <button class="game-btn" onclick="startWordSearch()"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg> Word Puzzle</button>
        <button class="game-btn" onclick="startQuiz()"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg> Quiz</button>
        <button class="game-btn" onclick="startMemory()"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20"/><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="M4 12V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5"/></svg> Memory</button>
      </div>
      <div id="game-board">
        <p style="color:var(--text-sub); padding:2rem;">Select a game!</p>
      </div>
    </div>
  `;
}

window.saveName = function() {
  const val = document.getElementById('p-name-input').value;
  if(val) { playerName = val; localStorage.setItem('playerName', val); renderGamesHub(document.getElementById('app-content')); }
}
window.clearName = function() { localStorage.removeItem('playerName'); playerName = ""; renderGamesHub(document.getElementById('app-content')); }

// --- GAMES LOGIC ---
window.startQuiz = function() {
  const board = document.getElementById('game-board');
  if(!appData.quiz || appData.quiz.length === 0) { board.innerHTML = "No questions."; return; }
  let qList = [...appData.quiz].sort(() => 0.5 - Math.random()).slice(0, 10);
  let score = 0, idx = 0;
  function showQ() {
    if(idx >= qList.length) { finishGame(score, "Quiz"); return; }
    const q = qList[idx];
    board.innerHTML = `<h3>Q ${idx+1} / ${qList.length}</h3><p style="font-size:1.2rem; margin:1.5rem 0;">${q.q}</p>
    <div style="display:flex; flex-direction:column; gap:10px;">${q.opt.map(o => `<button onclick="checkAns(this, '${o.replace(/'/g,"\\'")}', '${q.ans.replace(/'/g,"\\'")}')" class="quiz-opt">${o}</button>`).join('')}</div>`;
  }
  window.checkAns = function(btn, ch, cor) {
    board.querySelectorAll('button').forEach(b => b.disabled = true);
    if(ch === cor) { btn.style.background="#22c55e"; btn.style.color="white"; score+=10; } 
    else { btn.style.background="#ef4444"; btn.style.color="white"; }
    setTimeout(() => { idx++; showQ(); }, 1500);
  }
  showQ();
}

window.startWordSearch = function() { 
  const board = document.getElementById('game-board');
  let words = appData.words && appData.words.length > 0 ? appData.words : [{word:"IDD",clue:"Topic"}];
  let gameWords = words.sort(() => 0.5 - Math.random()).slice(0, 6);
  const size = Math.max(8, Math.max(...gameWords.map(w=>w.word.length))+1);
  let grid = Array(size).fill().map(() => Array(size).fill(''));
  
  gameWords.forEach(item => {
    let w = item.word.toUpperCase().replace(/\s/g, '');
    let placed=false, att=0;
    while(!placed && att<100) {
      let dir = Math.random()>0.5?'H':'V', r=Math.floor(Math.random()*size), c=Math.floor(Math.random()*size);
      if(canPlace(grid,w,r,c,dir)) { placeWord(grid,w,r,c,dir); placed=true; }
      att++;
    }
  });
  
  for(let r=0; r<size; r++) for(let c=0; c<size; c++) if(grid[r][c]==='') grid[r][c]=String.fromCharCode(65+Math.floor(Math.random()*26));
  
  let h = `<div class="word-grid" style="grid-template-columns:repeat(${size},1fr);">`;
  grid.forEach(r => r.forEach(c => h+=`<div class="word-cell" onclick="this.style.background='var(--accent)'; this.style.color='#781d22'">${c}</div>`));
  h += `</div><div style="margin-top:20px;text-align:left;font-size:0.9rem;"><b>Find:</b> ${gameWords.map(w=>w.word).join(', ')}</div>`;
  h += `<button class="btn-details" style="margin-top:20px;width:100%;" onclick="finishGame(50,'Word Search')">Found Them!</button>`;
  board.innerHTML = h;
}
function canPlace(g,w,r,c,d) { if(d==='H' && c+w.length>g.length) return false; if(d==='V' && r+w.length>g.length) return false; for(let i=0;i<w.length;i++) if(d==='H' && g[r][c+i]!=='' && g[r][c+i]!==w[i]) return false; else if(d==='V' && g[r+i][c]!=='' && g[r+i][c]!==w[i]) return false; return true; }
function placeWord(g,w,r,c,d) { for(let i=0;i<w.length;i++) if(d==='H') g[r][c+i]=w[i]; else g[r+i][c]=w[i]; }

window.startMemory = function() { 
  const board = document.getElementById('game-board');
  const icons = ['🧠','♿','❤️','🤝','🗣️','👂','👁️','🧩'];
  let cards = [...icons, ...icons].sort(() => 0.5 - Math.random());
  let h = `<div class="memory-grid">`;
  cards.forEach((icon, i) => h+=`<div id="mem-${i}" onclick="flipCard(${i}, '${icon}')" class="memory-card">${icon}</div>`);
  h += `</div>`;
  board.innerHTML = `<h3>Memory Match</h3>` + h;
}
let fC=null, lB=false, mC=0;
window.flipCard = function(id, ic) {
  if(lB) return;
  const el = document.getElementById('mem-'+id);
  if(el.classList.contains('flipped')) return;
  el.classList.add('flipped');
  if(!fC) fC = {id, ic};
  else {
    lB=true;
    if(fC.ic === ic) { mC++; fC=null; lB=false; if(mC===8) finishGame(100, "Memory"); }
    else { setTimeout(() => { document.getElementById('mem-'+fC.id).classList.remove('flipped'); el.classList.remove('flipped'); fC=null; lB=false; }, 1000); }
  }
}

function finishGame(s, g) {
  showToast(`Score: ${s}`);
  document.getElementById('game-board').innerHTML = `<h3>Good Job!</h3><p>Score: ${s}</p><button class="btn-details" onclick="renderGamesHub(document.getElementById('app-content'))">Back</button>`;
  fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'submit_score', name: playerName, score: s, game: g }) });
}

// --- SMART CHAT ---
window.toggleChat = function() { const c=document.getElementById('chat-window'); c.style.display=c.style.display==='flex'?'none':'flex'; }
window.handleChat = function() {
  const inp=document.getElementById('chat-input'), txt=inp.value.trim().toLowerCase(), b=document.getElementById('chat-body');
  if(!txt) return;
  b.innerHTML += `<div class="chat-bubble user-msg">${inp.value}</div>`;
  inp.value=''; b.scrollTop=b.scrollHeight;
  setTimeout(() => {
    let r="";
    if(txt.includes('team')||txt.includes('who')) r="Here are the people behind this project: "+(appData.profiles||[]).map(p=>p.name).join(', ');
    else {
      const m = appData.content ? appData.content.find(i => i.title.toLowerCase().includes(txt)||i.desc.toLowerCase().includes(txt)) : null;
      r = m ? `<b>${m.title}</b><br>${m.desc}` : "I didn't find that in the database. I'll suggest adding it!";
      if(!m) fetch(API_URL, { method:'POST', mode:'no-cors', body:JSON.stringify({action:'submit_suggestion', text:txt}) });
    }
    b.innerHTML += `<div class="chat-bubble bot-msg">${r}</div>`;
    b.scrollTop=b.scrollHeight;
  }, 500);
}

// --- UTILS ---
function getSmartImg(url) {
  if(!url) return 'https://via.placeholder.com/150?text=No+Img';
  const m = url.match(/[-\w]{25,}/);
  return (url.includes("drive.google.com") && m) ? `https://drive.google.com/uc?export=view&id=${m[0]}` : url;
}
function getMediaHtml(url, type, auto) {
  if (!url) return '';
  type = type ? type.toLowerCase() : 'image';
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  if(yt) return `<iframe src="https://www.youtube.com/embed/${yt[1]}?modestbranding=1&rel=0${auto?'&autoplay=1':''}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  if(type==='video'||type==='advocacy') {
    const m = url.match(/[-\w]{25,}/);
    if(m && url.includes("drive")) return `<iframe src="https://drive.google.com/file/d/${m[0]}/preview" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  }
  return `<img src="${getSmartImg(url)}" onclick="openImageViewer(this.src)" style="cursor:zoom-in">`;
}
function renderFooter(contacts) {
  const f = document.getElementById('footer-target');
  f.innerHTML = (contacts||[]).map(c => `<div class="footer-col"><h4>${c.title}</h4><p>${c.desc.replace(/\n/g,'<br>')}</p>${c.link?`<a href="${c.link}" target="_blank">Open Link</a>`:''}</div>`).join('');
}
function encodeData(o) { return JSON.stringify(o).replace(/'/g, "&apos;").replace(/"/g, "&quot;"); }
function showToast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 3000); }
function showActionToast(m, b, cb) {
  const t = document.getElementById('toast');
  t.innerHTML = `<span>${m}</span><button id="ta" class="toast-btn">${b}</button>`; t.classList.add('show');
  document.getElementById('ta').onclick = () => { t.classList.remove('show'); cb(); };
}
function renderAppBackup() { document.getElementById('app-content').innerHTML = `<div style="text-align:center; padding:4rem;"><h3>Offline</h3><button onclick="window.location.reload()" class="btn-details">Retry</button></div>`; }

// Listeners & SW
function initTheme() { document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')); }
window.toggleTheme = function() { const n = document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'; document.documentElement.setAttribute('data-theme',n); localStorage.setItem('theme',n); }
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(reg => {
  if(reg.waiting) showActionToast("Update Available", "Update", () => reg.waiting.postMessage({type:'SKIP_WAITING'}));
  reg.addEventListener('updatefound', () => {
    const n = reg.installing;
    n.addEventListener('statechange', () => { if(n.state==='installed' && navigator.serviceWorker.controller) showActionToast("Update Available", "Update", () => n.postMessage({type:'SKIP_WAITING'})); });
  });
  let ref; navigator.serviceWorker.addEventListener('controllerchange', () => { if(!ref) { window.location.reload(); ref=true; } });
});
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.deferredPrompt = e; document.getElementById('install-btn').style.display = 'flex'; });
document.getElementById('install-btn').onclick = () => { document.getElementById('install-btn').style.display='none'; window.deferredPrompt.prompt(); };
window.openImageViewer = function(s) { document.getElementById('v-img').src=s; document.getElementById('image-viewer').classList.add('active'); }
window.closeImageViewer = function() { document.getElementById('image-viewer').classList.remove('active'); }
