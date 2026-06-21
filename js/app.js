/* ══════════════════════════════════════════════════════════════
   RAAS Builders — Front-end app logic
   Handles: property rendering, filtering, language toggle, site
   settings, materials pricing, scroll reveal, mobile nav, contact → WA.
   Storage: localStorage (static demo). Backend coming later.
══════════════════════════════════════════════════════════════ */

// ─── Fallback sample properties (shown when admin hasn't added any) ───
const SAMPLE_PROPERTIES = [
  {
    id: 'sample-1',
    name: 'RAAS Garden Heights',
    type: 'plot',
    location: 'Shivamogga',
    price: '22',
    priceUnit: 'lakhs',
    area: '1200',
    areaUnit: 'sqft',
    status: 'available',
    description: 'Premium residential plots in a RERA-approved gated community.',
    images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80'],
    bhk: '',
    facing: 'East',
    length: '40',
    breadth: '30'
  },
  {
    id: 'sample-2',
    name: 'RAAS Pinnacle Residency',
    type: 'apartment',
    location: 'Electronic City, Bengaluru',
    price: '58',
    priceUnit: 'lakhs',
    area: '1180',
    areaUnit: 'sqft',
    status: 'premium',
    description: 'Luxury 2 & 3 BHK apartments with pool, gym and clubhouse.',
    images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80'],
    bhk: '2 BHK',
    facing: 'East',
    floor: '3rd of 12'
  },
  {
    id: 'sample-3',
    name: 'RAAS Malnad Greens',
    type: 'villa',
    location: 'Thirthahalli, Malnad',
    price: '48',
    priceUnit: 'lakhs',
    area: '2400',
    areaUnit: 'sqft',
    status: 'available',
    description: 'Eco-friendly villa layouts surrounded by the Western Ghats.',
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80'],
    bhk: '3 BHK',
    facing: 'North-East'
  },
  {
    id: 'sample-4',
    name: 'Malnad Farm Estate',
    type: 'land',
    location: 'Sagara, Shivamogga',
    price: '18',
    priceUnit: 'per_gunta',
    area: '2',
    areaUnit: 'acres',
    status: 'available',
    description: 'Agricultural land ideal for farmhouse or plantation — clear title, road access.',
    images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80'],
    bhk: '',
    facing: 'East',
    roadWidth: '20 ft mud road',
    zone: 'Agricultural'
  }
];

const TYPE_FALLBACK_IMG = {
  plot: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
  land: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
  apartment: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
  villa: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80'
};

const TYPE_LABEL = {
  plot: 'Plot / Site',
  land: 'Agri Land',
  apartment: 'Apartment',
  villa: 'Villa',
  commercial: 'Commercial'
};

const PRICE_UNIT_LABELS = {
  lakhs: 'Lakhs',
  crores: 'Crores',
  per_sqft: '/ sq.ft',
  per_acre: '/ Acre',
  per_gunta: '/ Gunta',
  negotiable: ''
};

const AREA_UNIT_LABELS = {
  sqft: 'sq.ft',
  acres: 'Acres',
  guntas: 'Guntas',
  cents: 'Cents',
  grounds: 'Grounds'
};

// ─── Default materials (matches index.html hardcoded, overridden by admin) ───
const DEFAULT_MATERIALS = [
  { icon: '🏖️', name: 'River Sand',       price: 'Enquiry based' },
  { icon: '🪨', name: 'M-Sand',           price: '₹55–65/cft' },
  { icon: '🧱', name: 'Bricks',           price: '₹8–12/unit' },
  { icon: '⚙️', name: 'TMT Steel',        price: 'Wholesale rate' },
  { icon: '🏗️', name: 'Cement',           price: '₹340–380/bag' },
  { icon: '🪵', name: 'Granite / Stone',   price: '₹90–140/sqft' }
];

// ─── API base URL ────────────────────────────────────────
// Vercel: same origin (empty string) — /api/* routes to serverless functions
// AWS:    same origin (empty string) — CloudFront routes /api/* to API Gateway
// Override only if static + API are on different domains (not recommended):
//   <script>window.RAAS_API_BASE='https://your-api-domain.com'</script>
const API_BASE = (typeof window !== 'undefined' && window.RAAS_API_BASE) || '';

