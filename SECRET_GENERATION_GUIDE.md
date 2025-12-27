# ClickVid Application Secret Generation Guide

## Overview

This guide explains how to generate secure secrets for the ClickVid application, specifically the `CRON_SECRET` and `NEXTAUTH_SECRET` environment variables. These secrets are critical for the security and proper functioning of your application.

## Why Secure Secrets Matter

- **NEXTAUTH_SECRET**: Secures NextAuth.js sessions, tokens, and encryption
- **CRON_SECRET**: Protects cron job endpoints from unauthorized access
- Weak or predictable secrets can lead to security vulnerabilities

## Methods for Generating Secrets

### Method 1: Using OpenSSL (Recommended)

#### Generate NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```
Example output:
```
A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6Z7a8B9c0D1e2F3g4H5i6J7k8L9m0N1o2P3q4R5s6T7u8V9w0X1y2Z3
```

#### Generate CRON_SECRET
```bash
openssl rand -base64 32
```
Example output:
```
Z9y8X7w6V5u4T3s2R1q0P9o8N7m6L5k4J3i2H1g0F9e8D7c6B5a4Z3y2x1W0v9U8t7S6r5Q4p3O2n1M0l9K8j7I6h5G4f3E2d1C0b9A8
```

### Method 2: Using Node.js Crypto

If you have Node.js installed:

#### Create a temporary script
```bash
cat > generate-secrets.js << 'EOF'
const crypto = require('crypto');

console.log('NEXTAUTH_SECRET:', crypto.randomBytes(32).toString('base64'));
console.log('CRON_SECRET:', crypto.randomBytes(32).toString('base64'));
EOF
```

#### Run the script
```bash
node generate-secrets.js
```

#### Clean up
```bash
rm generate-secrets.js
```

### Method 3: Using Online Generators (Use with Caution)

For quick generation, you can use online tools, but be aware of security considerations:

1. **NextAuth Secret Generator**: https://generate-secret.vercel.app/32
2. **Random String Generator**: https://www.random.org/strings/

**Security Note**: When using online generators, ensure you're using a secure connection and clear your browser history afterward.

### Method 4: Using Python

If you have Python installed:

```bash
python3 -c "import secrets; print('NEXTAUTH_SECRET:', secrets.token_urlsafe(32))"
python3 -c "import secrets; print('CRON_SECRET:', secrets.token_urlsafe(32))"
```

## Secret Requirements

### NEXTAUTH_SECRET
- **Length**: Minimum 32 characters (recommended)
- **Format**: Base64 encoded or URL-safe string
- **Complexity**: Should include a mix of uppercase, lowercase, numbers, and symbols
- **Uniqueness**: Must be unique to your application

### CRON_SECRET
- **Length**: Minimum 32 characters (recommended)
- **Format**: Base64 encoded or URL-safe string
- **Complexity**: Should include a mix of uppercase, lowercase, numbers, and symbols
- **Uniqueness**: Must be unique to your application

## Best Practices for Secret Management

### 1. Generate Fresh Secrets
- Always generate new secrets for each deployment
- Never reuse secrets between applications or environments
- If a secret might be compromised, generate a new one immediately

### 2. Store Secrets Securely
- Use Coolify's environment variables to store secrets
- Never commit secrets to version control
- Use a secrets management service for production environments

### 3. Secret Rotation
- Plan to rotate secrets periodically (e.g., every 6-12 months)
- Update secrets in a maintenance window to avoid service disruption
- Test secret rotation in a staging environment first

### 4. Documentation
- Keep a secure record of when secrets were generated
- Document the rotation schedule
- Note which services use which secrets

## Adding Secrets to Coolify

### Step 1: Generate Your Secrets
Use one of the methods above to generate both secrets.

### Step 2: Add to Coolify Environment Variables
1. Go to your ClickVid application in Coolify
2. Navigate to the "Environment" tab
3. Add the following variables:

| Variable | Value |
|----------|-------|
| `NEXTAUTH_SECRET` | [your-generated-nextauth-secret] |
| `CRON_SECRET` | [your-generated-cron-secret] |

### Step 3: Save and Deploy
1. Click "Save" to save the environment variables
2. Trigger a new deployment to apply the changes

## Verifying Secrets Work Correctly

### 1. Check Application Logs
After deployment, check the application logs for:
- Successful NextAuth.js initialization
- No authentication-related errors
- Cron jobs executing without authorization errors

### 2. Test Authentication
1. Try to log in to the application
2. Verify that sessions are created and maintained
3. Check that login persists across page refreshes

### 3. Test Cron Jobs
If your application has cron jobs:
1. Verify they execute on schedule
2. Check for any authorization errors in the logs

## Troubleshooting Secret Issues

### Invalid NEXTAUTH_SECRET
**Symptoms**:
- Authentication fails
- Users can't log in
- Sessions don't persist

**Solution**:
1. Generate a new NEXTAUTH_SECRET
2. Update the environment variable in Coolify
3. Redeploy the application

### Invalid CRON_SECRET
**Symptoms**:
- Cron jobs fail with authorization errors
- Scheduled tasks don't execute

**Solution**:
1. Generate a new CRON_SECRET
2. Update the environment variable in Coolify
3. Redeploy the application

### Secret Format Issues
**Symptoms**:
- Application fails to start
- Errors related to secret parsing

**Solution**:
1. Ensure secrets are properly formatted (Base64 or URL-safe)
2. Check for special characters that might need escaping
3. Regenerate secrets if necessary

## Security Considerations

### 1. Secret Entropy
- Use cryptographically secure random number generators
- Ensure secrets have sufficient entropy (randomness)
- Avoid predictable patterns or sequences

### 2. Secret Length
- Longer secrets are generally more secure
- Minimum 32 characters for both secrets
- Consider using 64 characters for enhanced security

### 3. Secret Complexity
- Include a mix of character types:
  - Uppercase letters (A-Z)
  - Lowercase letters (a-z)
  - Numbers (0-9)
  - Symbols (+, /, = for Base64)

### 4. Secret Storage
- Never store secrets in code
- Use environment variables or secure secret management
- Limit access to secrets to authorized personnel only

## Example Secrets (For Testing Only)

⚠️ **Warning**: These are examples only. Do not use these in production!

```
NEXTAUTH_SECRET=example-nextauth-secret-32-characters-minimum
CRON_SECRET=example-cron-secret-32-characters-minimum
```

## Automated Secret Generation Script

For convenience, here's a shell script that generates both secrets:

```bash
#!/bin/bash

echo "Generating secrets for ClickVid application..."
echo ""

# Generate NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
echo ""

# Generate CRON_SECRET
CRON_SECRET=$(openssl rand -base64 32)
echo "CRON_SECRET: $CRON_SECRET"
echo ""

# Create .env file (optional)
cat > .env.local << EOF
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
CRON_SECRET=$CRON_SECRET
EOF

echo "Secrets generated and saved to .env.local"
echo "Remember to add these to your Coolify environment variables!"
```

To use this script:
1. Save it as `generate-secrets.sh`
2. Make it executable: `chmod +x generate-secrets.sh`
3. Run it: `./generate-secrets.sh`
4. Copy the generated secrets to Coolify

## Conclusion

Generating secure secrets is a critical step in deploying the ClickVid application. Use the methods described above to create strong, unique secrets for both `NEXTAUTH_SECRET` and `CRON_SECRET`, then add them to your Coolify environment variables before deploying.

Remember to keep your secrets secure and rotate them periodically to maintain the security of your application.