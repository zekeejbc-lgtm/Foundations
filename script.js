// ----------------------------------------------------
// YOUR GOOGLE APPS SCRIPT DEPLOYMENT URL
// ----------------------------------------------------
const API_URL = "https://script.google.com/macros/s/AKfycbxe4e9qXtRv5caC_oMtcwZsdrkJc4oQ8aNrZWBvMAkOlFAtcLHUKyuhQ66uNLPz8wNE/exec"; 
// ----------------------------------------------------

let appData = {};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme (System or Saved)
  initTheme();

  // 2. Initialize Navigation State
  const cachedView = localStorage.getItem('currentView') || 'home';
  updateNavState(cachedView);
  
  showToast("Connecting...");
  
  // 3. Fetch Data from Google Sheet
  fetch(API_URL)
    .then(res => res.json())
    .then(data => {
      if(data.status === 'success') {
        appData = data;
        showToast("Loaded!");
        
        // Render Content
        renderFooter(data.contacts);
        renderView(cachedView);
        
        // Restore Scroll Position
        const scroll = localStorage.getItem('scrollPos');
        if(scroll) setTimeout(() => window.scrollTo(0, parseInt(scroll)), 50);
      } else { 
        throw new Error(data.message); 
      }
    })
    .catch(err => {
      console.error(err);
      showToast("Using Offline Data");
      renderAppBackup();
    });
});

// Save scroll position before leaving
window.addEventListener('beforeunload', () => localStorage.setItem('scrollPos', window.scrollY));

// --- THEME LOGIC ---
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');
  }
}

window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

// --- NAVIGATION LOGIC ---
window.switchView = function(viewName) {
  localStorage.setItem('currentView', viewName);
  localStorage.setItem('scrollPos', 0);
  updateNavState(viewName);
  renderView(viewName);
  window.scrollTo(0, 0);
}

function updateNavState(viewName) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if(viewName === 'home') document.getElementById('nav-home').classList.add('active');
  if(viewName === 'members') document.getElementById('nav-team').classList.add('active');
}

function renderView(viewName) {
  const container = document.getElementById('app-content');
  container.innerHTML = '';
  
  if(!appData.content) return; // Wait for data to load

  if(viewName === 'home') renderHome(container);
  else renderTeam(container);
}

// --- RENDER: HOME PAGE ---
function renderHome(container) {
  let html = '';
  
  // Split Content: Advocacy (Hero) vs Others (Grid)
  const videoItem = appData.content.find(i => i.type && i.type.toLowerCase() === 'advocacy');
  const cards = appData.content.filter(i => !i.type || i.type.toLowerCase() !== 'advocacy');

  // 1. Hero Section
  if(videoItem) {
    const vidHtml = getMediaHtml(videoItem.url, 'video', false);
    html += `
      <div class="hero-section">
        <h2 class="hero-title">${videoItem.title}</h2>
        <div class="hero-desc">${videoItem.desc}</div>
        <div class="hero-video">${vidHtml}</div>
      </div>
      <div class="section-header"><h2 class="section-title">Awareness Materials</h2></div>
    `;
  }

  // 2. Card Grid
  html += `<div class="grid">`;
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
  html += `</div>`;
  
  container.innerHTML = html;
  
  // Re-attach overlay click listeners
  container.querySelectorAll('.img-overlay').forEach(el => {
    el.onclick = function() { 
      this.parentElement.nextElementSibling.querySelector('button').click(); 
    };
  });
}

// --- RENDER: TEAM PAGE ---
function renderTeam(container) {
  let html = '';
  
  const instructor = appData.profiles.find(p => p.role.toLowerCase() === 'instructor');
  const members = appData.profiles.filter(p => p.role.toLowerCase() !== 'instructor');

  // 1. Instructor Card
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

  // 2. Members Grid
  html += `<div class="member-grid">`;
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
  html += `</div>`;
  
  container.innerHTML = html;
}

// --- RENDER: FOOTER ---
function renderFooter(contacts) {
  const f = document.getElementById('footer-target');
  let h = '';
  if(contacts) {
    contacts.forEach(c => {
      const link = c.link ? `<br><a href="${c.link}" target="_blank">Open Link</a>` : '';
      h += `
        <div class="footer-col">
          <h4>${c.title}</h4>
          <p>${c.desc.replace(/\n/g, '<br>')}</p>
          ${link}
        </div>`;
    });
  }
  f.innerHTML = h;
}

