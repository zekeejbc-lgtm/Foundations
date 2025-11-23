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
  console.log("System initializing...");
  
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
      
      const isInitial = document.getElementById('app-content').innerHTML.includes('sk-box') || document.getElementById('app-content').innerHTML === "";
      
      if(isInitial) {
        renderFooter(data.contacts);
        renderView(localStorage.getItem('currentView') || 'home');
        const scroll = localStorage.getItem('scrollPos');
        if(scroll) setTimeout(() => window.scrollTo(0, parseInt(scroll)), 50);
      }
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

// --- SMART CHATBOT LOGIC (AI) ---
window.toggleChat = function() {
  const c = document.getElementById('chat-window');
  c.style.display = c.style.display === 'flex' ? 'none' : 'flex';
  // Auto focus input
  if(c.style.display === 'flex') document.getElementById('chat-input').focus();
}

window.handleChat = function() {
  const inp = document.getElementById('chat-input');
  const txt = inp.value.trim().toLowerCase();
  const b = document.getElementById('chat-body');
  
  if(!txt) return;
  
  // 1. Display User Message
  b.innerHTML += `<div class="chat-bubble user-msg">${inp.value}</div>`;
  inp.value = '';
  b.scrollTop = b.scrollHeight; // Scroll to bottom

  // 2. Process Logic (The "AI")
  setTimeout(() => {
    let response = "";

    // A. CHECK TEAM INTENT
    if(txt.includes('team') || txt.includes('who') || txt.includes('people') || txt.includes('creator') || txt.includes('developer')) {
      if(appData.profiles && appData.profiles.length > 0) {
        let teamList = appData.profiles.map(p => `• <b>${p.name}</b> (${p.role})`).join('<br>');
        response = `Here are the people behind this project:<br><br>${teamList}`;
      } else {
        response = "I couldn't retrieve the team list right now.";
      }
    }
    // B. CHECK GAME INTENT
    else if(txt.includes('game') || txt.includes('play') || txt.includes('quiz')) {
      response = `We have learning games available! Go to the <a href="#" onclick="switchView('games'); toggleChat()" style="color:var(--primary); text-decoration:underline;">Games Tab</a> to play Word Search, Quiz, or Memory Match.`;
    }
    // C. CHECK DATABASE CONTENT (Full Search)
    else if(appData.content) {
      // Search Title and Description
      const match = appData.content.find(i => 
        i.title.toLowerCase().includes(txt) || 
        i.desc.toLowerCase().includes(txt)
      );

      if(match) {
        // Found! Show Title + FULL Description + Link if available
        response = `<b>Found: ${match.title}</b><br><br>${match.desc}`;
        if(match.url && !match.url.includes('placeholder')) {
          response += `<br><br><a href="${match.url}" target="_blank" style="color:var(--accent); font-weight:bold;">View Resource</a>`;
        }
      } else {
        // Not Found
        response = `I couldn't find specific information about "${txt}" in our database.<br><br>I have saved your question as a suggestion for our team to add later!`;
        // Send to Backend
        fetch(API_URL, { method:'POST', mode:'no-cors', body:JSON.stringify({action:'submit_suggestion', text:txt}) });
      }
    } else {
      response = "I'm having trouble accessing the database. Please check your connection.";
    }

    // 3. Display Bot Response
    b.innerHTML += `<div class="chat-bubble bot-msg">${response}</div>`;
    b.scrollTop = b.scrollHeight;

  }, 600); // Fake "thinking" delay
}

window.showFunFact = function() {
  const facts = [
    "Intellectual disability is characterized by significant limitations in both intellectual functioning and adaptive behavior.",
    "Early intervention services can greatly improve a child's development.",
    "People with IDD can live independent, productive lives with the right support.",
    "There are over 200 known causes of IDD, including genetic conditions and issues during pregnancy.",
    "Inclusion in education benefits both students with disabilities and those without."
  ];
  const f = facts[Math.floor(Math.random()*facts.length)];
  const b = document.getElementById('chat-body');
  b.innerHTML += `<div class="chat-bubble bot-msg">💡 <b>Did you know?</b><br>${f}</div>`;
  b.scrollTop = b.scrollHeight;
}

// --- GAME ENGINE (RESPONSIVE) ---

