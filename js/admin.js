// Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'raas2025'
};

// Temp storage for uploaded file data (base64)
let uploadedImages = [];
let uploadedLayout = null;

// Check if user is logged in
function checkAuth() {
  const isLoggedIn = sessionStorage.getItem('raas_admin_logged_in');
  if (isLoggedIn === 'true') {
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-section').style.display = 'flex';
  document.getElementById('dashboard-section').style.display = 'none';
}

function showDashboard() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('dashboard-section').style.display = 'block';
  loadPropertiesList();
}

// Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
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
}

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('raas_admin_logged_in');
    showLogin();
    const loginFormElement = document.getElementById('login-form');
    if (loginFormElement) loginFormElement.reset();
  });
}

// Handle multiple image uploads — convert to base64
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

// Handle layout/floor plan upload
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

// Add property form submit
const propertyForm = document.getElementById('property-form');
if (propertyForm) {
  propertyForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Validation
    const name = document.getElementById('prop-name').value.trim();
    const type = document.getElementById('prop-type').value;
    const location = document.getElementById('prop-location').value.trim();
    const price = document.getElementById('prop-price').value.trim();

    if (!name || !type || !location || !price) {
      alert('❌ Please fill in all required fields: Name, Type, Location, and Price');
      return;
    }

    if (isNaN(price) || price <= 0) {
      alert('❌ Price must be a valid number greater than 0');
      return;
    }

    const property = {
      id: Date.now(),
      name: name,
      type: type,
      location: location,
      price: price,
      area: document.getElementById('prop-area').value.trim(),
      bhk: document.getElementById('prop-bhk').value.trim(),
      facing: document.getElementById('prop-facing').value.trim(),
      amenities: document.getElementById('prop-amenities').value.trim(),
      status: document.getElementById('prop-status').value,
      description: document.getElementById('prop-description').value.trim(),
      images: uploadedImages.length > 0 ? uploadedImages : [],
      layout: uploadedLayout || null
    };

    const properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
    properties.push(property);
    localStorage.setItem('raas_properties', JSON.stringify(properties));

    // Reset
    propertyForm.reset();
    uploadedImages = [];
    uploadedLayout = null;
    document.getElementById('image-previews').innerHTML = '';
    document.getElementById('layout-preview').innerHTML = '';
    document.getElementById('image-upload-box').querySelector('p').textContent = 'Click to upload photos';
    document.getElementById('layout-upload-box').querySelector('p').textContent = 'Click to upload floor plan / layout';

    loadPropertiesList();
    alert('✅ Property added successfully!');
  });
}

// Load properties list
function loadPropertiesList() {
  const properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  const listContainer = document.getElementById('properties-list');

  if (properties.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <p>No properties added yet. Add your first property above.</p>
      </div>`;
    return;
  }

  listContainer.innerHTML = properties.map(prop => {
    const thumb = prop.images && prop.images.length > 0
      ? `<img src="${prop.images[0]}" alt="${prop.name}">`
      : `<div class="no-img">🏠</div>`;

    const layoutBadge = prop.layout
      ? `<span class="layout-badge">${prop.layout.type.includes('pdf') ? '📄 Layout PDF' : '📐 Layout Image'}</span>`
      : '';

    return `
      <div class="property-item">
        ${thumb}
        <div class="property-info">
          <h3>${prop.name}</h3>
          <p><strong>Type:</strong> ${prop.type} | <strong>Location:</strong> ${prop.location}</p>
          <p><strong>Price:</strong> ₹${prop.price} Lakhs | <strong>Status:</strong> ${prop.status}</p>
          ${prop.area ? `<p><strong>Area:</strong> ${prop.area} sq.ft ${prop.bhk ? '| <strong>BHK:</strong> ' + prop.bhk : ''}</p>` : ''}
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

// View layout file
function viewLayout(id) {
  const properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  const prop = properties.find(p => p.id === id);
  if (prop && prop.layout) {
    const win = window.open();
    if (prop.layout.type.includes('pdf')) {
      win.document.write(`<iframe src="${prop.layout.data}" width="100%" height="100%" style="border:none;"></iframe>`);
    } else {
      win.document.write(`<img src="${prop.layout.data}" style="max-width:100%;">`);
    }
  }
}

// Delete property
function deleteProperty(id) {
  if (confirm('Are you sure you want to delete this property?')) {
    let properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
    properties = properties.filter(prop => prop.id !== id);
    localStorage.setItem('raas_properties', JSON.stringify(properties));
    loadPropertiesList();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    checkAuth();
  } catch (error) {
    console.error('Error initializing admin page:', error);
  }
});
