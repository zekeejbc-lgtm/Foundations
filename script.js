// ----------------------------------------------------
// YOUR GOOGLE APPS SCRIPT URL
// ----------------------------------------------------
const API_URL = "https://script.google.com/macros/s/AKfycbxe4e9qXtRv5caC_oMtcwZsdrkJc4oQ8aNrZWBvMAkOlFAtcLHUKyuhQ66uNLPz8wNE/exec"; 
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  showToast("Connecting to Database...");
  fetchData();
});

// --- FETCH DATA ---
async function fetchData() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    // Check if API returned valid data
    if (data.content || data.contacts) {
      showToast("Data Loaded Successfully!");
      renderApp(data.content || [], data.contacts || []);
    } else {
      throw new Error("Invalid Data Structure");
    }
  } catch (error) {
    console.error(error);
    showToast("Offline Mode / Connection Error");
    // Render Backup Logic
    renderApp(
      [{title: "Offline", desc: "Content unavailable offline.", url: "", type: "Image", ref: ""}], 
      [{title: "System", desc: "No connection", link: ""}]
    );
  }
}

// --- RENDER APP ---
function renderApp(content, contacts) {
  const grid = document.getElementById('grid-target');
  const footer = document.getElementById('footer-target');
  const heroWrap = document.getElementById('hero-wrap');
  
  grid.innerHTML = '';
  footer.innerHTML = '';

  let advocacyFound = false;

  content.forEach(item => {
    const type = item.type ? item.type.toString().trim().toLowerCase() : 'image';
    const processedMedia = getMediaHtml(item.url, type, false);
    
    // Data Object for Modal
    const itemObj = {
      t: item.title,
      d: item.desc,
      u: item.url,
      ty: type,
      r: item.ref
    };

    // 1. ADVOCACY (HERO)
    if (type === 'advocacy' && !advocacyFound) {
      advocacyFound = true;
      heroWrap.style.display = 'block';
      document.getElementById('hero-title').innerText = item.title;
      document.getElementById('hero-desc').innerText = item.desc;
      // Auto-play allowed in hero (if browser permits)
      document.getElementById('hero-vid').innerHTML = getMediaHtml(item.url, 'video', false);
    } 
    // 2. GRID ITEMS
    else {
      // Logic: Videos play inline. Images open modal.
      let overlayHtml = '';
      let clickAction = '';
      
      if (type === 'video') {
        // Video: No overlay, user clicks play button on iframe
        overlayHtml = '';
      } else {
        // Image: Overlay triggers modal
        overlayHtml = `<div class="img-overlay"></div>`;
      }

      // Create Card Element
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-media">
          ${processedMedia}
          ${overlayHtml}
        </div>
        <div class="card-content">
          <h3 class="card-title">${item.title}</h3>
          <p class="card-desc">${item.desc}</p>
          <button class="btn-details">Read Details & Refs</button>
        </div>
      `;

      // Add Click Listeners to Text/Overlay/Button only (Not the Video iframe)
      const clickTargets = card.querySelectorAll('.img-overlay, .card-title, .btn-details');
      clickTargets.forEach(el => {
        el.addEventListener('click', () => openModal(itemObj));
      });

      grid.appendChild(card);
    }
  });

  if (!advocacyFound) heroWrap.style.display = 'none';

  // 3. RENDER CONTACTS
  if (contacts && contacts.length > 0) {
    contacts.forEach(c => {
      const linkHtml = c.link ? `<br><a href="${c.link}" target="_blank">Open Link</a>` : '';
      footer.innerHTML += `
        <div class="footer-col">
          <h4>${c.title}</h4>
          <p>${c.desc.replace(/\n/g, '<br>')}</p>
          ${linkHtml}
        </div>
      `;
    });
  } else {
    footer.innerHTML = "<p>No contacts found.</p>";
  }
}

// --- MEDIA PROCESSOR ---
function getMediaHtml(url, type, autoplay) {
  if (!url) return '<img src="https://via.placeholder.com/600?text=No+Media" style="width:100%;height:100%;object-fit:cover">';
  
  let finalUrl = url;
  
  // YouTube
  if (url.includes("youtube") || url.includes("youtu.be")) {
    const id = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/))([^&?]*)/);
    if (id && id[1]) {
       finalUrl = `https://www.youtube.com/embed/${id[1]}?modestbranding=1&rel=0`;
       if (autoplay) finalUrl += "&autoplay=1";
       return `<iframe src="${finalUrl}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    }
  }
  
  // Drive Video
  if (type === 'video' || type === 'advocacy') {
    const match = url.match(/[-\w]{25,}/);
    if (match) {
       finalUrl = `https://drive.google.com/file/d/${match[0]}/preview`;
       return `<iframe src="${finalUrl}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    }
  }

  // Drive Image
  const match = url.match(/[-\w]{25,}/);
  if (match && url.includes("drive")) {
     finalUrl = `https://drive.google.com/uc?export=view&id=${match[0]}`;
  }
  
  // Regular Image
  return `<img src="${finalUrl}" loading="lazy">`;
}

// --- MODAL LOGIC ---
const modal = document.getElementById('modal');
const mMedia = document.getElementById('m-media');
const mTitle = document.getElementById('m-title');
const mDesc = document.getElementById('m-desc');
const mRefBox = document.getElementById('m-ref-box');
const mRefContent = document.getElementById('m-ref-content');

function openModal(data) {
  mMedia.innerHTML = getMediaHtml(data.u, data.ty, true); // Autoplay in modal
  mTitle.innerText = data.t;
  mDesc.innerText = data.d;
  
  if (data.r && data.r.trim() !== "") {
    mRefBox.style.display = 'block';
    const linkedText = data.r.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="ref-link">$1</a>');
    mRefContent.innerHTML = linkedText;
  } else {
    mRefBox.style.display = 'none';
  }

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

document.getElementById('close-modal').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

function closeModal() {
  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
    mMedia.innerHTML = ''; // Stop video playback
  }, 300);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

// --- PWA INSTALL PROMPT ---
let deferredPrompt;
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'flex';
});

installBtn.addEventListener('click', () => {
  installBtn.style.display = 'none';
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choiceResult) => {
    deferredPrompt = null;
  });
});