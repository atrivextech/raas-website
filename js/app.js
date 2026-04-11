/* ══════════════════════════════════════════════════════════════
   RAAS Builders — Front-end app logic
   Handles: property rendering, filtering, language toggle, site
   settings, scroll reveal, mobile nav, contact form → WhatsApp.
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
    area: '1200',
    status: 'available',
    description: 'Premium residential plots in a RERA-approved gated community.',
    images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80'],
    bhk: '',
    facing: 'East'
  },
  {
    id: 'sample-2',
    name: 'RAAS Pinnacle Residency',
    type: 'apartment',
    location: 'Electronic City, Bengaluru',
    price: '58',
    area: '1180',
    status: 'premium',
    description: 'Luxury 2 & 3 BHK apartments with pool, gym and clubhouse.',
    images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80'],
    bhk: '2 & 3 BHK',
    facing: 'East'
  },
  {
    id: 'sample-3',
    name: 'RAAS Malnad Greens',
    type: 'villa',
    location: 'Thirthahalli, Malnad',
    price: '48',
    area: '2400',
    status: 'available',
    description: 'Eco-friendly villa layouts surrounded by the Western Ghats.',
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80'],
    bhk: '3 BHK',
    facing: 'North-East'
  }
];

const TYPE_FALLBACK_IMG = {
  plot: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
  apartment: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
  villa: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80'
};

const TYPE_LABEL = {
  plot: 'Plot',
  apartment: 'Apartment',
  villa: 'Villa',
  commercial: 'Commercial'
};

// ─── Load properties (admin-added or fall back to samples) ───
function getAllProperties() {
  const stored = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  return stored.length > 0 ? stored : SAMPLE_PROPERTIES;
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
    premium: '● Premium'
  };
  return `<span class="prop-badge ${status || 'available'}">${map[status] || map.available}</span>`;
}

function renderPropertyCard(prop) {
  const bg = getImage(prop);
  const typeLabel = TYPE_LABEL[prop.type] || prop.type || 'Property';
  const waMsg = encodeURIComponent(`Hi RAAS Builders, I'm interested in ${prop.name} at ${prop.location}. Please share more details.`);
  const waPhone = (window.RAAS_SETTINGS && window.RAAS_SETTINGS.phone_bengaluru_raw) || '919019793641';

  const specs = [];
  if (prop.area) specs.push(`<div class="spec-item">📐 ${prop.area} sq.ft</div>`);
  if (prop.bhk) specs.push(`<div class="spec-item">🛏️ ${prop.bhk}</div>`);
  if (prop.facing) specs.push(`<div class="spec-item">🧭 ${prop.facing}</div>`);
  if (specs.length === 0) specs.push(`<div class="spec-item">✅ RERA Approved</div>`);

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
          <div class="prop-price">₹${prop.price || '—'} <span>Lakhs</span></div>
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
  const all = getAllProperties();
  displayProperties(type === 'all' ? all : all.filter(p => p.type === type));
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

function loadSiteSettings() {
  const stored = JSON.parse(localStorage.getItem('raas_site_settings') || '{}');
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  window.RAAS_SETTINGS = settings;

  document.querySelectorAll('[data-setting]').forEach(el => {
    const key = el.getAttribute('data-setting');
    if (settings[key] !== undefined && settings[key] !== '') {
      el.innerHTML = settings[key];
    }
  });

  // Update WhatsApp + phone floating widgets
  const waBtn = document.getElementById('wa-btn');
  if (waBtn) {
    waBtn.href = `https://wa.me/${settings.phone_bengaluru_raw}?text=${encodeURIComponent("Hi RAAS Builders, I'm interested in your properties")}`;
  }
  const phoneBtn = document.getElementById('phone-btn');
  if (phoneBtn) {
    phoneBtn.href = `tel:+${settings.phone_bengaluru_raw}`;
  }
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

// ─── Contact form → WhatsApp ───
function handleContactSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('cf-name').value.trim();
  const phone = document.getElementById('cf-phone').value.trim();
  const email = document.getElementById('cf-email').value.trim();
  const interest = document.getElementById('cf-interest').value;
  const message = document.getElementById('cf-message').value.trim();

  const interestLabels = {
    plots: 'Buying a Plot',
    apartment: 'Buying an Apartment',
    construction: 'House Construction',
    interiors: 'Interior Design',
    materials: 'Building Materials',
    other: 'General Enquiry'
  };

  const text =
`Hi RAAS Builders,

Name: ${name}
Phone: ${phone}${email ? `\nEmail: ${email}` : ''}
Interested in: ${interestLabels[interest]}

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
  loadSiteSettings();
  displayProperties(getAllProperties());
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
});
