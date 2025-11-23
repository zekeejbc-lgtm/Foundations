// ----------------------------------------------------
// 🔴 PASTE YOUR GOOGLE APPS SCRIPT URL HERE 🔴
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
  console.log("Fetching...");
  showToast("Connecting...");
  
  fetchData();
  setInterval(checkForDataUpdates, 30000);
});

window.addEventListener('beforeunload', () => localStorage.setItem('scrollPos', window.scrollY));

// --- FETCH ---
async function fetchData() {
  try {
    const response = await fetch(API_URL + "?t=" + new Date().getTime());
    if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
    const data = await response.json();

    if(data.status === 'success' || data.status === 'partial_error') {
      currentDataHash = JSON.stringify(data);
      appData = data;
      
      showToast("Loaded Successfully!");
      renderFooter(data.contacts);
      renderView(localStorage.getItem('currentView') || 'home');
      
      const scroll = localStorage.getItem('scrollPos');
      if(scroll) setTimeout(() => window.scrollTo(0, parseInt(scroll)), 50);
    } else { throw new Error("API Error: " + data.message); }
  } catch (err) {
    console.error("Fetch Failed:", err);
    showToast("Offline Mode Active");
    if(!appData.content) renderAppBackup();
  }
}

async function checkForDataUpdates() {
  try {
    const response = await fetch(API_URL + "?t=" + new Date().getTime());
    const newData = await response.json();
    if(newData.status === 'success') {
      const newHash = JSON.stringify(newData);
      if(newHash !== currentDataHash) {
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

// --- RENDER HOME ---
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
        <div class="hero-desc-card">
          <div class="hero-desc">${videoItem.desc}</div>
        </div>
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
      </div>
    `;
  });
  html += `</div></div>`;
  container.innerHTML = html;
  
  container.querySelectorAll('.img-overlay').forEach(el => {
    el.onclick = function() { this.parentElement.nextElementSibling.querySelector('button').click(); };
  });
}

// --- RENDER TEAM ---
function renderTeam(container) {
  let html = '';
  if (!appData.profiles || appData.profiles.length === 0) {
    container.innerHTML = "<div style='text-align:center; padding:2rem;'><h3>No Profiles Found</h3></div>";
    return;
  }
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
      </div>
    `;
  });
  html += `</div></div>`;
  container.innerHTML = html;
}

// --- GAMES HUB ---
function renderGamesHub(container) {
  if(!playerName) {
    container.innerHTML = `
      <div style="text-align:center; padding:4rem 1rem;">
        <h2 class="hero-title">Enter Your Name</h2>
        <input type="text" id="p-name-input" placeholder="Your Name" style="padding:12px; border-radius:20px; border:1px solid #ccc; width:80%; margin-bottom:1rem; font-size:1rem;">
        <br><button class="btn-details" onclick="saveName()">Start Playing</button>
      </div>`;
    return;
  }
  
  let lbHtml = `<div class="leaderboard-box"><h3>🏆 Top 5 Leaderboard</h3>`;
  if(appData.leaderboard) {
    appData.leaderboard.forEach(p => {
      lbHtml += `<div class="lb-row"><span class="lb-name">${p.name}</span><span>${p.score} pts <small>(${p.game})</small></span></div>`;
    });
  }
  lbHtml += `</div>`;

  container.innerHTML = `
    <div class="game-container">
      <h2 class="section-title">Learning Games</h2>
      <p style="margin-bottom:2rem;">Welcome, <b>${playerName}</b>! <a href="#" onclick="clearName()" style="color:var(--primary); font-size:0.8rem;">(Change)</a></p>
      ${lbHtml}
      <div class="game-menu">
        <button class="game-btn" onclick="startWordSearch()">
          <svg class="icon-svg" style="width:24px;height:24px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
          Word Puzzle
        </button>
        <button class="game-btn" onclick="startQuiz()">
          <svg class="icon-svg" style="width:24px;height:24px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
          Quiz
        </button>
        <button class="game-btn" onclick="startMemory()">
          <svg class="icon-svg" style="width:24px;height:24px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20"/><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="M4 12V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5"/></svg>
          Memory
        </button>
      </div>
      <div id="game-board" style="background:var(--card-bg); padding:2rem; border-radius:20px; border:1px solid var(--border); min-height:300px; max-width:800px; margin:0 auto;">
        <p style="color:var(--text-sub);">Select a game to start playing!</p>
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
    <div style="display:grid; gap:10px;">${q.opt.map(o => `<button onclick="checkAns(this, '${o.replace(/'/g,"\\'")}', '${q.ans.replace(/'/g,"\\'")}')" class="quiz-opt">${o}</button>`).join('')}</div>`;
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
  let words = appData.words && appData.words.length > 0 ? appData.words : [{word:"AUTISM",clue:"Dev disorder"}];
  let gameWords = words.sort(() => 0.5 - Math.random()).slice(0, 8);
  const size = Math.max(10, Math.max(...gameWords.map(w=>w.word.length))+2);
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
  
  let h = `<div class="word-grid" style="grid-template-columns:repeat(${size},1fr)">`;
  grid.forEach(r => r.forEach(c => h+=`<div class="word-cell" onclick="this.style.background='var(--accent)'">${c}</div>`));
  h += `</div><div style="margin-top:20px;text-align:left;"><h4>Find:</h4><ul>${gameWords.map(w=>`<li>${w.clue}</li>`).join('')}</ul></div>`;
  h += `<button class="btn-details" style="margin-top:20px;width:100%;" onclick="finishGame(50,'Word Search')">Finish</button>`;
  board.innerHTML = h;
}
function canPlace(g,w,r,c,d) { if(d==='H' && c+w.length>g.length) return false; if(d==='V' && r+w.length>g.length) return false; for(let i=0;i<w.length;i++) if(d==='H' && g[r][c+i]!=='' && g[r][c+i]!==w[i]) return false; else if(d==='V' && g[r+i][c]!=='' && g[r+i][c]!==w[i]) return false; return true; }
function placeWord(g,w,r,c,d) { for(let i=0;i<w.length;i++) if(d==='H') g[r][c+i]=w[i]; else g[r+i][c]=w[i]; }

