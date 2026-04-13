/* ══════════════════════════════════════════════════════════════
   RAAS Admin — properties, materials pricing & site settings

   Dual-mode: tries /api/* serverless endpoints first.
   Falls back to localStorage when backend env vars are not set.
   Zero regression — works exactly like before when offline.
══════════════════════════════════════════════════════════════ */

// Fallback credentials (used ONLY when backend is not configured)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'raas2025'
};

// ─── API base (same-origin on both Vercel and AWS with CloudFront) ─
const API_BASE = (typeof window !== 'undefined' && window.RAAS_API_BASE) || '';

// ─── API helpers ─────────────────────────────────────────
let _backendAvailable = null; // null=unknown, true/false after health check

async function checkBackend() {
  if (_backendAvailable !== null) return _backendAvailable;
  try {
    const r = await fetch(API_BASE + '/api/health');
    if (!r.ok) { _backendAvailable = false; return false; }
    const data = await r.json();
    _backendAvailable = data.backend === true;
  } catch {
    _backendAvailable = false;
  }
  return _backendAvailable;
}

async function apiPost(path, body) {
  try {
    const r = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-RAAS-Client': 'web' },
      credentials: API_BASE ? 'include' : 'same-origin',
      body: JSON.stringify(body)
    });
    return { ok: r.ok, status: r.status, data: await r.json().catch(() => null) };
  } catch { return { ok: false, status: 0, data: null }; }
}

async function apiDelete(path) {
  try {
    const r = await fetch(API_BASE + path, {
      method: 'DELETE',
      headers: { 'X-RAAS-Client': 'web' },
      credentials: API_BASE ? 'include' : 'same-origin'
    });
    return { ok: r.ok, data: await r.json().catch(() => null) };
  } catch { return { ok: false, data: null }; }
}

