/* ══════════════════════════════════════════════════════════════
   RAAS Admin — properties + site settings
   NOTE: client-side only (localStorage). Replace with backend
   before real launch. Login check is NOT secure — it's a gate.
══════════════════════════════════════════════════════════════ */

// TODO: move these off the client once a backend exists.
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'raas2025'
};

let uploadedImages = [];
let uploadedLayout = null;

const DEFAULT_SETTINGS = {
  phone_bengaluru: '+91 90197 93641',
  phone_bengaluru_raw: '919019793641',
  phone_shivamogga: '+91 82777 55555',
  phone_shivamogga_raw: '918277755555',
  email: 'info@raasbuilders.com',
  address: 'Shivamogga, Karnataka<br>Branch: Bengaluru',
  hours: 'Mon – Sat: 9:00 AM – 7:00 PM<br>Sun: By appointment',
  stat_listings: '500+',
  stat_years: '14+',
  stat_districts: '3',
  stat_satisfaction: '98%',
  stat_listings_num: '500',
  stat_years_num: '14',
  stat_families_num: '3',
  stat_rating_num: '4.8',
  about_p1: "RAAS Builders & Developers has been serving Karnataka's real estate needs for over a decade. What started as a small plot brokerage in Shivamogga has grown into a full-service real estate company spanning plots, apartments, construction, interiors and wholesale materials.",
  about_p2: 'We combine deep local knowledge of the Malnad region with the scale and professionalism that Bengaluru clients expect. Every project — whether a single plot sale or a full-home construction — is handled with the same level of care, transparency and RERA compliance.',
  about_p3: 'Our mission is simple: to make property ownership and home-building straightforward, safe, and rewarding for every family we serve.'
};

// ─── Toast ────────────────────────────────────────────────
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// ─── Auth ─────────────────────────────────────────────────
function checkAuth() {
  const isLoggedIn = sessionStorage.getItem('raas_admin_logged_in');
  if (isLoggedIn === 'true') showDashboard();
  else showLogin();
}
function showLogin() {
  document.getElementById('login-section').style.display = 'flex';
  document.getElementById('dashboard-section').style.display = 'none';
}
function showDashboard() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('dashboard-section').style.display = 'block';
  loadPropertiesList();
  loadSettingsIntoForm();
}

document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('error-msg');
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    sessionStorage.setItem('raas_admin_logged_in', 'true');
    showDashboard();
    errorMsg.textContent = '';
  } else {
    errorMsg.textContent = 'Invalid username or password';
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('raas_admin_logged_in');
  showLogin();
  document.getElementById('login-form').reset();
});

// ─── Tabs ─────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.toggle('active', p.id === `tab-${tab}`);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ─── Property uploads ─────────────────────────────────────
function handleImageUpload(input) {
  uploadedImages = [];
  const previews = document.getElementById('image-previews');
  previews.innerHTML = '';
  const files = Array.from(input.files);

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImages[index] = e.target.result;
      const img = document.createElement('div');
      img.className = 'preview-thumb';
      img.innerHTML = `
        <img src="${e.target.result}" alt="Preview ${index + 1}">
        <span class="thumb-label">Photo ${index + 1}</span>
      `;
      previews.appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('image-upload-box').querySelector('p').textContent =
    `${files.length} photo(s) selected`;
}

function handleLayoutUpload(input) {
  uploadedLayout = null;
  const preview = document.getElementById('layout-preview');
  preview.innerHTML = '';

  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedLayout = { name: file.name, type: file.type, data: e.target.result };
    if (file.type.startsWith('image/')) {
      preview.innerHTML = `
        <div class="layout-thumb">
          <img src="${e.target.result}" alt="Layout">
          <span>📐 ${file.name}</span>
        </div>`;
    } else {
      preview.innerHTML = `
        <div class="layout-thumb pdf-thumb">
          <span class="pdf-icon">📄</span>
          <span>${file.name}</span>
        </div>`;
    }
  };
  reader.readAsDataURL(file);

  document.getElementById('layout-upload-box').querySelector('p').textContent =
    `Selected: ${file.name}`;
}
window.handleImageUpload = handleImageUpload;
window.handleLayoutUpload = handleLayoutUpload;

// ─── Add property ─────────────────────────────────────────
document.getElementById('property-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const property = {
    id: Date.now(),
    name: document.getElementById('prop-name').value,
    type: document.getElementById('prop-type').value,
    location: document.getElementById('prop-location').value,
    price: document.getElementById('prop-price').value,
    area: document.getElementById('prop-area').value,
    bhk: document.getElementById('prop-bhk').value,
    facing: document.getElementById('prop-facing').value,
    amenities: document.getElementById('prop-amenities').value,
    status: document.getElementById('prop-status').value,
    description: document.getElementById('prop-description').value,
    images: uploadedImages.length > 0 ? uploadedImages.slice() : [],
    layout: uploadedLayout || null
  };

  const properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  properties.push(property);
  try {
    localStorage.setItem('raas_properties', JSON.stringify(properties));
  } catch (err) {
    alert('⚠️ Storage limit reached. Try fewer / smaller photos per property until the backend is connected.');
    return;
  }

  document.getElementById('property-form').reset();
  uploadedImages = [];
  uploadedLayout = null;
  document.getElementById('image-previews').innerHTML = '';
  document.getElementById('layout-preview').innerHTML = '';
  document.getElementById('image-upload-box').querySelector('p').textContent = 'Click to upload photos';
  document.getElementById('layout-upload-box').querySelector('p').textContent = 'Click to upload floor plan / layout';

  loadPropertiesList();
  showToast('✅ Property added successfully');
});