window.startMemory = function() { 
  const board = document.getElementById('game-board');
  const icons = ['🧠','♿','❤️','🤝','🗣️','👂','👁️','🧩'];
  let cards = [...icons, ...icons].sort(() => 0.5 - Math.random());
  let h = `<div class="memory-grid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; max-width:400px; margin:0 auto;">`;
  cards.forEach((icon, i) => h+=`<div id="mem-${i}" onclick="flipCard(${i}, '${icon}')" style="aspect-ratio:1; background:var(--primary); border-radius:8px; cursor:pointer; display:grid; place-items:center; font-size:1.5rem; color:transparent;">${icon}</div>`);
  h += `</div>`;
  board.innerHTML = `<h3>Memory</h3>` + h;
}
let fC=null, lB=false, mC=0;
window.flipCard = function(id, ic) {
  if(lB) return;
  const el = document.getElementById('mem-'+id);
  if(el.style.background === 'white') return;
  el.style.background='white'; el.style.color='black'; el.style.border='2px solid var(--accent)';
  if(!fC) fC = {id, ic};
  else {
    if(fC.id === id) return;
    lB=true;
    if(fC.ic === ic) { mC++; fC=null; lB=false; if(mC===8) finishGame(100, "Memory"); }
    else {
      setTimeout(() => {
        const p = document.getElementById('mem-'+fC.id);
        p.style.background='var(--primary)'; p.style.color='transparent'; p.style.border='none';
        el.style.background='var(--primary)'; el.style.color='transparent'; el.style.border='none';
        fC=null; lB=false;
      }, 1000);
    }
  }
}

