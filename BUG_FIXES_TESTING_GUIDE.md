# Bug Fixes Testing Guide - Production Verification

This guide provides step-by-step instructions to verify that all 7 critical bugs have been successfully fixed in production.

---

## Overview of Fixes

The following bugs have been addressed in this deployment:

1. **Email verification link showing 'undefined' in URL**
2. **Email notification missing link after admin verification**
3. **Payment/upgrade error with generic error message**
4. **Stripe keys not saving/deleting properly**
5. **User dashboard menu buttons not working (video creation)**
6. **Plans/Billing upgrade not working after new Stripe keys**
7. **API functionality buttons not working on user side**

---

## Pre-Testing Setup

### 1. Environment Variables

Ensure the following environment variables are properly set in your production environment:

```bash
# IMPORTANT: Set your production domain
NEXTAUTH_URL="https://yourdomain.com"

# Database
DATABASE_URL="postgresql://..."

# Authentication
AUTH_SECRET="your-auth-secret"
NEXTAUTH_SECRET="your-nextauth-secret"

# Email (SMTP Configuration)
SMTP_HOST="your-smtp-host"
SMTP_PORT="587"
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
FROM_EMAIL="noreply@yourdomain.com"

# Stripe (Configure via Admin Panel)
# These can be set in the admin panel after deployment
```

**Critical Note:** If `NEXTAUTH_URL` is not set, the application will now fallback to:
- Request headers (recommended for reverse proxy setups)
- `VERCEL_URL` (for Vercel deployments)
- `http://localhost:3000` (development fallback)

---

## Testing Bug Fixes

### Bug #1: Email Verification Link

**What was fixed:**
- Email verification links previously showed "undefined/api/auth/verify-email?token=..."
- Now uses proper base URL from environment or request headers

**How to test:**

1. **Clear any test data:**
   ```sql
   -- Run this in your database if testing with existing users
   DELETE FROM "VerificationToken" WHERE identifier = 'test@example.com';
   DELETE FROM "User" WHERE email = 'test@example.com';
   ```

2. **Sign up a new user:**
   - Navigate to `/signup`
   - Create a new account with email `test@example.com`
   - Check the email inbox

3. **Verify the link:**
   - The verification email should contain a link like:
     ```
     https://yourdomain.com/api/auth/verify-email?token=abc123...
     ```
   - **NOT** `undefined/api/auth/verify-email?token=...`

4. **Click the verification link:**
   - Should redirect to login page with "verified=true" parameter
   - User status should change from "Pending" to "Active"
   - User can now log in successfully

**Expected Result:** ✅ Verification link contains correct domain and successfully verifies the account.

---

### Bug #2: Email Notification After Admin Verification

**What was fixed:**
- When admin manually verifies a user, email notification now includes proper login link
- Uses new "accountApproved" email template with clear messaging

**How to test:**

1. **Create a pending user:**
   - Sign up a new user account
   - Don't verify the email yet

2. **As Super Admin, manually approve the user:**
   - Log in as Super Admin
   - Navigate to `/chin/dashboard/users`
   - Find the pending user
   - Click "Approve" button

3. **Check the user's email:**
   - Should receive "Your Account Has Been Approved" email
   - Email should contain:
     - Clear approval message
     - Login link: `https://yourdomain.com/login`
     - **NOT** `undefined/login`

4. **Verify user can log in:**
   - User should be able to log in immediately
   - Should have full access to dashboard features

**Expected Result:** ✅ Approval email contains proper login link and user has full access.

---

### Bug #3 & #6: Payment/Upgrade Errors and Stripe Integration

**What was fixed:**
- Stripe checkout session URLs now use proper base URL
- Stripe key caching issue resolved (old keys no longer persist)
- Payment success/cancel URLs now correct

**How to test:**

1. **Update Stripe Keys (if needed):**
   - Log in as Super Admin
   - Navigate to `/chin/dashboard/api-integrations`
   - Enter new Stripe keys:
     - Publishable Key
     - Secret Key
     - Webhook Secret
   - Click "Save All Settings"

2. **Verify keys are saved:**
   - Refresh the page
   - Keys should be hidden but field should show "••••••••"
   - The new keys should be in use (not old cached keys)

