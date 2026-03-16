# 🚀 Quick Start Guide

## For Website Owner

### 1. Test Locally (Optional)

Before uploading to Hostinger, you can test on your computer:

1. Open `index.html` in your web browser
2. Click around to see the design
3. Open `admin.html` to see the admin panel
4. Login with: `admin` / `raas2025`

### 2. Upload to Hostinger

**Easiest Method:**

1. Login to Hostinger → File Manager
2. Go to `public_html` folder
3. Upload ALL files from RAAS-web folder
4. Done! Visit your domain

**Detailed steps:** See `DEPLOYMENT_GUIDE.md`

### 3. Change Admin Password

⚠️ **DO THIS FIRST!**

1. In Hostinger File Manager, open `js/admin.js`
2. Change line 2-5:
   ```javascript
   const ADMIN_CREDENTIALS = {
     username: 'your_new_username',
     password: 'your_secure_password'
   };
   ```
3. Save file

### 4. Add Your Properties

1. Go to `https://yourdomain.com/admin.html`
2. Login with your new credentials
3. Fill the form and click "Add Property"
4. Properties will appear on homepage automatically

### 5. Update Contact Info

Edit `index.html` and replace:
- Phone: `+919800000000` → Your number
- Email: `info@raasbuilders.com` → Your email
- Address: Update in footer section

## Admin Panel Features

### Adding a Property

**Required Fields:**
- Property Name (e.g., "RAAS Garden Heights")
- Type (Plot, Apartment, Villa, Commercial)
- Location (e.g., "Shivamogga")
- Price in Lakhs (e.g., "22" for ₹22 Lakhs)
- Status (Available, Sold, Premium)

**Optional Fields:**
- Area in sq.ft (e.g., "1200")
- Description (brief details)
- Image URL (link to property image)

### Image URLs

You can use images from:
1. **Upload to Hostinger:** File Manager → Upload → Copy URL
2. **Google Drive:** Share → Get link → Use direct link
3. **Image hosting:** imgur.com, imgbb.com
4. **Your own server**

Example: `https://yourdomain.com/images/property1.jpg`

### Managing Properties

- **View:** All properties listed below the form
- **Delete:** Click "Delete" button on any property
- **Edit:** Delete and re-add (or contact developer for edit feature)

## Tips & Best Practices

### Property Images
- Use high-quality images (1200x800px recommended)
- Compress images before uploading (use tinypng.com)
- Use consistent image sizes

### Property Descriptions
- Keep it brief (2-3 sentences)
- Highlight key features
- Mention RERA approval if applicable

### Pricing
- Enter only numbers (e.g., "22" not "22 Lakhs")
- System automatically adds "₹" and "Lakhs"

### Regular Maintenance
- Update sold properties status
- Remove outdated listings
- Add new properties regularly
- Backup your data monthly

## Common Questions

**Q: Where is my data stored?**
A: Currently in browser localStorage. For production, consider database upgrade.

**Q: Can multiple people manage properties?**
A: Not with current setup. Each browser stores its own data. Consider database upgrade for multi-admin support.

**Q: How to add more property types?**
A: Edit `admin.html` line 42-47 to add more options in the dropdown.

**Q: Can I customize colors?**
A: Yes! Edit `css/style.css` and change the `:root` variables.

**Q: How to add more pages?**
A: Create new HTML files and link them in navigation.

## Support Contacts

**Hostinger Support:**
- 24/7 Live Chat in your panel
- Email: support@hostinger.com

**Website Technical Issues:**
- Check `README.md` for troubleshooting
- Browser console (F12) shows errors
- Clear cache if things don't update

## Security Checklist

- [x] Changed default admin password
- [x] Enabled HTTPS/SSL
- [x] Set correct file permissions
- [x] Regular backups
- [x] Keep browser updated

## Next Steps

1. ✅ Deploy to Hostinger
2. ✅ Change admin credentials
3. ✅ Update contact information
4. ✅ Add your first property
5. ✅ Test on mobile devices
6. ✅ Share website link
7. ✅ Monitor and update regularly

---

**Need help? Check the detailed guides:**
- `README.md` - Complete documentation
- `DEPLOYMENT_GUIDE.md` - Step-by-step deployment
- Hostinger Knowledge Base - https://support.hostinger.com

**Your website is ready to go live! 🎉**
