# Setup .env.local File for Local Development

## ⚠️ IMPORTANT: Create This File Manually

The `.env.local` file is in `.gitignore` (for security), so you need to create it manually.

## 📝 Steps to Create .env.local

### **Step 1: Create the File**

**Location:** `client/.env.local` (in the `client/` directory)

**Windows:**
```powershell
# In PowerShell, navigate to client directory
cd client
# Create the file
New-Item -Path ".env.local" -ItemType File
```

**Or manually:**
1. Open `client/` folder in File Explorer
2. Create new file named `.env.local` (note the dot at the beginning)
3. Make sure it's not `.env.local.txt` - it should be just `.env.local`

### **Step 2: Add Content**

Open `.env.local` in a text editor and add:

```env
# Backend API URL for local development
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**Important:**
- No spaces around the `=` sign
- No quotes needed
- Make sure there's no trailing whitespace

### **Step 3: Restart Next.js**

**After creating the file:**
1. Stop the Next.js dev server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   # or
   bun dev
   ```

**Why restart?**
- Next.js reads `.env.local` only at startup
- Changes won't take effect until restart

### **Step 4: Verify**

Open browser console (F12) and check for:
```
API Base URL: http://localhost:8000/api
```

If you see this, the configuration is working!

---

## 🔍 Troubleshooting

### **Problem: File Not Found**
**Check:**
- File is in `client/` directory (not `client/server/` or root)
- File name is exactly `.env.local` (with the dot)
- File extension is not `.txt`

### **Problem: Still Using Fallback**
**Check:**
- Restarted Next.js after creating file?
- File content is correct (no extra spaces, correct format)?
- Browser console shows warning about missing env var?

### **Problem: Wrong URL**
**Check:**
- `.env.local` has: `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
- No quotes around the URL
- No trailing spaces

---

## ✅ Verification

After creating `.env.local` and restarting:

1. **Check browser console:**
   - Should see: `API Base URL: http://localhost:8000/api`
   - Should NOT see warning about missing env var

2. **Test API call:**
   - Try to login or register
   - Check Network tab in DevTools
   - Requests should go to `http://localhost:8000/api/...`

3. **Check server logs:**
   - Should see incoming requests
   - No CORS errors

---

## 📋 File Structure

```
client/
  ├── .env.local          ← CREATE THIS FILE
  ├── .gitignore          (already exists)
  ├── package.json
  ├── next.config.ts
  └── ...
```

---

## 🚀 Production (Hostinger) — performance & rate limiting

```env
# Same value as BFF_SHARED_SECRET in backEnd_Labo — passes the real visitor IP
# to Express for rate limiting. Server-side only (never prefix with NEXT_PUBLIC_).
BFF_SHARED_SECRET=<openssl rand -hex 32>

# Reverse proxies in front of Next that append to X-Forwarded-For (default 1)
# TRUSTED_PROXY_HOPS=1

# Optional: public origin that serves /api/files/* directly (Express subdomain
# or a CDN in front of it). Public images/videos then skip the Next.js proxy.
# PDFs and private files (documents, payments, excel) keep using /api.
# Must be https. Rebuild Next after changing (NEXT_PUBLIC_* is inlined at build).
# NEXT_PUBLIC_MEDIA_URL=https://media.dzlabmarket.com

# /api proxy: max wait (ms) for Express to start answering once the request is
# fully sent, then 504. Upload time is not counted. Default 30000.
# API_PROXY_TIMEOUT_MS=30000
```

---

## 🎯 Quick Copy-Paste

**Create file:** `client/.env.local`

**Content:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**Then restart Next.js!**