// ─── XSS sanitizer ──────────────────────────────────────
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

// ─── API-first helper: try fetch, fall back to localStorage ───
async function apiFetch(path) {
  try {
    const res = await fetch(API_BASE + path);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // network error / no backend → fall back
  }
}

// ─── Load properties (API → localStorage → samples) ───
function getAllProperties() {
  const stored = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  return stored.length > 0 ? stored : SAMPLE_PROPERTIES;
}

async function getAllPropertiesAsync() {
  const apiData = await apiFetch('/api/properties');
  if (Array.isArray(apiData) && apiData.length > 0) return apiData;
  return getAllProperties(); // localStorage fallback
}

function getImage(prop) {
  if (prop.images && prop.images.length > 0) return prop.images[0];
  if (prop.image) return prop.image;
  return TYPE_FALLBACK_IMG[prop.type] || TYPE_FALLBACK_IMG.plot;
}

function getStatusBadge(status) {
  const map = {
    available: '● Available',
    sold: '● Sold',
    booked: '● Booked',
    upcoming: '● Upcoming',
    premium: '● Premium'
  };
  return `<span class="prop-badge ${status || 'available'}">${map[status] || map.available}</span>`;
}

function formatPropPrice(prop) {
  if (!prop.price) return '₹ —';
  const unit = esc(PRICE_UNIT_LABELS[prop.priceUnit] || 'Lakhs');
  if (prop.priceUnit === 'negotiable') return `₹${esc(prop.price)} (Negotiable)`;
  return `₹${esc(prop.price)} <span>${unit}</span>`;
}

function formatPropArea(prop) {
  if (!prop.area) return '';
  const unit = AREA_UNIT_LABELS[prop.areaUnit] || 'sq.ft';
  return `${prop.area} ${unit}`;
}

function renderPropertyCard(prop) {
  const bg = esc(getImage(prop));
  const typeLabel = esc(TYPE_LABEL[prop.type] || prop.type || 'Property');
  const waMsg = encodeURIComponent(`Hi RAAS Builders, I'm interested in ${prop.name} at ${prop.location}. Please share more details.`);
  const waPhone = (window.RAAS_SETTINGS && window.RAAS_SETTINGS.whatsapp_number) || '919731234111';

  const specs = [];
  const areaStr = esc(formatPropArea(prop));
  if (areaStr) specs.push(`<div class="spec-item">📐 ${areaStr}</div>`);
  if (prop.bhk) specs.push(`<div class="spec-item">🛏️ ${esc(prop.bhk)}</div>`);
  if (prop.length && prop.breadth) specs.push(`<div class="spec-item">📏 ${esc(prop.length)}×${esc(prop.breadth)} ft</div>`);
  if (prop.facing) specs.push(`<div class="spec-item">🧭 ${esc(prop.facing)}</div>`);
  if (prop.floor) specs.push(`<div class="spec-item">🏢 Floor ${esc(prop.floor)}</div>`);
  if (prop.roadWidth) specs.push(`<div class="spec-item">🛣️ ${esc(prop.roadWidth)}</div>`);
  if (prop.zone) specs.push(`<div class="spec-item">📋 ${esc(prop.zone)}</div>`);
  if (prop.rera) specs.push(`<div class="spec-item">✅ RERA</div>`);
  if (specs.length === 0) specs.push(`<div class="spec-item">✅ Verified</div>`);

  const layoutBtn = prop.layout
    ? `<button class="prop-layout-btn" onclick="viewPublicLayout(${prop.id})" title="View Layout">${prop.layout.type && prop.layout.type.includes('pdf') ? '📄 Layout PDF' : '📐 View Layout'}</button>`
    : '';

  return `
    <article class="prop-card" data-type="${esc(prop.type || 'plot')}">
      <div class="prop-img" style="background-image: linear-gradient(135deg, rgba(13,31,27,0.35), rgba(26,60,52,0.35)), url('${bg}');">
        ${getStatusBadge(prop.status)}
      </div>
      <div class="prop-body">
        <div class="prop-type">${typeLabel}</div>
        <div class="prop-title">${esc(prop.name || 'Untitled')}</div>
        <div class="prop-location">📍 ${esc(prop.location || 'Karnataka')}</div>
        <div class="prop-specs">${specs.join('')}</div>
        ${layoutBtn}
        <div class="prop-footer">
          <div class="prop-price">${formatPropPrice(prop)}</div>
          <a href="https://wa.me/${waPhone}?text=${waMsg}" target="_blank" rel="noopener" class="prop-enquire">Enquire</a>
        </div>
      </div>
    </article>
  `;
}

