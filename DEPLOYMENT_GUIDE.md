# Quick Deployment Guide for Hostinger

## Step-by-Step Instructions

### 1. Prepare Your Files

Make sure you have all these files ready:
- ✅ index.html
- ✅ admin.html
- ✅ .htaccess
- ✅ css/style.css
- ✅ css/admin.css
- ✅ js/app.js
- ✅ js/admin.js

### 2. Login to Hostinger

1. Go to https://hostinger.com
2. Click "Login" (top right)
3. Enter your email and password
4. You'll see your hosting dashboard

### 3. Access File Manager

1. In the dashboard, find your hosting plan
2. Click "Manage" button
3. Scroll down and click "File Manager"
4. You'll see a file browser interface

### 4. Navigate to public_html

1. In File Manager, click on `public_html` folder
2. This is where your website files go
3. If there are existing files (like index.html), you can delete them

### 5. Upload Your Files

**Option A: Upload via File Manager**
1. Click "Upload Files" button (top right)
2. Select all your files and folders
3. Wait for upload to complete
4. Make sure folder structure is maintained:
   ```
   public_html/
   ├── index.html
   ├── admin.html
   ├── .htaccess
   ├── css/
   │   ├── style.css
   │   └── admin.css
   └── js/
       ├── app.js
       └── admin.js
   ```

**Option B: Create Folders First**
1. Click "New Folder" and create `css` folder
2. Click "New Folder" and create `js` folder
3. Upload files to respective folders:
   - Upload HTML files to `public_html`
   - Upload CSS files to `public_html/css`
   - Upload JS files to `public_html/js`

### 6. Verify File Permissions

1. Right-click on each folder → Properties
2. Set permissions to `755` for folders
3. Right-click on each file → Properties
4. Set permissions to `644` for files

### 7. Test Your Website

1. Open a new browser tab
2. Go to your domain: `https://yourdomain.com`
3. You should see the RAAS website
4. Test admin panel: `https://yourdomain.com/admin.html`

### 8. Configure Admin Access

**IMPORTANT: Change Default Password!**

1. In File Manager, navigate to `js/admin.js`
2. Right-click → Edit
3. Find these lines:
   ```javascript
   const ADMIN_CREDENTIALS = {
     username: 'admin',
     password: 'raas2025'
   };
   ```
4. Change to your secure credentials:
   ```javascript
   const ADMIN_CREDENTIALS = {
     username: 'your_username',
     password: 'your_strong_password'
   };
   ```
5. Click "Save Changes"

### 9. Enable SSL (HTTPS)

1. Go back to Hostinger dashboard
2. Find "SSL" section
3. Click "Install SSL"
4. Wait 5-10 minutes for activation
5. Your site will be accessible via `https://`

### 10. Update Contact Information

1. Edit `index.html` in File Manager
2. Search for and replace:
   - `+919800000000` → Your phone number
   - `info@raasbuilders.com` → Your email
   - Update address in footer

## Common Issues & Solutions

### Issue: Website shows "404 Not Found"
**Solution:** Make sure `index.html` is in `public_html` folder, not in a subfolder.

### Issue: CSS/JS not loading
**Solution:** 
1. Check folder structure is correct
2. Verify file permissions (644 for files, 755 for folders)
3. Clear browser cache (Ctrl+F5)

### Issue: Admin panel not working
**Solution:**
1. Check browser console for errors (F12)
2. Verify `js/admin.js` is uploaded correctly
3. Try different browser

### Issue: Can't upload files
**Solution:**
1. Check file size limits (usually 50MB per file)
2. Try uploading files one by one
3. Use FTP if File Manager fails

## Using FTP (Alternative Method)

If File Manager doesn't work, use FTP:

1. **Get FTP Credentials**
   - In Hostinger panel → FTP Accounts
   - Note: hostname, username, password

2. **Download FileZilla**
   - Go to https://filezilla-project.org/
   - Download and install

3. **Connect**
   - Open FileZilla
   - Enter: Host, Username, Password, Port (21)
   - Click "Quickconnect"

4. **Upload Files**
   - Left side: Your computer files
   - Right side: Server (navigate to public_html)
   - Drag and drop files from left to right

## Testing Checklist

After deployment, test these:

- [ ] Homepage loads correctly
- [ ] Navigation links work
- [ ] Properties section displays
- [ ] Admin page loads (`/admin.html`)
- [ ] Can login to admin panel
- [ ] Can add a test property
- [ ] Test property appears on homepage
- [ ] Can delete test property
- [ ] Mobile responsive (test on phone)
- [ ] Contact links work (phone, email)

## Next Steps

1. **Add Properties**
   - Login to admin panel
   - Add your real properties with images

2. **Backup Data**
   - Regularly export property data
   - Keep backup of website files

3. **Monitor Performance**
   - Check website speed
   - Monitor visitor analytics (add Google Analytics if needed)

4. **SEO Optimization**
   - Add meta descriptions
   - Submit sitemap to Google
   - Register on Google My Business

## Need Help?

**Hostinger Support:**
- Live Chat: Available 24/7 in Hostinger panel
- Email: support@hostinger.com
- Knowledge Base: https://support.hostinger.com

**Website Issues:**
- Check browser console (F12) for errors
- Clear browser cache
- Try incognito/private mode
- Test on different devices

---

**Congratulations! Your RAAS website is now live! 🎉**
