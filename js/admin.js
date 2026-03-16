// Admin credentials (in production, use backend authentication)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'raas2025'
};

// Check if user is logged in
function checkAuth() {
  const isLoggedIn = sessionStorage.getItem('raas_admin_logged_in');
  if (isLoggedIn === 'true') {
    showDashboard();
  } else {
    showLogin();
  }
}

// Show login form
function showLogin() {
  document.getElementById('login-section').style.display = 'flex';
  document.getElementById('dashboard-section').style.display = 'none';
}

// Show dashboard
function showDashboard() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('dashboard-section').style.display = 'block';
  loadPropertiesList();
}

// Handle login
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

// Handle logout
document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('raas_admin_logged_in');
  showLogin();
  document.getElementById('login-form').reset();
});

// Handle property form submission
document.getElementById('property-form').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const property = {
    id: Date.now(),
    name: document.getElementById('prop-name').value,
    type: document.getElementById('prop-type').value,
    location: document.getElementById('prop-location').value,
    price: document.getElementById('prop-price').value,
    area: document.getElementById('prop-area').value,
    status: document.getElementById('prop-status').value,
    description: document.getElementById('prop-description').value,
    image: document.getElementById('prop-image').value
  };
  
  // Get existing properties
  const properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  
  // Add new property
  properties.push(property);
  
  // Save to localStorage
  localStorage.setItem('raas_properties', JSON.stringify(properties));
  
  // Reset form
  document.getElementById('property-form').reset();
  
  // Reload properties list
  loadPropertiesList();
  
  // Show success message
  alert('Property added successfully!');
});

// Load properties list in admin panel
function loadPropertiesList() {
  const properties = JSON.parse(localStorage.getItem('raas_properties') || '[]');
  const listContainer = document.getElementById('properties-list');
  
  if (properties.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <p>No properties added yet. Add your first property above.</p>
      </div>
    `;
    return;
  }
  
  listContainer.innerHTML = properties.map(prop => `
    <div class="property-item">
      ${prop.image ? `<img src="${prop.image}" alt="${prop.name}">` : '<div style="width:100px;height:80px;background:var(--cream);border-radius:8px;"></div>'}
      <div class="property-info">
        <h3>${prop.name}</h3>
        <p><strong>Type:</strong> ${prop.type} | <strong>Location:</strong> ${prop.location}</p>
        <p><strong>Price:</strong> ₹${prop.price} Lakhs | <strong>Status:</strong> ${prop.status}</p>
        ${prop.area ? `<p><strong>Area:</strong> ${prop.area} sq.ft</p>` : ''}
      </div>
      <div class="property-actions">
        <button class="btn-delete" onclick="deleteProperty(${prop.id})">Delete</button>
      </div>
    </div>
  `).join('');
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