function displayProperties(list) {
  const grid = document.getElementById('properties-grid');
  if (!grid) return;
  if (!list || list.length === 0) {
    grid.innerHTML = `<div class="prop-empty">No properties match this filter yet. Check back soon!</div>`;
    return;
  }
  grid.innerHTML = list.map(renderPropertyCard).join('');
}

// View layout on public site
function viewPublicLayout(id) {
  const properties = getAllProperties();
  const prop = properties.find(p => p.id === id || p.id === String(id));
  if (prop && prop.layout && prop.layout.data) {
    const win = window.open();
    if (prop.layout.type && prop.layout.type.includes('pdf')) {
      win.document.write(`<html><head><title>Layout — ${esc(prop.name || 'Property')}</title></head><body style="margin:0;"><iframe src="${prop.layout.data}" width="100%" height="100%" style="border:none;position:absolute;inset:0;" sandbox="allow-same-origin"></iframe></body></html>`);
    } else {
      win.document.write(`<html><head><title>Layout — ${esc(prop.name || 'Property')}</title></head><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${prop.layout.data}" style="max-width:100%;max-height:100vh;display:block;"></body></html>`);
    }
  }
}
window.viewPublicLayout = viewPublicLayout;

function filterProperties(type) {
  // Sync filter from cache
  const all = getAllProperties();
  displayProperties(type === 'all' ? all : all.filter(p => p.type === type));
}

async function filterPropertiesAsync(type) {
  const all = await getAllPropertiesAsync();
  displayProperties(type === 'all' ? all : all.filter(p => p.type === type));
}

// ─── Materials (admin-editable pricing) ──────────────────
function getMaterials() {
  const stored = JSON.parse(localStorage.getItem('raas_materials') || 'null');
  return stored || DEFAULT_MATERIALS;
}

async function getMaterialsAsync() {
  const apiData = await apiFetch('/api/materials');
  if (Array.isArray(apiData) && apiData.length > 0) return apiData;
  return getMaterials();
}

function renderMaterialsGrid(materials) {
  const grid = document.getElementById('materials-grid');
  if (!grid) return;
  grid.innerHTML = materials.map(m => `
    <div class="material-card">
      <div class="material-icon">${esc(m.icon) || '📦'}</div>
      <div class="material-name">${esc(m.name)}</div>
      <div class="material-price">${esc(m.price) || 'Enquiry based'}</div>
    </div>
  `).join('');
}

function renderMaterialsSection() {
  // Render sync first (no flash), then update async
  renderMaterialsGrid(getMaterials());
  getMaterialsAsync().then(renderMaterialsGrid);
}

// ─── Site Settings (admin-editable) ───
const DEFAULT_SETTINGS = {
  phone_bengaluru: '+91 90197 93641',
  phone_bengaluru_raw: '919019793641',
  phone_shivamogga: '+91 97312 34111',
  phone_shivamogga_raw: '919731234111',
  whatsapp_number: '919731234111',
  email: 'raasbnd@gmail.com',
  address: '1st Floor, MSB280, Basavasa Sadhana<br>Chalukyanagar, Shivamogga – 577205',
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
  test_3_role: 'Farmhouse Owner, Sagara',
  // Interior design features
  int_home_features: '3D Design Preview, Premium Materials, Custom Furniture, On-site Supervision',
  int_kitchen_features: 'L / U / Island Layouts, Marine-grade Ply, Granite / Quartz Tops, 10-year Warranty',
  int_wardrobe_features: 'Sliding / Openable, Laminate Finishes, LED Lighting, Lifetime Hardware',
  // RERA & GST
  rera_number: '',
  gst_number: '',
  // Social media
  social_facebook: '',
  social_instagram: '',
  social_youtube: '',
  social_linkedin: '',
  social_twitter: ''
};

