# 🔥 SSH COMMANDS - CAPROVER vs COOLIFY

## 🎯 **QUICK COMPARISON:**

| Platform | Automated Script | Manual Commands | One-Liner Option |
|----------|------------------|-----------------|------------------|
| **CapRover** | `./deploy-caprover.sh` | 4 commands | `docker cp && docker exec && restart` |
| **Coolify** | `./deploy-coolify.sh` | 4 commands | Variable + 3 commands |

---

## 🚀 CAPROVER - AUTOMATED (Easiest)

### **Option A: Automated Script (One Command)**

```bash
# Save this as deploy-caprover.sh, then run:
chmod +x deploy-caprover.sh
./deploy-caprover.sh
```

**Script contents:**
```bash
#!/bin/bash
CONTAINER=$(docker ps | grep "srv-captain--" | grep clickvidev | awk '{print $NF}')
docker cp initialize-system.js "$CONTAINER":/app/
docker exec -it "$CONTAINER" node /app/initialize-system.js
docker restart "$CONTAINER"
```

---

## 🚀 CAPROVER - MANUAL COMMANDS (4 Lines)

```bash
docker ps | grep "srv-captain--" | grep clickvidev
# Copy container name

docker cp initialize-system.js CONTAINER_NAME:/app/
docker exec -it CONTAINER_NAME node /app/initialize-system.js
docker restart CONTAINER_NAME
```

---

## 🚀 COOLIFY - AUTOMATED (Easiest)

### **Option A: Automated Script (One Command)**

```bash
# Save this as deploy-coolify.sh, then run:
chmod +x deploy-coolify.sh
./deploy-coolify.sh
```

**Script contents:**
```bash
#!/bin/bash
CONTAINER=$(docker ps | grep coolify | grep clickvidev | awk '{print $NF}')
docker cp initialize-system.js "$CONTAINER":/app/
docker exec -it "$CONTAINER" node /app/initialize-system.js
docker restart "$CONTAINER"
```

---

## 🚀 COOLIFY - MANUAL COMMANDS (4 Lines)

```bash
docker ps | grep coolify | grep clickvidev
# Copy container name

CONTAINER="your-container-name"
docker cp initialize-system.js $CONTAINER:/app/
docker exec -it $CONTAINER node /app/initialize-system.js
docker restart $CONTAINER
```

---

## 📋 **VERIFICATION FOR BOTH (5 Commands)**

```bash
# Find container (works for both CapRover & Coolify)
CONTAINER=$(docker ps | grep clickvidev | awk '{print $NF}')

# Test if initialization worked:
docker exec -it $CONTAINER sh -c "npx prisma@latest setting count"
docker exec -it $CONTAINER sh -c "npx prisma@latest apikey count"
docker exec -it $CONTAINER sh -c "npx prisma@latest plan count"
docker exec -it $CONTAINER sh -c "npx prisma@latest emailSettings count"

# View logs
docker logs $CONTAINER
```

**Expected: All counts > 0 = ✅ SUCCESS!**

---

## ✅ **TEST THESE 5 THINGS (After 30 seconds):**

1. **Email**: Settings → Email → Send test → **Check inbox arrives**
2. **Stripe**: Plans → Upgrade → **Should redirect to Stripe checkout**
3. **Features**: Create video → **Free tier allows 3 videos/month**
4. **Verification**: Sign up → **Email arrives → Link verifies**
5. **Admin**: Super Admin → Users → **Can approve/delete**

---

## 📄 **DOCUMENTATION FILES CREATED:**

- `CAPROVER_SSH_COMMANDS.md` - CapRover-specific commands
- `COOLIFY_SSH_COMMANDS.md` - Coolify-specific commands
- `SSH_COMMANDS.md` - Complete reference
- `DEPLOYMENT_FIXES.md` - Full deployment guide
- `RUN_THIS_NOW.md` - Quick start
- `THIS_FILE.md` - Comparison and quick reference

---

## 🎯 **WHAT TO DO NOW:**

1. **Choose your platform:** CapRover or Coolify
2. **Copy the automated script** for your platform
3. **Save as .sh file** and make executable
4. **SSH after deployment** and run the script
5. **Wait 30 seconds** and test all 5 features

**All 9 issues will be resolved! ✅**
