# 🚀 Render Deployment Guide - RedSee OTT Platform

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **MongoDB Atlas**: Free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
3. **Cloudflare R2**: Account at [cloudflare.com](https://www.cloudflare.com) (for storage)
4. **GitHub/GitLab**: Repository for your code

---

## Step 1: Prepare Your Repository

### 1.1 Ensure All Files Are Committed

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 1.2 Verify Essential Files

Make sure these files exist:
- ✅ `package.json`
- ✅ `server.js`
- ✅ `render.yaml` (optional, but recommended)
- ✅ `.env` template (for reference)

---

## Step 2: Set Up MongoDB Atlas

### 2.1 Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster (M0)
3. Wait for cluster to be created (~5 minutes)

### 2.2 Configure Database Access

1. Go to **Database Access** → **Add New Database User**
2. Create user with:
   - Username: `redsee_user`
   - Password: Generate secure password
   - Database User Privileges: **Read and write to any database**

### 2.3 Configure Network Access

1. Go to **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** (0.0.0.0/0)
   - Or add Render's IP ranges if you prefer

### 2.4 Get Connection String

1. Go to **Database** → **Connect**
2. Choose **Connect your application**
3. Copy connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/redsee_ott?retryWrites=true&w=majority
   ```
4. Replace `<username>` and `<password>` with your credentials

---

## Step 3: Set Up Cloudflare R2 (Optional but Recommended)

### 3.1 Create R2 Bucket

1. Go to Cloudflare Dashboard → **R2**
2. Create bucket: `redsee-ott-content`
3. Note your **Account ID**

### 3.2 Create API Token

1. Go to **My Profile** → **API Tokens**
2. Create **Custom Token** with:
   - Permissions: **Cloudflare R2:Edit**
   - Account Resources: Your account
3. Save **Access Key ID** and **Secret Access Key**

### 3.3 Get R2 Endpoint

- Endpoint format: `https://<account-id>.r2.cloudflarestorage.com`
- Public URL: Set up custom domain or use R2.dev URL

---

## Step 4: Deploy to Render

### 4.1 Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub/GitLab repository
4. Select your repository

### 4.2 Configure Service

**Basic Settings:**
- **Name**: `redsee-ott-api`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: Leave empty (root)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Advanced Settings:**
- **Plan**: **Starter** (Free) or **Standard** (Paid)
- **Auto-Deploy**: `Yes` (deploys on git push)

### 4.3 Add Environment Variables

Click **Environment** tab and add:

#### Required Variables

```env
NODE_ENV=production
PORT=10000

# MongoDB
MONGODB_URI_PROD=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/redsee_ott?retryWrites=true&w=majority

# JWT Secrets (generate strong random strings)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Cloudflare R2
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=redsee-ott-content
R2_PUBLIC_URL=https://your-cdn-domain.com
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

# Razorpay (if using)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Logging
LOG_DIR=./logs
LOG_LEVEL=info
```

**Important**: Mark sensitive variables as **Secret** in Render

### 4.4 Deploy

1. Click **Create Web Service**
2. Render will:
   - Clone your repository
   - Run `npm install`
   - Start your application
3. Wait for deployment (~5-10 minutes)

---

## Step 5: Post-Deployment Setup

### 5.1 Get Your Render URL

After deployment, you'll get a URL like:
```
https://redsee-ott-api.onrender.com
```

### 5.2 Initialize Admin User

1. SSH into your Render service (if available) or use Render Shell
2. Run initialization script:

```bash
node scripts/init-admin.js
```

Or create admin via API:
```bash
curl -X POST https://your-app.onrender.com/api/admin/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@redsee.com",
    "password": "SecurePassword123!",
    "role": "super_admin"
  }'
```

### 5.3 Test Your API

```bash
# Root endpoint (API info)
curl https://your-app.onrender.com/

# Health check
curl https://your-app.onrender.com/api/v1/health

# Test admin login
curl -X POST https://your-app.onrender.com/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@redsee.com",
    "password": "SecurePassword123!"
  }'
```

---

## Step 6: Configure Custom Domain (Optional)

### 6.1 Add Custom Domain in Render

1. Go to your service → **Settings** → **Custom Domains**
2. Add your domain: `api.yourdomain.com`
3. Render will provide DNS records

### 6.2 Update DNS

Add CNAME record in your DNS provider:
```
Type: CNAME
Name: api
Value: your-app.onrender.com
```

### 6.3 Update Environment Variables

Update `R2_PUBLIC_URL` to use your custom domain if needed.

---

## Step 7: Update NGINX Config (If Using)

If you're using NGINX in front of Render, update `nginx.conf`:

```nginx
upstream redsee_api {
    server your-app.onrender.com;
    keepalive 64;
}
```

---

## Step 8: Monitor & Maintain

### 8.1 View Logs

1. Go to Render Dashboard → Your Service → **Logs**
2. Monitor for errors and performance

### 8.2 Set Up Alerts

1. Go to **Alerts** tab
2. Configure email/Slack notifications for:
   - Deployment failures
   - Service crashes
   - High memory usage

### 8.3 Auto-Deploy

- Render auto-deploys on git push to main branch
- Or manually deploy from dashboard

---

## Troubleshooting

### Issue: Build Fails

**Solution:**
- Check build logs in Render dashboard
- Ensure `package.json` has correct scripts
- Verify Node.js version compatibility

### Issue: Application Crashes

**Solution:**
- Check logs for errors
- Verify all environment variables are set
- Ensure MongoDB connection string is correct
- Check PORT is set to 10000 (Render requirement)

### Issue: MongoDB Connection Fails

**Solution:**
- Verify MongoDB Atlas network access allows all IPs
- Check connection string format
- Ensure username/password are URL-encoded
- Verify database name in connection string

### Issue: R2 Upload Fails

**Solution:**
- Verify all R2 environment variables are set
- Check R2 credentials are correct
- Ensure bucket exists and is accessible
- Verify R2_ENDPOINT format

---

## Render-Specific Considerations

### Port Configuration

Render requires your app to listen on the port provided by `PORT` environment variable (default: 10000).

Your `server.js` should already handle this:
```javascript
const PORT = process.env.PORT || 3000;
```

### Free Tier Limitations

- **Spins down after 15 minutes** of inactivity
- **Cold start** takes ~30 seconds after spin-down
- **512MB RAM** limit
- **100GB bandwidth** per month

**Upgrade to Standard** ($7/month) for:
- Always-on service
- More RAM
- Better performance

### Environment Variables

- Mark sensitive variables as **Secret**
- Use **Sync** feature to share variables across services
- Group related variables for easier management

---

## Quick Deploy Checklist

- [ ] Repository pushed to GitHub/GitLab
- [ ] MongoDB Atlas cluster created and configured
- [ ] Database user created with proper permissions
- [ ] Network access configured (0.0.0.0/0)
- [ ] Connection string copied
- [ ] Cloudflare R2 bucket created (if using)
- [ ] R2 API token created
- [ ] Render account created
- [ ] Web service created in Render
- [ ] All environment variables added
- [ ] Service deployed successfully
- [ ] Admin user initialized
- [ ] API tested and working
- [ ] Custom domain configured (optional)
- [ ] Monitoring/alerts set up

---

## Example Render Service Configuration

**Name**: `redsee-ott-api`  
**Region**: `Oregon (US West)`  
**Branch**: `main`  
**Root Directory**: (empty)  
**Environment**: `Node`  
**Build Command**: `npm install`  
**Start Command**: `npm start`  
**Plan**: `Starter` (Free) or `Standard` ($7/month)

---

## Support

- **Render Docs**: https://render.com/docs
- **Render Status**: https://status.render.com
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com

---

**Last Updated**: 2025-11-18  
**Status**: Production Ready

