const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✓ Found .env file');
} else {
  console.log('✗ .env file not found');
  process.exit(1);
}

// Parse environment variables
const envVars = {};
const lines = envContent.split('\n');
lines.forEach(line => {
  const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (match) {
    const key = match[1];
    const value = match[2].replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

console.log('\n=== ENVIRONMENT VARIABLE VALIDATION ===\n');

const criticalVars = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'AUTH_SECRET',
  'AUTH_TRUST_HOST',
  'ADMIN_EMAILS'
];

let hasErrors = false;

criticalVars.forEach(key => {
  const value = envVars[key];
  if (!value || value.trim() === '') {
    console.log(`✗ ${key}: MISSING or empty`);
    hasErrors = true;
    
    // Provide suggestions for missing values
    if (key === 'NEXTAUTH_SECRET' || key === 'AUTH_SECRET') {
      const generatedSecret = crypto.randomBytes(32).toString('base64');
      console.log(`  → Generate with: ${key}="${generatedSecret}"`);
    } else if (key === 'DATABASE_URL') {
      console.log('  → Use: DATABASE_URL="postgresql://postgres:password@localhost:5432/clickvid"');
    } else if (key === 'NEXTAUTH_URL' || key === 'AUTH_URL') {
      console.log('  → Use: NEXTAUTH_URL="https://app.vyydecourt.site"');
    } else if (key === 'ADMIN_EMAILS') {
      console.log('  → Use: ADMIN_EMAILS="admin@vyydecourt.site"');
    }
  } else {
    console.log(`✓ ${key}: Set`);
    
    // Validate specific values
    if (key === 'DATABASE_URL') {
      if (value.includes('srv-captain--postgres')) {
        console.log('  ⚠ Warning: Using Docker service name. Ensure database is reachable.');
      }
      if (!value.startsWith('postgresql://')) {
        console.log('  ⚠ Warning: DATABASE_URL should start with postgresql://');
      }
    }
    
    if (key === 'NEXTAUTH_SECRET' || key === 'AUTH_SECRET') {
      if (value === 'your-secret-key-here' || value.length < 16) {
        console.log(`  ⚠ Warning: ${key} is weak or default. Generate a strong secret.`);
      }
    }
  }
});

// Check if database is reachable
console.log('\n=== DATABASE CONNECTION TEST ===\n');
if (envVars.DATABASE_URL) {
  console.log('Testing database connection...');
  const { execSync } = require('child_process');
  try {
    // Simple test using node
    const testScript = `
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.$connect()
        .then(() => {
          console.log('Connected successfully');
          process.exit(0);
        })
        .catch(e => {
          console.error('Connection failed:', e.message);
          process.exit(1);
        });
    `;
    execSync(`node -e "${testScript.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  } catch (e) {
    console.log('Database connection test failed.');
    console.log('Run: node scripts/fix-super-admin.js for detailed diagnostics.');
  }
}

console.log('\n=== RECOMMENDED ACTIONS ===\n');

if (hasErrors) {
  console.log('1. Update your .env file with missing variables');
  console.log('2. Generate strong secrets for NEXTAUTH_SECRET and AUTH_SECRET');
  console.log('3. Ensure DATABASE_URL points to a reachable PostgreSQL instance');
  console.log('4. Restart your application after making changes');
} else {
  console.log('All critical environment variables are set.');
  console.log('If super admin login still fails, check:');
  console.log('1. Database connectivity (run: node scripts/fix-super-admin.js)');
  console.log('2. Application logs for authentication errors');
  console.log('3. Browser console for client-side errors');
}

console.log('\nFor detailed database setup guide, see: DATABASE_CONNECTION_GUIDE.md');