// 1. WORD SEARCH
window.startWordSearch = function() { 
  const board = document.getElementById('game-board');
  let words = appData.words && appData.words.length > 0 ? appData.words : [{word:"AUTISM",clue:"Dev disorder"}];
  // Limit to 6 words for mobile fitting
  let gameWords = words.sort(() => 0.5 - Math.random()).slice(0, 6);
  
  // Calculate Grid Size based on longest word
  const longest = Math.max(...gameWords.map(w=>w.word.length));
  const size = Math.max(8, longest + 1); // Keep grid tight
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
  
  // Responsive Grid Style
  let h = `<div class="word-grid" style="grid-template-columns:repeat(${size}, 1fr);">`;
  grid.forEach(r => r.forEach(c => h+=`<div class="word-cell" onclick="this.style.background='var(--accent)'; this.style.color='#781d22'">${c}</div>`));
  h += `</div><div style="margin-top:20px;text-align:left;"><h4>Find these words:</h4><ul style="font-size:0.9rem;">${gameWords.map(w=>`<li>${w.clue}</li>`).join('')}</ul></div>`;
  h += `<button class="btn-details" style="margin-top:20px;width:100%;" onclick="finishGame(50,'Word Search')">I Found Them!</button>`;
  board.innerHTML = h;
}
function canPlace(g,w,r,c,d) { if(d==='H' && c+w.length>g.length) return false; if(d==='V' && r+w.length>g.length) return false; for(let i=0;i<w.length;i++) if(d==='H' && g[r][c+i]!=='' && g[r][c+i]!==w[i]) return false; else if(d==='V' && g[r+i][c]!=='' && g[r+i][c]!==w[i]) return false; return true; }
function placeWord(g,w,r,c,d) { for(let i=0;i<w.length;i++) if(d==='H') g[r][c+i]=w[i]; else g[r+i][c]=w[i]; }

// 2. QUIZ
window.startQuiz = function() {
  const board = document.getElementById('game-board');
  if(!appData.quiz || appData.quiz.length === 0) { board.innerHTML = "No questions loaded."; return; }
  let qList = [...appData.quiz].sort(() => 0.5 - Math.random()).slice(0, 10);
  let score = 0, idx = 0;
  
  function showQ() {
    if(idx >= qList.length) { finishGame(score, "Quiz"); return; }
    const q = qList[idx];
    board.innerHTML = `
      <div class="quiz-box">
        <h3 style="color:var(--primary);">Question ${idx+1} / ${qList.length}</h3>
        <p style="font-size:1.1rem; font-weight:600; margin:1.5rem 0;">${q.q}</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${q.opt.map(o => `<button onclick="checkAns(this, '${o.replace(/'/g,"\\'")}', '${q.ans.replace(/'/g,"\\'")}')" class="quiz-opt">${o}</button>`).join('')}
        </div>
      </div>`;
  }
  window.checkAns = function(btn, ch, cor) {
    board.querySelectorAll('button').forEach(b => b.disabled = true);
    if(ch === cor) { btn.style.background="#22c55e"; btn.style.color="white"; score+=10; } 
    else { btn.style.background="#ef4444"; btn.style.color="white"; }
    setTimeout(() => { idx++; showQ(); }, 1500);
  }
  showQ();
}

// 3. MEMORY
window.startMemory = function() { 
  const board = document.getElementById('game-board');
  const icons = ['🧠','♿','❤️','🤝','🗣️','👂','👁️','🧩'];
  let cards = [...icons, ...icons].sort(() => 0.5 - Math.random());
  let h = `<div class="memory-grid">`;
  cards.forEach((icon, i) => h+=`<div class="memory-card" id="mem-${i}" onclick="flipCard(${i}, '${icon}')">${icon}</div>`);
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
    if(fC.id === id) return;
    lB=true;
    if(fC.ic === ic) { mC++; fC=null; lB=false; if(mC===8) finishGame(100, "Memory"); }
    else {
      setTimeout(() => {
        document.getElementById('mem-'+fC.id).classList.remove('flipped');
        el.classList.remove('flipped');
        fC=null; lB=false;
      }, 1000);
    }
  }
}

// --- COMMON ---
function finishGame(s, g) {
  showToast(`Score: ${s}`);
  document.getElementById('game-board').innerHTML = `
    <div style="text-align:center; padding:3rem;">
      <h2 style="color:var(--primary);">🎉 Great Job!</h2>
      <p>You scored <b>${s}</b> points in ${g}.</p>
      <button class="btn-details" onclick="renderGamesHub(document.getElementById('app-content'))">Play Again</button>
    </div>
  `;
  fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'submit_score', name: playerName, score: s, game: g }) });
}

// --- RENDERERS & REST OF LOGIC (Keep your existing Render Functions) ---
// Please ensure you include the renderHome, renderTeam, renderGamesHub, etc. logic here.
// I will include the renderGamesHub here as it was part of the update.

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
        <button class="game-btn" onclick="startWordSearch()">🧩 Word Puzzle</button>
        <button class="game-btn" onclick="startQuiz()">❓ Quiz</button>
        <button class="game-btn" onclick="startMemory()">🧠 Memory</button>
      </div>
      <div id="game-board">
        <p style="color:var(--text-sub); padding:2rem;">Select a game to start playing!</p>
      </div>
    </div>
  `;
}

window.saveName = function() {
  const val = document.getElementById('p-name-input').value;
  if(val) { playerName = val; localStorage.setItem('playerName', val); renderGamesHub(document.getElementById('app-content')); }
}
window.clearName = function() { localStorage.removeItem('playerName'); playerName = ""; renderGamesHub(document.getElementById('app-content')); }

// ... (INCLUDE THE REST: renderHome, renderTeam, nav functions, etc. from previous working code) ...
