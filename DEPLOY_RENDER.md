# 🚀 Quick Render Deployment Steps

## Prerequisites Checklist

- [ ] GitHub/GitLab repository with your code
- [ ] MongoDB Atlas account (free tier available)
- [ ] Cloudflare R2 account (for storage)
- [ ] Render account (sign up at render.com)

---

## Step-by-Step Deployment

### 1️⃣ Prepare MongoDB Atlas (5 minutes)

1. **Create Cluster**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create free M0 cluster
   - Wait for deployment (~5 min)

2. **Create Database User**
   - Database Access → Add New User
   - Username: `redsee_user`
   - Password: Generate secure password (save it!)
   - Privileges: Read and write to any database

3. **Network Access**
   - Network Access → Add IP Address
   - Click **"Allow Access from Anywhere"** (0.0.0.0/0)

4. **Get Connection String**
   - Database → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your password
   - Example: `mongodb+srv://redsee_user:YourPassword@cluster0.xxxxx.mongodb.net/redsee_ott?retryWrites=true&w=majority`

---

### 2️⃣ Setup Cloudflare R2 (5 minutes)

1. **Create Bucket**
   - Cloudflare Dashboard → R2 → Create Bucket
   - Name: `redsee-ott-content`

2. **Create API Token**
   - My Profile → API Tokens → Create Token
   - Type: Custom Token
   - Permissions: Cloudflare R2:Edit
   - Save: Access Key ID & Secret Access Key

3. **Get Endpoint**
   - Account ID: Found in R2 dashboard sidebar
   - Endpoint: `https://<account-id>.r2.cloudflarestorage.com`
   - Public URL: Use custom domain or R2.dev URL

---

### 3️⃣ Deploy to Render (10 minutes)

1. **Create Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub/GitLab repository
   - Select your repository

2. **Configure Service**

   **Basic Settings:**
   ```
   Name: redsee-ott-api
   Region: Choose closest to users
   Branch: main
   Root Directory: (leave empty)
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Plan: Starter (Free)
   ```

3. **Add Environment Variables**

   Click **"Environment"** tab and add these:

   **Required:**
   ```
   NODE_ENV = production
   PORT = 10000
   
   MONGODB_URI_PROD = mongodb+srv://user:pass@cluster.mongodb.net/redsee_ott?retryWrites=true&w=majority
   
   JWT_SECRET = [Generate 32+ char random string]
   JWT_REFRESH_SECRET = [Generate 32+ char random string]
   JWT_EXPIRE = 15m
   JWT_REFRESH_EXPIRE = 7d
   
   R2_ACCOUNT_ID = [Your R2 Account ID]
   R2_ACCESS_KEY_ID = [Your R2 Access Key]
   R2_SECRET_ACCESS_KEY = [Your R2 Secret Key]
   R2_BUCKET_NAME = redsee-ott-content
   R2_PUBLIC_URL = https://your-cdn-domain.com
   R2_ENDPOINT = https://your-account-id.r2.cloudflarestorage.com
   
   RAZORPAY_KEY_ID = [Your Razorpay Key]
   RAZORPAY_KEY_SECRET = [Your Razorpay Secret]
   
   LOG_DIR = ./logs
   LOG_LEVEL = info
   ```

   **💡 Tip:** Mark sensitive variables as **"Secret"** in Render

4. **Deploy**
   - Click **"Create Web Service"**
   - Wait for deployment (~5-10 minutes)
   - Your app will be live at: `https://redsee-ott-api.onrender.com`

---

### 4️⃣ Post-Deployment (5 minutes)

1. **Get Your URL**
   - Render provides: `https://your-app-name.onrender.com`
   - Save this URL

2. **Initialize Admin**
   - Use Render Shell or SSH
   - Run: `node scripts/init-admin.js`
   - Or create via API (see RENDER_DEPLOYMENT.md)

3. **Test API**
   ```bash
   # Root endpoint
   curl https://your-app.onrender.com/
   
   # Health check
   curl https://your-app.onrender.com/api/v1/health
   
   # Test login
   curl -X POST https://your-app.onrender.com/api/v1/admin/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@redsee.com","password":"YourPassword"}'
   ```

---

## 🔑 Generate Secure Secrets

Use these commands to generate secure JWT secrets:

```bash
# Generate JWT_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_REFRESH_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ⚠️ Important Notes

### Free Tier Limitations
- **Spins down** after 15 min inactivity
- **Cold start** ~30 seconds
- **512MB RAM** limit
- **100GB bandwidth/month**

### Upgrade to Standard ($7/month) for:
- Always-on service
- More RAM
- Better performance

### Port Configuration
- Render uses `PORT` environment variable
- Default: `10000`
- Your server.js already handles this ✅

---

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Verify `package.json` scripts are correct
- Ensure Node.js version is compatible

### App Crashes
- Check logs tab in Render
- Verify all environment variables are set
- Ensure MongoDB connection string is correct

### MongoDB Connection Fails
- Verify Atlas network access allows all IPs (0.0.0.0/0)
- Check connection string format
- Ensure username/password are URL-encoded

---

## 📋 Quick Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user created
- [ ] Network access configured (0.0.0.0/0)
- [ ] Connection string copied
- [ ] Cloudflare R2 bucket created
- [ ] R2 API token created
- [ ] Render account created
- [ ] Web service created
- [ ] All environment variables added
- [ ] Service deployed
- [ ] Admin user initialized
- [ ] API tested

---

## 📚 Full Documentation

See `RENDER_DEPLOYMENT.md` for detailed guide with:
- Custom domain setup
- NGINX configuration
- Monitoring setup
- Advanced troubleshooting

---

**Ready to deploy?** Follow steps 1-4 above! 🚀