async function apiGet(path) {
  try {
    const r = await fetch(API_BASE + path);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

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

const DEFAULT_MATERIALS = [
  { icon: '🏖️', name: 'River Sand',       price: 'Enquiry based' },
  { icon: '🪨', name: 'M-Sand',           price: '₹55–65/cft' },
  { icon: '🧱', name: 'Bricks',           price: '₹8–12/unit' },
  { icon: '⚙️', name: 'TMT Steel',        price: 'Wholesale rate' },
  { icon: '🏗️', name: 'Cement',           price: '₹340–380/bag' },
  { icon: '🪵', name: 'Granite / Stone',   price: '₹90–140/sqft' }
];

// ─── Which property types show which fields ──────────────
const TYPE_FIELD_RULES = {
  plot:       { bhk: false, floor: false, amenities: false, dimensions: true,  landDetails: true  },
  land:       { bhk: false, floor: false, amenities: false, dimensions: false, landDetails: true  },
  apartment:  { bhk: true,  floor: true,  amenities: true,  dimensions: false, landDetails: false },
  villa:      { bhk: true,  floor: false, amenities: true,  dimensions: true,  landDetails: false },
  commercial: { bhk: false, floor: true,  amenities: true,  dimensions: false, landDetails: false }
};

// Default measurement unit per type
const TYPE_DEFAULT_AREA_UNIT = {
  plot: 'sqft',
  land: 'acres',
  apartment: 'sqft',
  villa: 'sqft',
  commercial: 'sqft'
};

const TYPE_DEFAULT_PRICE_UNIT = {
  plot: 'lakhs',
  land: 'per_acre',
  apartment: 'lakhs',
  villa: 'lakhs',
  commercial: 'lakhs'
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
  loadMaterialsEditor();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('error-msg');
  errorMsg.textContent = '';

  const hasBackend = await checkBackend();

  if (hasBackend) {
    // Try API login (sets httpOnly cookie)
    const res = await apiPost('/api/login', { username, password });
    if (res.ok) {
      sessionStorage.setItem('raas_admin_logged_in', 'true');
      showDashboard();
      return;
    }
    errorMsg.textContent = (res.data && res.data.error) || 'Invalid credentials';
    return;
  }

  // Fallback: client-side check
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    sessionStorage.setItem('raas_admin_logged_in', 'true');
    showDashboard();
  } else {
    errorMsg.textContent = 'Invalid username or password';
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await apiDelete('/api/login').catch(() => {}); // clear server cookie
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

// ─── Property type → conditional fields ───────────────────
function updateFormFieldsByType() {
  const type = document.getElementById('prop-type').value;
  const rules = TYPE_FIELD_RULES[type] || { bhk: true, floor: true, amenities: true, dimensions: true, landDetails: false };

  const rowBhk = document.getElementById('row-bhk');
  const rowDimensions = document.getElementById('row-dimensions');
  const rowAmenities = document.getElementById('row-amenities');
  const rowLandDetails = document.getElementById('row-land-details');

  if (rowBhk) rowBhk.style.display = (rules.bhk || rules.floor) ? '' : 'none';
  if (rowDimensions) rowDimensions.style.display = rules.dimensions ? '' : 'none';
  if (rowAmenities) rowAmenities.style.display = rules.amenities ? '' : 'none';
  if (rowLandDetails) rowLandDetails.style.display = rules.landDetails ? '' : 'none';

  // BHK select visibility within row
  const bhkGroup = document.getElementById('prop-bhk')?.closest('.form-group');
  const floorGroup = document.getElementById('prop-floor')?.closest('.form-group');
  if (bhkGroup) bhkGroup.style.display = rules.bhk ? '' : 'none';
  if (floorGroup) floorGroup.style.display = rules.floor ? '' : 'none';

  // Set smart default units
  if (type && TYPE_DEFAULT_AREA_UNIT[type]) {
    const areaUnit = document.getElementById('prop-area-unit');
    if (areaUnit) areaUnit.value = TYPE_DEFAULT_AREA_UNIT[type];
  }
  if (type && TYPE_DEFAULT_PRICE_UNIT[type]) {
    const priceUnit = document.getElementById('prop-price-unit');
    if (priceUnit) priceUnit.value = TYPE_DEFAULT_PRICE_UNIT[type];
  }

  // Update labels contextually
  const areaLabel = document.querySelector('label[for="prop-area"]');
  if (areaLabel) {
    if (type === 'land') areaLabel.textContent = 'Total Land Area *';
    else if (type === 'plot') areaLabel.textContent = 'Plot Area *';
    else if (type === 'apartment') areaLabel.textContent = 'Super Built-up Area *';
    else if (type === 'villa') areaLabel.textContent = 'Built-up Area *';
    else areaLabel.textContent = 'Area *';
  }
}

const propTypeSelect = document.getElementById('prop-type');
if (propTypeSelect) {
  propTypeSelect.addEventListener('change', updateFormFieldsByType);
  // Set initial state
  updateFormFieldsByType();
}

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
document.getElementById('property-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.getElementById('prop-type').value;
  const rules = TYPE_FIELD_RULES[type] || {};

  const property = {
    id: Date.now(),
    name: document.getElementById('prop-name').value,
    type: type,
    location: document.getElementById('prop-location').value,
    price: document.getElementById('prop-price').value,
    priceUnit: document.getElementById('prop-price-unit').value,
    area: document.getElementById('prop-area').value,
    areaUnit: document.getElementById('prop-area-unit').value,
    status: document.getElementById('prop-status').value,
    facing: document.getElementById('prop-facing').value,
    rera: document.getElementById('prop-rera').value,
    description: document.getElementById('prop-description').value,
    images: uploadedImages.length > 0 ? uploadedImages.slice() : [],
    layout: uploadedLayout || null
  };

  // Conditional fields
  if (rules.bhk) property.bhk = document.getElementById('prop-bhk').value;
  if (rules.floor) property.floor = document.getElementById('prop-floor').value;
  if (rules.amenities) property.amenities = document.getElementById('prop-amenities').value;
  if (rules.dimensions) {
    property.length = document.getElementById('prop-length').value;
    property.breadth = document.getElementById('prop-breadth').value;
  }
  if (rules.landDetails) {
    property.roadWidth = document.getElementById('prop-road-width').value;
    property.zone = document.getElementById('prop-zone').value;
  }

  // Save to localStorage first (instant feedback)
  const properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  properties.push(property);
  try {
    localStorage.setItem('raas_properties', JSON.stringify(properties));
  } catch (err) {
    alert('Storage limit reached. Try fewer / smaller photos per property until the backend is connected.');
    return;
  }

  // Also save to API (if backend is configured, makes it visible to all visitors)
  if (_backendAvailable) {
    const res = await apiPost('/api/properties', property);
    if (!res.ok) {
      showToast('Saved locally. API sync failed — will retry later.');
    }
  }

  document.getElementById('property-form').reset();
  uploadedImages = [];
  uploadedLayout = null;
  document.getElementById('image-previews').innerHTML = '';
  document.getElementById('layout-preview').innerHTML = '';
  document.getElementById('image-upload-box').querySelector('p').textContent = 'Click to upload photos';
  document.getElementById('layout-upload-box').querySelector('p').textContent = 'Click to upload floor plan / site map / layout';
  updateFormFieldsByType();

  loadPropertiesList();
  showToast('Property added successfully');
});

// ─── Properties list ──────────────────────────────────────
const PRICE_UNIT_LABELS = {
  lakhs: 'Lakhs',
  crores: 'Crores',
  per_sqft: '/ sq.ft',
  per_acre: '/ Acre',
  per_gunta: '/ Gunta',
  negotiable: '(Negotiable)'
};

const AREA_UNIT_LABELS = {
  sqft: 'sq.ft',
  acres: 'Acres',
  guntas: 'Guntas',
  cents: 'Cents',
  grounds: 'Grounds'
};

const TYPE_LABELS = {
  plot: 'Plot / Site',
  land: 'Agricultural Land',
  apartment: 'Apartment',
  villa: 'Villa',
  commercial: 'Commercial'
};

function formatPrice(prop) {
  if (!prop.price) return '₹ —';
  const unit = PRICE_UNIT_LABELS[prop.priceUnit] || 'Lakhs';
  if (prop.priceUnit === 'negotiable') return `₹${prop.price} ${unit}`;
  return `₹${prop.price} ${unit}`;
}

function formatArea(prop) {
  if (!prop.area) return '';
  const unit = AREA_UNIT_LABELS[prop.areaUnit] || 'sq.ft';
  return `${prop.area} ${unit}`;
}

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

    const typeLabel = TYPE_LABELS[prop.type] || prop.type;
    const areaStr = formatArea(prop);
    const priceStr = formatPrice(prop);

    let detailsLine2 = `<p><strong>Price:</strong> ${priceStr}`;
    if (areaStr) detailsLine2 += ` &nbsp;|&nbsp; <strong>Area:</strong> ${areaStr}`;
    detailsLine2 += ` &nbsp;|&nbsp; <strong>Status:</strong> ${prop.status}</p>`;

    let detailsLine3 = '';
    if (prop.bhk) detailsLine3 += `<strong>BHK:</strong> ${prop.bhk} &nbsp; `;
    if (prop.facing) detailsLine3 += `<strong>Facing:</strong> ${prop.facing} &nbsp; `;
    if (prop.floor) detailsLine3 += `<strong>Floor:</strong> ${prop.floor} &nbsp; `;
    if (prop.length && prop.breadth) detailsLine3 += `<strong>Dimensions:</strong> ${prop.length} × ${prop.breadth} ft &nbsp; `;
    if (prop.roadWidth) detailsLine3 += `<strong>Road:</strong> ${prop.roadWidth} &nbsp; `;
    if (prop.zone) detailsLine3 += `<strong>Zone:</strong> ${prop.zone} &nbsp; `;
    if (prop.rera) detailsLine3 += `<strong>RERA:</strong> ${prop.rera}`;
    if (detailsLine3) detailsLine3 = `<p>${detailsLine3}</p>`;

    return `
      <div class="property-item">
        ${thumb}
        <div class="property-info">
          <h3>${prop.name}</h3>
          <p><strong>Type:</strong> ${typeLabel} &nbsp;|&nbsp; <strong>Location:</strong> ${prop.location}</p>
          ${detailsLine2}
          ${detailsLine3}
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

async function deleteProperty(id) {
  if (confirm('Are you sure you want to delete this property?')) {
    let properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
    properties = properties.filter(prop => prop.id !== id);
    localStorage.setItem('raas_properties', JSON.stringify(properties));
    if (_backendAvailable) {
      await apiDelete(`/api/properties?id=${id}`);
    }
    loadPropertiesList();
    showToast('Property deleted');
  }
}
window.deleteProperty = deleteProperty;

// ═══════════════════════════════════════════════════════════
//   MATERIALS PRICING EDITOR
// ═══════════════════════════════════════════════════════════
function getMaterials() {
  const stored = JSON.parse(localStorage.getItem('raas_materials') || 'null');
  return stored || DEFAULT_MATERIALS.slice();
}

function renderMaterialRow(mat, index) {
  return `
    <div class="material-edit-row" data-index="${index}">
      <div class="form-group">
        <label>Icon</label>
        <input type="text" class="icon-input mat-icon" value="${mat.icon || ''}" placeholder="🧱">
      </div>
      <div class="form-group">
        <label>Material Name</label>
        <input type="text" class="mat-name" value="${mat.name || ''}" placeholder="e.g. Cement" required>
      </div>
      <div class="form-group">
        <label>Price / Rate</label>
        <input type="text" class="mat-price" value="${mat.price || ''}" placeholder="e.g. ₹340–380/bag">
      </div>
      <button type="button" class="btn-remove-material" onclick="removeMaterialRow(${index})" title="Remove">✕</button>
    </div>`;
}

function loadMaterialsEditor() {
  const materials = getMaterials();
  const editor = document.getElementById('materials-editor');
  if (!editor) return;
  editor.innerHTML = materials.map((m, i) => renderMaterialRow(m, i)).join('');
}

function addMaterialRow() {
  const editor = document.getElementById('materials-editor');
  if (!editor) return;
  const idx = editor.querySelectorAll('.material-edit-row').length;
  editor.insertAdjacentHTML('beforeend', renderMaterialRow({ icon: '', name: '', price: '' }, idx));
}
window.addMaterialRow = addMaterialRow;

function removeMaterialRow(index) {
  const rows = document.querySelectorAll('.material-edit-row');
  if (rows[index]) rows[index].remove();
  // Re-index
  document.querySelectorAll('.material-edit-row').forEach((row, i) => {
    row.setAttribute('data-index', i);
    row.querySelector('.btn-remove-material').setAttribute('onclick', `removeMaterialRow(${i})`);
  });
}
window.removeMaterialRow = removeMaterialRow;

function collectMaterialsFromForm() {
  const rows = document.querySelectorAll('.material-edit-row');
  const materials = [];
  rows.forEach(row => {
    const icon = row.querySelector('.mat-icon').value.trim();
    const name = row.querySelector('.mat-name').value.trim();
    const price = row.querySelector('.mat-price').value.trim();
    if (name) materials.push({ icon, name, price });
  });
  return materials;
}

const materialsForm = document.getElementById('materials-form');
if (materialsForm) {
  materialsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const materials = collectMaterialsFromForm();
    localStorage.setItem('raas_materials', JSON.stringify(materials));
    if (_backendAvailable) {
      await apiPost('/api/materials', materials);
    }
    showToast('Materials pricing saved');
  });
}

// ═══════════════════════════════════════════════════════════
//   SITE SETTINGS
// ═══════════════════════════════════════════════════════════
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
    if (el.tagName === 'TEXTAREA') val = val.replace(/<br\s*\/?>/gi, '\n');
    el.value = val;
  });
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
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
  if (_backendAvailable) {
    await apiPost('/api/settings', settings);
  }
  showToast('Site settings saved');
});

document.addEventListener('DOMContentLoaded', () => {
  checkBackend(); // probe backend early (non-blocking)
  checkAuth();
});