function applySiteSettings(settings) {
  window.RAAS_SETTINGS = settings;

  // Safe keys that contain trusted HTML (admin-authored with <br> tags)
  const htmlKeys = new Set(['address', 'hours']);

  document.querySelectorAll('[data-setting]').forEach(el => {
    const key = el.getAttribute('data-setting');
    if (settings[key] !== undefined && settings[key] !== '') {
      if (htmlKeys.has(key)) {
        // Only allow <br> tags, escape everything else
        el.innerHTML = esc(settings[key]).replace(/&lt;br\s*\/?&gt;/gi, '<br>');
      } else {
        el.textContent = settings[key];
      }
    }
  });

  // Show/hide RERA & GST rows based on whether values are set
  const reraRow = document.getElementById('rera-row');
  const gstRow = document.getElementById('gst-row');
  const footerReraGst = document.getElementById('footer-rera-gst');
  const footerRera = document.getElementById('footer-rera');
  const footerGst = document.getElementById('footer-gst');
  if (reraRow) reraRow.style.display = settings.rera_number ? '' : 'none';
  if (gstRow) gstRow.style.display = settings.gst_number ? '' : 'none';
  if (footerRera) footerRera.style.display = settings.rera_number ? '' : 'none';
  if (footerGst) footerGst.style.display = settings.gst_number ? '' : 'none';
  if (footerReraGst) footerReraGst.style.display = (settings.rera_number || settings.gst_number) ? '' : 'none';

  // Social media icons — show only the ones that have a URL set
  const socialMap = {
    'social-facebook': 'social_facebook',
    'social-instagram': 'social_instagram',
    'social-youtube': 'social_youtube',
    'social-linkedin': 'social_linkedin',
    'social-twitter': 'social_twitter'
  };
  let anySocial = false;
  Object.entries(socialMap).forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    if (!el) return;
    const url = settings[key];
    if (url) {
      el.href = url;
      el.style.display = '';
      anySocial = true;
    } else {
      el.style.display = 'none';
    }
  });
  const footerSocial = document.getElementById('footer-social');
  if (footerSocial) footerSocial.style.display = anySocial ? '' : 'none';

  // All WhatsApp links use the dedicated admin WhatsApp number.
  const waNumber = settings.whatsapp_number || '919731234111';
  const waBtn = document.getElementById('wa-btn');
  if (waBtn) {
    waBtn.href = `https://wa.me/${waNumber}?text=${encodeURIComponent("Hi RAAS Builders, I'm interested in your properties")}`;
  }
  const heroWaBtn = document.getElementById('hero-wa-btn');
  if (heroWaBtn) {
    heroWaBtn.href = `https://wa.me/${waNumber}?text=${encodeURIComponent("Hi RAAS Builders, I'm interested in your properties")}`;
  }
  // Floating call button uses the Bengaluru office line.
  const phoneBtn = document.getElementById('phone-btn');
  if (phoneBtn) {
    phoneBtn.href = `tel:+${settings.phone_bengaluru_raw || '919019793641'}`;
  }
  // Keep inline tel: links in sync with their displayed number (href, not just text).
  document.querySelectorAll('a[data-setting="phone_bengaluru"]').forEach(a => {
    if (settings.phone_bengaluru_raw) a.href = `tel:+${settings.phone_bengaluru_raw}`;
  });
  document.querySelectorAll('a[data-setting="phone_shivamogga"]').forEach(a => {
    if (settings.phone_shivamogga_raw) a.href = `tel:+${settings.phone_shivamogga_raw}`;
  });

  // ─── Dynamic feature lists (comma-separated → individual divs) ───
  const featureTargets = {
    'pkg-essential-features': 'pkg_essential_features',
    'pkg-premium-features': 'pkg_premium_features',
    'pkg-elite-features': 'pkg_elite_features',
    'pkg-farmhouse-features': 'pkg_farmhouse_features'
  };
  Object.entries(featureTargets).forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    if (el && settings[key]) {
      el.innerHTML = settings[key].split(',').map(f =>
        `<div class="pack-feature">${esc(f.trim())}</div>`
      ).join('');
    }
  });

  // ─── Hero specs (comma-separated → individual spec divs) ───
  const heroSpecs = document.getElementById('hero-specs');
  if (heroSpecs && settings.hero_specs) {
    heroSpecs.innerHTML = settings.hero_specs.split(',').map(s => {
      const txt = s.trim();
      // Split on first space to bold the value part
      const parts = txt.match(/^([^\s]+)\s+(.+)$/);
      return parts
        ? `<div class="hero-prop-spec">${esc(parts[1])} <strong>${esc(parts[2])}</strong></div>`
        : `<div class="hero-prop-spec">${esc(txt)}</div>`;
    }).join('');
  }

  // ─── Interior feature lists (comma-separated → li items) ───
  const interiorTargets = {
    'int-home-features': 'int_home_features',
    'int-kitchen-features': 'int_kitchen_features',
    'int-wardrobe-features': 'int_wardrobe_features'
  };
  Object.entries(interiorTargets).forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    if (el && settings[key]) {
      el.innerHTML = settings[key].split(',').map(f =>
        `<li>✅ ${esc(f.trim())}</li>`
      ).join('');
    }
  });

  // ─── Testimonial avatars (initials from name) ───
  [1, 2, 3].forEach(i => {
    const name = settings[`test_${i}_name`];
    const avatarEl = document.getElementById(`test-${i}-avatar`);
    if (avatarEl && name) {
      const initials = name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
      avatarEl.textContent = initials;
    }
    // Hide empty testimonials
    const card = document.getElementById(`testimonial-${i}`);
    if (card) {
      card.style.display = settings[`test_${i}_text`] ? '' : 'none';
    }
  });
}