// --- UNIVERSAL MEDIA HANDLER ---
function getSmartImg(url) {
  if(!url) return 'https://via.placeholder.com/150?text=No+Img';
  
  // Check for Google Drive Link
  const driveMatch = url.match(/[-\w]{25,}/);
  if (url.includes("drive.google.com") && driveMatch) {
    // Convert to export view for direct display
    return `https://drive.google.com/uc?export=view&id=${driveMatch[0]}`;
  }
  
  // For Facebook, Web, Imgur, etc., just return the URL
  return url;
}

function getMediaHtml(url, type, autoplay) {
  if (!url) return '';
  type = type ? type.toLowerCase() : 'image';
  
  // YouTube Logic
  if (url.includes("youtube") || url.includes("youtu.be")) {
    const id = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/))([^&?]*)/);
    if(id) {
       let src = `https://www.youtube.com/embed/${id[1]}?modestbranding=1&rel=0`;
       if(autoplay) src += "&autoplay=1";
       return `<iframe src="${src}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    }
  }
  
  // Google Drive Video Logic
  if (type === 'video' || type === 'advocacy') {
    const match = url.match(/[-\w]{25,}/);
    if(match && url.includes("drive")) {
       return `<iframe src="https://drive.google.com/file/d/${match[0]}/preview" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    }
    // Standard Video File
    if(url.endsWith('.mp4') || url.endsWith('.webm')) {
       return `<video src="${url}" controls style="width:100%; height:100%"></video>`;
    }
  }
  
  // Fallback to Smart Image
  return `<img src="${getSmartImg(url)}">`;
}

// --- MODAL LOGIC ---
window.openModal = function(data) {
  const m = document.getElementById('modal');
  document.getElementById('m-title').innerText = data.title;
  document.getElementById('m-desc').innerText = data.desc;
  document.getElementById('m-media').innerHTML = getMediaHtml(data.url, data.type, true);
  
  const refBox = document.getElementById('m-ref-box');
  if(data.ref) {
    refBox.style.display = 'block';
    // Make links in text clickable
    document.getElementById('m-ref-content').innerHTML = data.ref.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="ref-link">$1</a>');
  } else { 
    refBox.style.display = 'none'; 
  }
  
  m.style.display = 'flex';
  setTimeout(() => m.classList.add('active'), 10);
}

window.openProfile = function(data) {
  const m = document.getElementById('profile-modal');
  document.getElementById('p-name').innerText = data.name;
  document.getElementById('p-role').innerText = data.role + (data.program ? " | " + data.program : "");
  document.getElementById('p-bio').innerText = data.fullBio || data.shortDesc;
  document.getElementById('p-img').src = getSmartImg(data.imgUrl);
  
  const fb = document.getElementById('p-fb');
  if(data.fbLink) { 
    fb.style.display = 'inline-block'; 
    fb.href = data.fbLink; 
  } else { 
    fb.style.display = 'none'; 
  }
  
  m.style.display = 'flex';
  setTimeout(() => m.classList.add('active'), 10);
}

// Close Button Logic
document.querySelectorAll('.close-btn').forEach(btn => {
  btn.onclick = function() {
    const m = this.closest('.modal');
    m.classList.remove('active');
    setTimeout(() => {
      m.style.display = 'none';
      if(m.id === 'modal') document.getElementById('m-media').innerHTML = ''; // Stop videos
    }, 300);
  }
});

// --- HELPER FUNCTIONS ---
function encodeData(obj) { 
  // Encodes data to be safely passed in HTML onClick attributes
  return JSON.stringify(obj).replace(/'/g, "&apos;").replace(/"/g, "&quot;"); 
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

function renderAppBackup() {
  // Minimal backup render if offline
  renderApp([{title:"Offline", desc:"Check internet connection.", type:"Image"}], []);
}

// --- PWA INSTALL LOGIC ---
let deferredPrompt;
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); 
  deferredPrompt = e; 
  installBtn.style.display = 'block';
});

installBtn.addEventListener('click', () => {
  installBtn.style.display = 'none'; 
  deferredPrompt.prompt();
});