3. **Test payment upgrade flow:**
   - Log in as a regular user (on Free plan)
   - Navigate to `/dashboard/settings/billing`
   - Select a paid plan (e.g., Professional, monthly)
   - Click "Upgrade" button
   - Click "Pay with Stripe" in the dialog

4. **Verify Stripe checkout:**
   - Should redirect to Stripe checkout page
   - Should NOT see generic error message
   - Complete or cancel the checkout
   - Success URL should be: `https://yourdomain.com/dashboard/settings/billing?payment_success=true`
   - Cancel URL should be: `https://yourdomain.com/dashboard/settings/billing`

5. **Complete a test payment:**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
   - Any ZIP code
   - Complete the payment

6. **Verify successful upgrade:**
   - Should redirect back to billing page
   - Should see success toast notification
   - User plan should update to the selected plan
   - Check Stripe dashboard for the subscription

**Expected Result:** ✅ Payment flow works without errors, URLs are correct, and subscription is created.

---

### Bug #4: Stripe Keys Persistence

**What was fixed:**
- Stripe instance cache is now invalidated when keys change
- Old keys no longer persist after updates

**How to test:**

1. **Set initial Stripe keys:**
   - Navigate to `/chin/dashboard/api-integrations`
   - Enter test Stripe keys
   - Save settings