function loadSiteSettings() {
  // Sync first: localStorage / defaults (instant, no flash)
  const stored = JSON.parse(localStorage.getItem('raas_site_settings') || '{}');
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  applySiteSettings(settings);

  // Then try API (updates if backend has newer data)
  apiFetch('/api/settings').then(apiSettings => {
    if (apiSettings && typeof apiSettings === 'object' && Object.keys(apiSettings).length > 0) {
      const merged = { ...DEFAULT_SETTINGS, ...apiSettings };
      applySiteSettings(merged);
    }
  });
}

// ─── Language toggle (EN ↔ Kannada) ───
let currentLang = 'en';

function applyLanguage() {
  document.querySelectorAll('[data-en]').forEach(el => {
    const en = el.getAttribute('data-en');
    const kn = el.getAttribute('data-kn');
    if (!en || !kn) return;
    el.innerHTML = currentLang === 'en' ? en : kn;
  });
  const icon = document.getElementById('lang-icon');
  const text = document.getElementById('lang-text');
  if (icon && text) {
    icon.textContent = currentLang === 'en' ? '🇬🇧' : '🇮🇳';
    text.textContent = currentLang === 'en' ? 'EN' : 'ಕನ್ನಡ';
  }
  document.documentElement.lang = currentLang;
}

function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'kn' : 'en';
  localStorage.setItem('raas_language', currentLang);
  applyLanguage();
}

// ─── Contact form → WhatsApp + API ───
const CONTACT_INTEREST_LABELS = {
  plots: 'Buying a Plot',
  land: 'Agricultural Land',
  apartment: 'Buying an Apartment',
  villa: 'Buying a Villa',
  commercial: 'Commercial Property',
  construction: 'House Construction',
  interiors: 'Interior Design',
  materials: 'Building Materials',
  other: 'General Enquiry'
};

// Read + validate the contact form. Returns the enquiry object, or null if invalid.
function collectContactEnquiry() {
  const name = document.getElementById('cf-name').value.trim();
  const phone = document.getElementById('cf-phone').value.trim();
  const email = document.getElementById('cf-email').value.trim();
  const interest = document.getElementById('cf-interest').value;
  const message = document.getElementById('cf-message').value.trim();
  const budgetEl = document.getElementById('cf-budget');
  const timelineEl = document.getElementById('cf-timeline');
  const budget = budgetEl ? budgetEl.value : '';
  const timeline = timelineEl ? timelineEl.value : '';

  // Phone validation: Indian mobile (10 digits, optionally prefixed with +91 / 0)
  const phoneClean = phone.replace(/[\s\-()]/g, '');
  if (!/^(\+?91|0)?[6-9]\d{9}$/.test(phoneClean)) {
    const phoneInput = document.getElementById('cf-phone');
    phoneInput.setCustomValidity('Please enter a valid 10-digit Indian mobile number');
    phoneInput.reportValidity();
    phoneInput.setCustomValidity('');
    return null;
  }

  return { name, phone, email, interest, message, budget, timeline, timestamp: Date.now() };
}

