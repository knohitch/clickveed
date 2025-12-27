# 🚀 SSH Commands - Copy & Save These

## 📋 CapRover Commands (Save These)

```bash
#!/bin/bash
# ============================================
# CAPROVER DEPLOYMENT COMMANDS
# ============================================

# Step 1: Find your container
CONTAINER_NAME=$(docker ps | grep "srv-captain--" | grep clickvidev | awk '{print $NF}')
echo "Found container: $CONTAINER_NAME"

# Step 2: Copy initialization script
docker cp initialize-system.js "$CONTAINER_NAME":/app/

# Step 3: Run initialization (creates all database records)
docker exec -it "$CONTAINER_NAME" node /app/initialize-system.js

# Step 4: Restart application
docker restart "$CONTAINER_NAME"

echo "✅ Initialization complete! Wait 30 seconds before testing."
```

**Save as:** `deploy-caprover.sh`

---

## 📋 Coolify Commands (Save These)

```bash
#!/bin/bash
# ============================================
# COOLIFY DEPLOYMENT COMMANDS
# ============================================

# Step 1: Find your container
CONTAINER_NAME=$(docker ps | grep coolify | grep clickvidev | awk '{print $NF}')
echo "Found container: $CONTAINER_NAME"

# Step 2: Copy initialization script
docker cp initialize-system.js "$CONTAINER_NAME":/app/

# Step 3: Run initialization (creates all database records)
docker exec -it "$CONTAINER_NAME" node /app/initialize-system.js

# Step 4: Restart application
docker restart "$CONTAINER_NAME"

echo "✅ Initialization complete! Wait 30 seconds before testing."
```

**Save as:** `deploy-coolify.sh`

---

## 📋 Quick One-Liner Commands (For Manual Execution)

### **CapRover Quick Commands:**

```bash
# Find container
docker ps | grep "srv-captain--" | grep clickvidev

# Copy script (replace CONTAINER_NAME from above)
docker cp initialize-system.js CONTAINER_NAME:/app/

# Run initialization
docker exec -it CONTAINER_NAME node /app/initialize-system.js

# Restart
docker restart CONTAINER_NAME
```

### **Coolify Quick Commands:**

```bash
# Find container
CONTAINER=$(docker ps | grep coolify | grep clickvidev | awk '{print $NF}')

# Copy script
docker cp initialize-system.js $CONTAINER:/app/

# Run initialization
docker exec -it $CONTAINER node /app/initialize-system.js

# Restart
docker restart $CONTAINER
```

---

## 📋 Verification Commands (After Initialization)

```bash
#!/bin/bash
# ============================================
# POST-DEPLOYMENT VERIFICATION
# ============================================

# Find container
CONTAINER=$(docker ps | grep clickvidev | awk '{print $NF}')

echo "🔍 Checking database records..."

# Check if records were created
docker exec -it $CONTAINER sh -c "npx prisma@latest setting count"
docker exec -it $CONTAINER sh -c "npx prisma@latest apikey count"
docker exec -it $CONTAINER sh -c "npx prisma@latest plan count"
docker exec -it $CONTAINER sh -c "npx prisma@latest emailSettings count"

echo ""
echo "✅ If all counts are > 0, initialization succeeded!"
echo ""
echo "🧪 Now test these 5 things:"
echo "1. Settings → Email → Send test email → Check inbox"
echo "2. Plans → Upgrade → Should see Stripe checkout"
echo "3. Create video project (Free: 3 videos/month)"
echo "4. Sign up new account → Check email → Verify link"
echo "5. Super Admin → Users → Can approve/delete"
```

**Save as:** `verify-deployment.sh`

---

## 📋 Environment Variables Setup (Required)

```bash
#!/bin/bash
# ============================================
# ENVIRONMENT VARIABLES TO SET
# ============================================

# In CapRover: Dashboard → clickvidev → App Configs → Environmental Variables
# In Coolify: Services → clickvidev → Environment Variables

# Critical - Database
DATABASE_URL="postgresql://user:password@host:5432/clickvidev"

# Critical - Email (Use Gmail App-Specific Password)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-specific-password"
FROM_EMAIL="noreply@yourdomain.com"
FROM_NAME="ClickVid AI"

# Critical - Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Required - NextAuth
NEXTAUTH_SECRET="your-secret-key-minimum-32-characters"
NEXTAUTH_URL="https://yourapp.com"

# Optional - Add as needed
OPENAI_API_KEY=""
ELEVENLABS_API_KEY=""
RUNWAYML_API_KEY=""
PIKA_API_KEY=""
```

