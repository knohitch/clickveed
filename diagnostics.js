const fs = require('fs');
const path = require('path');

console.log('=== DEPLOYMENT DIAGNOSTICS FOR CAPROVER & COOLIFY ===\n');

// Test 1: Check startup.sh
console.log('Test 1: Checking startup.sh...');
if (fs.existsSync('startup.sh')) {
  console.log('✓ startup.sh exists');
  const content = fs.readFileSync('startup.sh', 'utf8');
  if (content.includes('.next/standalone/server.js')) {
    console.log('✓ startup.sh has correct Next.js standalone path');
  } else {
    console.log('✗ startup.sh missing correct Next.js standalone path');
  }
  if (content.includes('[ -f "server.js" ]')) {
    console.log('✓ startup.sh has server.js fallback logic');
  } else {
    console.log('✗ startup.sh missing server.js fallback logic');
  }
} else {
  console.log('✗ startup.sh does not exist');
}

// Test 2: Check Dockerfile.caprover
console.log('\nTest 2: Checking Dockerfile.caprover...');
if (fs.existsSync('Dockerfile.caprover')) {
  console.log('✓ Dockerfile.caprover exists');
  const content = fs.readFileSync('Dockerfile.caprover', 'utf8');
  if (content.includes('openssl')) {
    console.log('✓ Dockerfile.caprover includes openssl');
  } else {
    console.log('✗ Dockerfile.caprover missing openssl');
  }
  if (content.includes('postgresql-client')) {
    console.log('✓ Dockerfile.caprover includes postgresql-client');
  } else {
    console.log('✗ Dockerfile.caprover missing postgresql-client');
  }
} else {
  console.log('✗ Dockerfile.caprover does not exist');
}

// Test 3: Check main Dockerfile (for Coolify)
console.log('\nTest 3: Checking main Dockerfile (for Coolify)...');
if (fs.existsSync('Dockerfile')) {
  console.log('✓ Dockerfile exists');
  const content = fs.readFileSync('Dockerfile', 'utf8');
  if (content.includes('openssl')) {
    console.log('✓ Dockerfile includes openssl');
  } else {
    console.log('✗ Dockerfile missing openssl');
  }
  if (content.includes('node:18')) {
    console.log('✓ Dockerfile uses Node.js 18');
  } else {
    console.log('✗ Dockerfile may not use correct Node.js version');
  }
} else {
  console.log('✗ Dockerfile does not exist');
}

// Test 4: Check Prisma configuration
console.log('\nTest 4: Checking Prisma configuration...');
if (fs.existsSync('prisma/schema.prisma')) {
  console.log('✓ prisma/schema.prisma exists');
  const content = fs.readFileSync('prisma/schema.prisma', 'utf8');
  if (content.includes('linux-musl-openssl-3.0.x')) {
    console.log('✓ Prisma has correct binary targets in schema');
  } else {
    console.log('✗ Prisma missing correct binary targets in schema');
  }
} else {
  console.log('✗ prisma/schema.prisma does not exist');
}

if (fs.existsSync('package.json')) {
  const content = fs.readFileSync('package.json', 'utf8');
  if (content.includes('linux-musl-openssl-3.0.x')) {
    console.log('✓ Prisma has correct binary targets in package.json');
  } else {
    console.log('✗ Prisma missing correct binary targets in package.json');
  }
} else {
  console.log('✗ package.json does not exist');
}

// Test 5: Check next.config.mjs
console.log('\nTest 5: Checking next.config.mjs...');
if (fs.existsSync('next.config.mjs')) {
  const content = fs.readFileSync('next.config.mjs', 'utf8');
  if (content.includes("output: 'standalone'")) {
    console.log('✓ next.config.mjs has standalone output enabled');
  } else {
    console.log('✗ next.config.mjs missing standalone output');
  }
} else {
  console.log('✗ next.config.mjs does not exist');
}

// Test 6: Check ESLint configuration
console.log('\nTest 6: Checking ESLint configuration...');
if (fs.existsSync('.eslintrc.json')) {
  console.log('✓ .eslintrc.json exists');
} else {
  console.log('✗ .eslintrc.json does not exist');
}

// Test 7: Check environment variables
console.log('\nTest 7: Checking environment configuration...');
if (fs.existsSync('.env.example') && fs.existsSync('.env')) {
  console.log('✓ Both .env.example and .env exist');
} else if (fs.existsSync('.env.example')) {
  console.log('⚠ .env.example exists but .env may be missing');
} else if (fs.existsSync('.env')) {
  console.log('✓ .env exists');
} else {
  console.log('✗ No environment files found');
}

// Test 8: Check critical scripts
console.log('\nTest 8: Checking package.json scripts...');
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.scripts && packageJson.scripts.build) {
    console.log('✓ build script exists');
  } else {
    console.log('✗ build script missing');
  }
  if (packageJson.scripts && packageJson.scripts.start) {
    console.log('✓ start script exists');
  } else {
    console.log('✗ start script missing');
  }
}

console.log('\n=== DIAGNOSTICS COMPLETE ===');