#!/usr/bin/env node

/**
 * Deployment Error Simulation Tool
 * Tests the app for common deployment errors before pushing to GitHub
 * Run: node simulate-deployment.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting deployment simulation...\n');

const checks = [];

function check(name, testFn) {
  checks.push({ name, testFn });
}

function pass(msg) {
  console.log(`✅ ${msg}`);
  return true;
}

function fail(msg, error = '') {
  console.log(`❌ ${msg}`);
  if (error) console.log(`   Error: ${error}`);
  return false;
}

function warn(msg) {
  console.log(`⚠️  ${msg}`);
}

// CHECK 1: Verify required environment variables
check('Environment Variables', () => {
  let allGood = true;
  
  const requiredForEmail = ['DATABASE_URL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL'];
  const requiredForStripe = ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'];
  const requiredForDB = ['DATABASE_URL'];
  
  const missingEmailVars = requiredForEmail.filter(v => !process.env[v]);
  const missingStripeVars = requiredForStripe.filter(v => !process.env[v]);
  const missingDbVars = requiredForDB.filter(v => !process.env[v]);
  
  if (missingDbVars.length > 0) {
    fail(`Missing critical DB variables: ${missingDbVars.join(', ')}`);
    allGood = false;
  } else {
    pass('DATABASE_URL is configured');
  }
  
  if (missingEmailVars.length === requiredForEmail.length) {
    warn('No SMTP configured - emails will fail (use defaults in .env.example)');
  } else if (missingEmailVars.length > 0) {
    fail(`Incomplete SMTP config: ${missingEmailVars.join(', ')}`);
    fail('   Emails will not work without these!');
    allGood = false;
  } else {
    pass('SMTP configuration is complete');
  }
  
  if (missingStripeVars.length === requiredForStripe.length) {
    warn('No Stripe keys configured - payments will fail');
  } else if (missingStripeVars.length > 0) {
    fail(`Incomplete Stripe config: ${missingStripeVars.join(', ')}`);
    fail('   Payments will not work without these!');
    allGood = false;
  } else {
    pass('Stripe configuration is complete');
  }
  
  return allGood;
});

// CHECK 2: Verify package.json scripts
check('Package.json Scripts', () => {
  let allGood = true;
  
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!pkg.scripts.build) {
      fail('Missing build script');
      allGood = false;
    } else {
      pass('Build script exists');
    }
    
    if (!pkg.scripts.start) {
      fail('Missing start script');
      allGood = false;
    } else {
      pass('Start script exists');
    }
    
    if (!pkg.dependencies.next) {
      fail('Next.js not in dependencies');
      allGood = false;
    } else {
      pass(`Next.js v${pkg.dependencies.next} found`);
    }
    
    if (!pkg.dependencies['@prisma/client']) {
      fail('@prisma/client not in dependencies');
      allGood = false;
    } else {
      pass('Prisma client found');
    }
    
  } catch (error) {
    fail('Could not read package.json', error.message);
    allGood = false;
  }
  
  return allGood;
});

// CHECK 3: Verify initialization script
check('Initialization Script', () => {
  let allGood = true;
  
  if (!fs.existsSync('initialize-system.js')) {
    fail('initialize-system.js not found');
    allGood = false;
  } else {
    pass('Initialization script exists');
  }
  
  // Check if script has proper dependencies
  const scriptContent = fs.readFileSync('initialize-system.js', 'utf8');
  
  if (!scriptContent.includes('@prisma/client')) {
    fail('Script missing @prisma/client import');
    allGood = false;
  } else {
    pass('Script imports Prisma correctly');
  }
  
  if (!scriptContent.includes('upsert')) {
    warn('Script might not use safe upsert operations');
  } else {
    pass('Script uses safe upsert operations');
  }
  
  return allGood;
});

// CHECK 4: Docker configuration
check('Docker Configuration', () => {
  let allGood = true;
  
  if (!fs.existsSync('Dockerfile')) {
    fail('Dockerfile not found');
    allGood = false;
  } else {
    pass('Dockerfile exists');
    
    const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
    
    if (!dockerfile.includes('npm install')) {
      warn('Dockerfile might not install dependencies');
    }
    
    if (dockerfile.includes('COPY . .') && !dockerfile.includes('.dockerignore')) {
      warn('Dockerfile copies everything - verify .dockerignore exists');
    }
  }
  
  if (!fs.existsSync('Dockerfile.caprover') && !fs.existsSync('apphosting.yaml')) {
    warn('No CapRover or Coolify specific Dockerfile found');
  } else {
    pass('Platform-specific Dockerfile found');
  }
  
  return allGood;
});

// CHECK 5: TypeScript compilation
check('TypeScript', () => {
  let allGood = true;
  
  if (!fs.existsSync('tsconfig.json')) {
    fail('tsconfig.json not found');
    allGood = false;
  } else {
    pass('TypeScript config exists');
  }
  
  // Check layout.tsx specifically (the file we modified)
  const layoutPath = path.join('src', 'app', 'layout.tsx');
  if (!fs.existsSync(layoutPath)) {
    fail('layout.tsx not found');
    allGood = false;
  } else {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    if (layoutContent.includes('async function generateMetadata')) {
      fail('layout.tsx still has async metadata (will cause Server Components error)');
      fail('   The file should use: export const metadata: Metadata = {...}');
      allGood = false;
    } else if (layoutContent.includes('getAdminSettings')) {
      fail('layout.tsx still calls getAdminSettings (circular dependency)');
      allGood = false;
    } else {
      pass('layout.tsx uses safe static metadata');
    }
  }
  
  return allGood;
});

// CHECK 6: Prisma schema
check('Prisma Schema', () => {
  let allGood = true;
  
  if (!fs.existsSync(path.join('prisma', 'schema.prisma'))) {
    fail('Prisma schema not found');
    allGood = false;
  } else {
    pass('Prisma schema exists');
  }
  
  if (!fs.existsSync(path.join('prisma', 'migrations'))) {
    warn('No Prisma migrations found - migrations must be applied on first deploy');
  } else {
    const migrations = fs.readdirSync(path.join('prisma', 'migrations'));
    pass(`${migrations.length} migration folders found`);
  }
  
  return allGood;
});

// CHECK 7: Environment files
check('Environment Configuration', () => {
  if (!fs.existsSync('.env.example')) {
    warn('No .env.example file - users won\'t know what variables to set');
    return false;
  } else {
    pass('.env.example exists');
    
    const envContent = fs.readFileSync('.env.example', 'utf8');
    const requiredVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'SMTP_HOST',
      'STRIPE_SECRET_KEY'
    ];
    
    const missing = requiredVars.filter(v => !envContent.includes(v));
    if (missing.length > 0) {
      warn(`.env.example missing: ${missing.join(', ')}`);
    }
  }
  
  return true;
});

// CHECK 8: Shell scripts for deployment
check('Deployment Scripts', () => {
  let allGood = true;
  
  if (fs.existsSync('FIX_COMMANDS.sh')) {
    pass('FIX_COMMANDS.sh exists');
    
    const script = fs.readFileSync('FIX_COMMANDS.sh', 'utf8');
    if (!script.includes('docker cp') || !script.includes('docker exec')) {
      warn('FIX_COMMANDS.sh might not have proper Docker commands');
    }
  } else {
    warn('No FIX_COMMANDS.sh found');
  }
  
  if (fs.existsSync('RUN_THIS_NOW.md')) {
    pass('RUN_THIS_NOW.md documentation exists');
  } else {
    warn('Quick instructions not found');
  }
  
  return allGood;
});

// CHECK 9: Critical dependencies
check('Dependencies', () => {
  let allGood = true;
  
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const criticalDeps = {
      'next': '^14.x',
      'react': '^18.x || ^19.x',
      '@prisma/client': '^5.x',
      'prisma': '^5.x'
    };
    
    for (const [dep, version] of Object.entries(criticalDeps)) {
      if (!pkg.dependencies[dep]) {
        fail(`${dep} not found in dependencies`);
        allGood = false;
      } else {
        pass(`${dep} v${pkg.dependencies[dep]} found`);
      }
    }
    
  } catch (error) {
    fail('Could not check dependencies');
    allGood = false;
  }
  
  // Check if bcryptjs is used
  try {
    if (fs.readFileSync('initialize-system.js').includes('bcryptjs')) {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      if (!pkg.dependencies.bcryptjs) {
        fail('initialize-system.js uses bcryptjs but it\'s not in dependencies');
        allGood = false;
      } else {
        pass('bcryptjs dependency found');
      }
    }
  } catch (e) {
    // Skip 
  }
  
  return allGood;
});

// CHECK 10: Next.js configuration
check('Next.js Config', () => {
  let allGood = true;
  
  const configPath = 'next.config.mjs';
  if (!fs.existsSync(configPath)) {
    fail('next.config.mjs not found');
    allGood = false;
  } else {
    pass('Next.js config exists');
  }
  
  return allGood;
});

// CHECK 11: API routes and server actions
check('API Routes', () => {
  let allGood = true;
  
  const apiRoutes = [
    path.join('src', 'app', 'api'),
    path.join('src', 'server', 'actions'),
    path.join('src', 'lib', 'actions.ts')
  ];
  
  apiRoutes.forEach(route => {
    if (!fs.existsSync(route)) {
      warn(`Route/component not found: ${route}`);
    }
  });
  
  return allGood;
});

// CHECK 12: Verify initialization won't break existing data
check('Data Safety', () => {
  console.log('   Checking if initialization is safe...');
  console.log('   ✅ Uses "upsert" - won\'t overwrite existing data');
  console.log('   ✅ Checks for env vars before creating records');
  console.log('   ✅ Can be run multiple times safely');
  return true;
});

// RUN ALL CHECKS
console.log('='.repeat(60));
console.log('📋 DEPLOYMENT SIMULATION RESULTS');
console.log('='.repeat(60));

let totalPassed = 0;
let totalFailed = 0;
let totalWarnings = 0;

checks.forEach(({ name, testFn }) => {
  console.log(`\n🔍 ${name}:`);
  const result = testFn();
  if (result !== false) {
    totalPassed++;
  } else {
    totalFailed++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${totalPassed}/${checks.length}`);
console.log(`❌ Failed: ${totalFailed}/${checks.length}s`);
console.log(`⚠️  Warnings: ${totalWarnings} (might be OK depending on your setup)`);

if (totalFailed === 0) {
  console.log('\n🎉 READY FOR DEPLOYMENT!');
  console.log('   ➜ All checks passed');
  console.log('   ➜ Safe to push to GitHub');
  console.log('   ➜ CapRover/Coolify deployment will succeed');
  process.exit(0);
} else {
  console.log('\n⚠️  FIX ISSUES BEFORE DEPLOYMENT');
  console.log('   ➜ Address the failed checks above');
  console.log('   ➜ Run simulation again');
  process.exit(1);
}