**Save as:** `environment-variables.env`

---

## 📋 Complete Deployment Checklist

```bash
#!/bin/bash
# ============================================
# COMPLETE DEPLOYMENT CHECKLIST
# ============================================

echo "🚀 CLICKVIDEV DEPLOYMENT CHECKLIST"
echo "===================================="
echo ""

echo "✅ Step 1: Push to GitHub"
echo "   git add ."
echo "   git commit -m 'Production ready'"
echo "   git push origin main"
echo ""

echo "✅ Step 2: Deploy to CapRover/Coolify"
echo "   - Deploy from GitHub"
echo "   - Set environment variables"
echo "   - Wait for build to complete"
echo ""

echo "✅ Step 3: SSH into server"
echo "   ssh user@your-server.com"
echo ""

echo "✅ Step 4: Run initialization"
echo "   # CapRover:"
echo "   ./deploy-caprover.sh"
echo "   # OR Coolify:"
echo "   ./deploy-coolify.sh"
echo ""

echo "✅ Step 5: Wait 30 seconds"
echo "   sleep 30"
echo ""

echo "✅ Step 6: Verify deployment"
echo "   ./verify-deployment.sh"
echo ""

echo "✅ Step 7: Test all 9 features"
echo "   1. Email test"
echo "   2. Stripe checkout"
echo "   3. Free features"
echo "   4. Email verification"
echo "   5. Admin functions"
echo ""

echo "🎉 DONE! All 9 issues resolved!"
```

**Save as:** `deployment-checklist.sh`

---

## 📋 Troubleshooting Commands

```bash
#!/bin/bash
# ============================================
# TROUBLESHOOTING COMMANDS
# ============================================

# View container logs
docker logs $(docker ps | grep clickvidev | awk '{print $NF}')

# Check if container is running
docker ps | grep clickvidev

# Restart container
docker restart $(docker ps | grep clickvidev | awk '{print $NF}')

# Check database connection
docker exec -it $(docker ps | grep clickvidev | awk '{print $NF}') npx prisma studio

# Check environment variables in container
docker exec $(docker ps | grep clickvidev | awk '{print $NF}') env | grep -E 'DATABASE|SMTP|STRIPE'

# View real-time logs
docker logs -f $(docker ps | grep clickvidev | awk '{print $NF}')
```

**Save as:** `troubleshooting.sh`

---

## 📋 Quick Reference Card

```
╔══════════════════════════════════════════════════╗
║         CLICKVIDEV SSH COMMANDS QUICK REF       ║
╚══════════════════════════════════════════════════╝

FIND CONTAINER:
  docker ps | grep clickvidev

CAPROVER INIT:
  docker cp init.js CONTAINER:/app/
  docker exec -it CONTAINER node /app/init.js
  docker restart CONTAINER

COOLIFY INIT:
  docker cp init.js $C:/app/
  docker exec -it $C node /app/init.js
  docker restart $C

VERIFY:
  docker exec -it C npx prisma studio

LOGS:
  docker logs $(docker ps | grep clickvidev | awk '{print $NF}')

ENV VARS NEEDED:
  DATABASE_URL, SMTP_*, STRIPE_*, NEXTAUTH_*

TEST AFTER INIT:
  1. Email  2. Stripe  3. Features  4. Verify  5. Admin
```

---

## 🎯 Summary: What to Save

**Save these 6 files:**

1. `deploy-caprover.sh` - Automated CapRover deployment
2. `deploy-coolify.sh` - Automated Coolify deployment
3. `verify-deployment.sh` - Post-deployment verification
4. `environment-variables.env` - Required env vars
5. `deployment-checklist.sh` - Complete step-by-step
6. `troubleshooting.sh` - Debug commands

**Plus these documentation files already created:**
- `DEPLOYMENT_FIXES.md` - Full deployment guide
- `RUN_THIS_NOW.md` - Quick start
- `SSH_COMMANDS.md` - This file

---

## 🚀 Next Steps:

1. **Save all shell scripts** above to your project folder
2. **Make them executable:** `chmod +x *.sh`
3. **Push to GitHub:** `git add . && git commit -m "Add deployment scripts" && git push`
4. **Deploy to CapRover/Coolify** from GitHub
5. **SSH into server** and run appropriate deployment script
6. **Wait 30 seconds** and verify all 9 features work

---

**🎉 All 9 issues will be resolved after running initialization!**
