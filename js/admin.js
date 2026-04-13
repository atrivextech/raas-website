/* ══════════════════════════════════════════════════════════════
   RAAS Admin — properties, materials pricing & site settings

   Dual-mode: tries /api/* serverless endpoints first.
   Falls back to localStorage when backend env vars are not set.
   Zero regression — works exactly like before when offline.
══════════════════════════════════════════════════════════════ */

// Fallback credentials (used ONLY when backend is not configured)
// ⚠️ In production, set SESSION_SECRET + ADMIN_PASSWORD env vars
//    so auth happens server-side with httpOnly cookies instead.
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'raas2025'
};

// ─── Constants ──────────────────────────────────────────
const MAX_FILE_SIZE = 2 * 1024 * 1024;     // 2 MB per image
const MAX_IMAGES    = 8;                     // max photos per property
const MAX_LAYOUT_SIZE = 5 * 1024 * 1024;    // 5 MB for layout PDF/image

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
let editingPropertyId = null; // null = adding new, number = editing existing

// ─── XSS sanitizer (escape HTML for safe display) ───────
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

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
  about_p3: 'Our mission is simple: to make property ownership and home-building straightforward, safe, and rewarding for every family we serve.',
  // Construction packages
  pkg_essential_price: 'From ₹1,650/sqft',
  pkg_essential_features: 'Basic finishes, Standard fixtures, 2-year warranty',
  pkg_premium_price: 'From ₹2,200/sqft',
  pkg_premium_features: 'Modular kitchen, Italian tiles, 5-year warranty',
  pkg_elite_price: 'From ₹3,200/sqft',
  pkg_elite_features: 'Full interior design, Smart home ready, Lifetime support',
  pkg_farmhouse_price: 'Custom Pricing',
  pkg_farmhouse_features: 'Eco-friendly design, Vastu compliant, Site assessment',
  // Apartment pricing
  apt_1bhk_price: '✅ Starting ₹25 Lakhs',
  apt_1bhk_area: '✅ 450 – 650 sq.ft',
  apt_23bhk_price: '✅ Starting ₹45 Lakhs',
  apt_23bhk_area: '✅ 900 – 1600 sq.ft',
  // Hero showcase
  hero_title: 'Prime Plot — Thirthahalli Road',
  hero_location: '📍 Shivamogga District, Karnataka',
  hero_price: '₹18.5 L',
  hero_specs: '📐 30×40 ft, 🛣️ 40ft Road, ✅ RERA',
  // Testimonials
  test_1_text: '"Bought a plot in Thirthahalli through RAAS. The entire process — from survey verification to registration — was smooth and transparent. Highly recommended."',
  test_1_name: 'Shivakumar R.',
  test_1_role: 'Plot Owner, Shivamogga',
  test_2_text: '"RAAS built our 3 BHK home in Bengaluru from foundation to final interiors. On time, within budget, and the quality exceeded our expectations."',
  test_2_name: 'Priya K.',
  test_2_role: 'Homeowner, Bengaluru',
  test_3_text: '"We built our farmhouse in Sagara with RAAS. Their Malnad expertise made a huge difference — they understood the terrain, water sources and local permissions."',
  test_3_name: 'Mohan H.',
  test_3_role: 'Farmhouse Owner, Sagara'
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
  loadEnquiries();
  updateDashboardSummary();
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
  let files = Array.from(input.files);

  // Validate count
  if (files.length > MAX_IMAGES) {
    showToast(`Maximum ${MAX_IMAGES} photos allowed. First ${MAX_IMAGES} will be used.`);
    files = files.slice(0, MAX_IMAGES);
  }

  // Validate sizes
  const oversized = files.filter(f => f.size > MAX_FILE_SIZE);
  if (oversized.length > 0) {
    showToast(`${oversized.length} file(s) exceed 2 MB and were skipped.`);
    files = files.filter(f => f.size <= MAX_FILE_SIZE);
  }

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

  if (file.size > MAX_LAYOUT_SIZE) {
    showToast('Layout file must be under 5 MB');
    input.value = '';
    return;
  }

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

