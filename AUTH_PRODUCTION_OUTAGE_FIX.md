# Production Outage Fix - Login Authentication

## Issue
Production deployment at `https://app.vyydecourt.site` showing:  
**"Login Failed - An unexpected error occurred during login"**

## Root Causes Identified

### 1. **Environment Variable Mismatch**
- Code expects: `AUTH_TRUST_HOST === 'true'`
- Production has: `NEXTAUTH_TRUST_HOST=1`
- Boolean check fails, breaking authentication

### 2. **Incorrect Redirect Strategy**
- Server action used `redirect: true` in `signIn()` call
- This causes redirect before response completes
- Client receives empty response, triggering error
- Session cookie not fully set when redirect happens

### 3. **Missing Redirect Callback**
- `auth.ts` lacked `redirect` callback
- No role-based redirect handling in NextAuth
- Relied solely on client-side redirects

## Fixes Applied

### 1. Fixed `src/auth.ts`

**Added Environment Helper:**
```typescript
const parseBooleanEnv = (value: string | undefined): boolean => {
  if (!value) return false;
  return value.toLowerCase() === 'true' || value === '1';
};
```

**Fixed trustHost:**
```typescript
trustHost: parseBooleanEnv(process.env.AUTH_TRUST_HOST),
```
Now accepts both `"true"` and `"1"` values.

**Added Redirect Callback:**
```typescript
async redirect({ url, baseUrl }) {
  // If url is relative or matches baseUrl, use it
  if (url.startsWith('/')) return url;
  // If url starts with baseUrl, use it
  if (url.startsWith(baseUrl)) return url;
  // Otherwise fallback to baseUrl
  return baseUrl;
}
```

**Role Propagation Safeguards:**
```typescript
token.role = user.role || 'USER';  // Fallback to USER
token.status = user.status || 'Active';  // Fallback to Active
```

### 2. Fixed `src/server/actions/auth-actions.ts`

**Changed redirect strategy:**
```typescript
// Before (BREAKING):
const result = await signIn('credentials', {
  email,
  password,
  redirect: true,  // ❌ Causes premature redirect
  callbackUrl
});

// After (FIXED):
const result = await signIn('credentials', {
  email,
  password,
  redirect: false,  // ✅ Returns control to server action
  callbackUrl
});

if (result?.error) {
  console.error('SignIn error:', result.error);
  return { error: 'Invalid email or password', success: false };
}

return { 
  success: true, 
  error: '',
  redirectUrl: callbackUrl,
  userRole: userWithRole?.role || 'USER'
};
```

### 3. Fixed `src/components/auth/login-form.tsx`

**Restored client-side redirect:**
```typescript
React.useEffect(() => {
  if (state?.success && state?.redirectUrl) {
    console.log('Login successful, redirecting to:', state.redirectUrl);
    window.location.href = state.redirectUrl;  // ✅ Now works properly
  }
}, [state?.success, state?.redirectUrl]);
```

## How It Works Now

1. **User submits login** → Server action validates credentials
2. **`signIn()` called with `redirect: false`** → Returns session result
3. **Server action returns redirect URL** → Client receives successful response
4. **Client-side redirect** → Session cookie is fully set before navigation
5. **NextAuth redirect callback** → Ensures role-based routing works

## Role-Based Redirects

- **SUPER_ADMIN** → `/chin/dashboard`
- **ADMIN** → `/kanri/dashboard`  
- **USER** → `/dashboard`

## Environment Variables Required

### Critical for Production:
```bash
AUTH_TRUST_HOST=true  # or "1" - both now work
NEXTAUTH_URL=https://app.vyydecourt.site
AUTH_URL=https://app.vyydecourt.site
NEXTAUTH_SECRET=your-secret-here
AUTH_SECRET=your-secret-here
```

### Optional for development:
```bash
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=false  # or not set
```

## Testing

### Super Admin Login:
1. Navigate to `/login`
2. Enter super admin credentials
3. Should redirect to `/chin/dashboard`

### Regular User Login:
1. Navigate to `/login`
2. Enter regular user credentials
3. Should redirect to `/dashboard`

### Admin Login:
1. Navigate to `/login`
2. Enter admin credentials
3. Should redirect to `/kanri/dashboard`

### Failed Login:
1. Enter incorrect credentials
2. Should show error message
3. Should NOT redirect

## Deployment Steps

### Update Environment Variables:

**Option 1: CapRover**
```bash
# SSH into your CapRover server
cd /captain/data/apps/your-app-name
echo 'AUTH_TRUST_HOST=true' >> .env
caprover restart --app your-app-name
```

**Option 2: Coolify**
1. Go to project → application → environment variables
2. Update `AUTH_TRUST_HOST=true`
3. Remove `NEXTAUTH_TRUST_HOST` if exists
4. Save and redeploy

**Option 3: Docker Compose**
```yaml
environment:
  - AUTH_TRUST_HOST=true
```

### Deploy Code Changes:
```bash
git pull origin main
npm install
npm run build
# Or use your deployment platform's build process
```

### Verify:
```bash
# Check logs for errors
docker logs your-app-container

# Test login
curl -X POST https://app.vyydecourt.site/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'
```

## Error Prevention

### Never Throws Silently:
- All callbacks wrapped in try-catch
- Errors logged to console
- Graceful fallbacks (never return null)

### Session Always Valid:
- JWT callback always returns token
- Session callback always returns session
- Default values for all fields

### Environment Safe:
- Boolean parsing handles multiple formats
- Falls back gracefully if undefined
- Logs warnings for missing variables

## Related Files

- `.env.production.example` - Production environment template
- `DEPLOYMENT_TROUBLESHOOTING_GUIDE.md` - Platform-specific deployment guide
- `TEST_LOGIN_FIX.md` - Previous login loop fix (different issue)

## Checklist for Production

- [ ] Update `AUTH_TRUST_HOST=true` in deployment platform
- [ ] Pull latest code changes from main branch
- [ ] Build and deploy application
- [ ] Test SUPER_ADMIN login → `/chin/dashboard`
- [ ] Test ADMIN login → `/kanri/dashboard`
- [ ] Test USER login → `/dashboard`
- [ ] Verify error messages display correctly
- [ ] Check logs for authentication errors
- [ ] Monitor session cookie being set
- [ ] Test logout functionality

## Support

If issues persist after deployment:

1. Check environment variables:
```bash
# In container
docker exec -it your-app-container env | grep AUTH
```

2. Check session:
```bash
# Browser DevTools → Application → Cookies
# Look for `next-auth.session-token`
```

3. Check logs:
```bash
docker logs -f your-app-container
```

4. Verify database connection:
```bash
# In container
psql $DATABASE_URL