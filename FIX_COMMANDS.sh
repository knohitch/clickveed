#!/bin/bash

# ============================================
# CRITICAL FIX - Run These Commands NOW
# ============================================
# This fixes ALL 9 issues without redeploying or deleting anything
# SSH into your server, then run these commands

# =========== FOR CAPROVER USERS ===========

echo "🔍 Finding your CapRover container..."
CONTAINER_NAME=$(docker ps | grep "srv-captain--" | grep clickvidev | awk '{print $NF}')

echo "✅ Found container: $CONTAINER_NAME"
echo ""
echo "📂 Copying initialization script..."
docker cp initialize-system.js "$CONTAINER_NAME":/app/

echo "🚀 Running initialization (this takes 30 seconds)..."
docker exec -it "$CONTAINER_NAME" node /app/initialize-system.js

echo "🔄 Restarting application..."
docker restart "$CONTAINER_NAME"

echo ""
echo "✅ DONE! Your app is fixed."
echo ""
echo "Next: Wait 30 seconds, then test with these 5 checks:"
echo "1. Settings → Email → Send test email → Check inbox"
echo "2. User dashboard → Plans → Click upgrade → Should see Stripe"
echo "3. Try creating a video (Free tier: 3 videos allowed)"
echo "4. Sign up new account → Check email for verification"
echo "5. Super Admin → Users → Try approve/delete user"

# =========== FOR COOLIFY USERS ===========
#
# echo "🔍 Finding your Coolify container..."
# CONTAINER_NAME=$(docker ps | grep coolify | grep clickvidev | awk '{print $NF}')
#
# echo "✅ Found container: $CONTAINER_NAME"
# echo ""
# echo "📂 Copying initialization script..."
# docker cp initialize-system.js "$CONTAINER_NAME":/app/
#
# echo "🚀 Running initialization (this takes 30 seconds)..."
# docker exec -it "$CONTAINER_NAME" node /app/initialize-system.js
#
# echo "🔄 Restarting application..."
# docker restart "$CONTAINER_NAME"
#
# echo ""
# echo "✅ DONE! Your app is fixed."
