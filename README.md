# RAAS Builders & Developers Website

A modern, bilingual (English + Kannada) real estate website with admin panel for property management.

## Features

- 🏠 Property listings with filtering
- 🔐 Secure admin panel for property management
- 📱 Fully responsive design
- 🌐 Bilingual support (English + Kannada)
- ⚡ Fast and lightweight
- 🎨 Premium design based on mockup

## Admin Access

**URL:** `https://yourdomain.com/admin.html`

**Default Credentials:**
- Username: `admin`
- Password: `raas2025`

⚠️ **IMPORTANT:** Change these credentials in `js/admin.js` before deploying to production!

## Deployment to Hostinger

### Method 1: File Manager (Recommended for beginners)

1. **Login to Hostinger**
   - Go to https://hostinger.com
   - Login to your account
   - Navigate to your hosting panel

2. **Access File Manager**
   - Click on "File Manager" in your hosting panel
   - Navigate to `public_html` folder

3. **Upload Files**
   - Delete any existing files in `public_html` (except `.htaccess` if you want to keep it)
   - Upload all files from this project:
     - `index.html`
     - `admin.html`
     - `css/` folder
     - `js/` folder
     - `.htaccess`

4. **Set Permissions**
   - Right-click on folders and set permissions to 755
   - Right-click on files and set permissions to 644

5. **Test Your Website**
   - Visit `https://yourdomain.com`
   - Visit `https://yourdomain.com/admin.html` to access admin panel

### Method 2: FTP Upload

1. **Get FTP Credentials**
   - In Hostinger panel, go to "FTP Accounts"
   - Note down: hostname, username, password, port

2. **Use FTP Client**
   - Download FileZilla (https://filezilla-project.org/)
   - Connect using your FTP credentials
   - Navigate to `public_html` folder
   - Upload all project files

### Method 3: Git Deployment (Advanced)

1. **SSH Access**
   - Enable SSH in Hostinger panel
   - Connect via SSH: `ssh username@yourdomain.com`

2. **Clone Repository**
   ```bash
   cd public_html
   git clone https://github.com/atrivextech/raas-website.git .
   ```

## File Structure

```
RAAS-web/
├── index.html              # Main website
├── admin.html              # Admin panel
├── .htaccess              # Server configuration
├── css/
│   ├── style.css          # Main website styles
│   └── admin.css          # Admin panel styles
├── js/
│   ├── app.js             # Main website functionality
│   └── admin.js           # Admin panel functionality
└── README.md              # This file
```

## How to Use Admin Panel

1. **Login**
   - Go to `https://yourdomain.com/admin.html`
   - Enter username and password
   - Click "Login"

2. **Add Property**
   - Fill in the property form:
     - Property Name (required)
     - Type: Plot, Apartment, Villa, or Commercial
     - Location (required)
     - Price in Lakhs (required)
     - Area in sq.ft (optional)
     - Status: Available, Sold, or Premium
     - Description (optional)
     - Image URL (optional)
   - Click "Add Property"

3. **Manage Properties**
   - View all properties in the list below
   - Click "Delete" to remove a property

4. **Logout**
   - Click "Logout" button in the header

## Data Storage

Currently, the website uses **localStorage** (browser storage) to save properties. This means:

✅ **Pros:**
- No backend/database needed
- Works immediately
- Free hosting

⚠️ **Limitations:**
- Data is stored in the browser
- Clearing browser data will delete properties
- Not suitable for multiple admins

### Upgrading to Database (Optional)

For production use with multiple admins, consider upgrading to:
- **PHP + MySQL** (available on Hostinger)
- **Firebase** (Google's backend service)
- **Supabase** (PostgreSQL backend)

Contact a developer to implement database integration.

## Customization

### Change Admin Credentials

Edit `js/admin.js`:
```javascript
const ADMIN_CREDENTIALS = {
  username: 'your_username',
  password: 'your_secure_password'
};
```

### Update Contact Information

Edit `index.html`:
- Phone numbers: Search for `+919800000000`
- Email: Search for `info@raasbuilders.com`
- Address: Update in footer section

### Change Colors

Edit `css/style.css` and `css/admin.css`:
```css
:root {
  --navy: #12243A;
  --gold: #B8922A;
  /* Modify these values */
}
```

## Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers

## Security Recommendations

1. **Change default admin credentials** immediately
2. **Use HTTPS** (enable SSL in Hostinger)
3. **Regular backups** of your property data
4. **Keep browser updated** when managing properties
5. Consider implementing **backend authentication** for production

## Support

For technical support or customization:
- Email: info@raasbuilders.com
- Phone: +91 98XXXXXXXX

## License

© 2025 RAAS Builders & Developers. All Rights Reserved.

---

**Built with ❤️ for RAAS Builders & Developers**