// ─── Properties list ──────────────────────────────────────
function loadPropertiesList() {
  const properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  const listContainer = document.getElementById('properties-list');

  if (properties.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <p>No properties added yet. Add your first property above — it will appear on the public site.</p>
      </div>`;
    return;
  }

  listContainer.innerHTML = properties.map(prop => {
    const thumb = prop.images && prop.images.length > 0
      ? `<img src="${prop.images[0]}" alt="${prop.name}">`
      : `<div class="no-img">🏠</div>`;

    const layoutBadge = prop.layout
      ? `<span class="layout-badge">${prop.layout.type && prop.layout.type.includes('pdf') ? '📄 Layout PDF' : '📐 Layout Image'}</span>`
      : '';

    return `
      <div class="property-item">
        ${thumb}
        <div class="property-info">
          <h3>${prop.name}</h3>
          <p><strong>Type:</strong> ${prop.type} &nbsp;|&nbsp; <strong>Location:</strong> ${prop.location}</p>
          <p><strong>Price:</strong> ₹${prop.price} Lakhs &nbsp;|&nbsp; <strong>Status:</strong> ${prop.status}</p>
          ${prop.area ? `<p><strong>Area:</strong> ${prop.area} sq.ft ${prop.bhk ? '&nbsp;|&nbsp; <strong>BHK:</strong> ' + prop.bhk : ''}</p>` : ''}
          ${prop.amenities ? `<p><strong>Amenities:</strong> ${prop.amenities}</p>` : ''}
          ${layoutBadge}
          ${prop.images && prop.images.length > 1 ? `<p><strong>Photos:</strong> ${prop.images.length} uploaded</p>` : ''}
        </div>
        <div class="property-actions">
          ${prop.layout ? `<button class="btn-view-layout" onclick="viewLayout(${prop.id})">View Layout</button>` : ''}
          <button class="btn-delete" onclick="deleteProperty(${prop.id})">Delete</button>
        </div>
      </div>`;
  }).join('');
}

function viewLayout(id) {
  const properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  const prop = properties.find(p => p.id === id);
  if (prop && prop.layout) {
    const win = window.open();
    if (prop.layout.type && prop.layout.type.includes('pdf')) {
      win.document.write(`<iframe src="${prop.layout.data}" width="100%" height="100%" style="border:none;position:absolute;inset:0;"></iframe>`);
    } else {
      win.document.write(`<img src="${prop.layout.data}" style="max-width:100%;display:block;margin:auto;">`);
    }
  }
}
window.viewLayout = viewLayout;

function deleteProperty(id) {
  if (confirm('Are you sure you want to delete this property?')) {
    let properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
    properties = properties.filter(prop => prop.id !== id);
    localStorage.setItem('raas_properties', JSON.stringify(properties));
    loadPropertiesList();
    showToast('🗑️ Property deleted');
  }
}
window.deleteProperty = deleteProperty;

// ─── Site Settings ────────────────────────────────────────
function getSettings() {
  const stored = JSON.parse(localStorage.getItem('raas_site_settings') || '{}');
  return { ...DEFAULT_SETTINGS, ...stored };
}

function loadSettingsIntoForm() {
  const s = getSettings();
  const map = {
    's-phone-blr': 'phone_bengaluru',
    's-phone-blr-raw': 'phone_bengaluru_raw',
    's-phone-shi': 'phone_shivamogga',
    's-phone-shi-raw': 'phone_shivamogga_raw',
    's-email': 'email',
    's-address': 'address',
    's-hours': 'hours',
    's-stat-listings': 'stat_listings',
    's-stat-years': 'stat_years',
    's-stat-districts': 'stat_districts',
    's-stat-satisfaction': 'stat_satisfaction',
    's-stat-listings-num': 'stat_listings_num',
    's-stat-years-num': 'stat_years_num',
    's-stat-families-num': 'stat_families_num',
    's-stat-rating-num': 'stat_rating_num',
    's-about-1': 'about_p1',
    's-about-2': 'about_p2',
    's-about-3': 'about_p3'
  };
  Object.entries(map).forEach(([inputId, key]) => {
    const el = document.getElementById(inputId);
    if (!el) return;
    let val = s[key] || '';
    // Convert <br> back to newlines for textareas
    if (el.tagName === 'TEXTAREA') val = val.replace(/<br\s*\/?>/gi, '\n');
    el.value = val;
  });
}

document.getElementById('settings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const getVal = (id, asHtml = false) => {
    const el = document.getElementById(id);
    if (!el) return '';
    let v = el.value.trim();
    if (asHtml) v = v.replace(/\n/g, '<br>');
    return v;
  };

  const settings = {
    phone_bengaluru: getVal('s-phone-blr'),
    phone_bengaluru_raw: getVal('s-phone-blr-raw').replace(/\D/g, ''),
    phone_shivamogga: getVal('s-phone-shi'),
    phone_shivamogga_raw: getVal('s-phone-shi-raw').replace(/\D/g, ''),
    email: getVal('s-email'),
    address: getVal('s-address', true),
    hours: getVal('s-hours', true),
    stat_listings: getVal('s-stat-listings'),
    stat_years: getVal('s-stat-years'),
    stat_districts: getVal('s-stat-districts'),
    stat_satisfaction: getVal('s-stat-satisfaction'),
    stat_listings_num: getVal('s-stat-listings-num'),
    stat_years_num: getVal('s-stat-years-num'),
    stat_families_num: getVal('s-stat-families-num'),
    stat_rating_num: getVal('s-stat-rating-num'),
    about_p1: getVal('s-about-1'),
    about_p2: getVal('s-about-2'),
    about_p3: getVal('s-about-3')
  };

  localStorage.setItem('raas_site_settings', JSON.stringify(settings));
  showToast('💾 Site settings saved');
});

document.addEventListener('DOMContentLoaded', checkAuth);