function finishGame(s, g) {
  showToast(`Score: ${s}`);
  document.getElementById('game-board').innerHTML = `<h3>Good Job!</h3><p>Score: ${s}</p><button class="btn-details" onclick="renderGamesHub(document.getElementById('app-content'))">Back</button>`;
  fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'submit_score', name: playerName, score: s, game: g }) });
}

// --- CHAT & FACTS ---
window.toggleChat = function() {
  const c = document.getElementById('chat-window');
  c.style.display = c.style.display === 'flex' ? 'none' : 'flex';
}
window.handleChat = function() {
  const inp = document.getElementById('chat-input');
  const txt = inp.value.toLowerCase();
  const b = document.getElementById('chat-body');
  if(!txt) return;
  b.innerHTML += `<div class="chat-bubble user-msg">${inp.value}</div>`;
  inp.value = '';
  let found = appData.content ? appData.content.find(i => i.title.toLowerCase().includes(txt) || i.desc.toLowerCase().includes(txt)) : null;
  setTimeout(() => {
    if(found) b.innerHTML += `<div class="chat-bubble bot-msg">Found: <b>${found.title}</b><br>${found.desc.substring(0,100)}...</div>`;
    else { 
      b.innerHTML += `<div class="chat-bubble bot-msg">Not found. I'll suggest this topic to the team.</div>`; 
      fetch(API_URL, { method:'POST', mode:'no-cors', body:JSON.stringify({action:'submit_suggestion', text:txt}) });
    }
    b.scrollTop = b.scrollHeight;
  }, 500);
}
window.showFunFact = function() {
  const facts = ["IDD includes 200+ conditions.", "Early intervention works.", "Inclusion benefits everyone."];
  const f = facts[Math.floor(Math.random()*facts.length)];
  document.getElementById('chat-body').innerHTML += `<div class="chat-bubble bot-msg">💡 <b>Did you know?</b> ${f}</div>`;
}

// --- UTILS ---
function renderFooter(contacts) {
  const f = document.getElementById('footer-target');
  f.innerHTML = (contacts||[]).map(c => `<div class="footer-col"><h4>${c.title}</h4><p>${c.desc.replace(/\n/g,'<br>')}</p>${c.link?`<a href="${c.link}" target="_blank">Open Link</a>`:''}</div>`).join('');
}
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
function encodeData(o) { return JSON.stringify(o).replace(/'/g, "&apos;").replace(/"/g, "&quot;"); }
function showToast(m) {
  const t = document.getElementById('toast'); t.innerText = m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 3000);
}
function showActionToast(m, b, cb) {
  const t = document.getElementById('toast');
  t.innerHTML = `<span>${m}</span><button id="ta" class="toast-btn">${b}</button>`; t.classList.add('show');
  document.getElementById('ta').onclick = () => { t.classList.remove('show'); cb(); };
}
function renderAppBackup() {
  document.getElementById('app-content').innerHTML = `<div style="text-align:center; padding:4rem;"><h3>Offline</h3><p>Check connection.</p><button onclick="window.location.reload()" class="btn-details">Retry</button></div>`;
}

// Theme & SW
function initTheme() { document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')); }
window.toggleTheme = function() {
  const n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', n); localStorage.setItem('theme', n);
}
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(reg => {
  if(reg.waiting) showUpdateToast(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const n = reg.installing;
    n.addEventListener('statechange', () => { if(n.state==='installed' && navigator.serviceWorker.controller) showUpdateToast(n); });
  });
});
function showUpdateToast(w) { showActionToast("Update Available", "Update", () => w.postMessage({type:'SKIP_WAITING'})); }
navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());

// Install
let deferredPrompt;
const installBtn = document.getElementById('install-btn');
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; installBtn.style.display = 'flex'; });
installBtn.addEventListener('click', () => { installBtn.style.display='none'; deferredPrompt.prompt(); });

// Viewers
window.openImageViewer = function(s) { document.getElementById('v-img').src=s; document.getElementById('image-viewer').classList.add('active'); }
window.closeImageViewer = function() { document.getElementById('image-viewer').classList.remove('active'); }