2. **Test with initial keys:**
   - Create a checkout session (as per Bug #3 test)
   - Verify it works with the current keys

3. **Update to different Stripe keys:**
   - Go back to API integrations
   - Clear the current keys
   - Enter different Stripe keys (e.g., different test mode keys)
   - Save settings

4. **Immediately test with new keys:**
   - Without restarting the server
   - Create a new checkout session
   - Should use the NEW keys (not cached old keys)
   - Verify in Stripe dashboard that the session appears in the correct account

5. **Check server logs:**
   - Should see log messages:
     ```
     Stripe key changed, invalidating cached instance
     Creating new Stripe instance
     ```

**Expected Result:** ✅ New Stripe keys are used immediately without server restart.

---

### Bug #5 & #7: Dashboard Menu Navigation

**What was fixed:**
- Removed race condition in collapsible menu state management
- Simplified toggle logic
- Fixed click event propagation for menu items

**How to test:**

1. **Log in as a regular user:**
   - Navigate to `/dashboard`

2. **Test collapsible sections:**
   - Click on "AI Assistant" section header
     - Should expand/collapse smoothly
     - No console errors
   - Click on "Video Suite" section header
     - Should expand/collapse properly
   - Click on "Image Editing" section header
     - Should work correctly

3. **Test menu item navigation:**
   - Expand "Video Suite" section
   - Click on "Video Pipeline" menu item
     - Should navigate to `/dashboard/video-pipeline`
   - Click on "Script Generator" menu item
     - Should navigate to `/dashboard/video-suite/ai-script-generator`
   - Verify all menu items are clickable

4. **Test all sections:**
   - Go through each main section:
     - ✅ AI Assistant → All sub-items clickable
     - ✅ Video Suite → All sub-items clickable
     - ✅ Image Editing → All sub-items clickable
     - ✅ AI Agents → All sub-items clickable
     - ✅ Social Suite → All sub-items clickable
     - ✅ Media Management → All sub-items clickable

5. **Test active state highlighting:**
   - When on `/dashboard/video-suite/ai-script-generator`:
     - "Video Suite" section should be expanded
     - "Script Generator" item should be highlighted
   - When on a different page, active states should update correctly

**Expected Result:** ✅ All menu items are clickable and navigate correctly without errors.

---

### Bug #5 Specific: Video Creation

**What was fixed:**
- Dashboard navigation allows access to video creation tools
- Menu buttons for video creation are now functional

**How to test:**

1. **Access video creation tools:**
   - Navigate to `/dashboard/video-suite`
   - All 10 video tools should be displayed:
     1. Video Pipeline
     2. Video Editor
     3. Magic Clips Generator
     4. AI Script Generator
     5. AI Voice Over
     6. AI Image to Video
     7. AI Voice Cloning
     8. AI Video From URL
     9. AI Stock Media Generator
     10. AI Persona & Avatar Studio

2. **Click each tool card:**
   - Each should navigate to its respective page
   - No navigation errors

3. **Test video creation workflow:**
   - Click on "Magic Clips Generator"
   - Should load the video creation form
   - (Optionally) Test creating a video with Free tier limits

**Expected Result:** ✅ All video creation tools are accessible and functional.

---

### Bug #7 Specific: API Functionality

**What was fixed:**
- API functionality menu items are now clickable
- Navigation to API pages works correctly

**How to test:**

1. **As Super Admin:**
   - Navigate to `/chin/dashboard/api-docs`
   - Page should load showing API documentation links
   - All external links should work

2. **API Integrations page:**
   - Navigate to `/chin/dashboard/api-integrations`
   - Page should load with all API key categories
   - Can add/edit API keys
   - Save functionality works

3. **Test API key management:**
   - Add a test API key (e.g., OpenAI)
   - Save settings
   - Refresh page
   - Key should be saved (shown as ••••••••)

**Expected Result:** ✅ API pages load correctly and functionality works.

---

## Integration Testing Checklist

After verifying individual bug fixes, test complete user flows:

### Complete User Journey - Free Tier

- [ ] Sign up new account
- [ ] Receive and verify email
- [ ] Complete onboarding
- [ ] Navigate dashboard (all menu items work)
- [ ] Create a project
- [ ] Access video creation tools
- [ ] View billing page
- [ ] Attempt upgrade (test payment flow)

### Complete Admin Journey

- [ ] Log in as Super Admin
- [ ] Approve a pending user
- [ ] User receives approval email with correct link
- [ ] Update Stripe API keys
- [ ] Verify new keys are used immediately
- [ ] Create a new plan
- [ ] Test subscription flow with new plan

---

## Production Environment Checks

### 1. Environment Configuration

```bash
# Verify environment variables are set
echo $NEXTAUTH_URL
echo $DATABASE_URL
# Should show actual values, not "undefined"
```

### 2. Database Migration Status

```bash
# Check if migrations are applied
npx prisma migrate status
```

### 3. Health Checks

- [ ] Application loads at root URL
- [ ] Database connection is working
- [ ] SMTP email sending works
- [ ] Stripe API connection works (if keys configured)

### 4. Error Logging

Check application logs for:
- [ ] No "NEXTAUTH_URL is not set" errors
- [ ] No Stripe key errors
- [ ] No navigation errors
- [ ] No email sending errors

---

## Rollback Plan

If any issues are found:

1. **Identify the specific bug:**
   - Use the testing steps above to isolate the issue
   - Check server logs for errors

2. **Quick fixes:**
   - Ensure `NEXTAUTH_URL` is set correctly
   - Verify Stripe keys are valid
   - Check email SMTP configuration

3. **Full rollback (if necessary):**
   ```bash
   # Revert to previous git commit
   git revert HEAD
   git push origin main

   # Or checkout previous working commit
   git checkout <previous-commit-hash>
   git push origin main --force
   ```

---

## Success Criteria

All bug fixes are considered successful when:

1. ✅ Email verification links contain proper domain
2. ✅ Admin approval emails contain correct login links
3. ✅ Payment/upgrade flow works without errors
4. ✅ Stripe keys update without server restart
5. ✅ All dashboard menu items are clickable
6. ✅ Video creation tools are accessible
7. ✅ API functionality pages work correctly

---

## Additional Notes

### Monitoring Recommendations

1. **Set up error tracking:**
   - Sentry, LogRocket, or similar
   - Monitor for undefined URL errors
   - Track Stripe API errors

2. **User feedback:**
   - Monitor support tickets for navigation issues
   - Check for email delivery complaints
   - Watch for payment failures

3. **Logs to watch:**
   - Stripe cache invalidation logs
   - Email sending logs
   - Navigation/routing errors

### Performance Considerations

The fixes include:
- Smart caching for Stripe instances (recreates only when keys change)
- Efficient navigation state management
- Proper URL construction without unnecessary lookups

No performance degradation is expected from these fixes.

---

## Contact & Support

If you encounter any issues during testing:
1. Check server logs first
2. Verify environment variables
3. Ensure database migrations are applied
4. Review this testing guide for missed steps

For deployment-specific issues, refer to:
- `DEPLOYMENT_GUIDE.md`
- `COOLIFY_DEPLOYMENT_GUIDE.md`
- `CAPROVER_STEPS.txt`