// ─── Add / Edit property ──────────────────────────────────
function collectPropertyFromForm() {
  const type = document.getElementById('prop-type').value;
  const rules = TYPE_FIELD_RULES[type] || {};

  const property = {
    id: editingPropertyId || Date.now(),
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
  return property;
}

function resetPropertyForm() {
  document.getElementById('property-form').reset();
  uploadedImages = [];
  uploadedLayout = null;
  editingPropertyId = null;
  document.getElementById('image-previews').innerHTML = '';
  document.getElementById('layout-preview').innerHTML = '';
  document.getElementById('image-upload-box').querySelector('p').textContent = 'Click to upload photos';
  document.getElementById('layout-upload-box').querySelector('p').textContent = 'Click to upload floor plan / site map / layout';
  // Reset form header
  const formH2 = document.querySelector('#tab-properties .card h2');
  if (formH2) formH2.innerHTML = formH2.innerHTML.replace(/<span class="editing-badge">.*?<\/span>/, '');
  const submitBtn = document.querySelector('#property-form button[type="submit"]');
  if (submitBtn) submitBtn.textContent = '✅ Add Property';
  updateFormFieldsByType();
}

function loadPropertyIntoForm(prop) {
  editingPropertyId = prop.id;
  // Basic fields
  document.getElementById('prop-name').value = prop.name || '';
  document.getElementById('prop-type').value = prop.type || 'plot';
  updateFormFieldsByType();
  document.getElementById('prop-location').value = prop.location || '';
  document.getElementById('prop-price').value = prop.price || '';
  document.getElementById('prop-price-unit').value = prop.priceUnit || 'lakhs';
  document.getElementById('prop-area').value = prop.area || '';
  document.getElementById('prop-area-unit').value = prop.areaUnit || 'sqft';
  document.getElementById('prop-status').value = prop.status || 'available';
  document.getElementById('prop-facing').value = prop.facing || '';
  document.getElementById('prop-rera').value = prop.rera || '';
  document.getElementById('prop-description').value = prop.description || '';
  // Conditional
  if (prop.bhk) document.getElementById('prop-bhk').value = prop.bhk;
  if (prop.floor) document.getElementById('prop-floor').value = prop.floor;
  if (prop.amenities) document.getElementById('prop-amenities').value = prop.amenities;
  if (prop.length) document.getElementById('prop-length').value = prop.length;
  if (prop.breadth) document.getElementById('prop-breadth').value = prop.breadth;
  if (prop.roadWidth) document.getElementById('prop-road-width').value = prop.roadWidth;
  if (prop.zone) document.getElementById('prop-zone').value = prop.zone;
  // Images
  if (prop.images && prop.images.length > 0) {
    uploadedImages = prop.images.slice();
    const previews = document.getElementById('image-previews');
    previews.innerHTML = prop.images.map((src, i) =>
      `<div class="preview-thumb"><img src="${esc(src)}" alt="Photo ${i+1}"><span class="thumb-label">Photo ${i+1}</span></div>`
    ).join('');
    document.getElementById('image-upload-box').querySelector('p').textContent = `${prop.images.length} photo(s) loaded`;
  }
  if (prop.layout) {
    uploadedLayout = prop.layout;
    document.getElementById('layout-preview').innerHTML = `<div class="layout-thumb"><span>📐 ${esc(prop.layout.name || 'Layout')}</span></div>`;
  }
  // Update form header
  const formH2 = document.querySelector('#tab-properties .card h2');
  if (formH2 && !formH2.querySelector('.editing-badge')) {
    formH2.innerHTML += ' <span class="editing-badge">EDITING</span>';
  }
  const submitBtn = document.querySelector('#property-form button[type="submit"]');
  if (submitBtn) submitBtn.textContent = '💾 Save Changes';
  // Scroll to form
  document.querySelector('#tab-properties .card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.loadPropertyIntoForm = loadPropertyIntoForm;

document.getElementById('property-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const property = collectPropertyFromForm();
  const isEdit = !!editingPropertyId;

  // Validate required fields
  if (!property.name || !property.name.trim()) { showToast('Property name is required'); return; }
  if (!property.location || !property.location.trim()) { showToast('Location is required'); return; }
  if (property.price && isNaN(Number(property.price))) { showToast('Price must be a number'); return; }
  if (property.area && isNaN(Number(property.area))) { showToast('Area must be a number'); return; }

  let properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  if (isEdit) {
    properties = properties.map(p => p.id === editingPropertyId ? property : p);
  } else {
    properties.push(property);
  }

  try {
    localStorage.setItem('raas_properties', JSON.stringify(properties));
  } catch (err) {
    alert('Storage limit reached. Try fewer / smaller photos per property.');
    return;
  }

  if (_backendAvailable) {
    const res = await apiPost('/api/properties', property);
    if (!res.ok) showToast('Saved locally. API sync failed.');
  }

  resetPropertyForm();
  loadPropertiesList();
  updateDashboardSummary();
  showToast(isEdit ? 'Property updated' : 'Property added');
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
      ? `<img src="${esc(prop.images[0])}" alt="${esc(prop.name)}">`
      : `<div class="no-img">🏠</div>`;

    const layoutBadge = prop.layout
      ? `<span class="layout-badge">${prop.layout.type && prop.layout.type.includes('pdf') ? '📄 Layout PDF' : '📐 Layout Image'}</span>`
      : '';

    const typeLabel = esc(TYPE_LABELS[prop.type] || prop.type);
    const areaStr = esc(formatArea(prop));
    const priceStr = formatPrice(prop);
    const st = prop.status || 'available';

    // Quick status pills
    const statuses = ['available', 'booked', 'sold', 'premium'];
    const statusPills = statuses.map(s =>
      `<button class="qs-${s}${s === st ? ' qs-active' : ''}" onclick="quickStatus(${prop.id},'${s}')">${s}</button>`
    ).join('');

    let details3 = '';
    if (prop.bhk) details3 += `<strong>BHK:</strong> ${esc(prop.bhk)} &nbsp; `;
    if (prop.facing) details3 += `<strong>Facing:</strong> ${esc(prop.facing)} &nbsp; `;
    if (prop.floor) details3 += `<strong>Floor:</strong> ${esc(prop.floor)} &nbsp; `;
    if (prop.length && prop.breadth) details3 += `<strong>Dim:</strong> ${esc(prop.length)}×${esc(prop.breadth)} ft &nbsp; `;
    if (prop.roadWidth) details3 += `<strong>Road:</strong> ${esc(prop.roadWidth)} &nbsp; `;
    if (prop.zone) details3 += `<strong>Zone:</strong> ${esc(prop.zone)} &nbsp; `;
    if (prop.rera) details3 += `<strong>RERA:</strong> ${esc(prop.rera)}`;
    if (details3) details3 = `<p>${details3}</p>`;

    return `
      <div class="property-item">
        ${thumb}
        <div class="property-info">
          <h3>${esc(prop.name)}</h3>
          <p><strong>Type:</strong> ${typeLabel} &nbsp;|&nbsp; <strong>Location:</strong> ${esc(prop.location)}</p>
          <p><strong>Price:</strong> ${priceStr}${areaStr ? ` &nbsp;|&nbsp; <strong>Area:</strong> ${areaStr}` : ''}</p>
          ${details3}
          ${prop.amenities ? `<p><strong>Amenities:</strong> ${esc(prop.amenities)}</p>` : ''}
          ${layoutBadge}
          ${prop.images && prop.images.length > 1 ? `<p><strong>Photos:</strong> ${prop.images.length} uploaded</p>` : ''}
          <div class="quick-status">${statusPills}</div>
        </div>
        <div class="property-actions">
          <button class="btn-edit" onclick="editProperty(${prop.id})">✏️ Edit</button>
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
      win.document.write(`<iframe src="${prop.layout.data}" width="100%" height="100%" style="border:none;position:absolute;inset:0;" sandbox="allow-same-origin"></iframe>`);
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

// ─── Edit property (load into form) ─────────────────────
function editProperty(id) {
  const properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  const prop = properties.find(p => p.id === id);
  if (!prop) { showToast('Property not found'); return; }
  loadPropertyIntoForm(prop);
}
window.editProperty = editProperty;

// ─── Quick status change ─────────────────────────────────
async function quickStatus(id, status) {
  let properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  properties = properties.map(p => p.id === id ? { ...p, status } : p);
  localStorage.setItem('raas_properties', JSON.stringify(properties));

  if (_backendAvailable) {
    const prop = properties.find(p => p.id === id);
    if (prop) apiPost('/api/properties', prop); // fire-and-forget
  }

  loadPropertiesList();
  updateDashboardSummary();
  showToast(`Status → ${status}`);
}
window.quickStatus = quickStatus;

// ─── Dashboard summary ───────────────────────────────────
function updateDashboardSummary() {
  const properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  const enquiries = JSON.parse(localStorage.getItem('raas_enquiries') || '[]');

  const counts = { total: properties.length, available: 0, booked: 0, sold: 0, enquiries: enquiries.length };
  properties.forEach(p => {
    const s = p.status || 'available';
    if (s === 'available' || s === 'premium' || s === 'upcoming') counts.available++;
    else if (s === 'booked') counts.booked++;
    else if (s === 'sold') counts.sold++;
  });

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('sum-total', counts.total);
  el('sum-available', counts.available);
  el('sum-booked', counts.booked);
  el('sum-sold', counts.sold);
  el('sum-enquiries', counts.enquiries);
}

// ─── Enquiries / Leads view ──────────────────────────────
async function loadEnquiries() {
  // Try API first
  let enquiries = null;
  if (_backendAvailable !== false) {
    enquiries = await apiGet('/api/contact');
  }
  // Fall back to localStorage
  if (!Array.isArray(enquiries) || enquiries.length === 0) {
    enquiries = JSON.parse(localStorage.getItem('raas_enquiries') || '[]');
  }

  const container = document.getElementById('enquiries-list');
  if (!container) return;

  if (enquiries.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No enquiries yet. When visitors use the contact form, their messages will appear here.</p>
      </div>`;
    return;
  }

  // Sort newest first
  enquiries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const waPhone = '919019793641';
  container.innerHTML = enquiries.map(enq => {
    const date = enq.timestamp ? new Date(enq.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const interestLabel = {
      plots: 'Buying a Plot', land: 'Agricultural Land', apartment: 'Apartment',
      villa: 'Villa', commercial: 'Commercial Property',
      construction: 'Construction', interiors: 'Interiors', materials: 'Materials', other: 'General'
    }[enq.interest] || esc(enq.interest || '');

    return `
      <div class="enquiry-card">
        <div class="enquiry-header">
          <strong>${esc(enq.name || 'Unknown')}</strong>
          ${date ? `<span class="enquiry-date">${date}</span>` : ''}
        </div>
        <p><strong>Phone:</strong> ${esc(enq.phone || '—')} &nbsp; <strong>Email:</strong> ${esc(enq.email || '—')}</p>
        <p><strong>Interest:</strong> ${interestLabel}</p>
        ${enq.message ? `<p class="enquiry-message">${esc(enq.message)}</p>` : ''}
        ${enq.budget ? `<p><strong>Budget:</strong> ${esc(enq.budget)}</p>` : ''}
        ${enq.timeline ? `<p><strong>Timeline:</strong> ${esc(enq.timeline)}</p>` : ''}
        <div class="enquiry-actions">
          <a class="btn-wa-reply" href="https://wa.me/${enq.phone ? enq.phone.replace(/\D/g, '') : waPhone}?text=${encodeURIComponent('Hi ' + (enq.name || '') + ', thanks for contacting RAAS Builders!')}" target="_blank" rel="noopener">💬 WhatsApp</a>
          ${enq.phone ? `<a class="btn-call-reply" href="tel:${esc(enq.phone)}">📞 Call</a>` : ''}
        </div>
      </div>`;
  }).join('');
}

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
    's-about-3': 'about_p3',
    // Construction packages
    's-pkg-essential-price': 'pkg_essential_price',
    's-pkg-essential-features': 'pkg_essential_features',
    's-pkg-premium-price': 'pkg_premium_price',
    's-pkg-premium-features': 'pkg_premium_features',
    's-pkg-elite-price': 'pkg_elite_price',
    's-pkg-elite-features': 'pkg_elite_features',
    's-pkg-farmhouse-price': 'pkg_farmhouse_price',
    's-pkg-farmhouse-features': 'pkg_farmhouse_features',
    // Apartment pricing
    's-apt-1bhk-price': 'apt_1bhk_price',
    's-apt-1bhk-area': 'apt_1bhk_area',
    's-apt-23bhk-price': 'apt_23bhk_price',
    's-apt-23bhk-area': 'apt_23bhk_area',
    // Hero showcase
    's-hero-title': 'hero_title',
    's-hero-location': 'hero_location',
    's-hero-price': 'hero_price',
    's-hero-specs': 'hero_specs',
    // Testimonials
    's-test-1-text': 'test_1_text',
    's-test-1-name': 'test_1_name',
    's-test-1-role': 'test_1_role',
    's-test-2-text': 'test_2_text',
    's-test-2-name': 'test_2_name',
    's-test-2-role': 'test_2_role',
    's-test-3-text': 'test_3_text',
    's-test-3-name': 'test_3_name',
    's-test-3-role': 'test_3_role'
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

  // Validate phone numbers
  const rawBlr = getVal('s-phone-blr-raw').replace(/\D/g, '');
  const rawShi = getVal('s-phone-shi-raw').replace(/\D/g, '');
  if (rawBlr && (rawBlr.length < 10 || rawBlr.length > 13)) { showToast('Invalid Bengaluru phone number'); return; }
  if (rawShi && (rawShi.length < 10 || rawShi.length > 13)) { showToast('Invalid Shivamogga phone number'); return; }

  const settings = {
    phone_bengaluru: getVal('s-phone-blr'),
    phone_bengaluru_raw: rawBlr,
    phone_shivamogga: getVal('s-phone-shi'),
    phone_shivamogga_raw: rawShi,
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
    about_p3: getVal('s-about-3'),
    // Construction packages
    pkg_essential_price: getVal('s-pkg-essential-price'),
    pkg_essential_features: getVal('s-pkg-essential-features'),
    pkg_premium_price: getVal('s-pkg-premium-price'),
    pkg_premium_features: getVal('s-pkg-premium-features'),
    pkg_elite_price: getVal('s-pkg-elite-price'),
    pkg_elite_features: getVal('s-pkg-elite-features'),
    pkg_farmhouse_price: getVal('s-pkg-farmhouse-price'),
    pkg_farmhouse_features: getVal('s-pkg-farmhouse-features'),
    // Apartment pricing
    apt_1bhk_price: getVal('s-apt-1bhk-price'),
    apt_1bhk_area: getVal('s-apt-1bhk-area'),
    apt_23bhk_price: getVal('s-apt-23bhk-price'),
    apt_23bhk_area: getVal('s-apt-23bhk-area'),
    // Hero showcase
    hero_title: getVal('s-hero-title'),
    hero_location: getVal('s-hero-location'),
    hero_price: getVal('s-hero-price'),
    hero_specs: getVal('s-hero-specs'),
    // Testimonials
    test_1_text: getVal('s-test-1-text'),
    test_1_name: getVal('s-test-1-name'),
    test_1_role: getVal('s-test-1-role'),
    test_2_text: getVal('s-test-2-text'),
    test_2_name: getVal('s-test-2-name'),
    test_2_role: getVal('s-test-2-role'),
    test_3_text: getVal('s-test-3-text'),
    test_3_name: getVal('s-test-3-name'),
    test_3_role: getVal('s-test-3-role')
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