// Persist to localStorage (admin offline view) + POST to backend (stores + emails owner).
function saveEnquiry(enquiry) {
  try {
    const existing = JSON.parse(localStorage.getItem('raas_enquiries') || '[]');
    existing.push(enquiry);
    localStorage.setItem('raas_enquiries', JSON.stringify(existing));
  } catch { /* storage full — non-critical */ }

  apiFetch('/api/health').then(h => {
    if (h && h.backend) {
      fetch(API_BASE + '/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enquiry)
      }).catch(() => {});
    }
  });
}

function showContactSuccess(viaWhatsapp) {
  const box = document.getElementById('cf-success');
  if (!box) return;
  box.textContent = viaWhatsapp
    ? 'Opening WhatsApp… Your enquiry has also been sent to our team.'
    : 'Thank you! Your enquiry has been sent. Our team will contact you shortly.';
  box.style.display = 'block';
  clearTimeout(showContactSuccess._t);
  showContactSuccess._t = setTimeout(() => { box.style.display = 'none'; }, 8000);
}

// Primary submit → send via email/backend, no WhatsApp popup.
async function handleContactSubmit(e) {
  e.preventDefault();
  const enquiry = collectContactEnquiry();
  if (!enquiry) return false;
  saveEnquiry(enquiry);
  showContactSuccess(false);
  e.target.reset();
  return false;
}

// Secondary action → open WhatsApp (also logs the enquiry so the owner is notified).
function sendViaWhatsApp() {
  const enquiry = collectContactEnquiry();
  if (!enquiry) return false;
  saveEnquiry(enquiry);

  const { name, phone, email, interest, message, budget, timeline } = enquiry;
  const text =
`Hi RAAS Builders,

Name: ${name}
Phone: ${phone}${email ? `\nEmail: ${email}` : ''}
Interested in: ${CONTACT_INTEREST_LABELS[interest] || interest}${budget ? `\nBudget: ${budget}` : ''}${timeline ? `\nTimeline: ${timeline}` : ''}

${message}`;

  const waPhone = (window.RAAS_SETTINGS && window.RAAS_SETTINGS.whatsapp_number) || '919731234111';
  window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank');
  showContactSuccess(true);
  const form = document.getElementById('contact-form');
  if (form) form.reset();
  return false;
}
window.handleContactSubmit = handleContactSubmit;
window.sendViaWhatsApp = sendViaWhatsApp;
window.toggleLanguage = toggleLanguage;

// ─── Scroll reveal + smooth scroll + mobile nav ───
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 60);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const links = document.getElementById('nav-links');
        if (links && links.classList.contains('open')) links.classList.remove('open');
      }
    });
  });
}

function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    toggle.textContent = links.classList.contains('open') ? '✕' : '☰';
  });
  document.addEventListener('click', (e) => {
    if (!links.contains(e.target) && !toggle.contains(e.target) && links.classList.contains('open')) {
      links.classList.remove('open');
      toggle.textContent = '☰';
    }
  });
}

function initFilters() {
  const buttons = document.querySelectorAll('.pf-chip');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterProperties(btn.getAttribute('data-filter'));
    });
  });
}

// ─── Bootstrap ───
document.addEventListener('DOMContentLoaded', () => {
  // 1. Instant render from localStorage / defaults (zero flash)
  loadSiteSettings();
  displayProperties(getAllProperties());
  renderMaterialsSection();
  initFilters();
  initSmoothScroll();
  initReveal();
  initMobileNav();

  const savedLang = localStorage.getItem('raas_language');
  if (savedLang === 'kn') {
    currentLang = 'kn';
    applyLanguage();
  }

  const yr = document.getElementById('footer-year');
  if (yr) yr.textContent = new Date().getFullYear();

  // 2. Background: try API and refresh if backend has data
  //    (settings + materials already handled inside their load functions)
  getAllPropertiesAsync().then(props => {
    displayProperties(props);
  });
});
