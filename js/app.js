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
  const unit = PRICE_UNIT_LABELS[prop.priceUnit] || 'Lakhs';
  if (prop.priceUnit === 'negotiable') return `₹${prop.price} (Negotiable)`;
  return `₹${prop.price} <span>${unit}</span>`;
}

function formatPropArea(prop) {
  if (!prop.area) return '';
  const unit = AREA_UNIT_LABELS[prop.areaUnit] || 'sq.ft';
  return `${prop.area} ${unit}`;
}

function renderPropertyCard(prop) {
  const bg = getImage(prop);
  const typeLabel = TYPE_LABEL[prop.type] || prop.type || 'Property';
  const waMsg = encodeURIComponent(`Hi RAAS Builders, I'm interested in ${prop.name} at ${prop.location}. Please share more details.`);
  const waPhone = (window.RAAS_SETTINGS && window.RAAS_SETTINGS.phone_bengaluru_raw) || '919019793641';

  const specs = [];
  const areaStr = formatPropArea(prop);
  if (areaStr) specs.push(`<div class="spec-item">📐 ${areaStr}</div>`);
  if (prop.bhk) specs.push(`<div class="spec-item">🛏️ ${prop.bhk}</div>`);
  if (prop.length && prop.breadth) specs.push(`<div class="spec-item">📏 ${prop.length}×${prop.breadth} ft</div>`);
  if (prop.facing) specs.push(`<div class="spec-item">🧭 ${prop.facing}</div>`);
  if (prop.floor) specs.push(`<div class="spec-item">🏢 Floor ${prop.floor}</div>`);
  if (prop.roadWidth) specs.push(`<div class="spec-item">🛣️ ${prop.roadWidth}</div>`);
  if (prop.zone) specs.push(`<div class="spec-item">📋 ${prop.zone}</div>`);
  if (prop.rera) specs.push(`<div class="spec-item">✅ RERA</div>`);
  if (specs.length === 0) specs.push(`<div class="spec-item">✅ Verified</div>`);

  return `
    <article class="prop-card" data-type="${prop.type || 'plot'}">
      <div class="prop-img" style="background-image: linear-gradient(135deg, rgba(13,31,27,0.35), rgba(26,60,52,0.35)), url('${bg}');">
        ${getStatusBadge(prop.status)}
      </div>
      <div class="prop-body">
        <div class="prop-type">${typeLabel}</div>
        <div class="prop-title">${prop.name || 'Untitled'}</div>
        <div class="prop-location">📍 ${prop.location || 'Karnataka'}</div>
        <div class="prop-specs">${specs.join('')}</div>
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
      <div class="material-icon">${m.icon || '📦'}</div>
      <div class="material-name">${m.name}</div>
      <div class="material-price">${m.price || 'Enquiry based'}</div>
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

function applySiteSettings(settings) {
  window.RAAS_SETTINGS = settings;

  document.querySelectorAll('[data-setting]').forEach(el => {
    const key = el.getAttribute('data-setting');
    if (settings[key] !== undefined && settings[key] !== '') {
      el.innerHTML = settings[key];
    }
  });

  const waBtn = document.getElementById('wa-btn');
  if (waBtn) {
    waBtn.href = `https://wa.me/${settings.phone_bengaluru_raw}?text=${encodeURIComponent("Hi RAAS Builders, I'm interested in your properties")}`;
  }
  const phoneBtn = document.getElementById('phone-btn');
  if (phoneBtn) {
    phoneBtn.href = `tel:+${settings.phone_bengaluru_raw}`;
  }
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
async function handleContactSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('cf-name').value.trim();
  const phone = document.getElementById('cf-phone').value.trim();
  const email = document.getElementById('cf-email').value.trim();
  const interest = document.getElementById('cf-interest').value;
  const message = document.getElementById('cf-message').value.trim();

  const interestLabels = {
    plots: 'Buying a Plot',
    land: 'Agricultural Land',
    apartment: 'Buying an Apartment',
    construction: 'House Construction',
    interiors: 'Interior Design',
    materials: 'Building Materials',
    other: 'General Enquiry'
  };

  // Save to API (non-blocking, fires email notification if Resend configured)
  apiFetch('/api/health').then(h => {
    if (h && h.backend) {
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, interest, message })
      }).catch(() => {});
    }
  });

  // Always open WhatsApp (primary channel)
  const text =
`Hi RAAS Builders,

Name: ${name}
Phone: ${phone}${email ? `\nEmail: ${email}` : ''}
Interested in: ${interestLabels[interest] || interest}

${message}`;

  const waPhone = (window.RAAS_SETTINGS && window.RAAS_SETTINGS.phone_bengaluru_raw) || '919019793641';
  window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank');
  return false;
}
window.handleContactSubmit = handleContactSubmit;
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
