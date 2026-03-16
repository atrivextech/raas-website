// Load properties from localStorage
function loadProperties() {
  const properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  displayProperties(properties);
}

// Get background image based on property type
function getPropertyImage(type, image) {
  if (image) return image;
  
  const images = {
    plot: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
    apartment: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
    villa: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80'
  };
  
  return images[type] || images.plot;
}

// Display properties on the page
function displayProperties(properties) {
  const grid = document.getElementById('properties-grid');
  
  if (properties.length === 0) {
    // Show default sample properties with images
    grid.innerHTML = `
      <div class="prop-card" data-type="plot">
        <div class="prop-img" style="background: linear-gradient(135deg, rgba(26,95,122,0.7), rgba(42,127,154,0.5)), url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80') center/cover no-repeat;">
          <span class="prop-badge available">● Available</span>
        </div>
        <div class="prop-body">
          <div class="prop-type" data-en="Plot" data-kn="ನಿವೇಶನ">Plot</div>
          <div class="prop-title" data-en="RAAS Garden Heights" data-kn="ರಾಸ್ ಗಾರ್ಡನ್ ಹೈಟ್ಸ್">RAAS Garden Heights</div>
          <div class="prop-location" data-en="📍 Shivamogga" data-kn="📍 ಶಿವಮೊಗ್ಗ">📍 Shivamogga</div>
          <div class="prop-specs">
            <div class="spec-item">📐 1,200 sq.ft</div>
            <div class="spec-item">🗺️ RERA Approved</div>
          </div>
          <p style="font-size: 12px; color: var(--dark); margin: 12px 0;" data-en="Premium residential plots in gated community" data-kn="ಗೇಟೆಡ್ ಸಮುದಾಯದಲ್ಲಿ ಪ್ರೀಮಿಯಂ ವಸತಿ ಪ್ಲಾಟ್‌ಗಳು">Premium residential plots in gated community</p>
          <div class="prop-footer">
            <div class="prop-price">₹22 <span>Lakhs</span></div>
            <a href="tel:+919800000000" class="prop-enquire" data-en="Enquire" data-kn="ವಿಚಾರಿಸಿ">Enquire</a>
          </div>
        </div>
      </div>
      
      <div class="prop-card" data-type="apartment">
        <div class="prop-img" style="background: linear-gradient(135deg, rgba(26,95,122,0.7), rgba(42,127,154,0.5)), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80') center/cover no-repeat;">
          <span class="prop-badge premium">● Premium</span>
        </div>
        <div class="prop-body">
          <div class="prop-type" data-en="Apartment" data-kn="ಅಪಾರ್ಟ್‌ಮೆಂಟ್">Apartment</div>
          <div class="prop-title" data-en="RAAS Pinnacle Residency" data-kn="ರಾಸ್ ಪಿನ್ನಕಲ್ ರೆಸಿಡೆನ್ಸಿ">RAAS Pinnacle Residency</div>
          <div class="prop-location" data-en="📍 Electronic City, Bengaluru" data-kn="📍 ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ, ಬೆಂಗಳೂರು">📍 Electronic City, Bengaluru</div>
          <div class="prop-specs">
            <div class="spec-item">🛏️ 2 & 3 BHK</div>
            <div class="spec-item">🏊 Amenities</div>
          </div>
          <p style="font-size: 12px; color: var(--dark); margin: 12px 0;" data-en="Luxury apartments with modern facilities" data-kn="ಆಧುನಿಕ ಸೌಲಭ್ಯಗಳೊಂದಿಗೆ ಐಷಾರಾಮಿ ಅಪಾರ್ಟ್‌ಮೆಂಟ್‌ಗಳು">Luxury apartments with modern facilities</p>
          <div class="prop-footer">
            <div class="prop-price">₹58 <span>Lakhs</span></div>
            <a href="tel:+919800000000" class="prop-enquire" data-en="Enquire" data-kn="ವಿಚಾರಿಸಿ">Enquire</a>
          </div>
        </div>
      </div>
      
      <div class="prop-card" data-type="villa">
        <div class="prop-img" style="background: linear-gradient(135deg, rgba(26,95,122,0.7), rgba(42,127,154,0.5)), url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80') center/cover no-repeat;">
          <span class="prop-badge available">● New Launch</span>
        </div>
        <div class="prop-body">
          <div class="prop-type" data-en="Villa Layout" data-kn="ವಿಲ್ಲಾ ಬಡಾವಣೆ">Villa Layout</div>
          <div class="prop-title" data-en="RAAS Malnad Greens" data-kn="ರಾಸ್ ಮಲೆನಾಡ್ ಗ್ರೀನ್ಸ್">RAAS Malnad Greens</div>
          <div class="prop-location" data-en="📍 Thirthahalli, Malnad Region" data-kn="📍 ತೀರ್ಥಹಳ್ಳಿ, ಮಲೆನಾಡು">📍 Thirthahalli, Malnad Region</div>
          <div class="prop-specs">
            <div class="spec-item">📐 2,400 sq.ft</div>
            <div class="spec-item">🌿 Eco Layout</div>
          </div>
          <p style="font-size: 12px; color: var(--dark); margin: 12px 0;" data-en="Eco-friendly villa layouts in nature" data-kn="ಪ್ರಕೃತಿಯಲ್ಲಿ ಪರಿಸರ ಸ್ನೇಹಿ ವಿಲ್ಲಾ ವಿನ್ಯಾಸಗಳು">Eco-friendly villa layouts in nature</p>
          <div class="prop-footer">
            <div class="prop-price">₹18 <span>Lakhs</span></div>
            <a href="tel:+919800000000" class="prop-enquire" data-en="Enquire" data-kn="ವಿಚಾರಿಸಿ">Enquire</a>
          </div>
        </div>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = properties.map(prop => {
    const bgImage = getPropertyImage(prop.type, prop.image);
    return `
      <div class="prop-card" data-type="${prop.type}">
        <div class="prop-img" style="background: linear-gradient(135deg, rgba(7,17,29,0.6), rgba(18,36,58,0.4)), url('${bgImage}') center/cover no-repeat;">
          <span class="prop-badge ${prop.status}">${prop.status === 'available' ? '● Available' : prop.status === 'sold' ? '● Sold' : '● Premium'}</span>
        </div>
        <div class="prop-body">
          <div class="prop-type">${prop.type}</div>
          <div class="prop-title">${prop.name}</div>
          <div class="prop-location">📍 ${prop.location}</div>
          ${prop.area ? `
          <div class="prop-specs">
            <div class="spec-item">📐 ${prop.area} sq.ft</div>
          </div>
          ` : ''}
          ${prop.description ? `<p style="font-size: 12px; color: var(--mid); margin: 12px 0;">${prop.description}</p>` : ''}
          <div class="prop-footer">
            <div class="prop-price">₹${prop.price} <span>Lakhs</span></div>
            <a href="tel:+919800000000" class="prop-enquire">Enquire</a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Filter properties
function filterProperties(type) {
  const properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  
  if (type === 'all') {
    displayProperties(properties);
  } else {
    const filtered = properties.filter(prop => prop.type === type);
    displayProperties(filtered);
  }
}

// Initialize filter buttons
document.addEventListener('DOMContentLoaded', () => {
  loadProperties();
  
  // Filter buttons
  const filterButtons = document.querySelectorAll('.pf-chip');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      filterProperties(filter);
    });
  });
  
  // Smooth scroll for navigation
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});


// Language Toggle Functionality
let currentLang = 'en';

function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'kn' : 'en';
  
  // Update all elements with data-en and data-kn attributes
  document.querySelectorAll('[data-en]').forEach(element => {
    const enText = element.getAttribute('data-en');
    const knText = element.getAttribute('data-kn');
    
    if (currentLang === 'en') {
      element.innerHTML = enText;
    } else {
      element.innerHTML = knText;
    }
  });
  
  // Update language toggle button
  const langIcon = document.getElementById('lang-icon');
  const langText = document.getElementById('lang-text');
  
  if (currentLang === 'en') {
    langIcon.textContent = '🇬🇧';
    langText.textContent = 'EN';
  } else {
    langIcon.textContent = '🇮🇳';
    langText.textContent = 'ಕನ್ನಡ';
  }
  
  // Save preference
  localStorage.setItem('raas_language', currentLang);
}

// Load saved language preference
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('raas_language');
  if (savedLang && savedLang !== 'en') {
    toggleLanguage();
  }
});
