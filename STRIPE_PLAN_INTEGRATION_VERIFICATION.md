# Stripe Plan Integration Verification Guide

## Current Integration Status

The Stripe plan integration has been implemented with the following components:

### 1. Plan Management UI (Enhanced)
- **Location**: `/chin/dashboard/plans`
- **Features**: Individual feature CRUD operations (add, edit, delete)
- **Stripe Fields**: Monthly, Quarterly, Yearly Price ID inputs
- **Validation**: Plan form requires Stripe Price IDs for paid plans

### 2. Stripe Checkout Flow
- **Endpoint**: `/api/stripe/create-checkout-session`
- **Logic**: 
  - Validates user authentication
  - Checks plan exists and has Stripe Price ID for selected billing cycle
  - Creates/retrieves Stripe customer
  - Generates checkout session with metadata (userId, planId, priceId)

### 3. Stripe Webhook Handler
- **Endpoint**: `/api/stripe/webhook`
- **Events Handled**:
  - `checkout.session.completed`: Updates user with planId from metadata
  - `customer.subscription.updated`: Matches stripePriceId to plan and updates user
  - `customer.subscription.deleted`: Downgrades user to "Creator" plan

### 4. Plan Feature Access System
- **Database**: PlanFeature table stores features per plan
- **Access Control**: Feature access is checked via `checkFeatureAccess` based on:
  1. Database-configured plan features (priority)
  2. Plan featureTier fallback
  3. Plan name fallback

## Critical Checks Required

### ✅ Working Components (Confirmed)
1. **UI for plan management** - Enhanced with individual feature CRUD
2. **Stripe Price ID storage** - Fields exist in Plan model
3. **Checkout session creation** - Validates Price IDs exist
4. **Webhook plan matching** - Maps stripePriceId to planId

### ⚠️ Issues to Address

#### 1. Database Connectivity (Production)
- **Problem**: `srv-captain--postgres:5432` unreachable from local development
- **Impact**: Cannot test Stripe integration locally
- **Solution**: Use production environment or local Docker setup

#### 2. Plan Assignment Verification
- **Check**: When user pays, does `planId` get correctly assigned?
- **Current Logic**: Webhook uses metadata.planId from checkout session
- **Risk**: If metadata missing, plan assignment fails

#### 3. Feature Access After Payment
- **Check**: Do users immediately get feature access after payment?
- **Current**: Yes, via `upsertUser` in webhook

#### 4. Stripe Price ID Management
- **Best Practice**: Each Stripe Price ID should be unique across plans
- **Current**: Duplicate detection exists but needs enforcement

## Testing Procedures

### Test 1: Plan Creation with Stripe IDs
1. Navigate to `/chin/dashboard/plans`
2. Create/edit a plan with:
   - Valid Stripe Price IDs (from Stripe Dashboard → Products → Pricing)
   - Multiple features using the enhanced UI
3. Save plan

### Test 2: Checkout Flow Simulation
1. User selects plan with billing cycle
2. System validates Stripe Price ID exists
3. Creates checkout session
4. User completes payment

### Test 3: Webhook Plan Assignment
1. Stripe sends `checkout.session.completed` webhook
2. Webhook extracts `metadata.planId`
3. Calls `upsertUser` with correct planId
4. User record updated with new plan

### Test 4: Feature Access Verification
1. After payment, user tries to access premium feature
2. `checkFeatureAccess` checks user's plan features
3. Access granted if feature in plan's feature list

## Common Issues & Solutions

### Issue: "Stripe Price ID not found" error
**Cause**: Plan saved without Stripe Price IDs
**Fix**: 
1. Edit plan in admin panel
2. Add Stripe Price IDs from Stripe Dashboard
3. Save plan

### Issue: User not getting plan after payment
**Cause**: Webhook not configured or metadata missing
**Fix**:
1. Check Stripe webhook endpoint is reachable
2. Verify metadata includes `planId` in checkout session
3. Check database connectivity

### Issue: Duplicate features in plan
**Cause**: Previous textarea-based input allowed duplicates
**Fix**: Use enhanced UI which prevents duplicates visually

### Issue: Feature access not working
**Cause**: Plan has no features configured
**Fix**:
1. Edit plan in admin panel
2. Add features using "Add Feature" button
3. Save plan

## Production Deployment Checklist

### Before Deployment
- [ ] Stripe API keys configured in admin settings
- [ ] Webhook endpoint registered in Stripe Dashboard
- [ ] All plans have valid Stripe Price IDs
- [ ] Each plan has features configured
- [ ] Database connectivity verified

### After Deployment
- [ ] Test checkout with sandbox mode
- [ ] Verify webhook receipt in Stripe logs
- [ ] Confirm user plan assignment
- [ ] Test feature access for paid users

## Monitoring & Debugging

### Key Logs to Check
1. **Checkout errors**: `/api/stripe/create-checkout-session` logs
2. **Webhook errors**: `/api/stripe/webhook` logs  
3. **Plan assignment**: `upsertUser` function logs
4. **Feature access**: `checkFeatureAccess` logs

### Database Queries for Verification
```sql
-- Check plan configurations
SELECT name, stripePriceIdMonthly, stripePriceIdQuarterly, stripePriceIdYearly 
FROM "Plan" 
ORDER BY priceMonthly;

-- Check user plan assignments
SELECT u.email, p.name as plan_name, u.stripeSubscriptionStatus
FROM "User" u
LEFT JOIN "Plan" p ON u."planId" = p.id
WHERE u."stripeSubscriptionId" IS NOT NULL;

-- Check plan features
SELECT p.name, COUNT(pf.id) as feature_count
FROM "Plan" p
LEFT JOIN "PlanFeature" pf ON p.id = pf."planId"
GROUP BY p.name
ORDER BY feature_count DESC;
```

## Conclusion

The Stripe integration is architecturally sound with proper:
1. **Data flow**: UI → Database → Checkout → Webhook → User update
2. **Error handling**: Validation at each step
3. **Feature management**: Enhanced UI for admin control

**Primary dependency**: Database connectivity for production environment. Once database is accessible, the integration should work as designed.

**Next steps**: 
1. Ensure production database is running
2. Configure Stripe webhook endpoint
3. Test end-to-end payment flow
4. Monitor user plan assignments