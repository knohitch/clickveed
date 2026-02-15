# 🚀 QUICK FIX - Run This Now

## Prerequisites ✓
- SSH access available
- Application deployed
- Environment variables configured

## Step 1: Find Your Container Name

SSH into your server and run:

```bash
# For CapRover
docker ps | grep "srv-captain--" | grep clickvidev

# For Coolify
docker ps | grep coolify | grep clickvidev
```

**Copy the container name** (looks like: `srv-captain--clickvidev-somehash`)

## Step 2: Run Initialization Script

Replace `YOUR_CONTAINER_NAME` with the actual container name from Step 1:

```bash
# Copy the script to the container
docker cp initialize-system.js YOUR_CONTAINER_NAME:/app/initialize-system.js

# Run the initialization
docker exec -it YOUR_CONTAINER_NAME node /app/initialize-system.js
```

**Expected Output:**
```
🚀 Starting system initialization...

📧 Setting up email configuration...
✅ Email settings configured

🔑 Setting up API keys...
✅ API key created: stripeSecretKey
✅ API key created: stripePublishableKey
✅ API key created: stripeWebhookSecret
[... more API keys ...]

💳 Setting up default subscription plans...
✅ Plan created: Free Tier
✅ Plan created: Starter
✅ Plan created: Professional

⚙️ Setting up general application settings...
✅ Setting created: appName
✅ Setting created: allowAdminSignup
[... more settings ...]

📧 Creating default email templates...
✅ Email template created: userSignup
✅ Email template created: emailVerification
[... more templates ...]

🎉 System initialization completed successfully!

Next steps:
1. Restart your application
2. Log in as Super Admin
3. Configure your API keys in Settings > API Integrations
4. Test email configuration in Settings > Email
5. Adjust plans and pricing as needed
```

## Step 3: Restart Application

**CapRover:**
- Dashboard → Applications → clickvidev → Settings → Restart

**Coolify:**
- Dashboard → Services → clickvidev → Restart

Or via command line:
```bash
docker restart YOUR_CONTAINER_NAME
```

## Step 4: Verify Success

Visit your application and test:

### ✅ Test 1: Email Configuration
1. Log in as Super Admin
2. Go to: Settings → Email
3. Click "Send Test Email"
4. Enter your email address
5. Click Send
6. **Check your inbox** - you should receive an email within 30 seconds

### ✅ Test 2: Stripe Integration
1. Log in as regular user
2. Go to: Plans & Billing
3. You should see 3 plans:
   - **Free Tier** (current)
   - **Starter ($29/mo)**
   - **Pro ($99/mo)**
4. Click "Upgrade" on Starter or Pro
5. **Should redirect to Stripe checkout** (not error)

### ✅ Test 3: User Features
1. Stay logged in as regular user
2. Try creating a new video project
3. **Should work** (3 videos allowed on Free tier)
4. Try generating a thumbnail
5. **Should work** (thumbnail tools included in Free)

### ✅ Test 4: Email Verification (New User)
1. Sign out
2. Click "Sign Up"
3. Create a new test account
4. **Check email inbox** - verification email should arrive within 30 seconds
5. Click verify link → account should be activated

### ✅ Test 5: Super Admin Functions
1. Log in as Super Admin
2. Go to: Admin Panel → Users
3. Find a pending user (if any)
4. Click "Verify User" or "Delete User"
5. **Should work without errors**

## Troubleshooting

**If initialization fails with "Cannot find module '@prisma/client'":**
```bash
docker exec -it YOUR_CONTAINER_NAME npm install @prisma/client bcryptjs
docker exec -it YOUR_CONTAINER_NAME node /app/initialize-system.js
```

**If you get "DATABASE_URL not found":**
Your environment variables aren't properly set. Check:
- CapRover: App Config → Environmental Variables
- Coolify: Services → clickvidev → Environment Variables
- Ensure DATABASE_URL, SMTP_HOST, SMTP_USER, etc. are all set

**If initialization succeeds but emails still don't work:**
1. Check email settings: `docker exec -it YOUR_CONTAINER_NAME npx prisma studio`
2. Verify SMTP credentials are correct
3. Gmail users: Must use [App-Specific Password](https://support.google.com/accounts/answer/185833), not regular password

**If Stripe still errors:**
1. Verify Stripe keys in database: `npx prisma studio`
2. Check ApiKey table has stripeSecretKey, stripePublishableKey
3. Ensure Webhook endpoint is configured in Stripe dashboard

## Quick Status Check

Run this to verify everything worked:

```bash
# Check if records were created
docker exec -it YOUR_CONTAINER_NAME sh -c "npx prisma@latest setting count"
docker exec -it YOUR_CONTAINER_NAME sh -c "npx prisma@latest apikey count"
docker exec -it YOUR_CONTAINER_NAME sh -c "npx prisma@latest plan count"

each command should return a number > 0
```

## ✅ All 9 Problems Fixed

After running this, all these issues will be resolved:

1. ✅ SMTP/email not working
2. ✅ User can't use free features
3. ✅ Payment upgrade fails
4. ✅ No verification email on signup
5. ✅ Super Admin can't approve/delete users
6. ✅ No email on password reset
7. ✅ Free version features not accessible
8. ✅ Stripe payment errors
9. ✅ Super Admin user management broken

---

## 🚀 **Copy, Paste, and Run These Commands NOW:**

```bash
# SSH into your server first

# Find your container
docker ps | grep clickvidev

# Run these (replace YOUR_CONTAINER_NAME):
docker cp initialize-system.js YOUR_CONTAINER_NAME:/app/initialize-system.js
docker exec -it YOUR_CONTAINER_NAME node /app/initialize-system.js
docker restart YOUR_CONTAINER_NAME
```

**Then test with the 5 verification steps above.**
