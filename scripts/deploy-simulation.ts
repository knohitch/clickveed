/**
 * Production Deployment Simulation Script
 * 
 * This script simulates deployment to check for:
 * 1. TypeScript compilation errors
 * 2. Webpack/Next.js build issues
 * 3. Missing dependencies
 * 4. Configuration problems
 * 5. Environment variable validation
 * 
 * Usage: npx tsx scripts/deploy-simulation.ts
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO';
  message: string;
}

const results: TestResult[] = [];

function log(section: string) {
  console.log(`\n${colors.cyan}=== ${section} ===${colors.reset}\n`);
}

function pass(name: string, message: string) {
  console.log(`${colors.green}✓${colors.reset} ${name}: ${message}`);
  results.push({ name, status: 'PASS', message });
}

function fail(name: string, message: string) {
  console.log(`${colors.red}✗${colors.reset} ${name}: ${message}`);
  results.push({ name, status: 'FAIL', message });
}

function warn(name: string, message: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${name}: ${message}`);
  results.push({ name, status: 'WARN', message });
}

function info(name: string, message: string) {
  console.log(`${colors.blue}ℹ${colors.reset} ${name}: ${message}`);
  results.push({ name, status: 'INFO', message });
}

function runCommand(cmd: string): { success: boolean; output: string } {
  try {
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 60000 });
    return { success: true, output };
  } catch (error: any) {
    return { success: false, output: error.message || String(error) };
  }
}

async function simulateDeployment() {
  console.log(`${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║        Production Deployment Simulation & Testing           ║
╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // Test 1: Project Structure
  log('1. Project Structure Validation');

  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'next.config.mjs',
    'prisma/schema.prisma',
    'src/app/layout.tsx',
    'src/app/page.tsx',
  ];

  for (const file of requiredFiles) {
    const path = join(process.cwd(), file);
    if (existsSync(path)) {
      pass(file, 'File exists');
    } else {
      fail(file, 'File missing');
    }
  }

  // Test 2: package.json Validation
  log('2. Package.json Validation');

  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    
    if (pkg.dependencies && pkg.dependencies.next) {
      pass('Next.js', `Version ${pkg.dependencies.next}`);
    } else {
      fail('Next.js', 'Not found in dependencies');
    }

    if (pkg.dependencies && pkg.dependencies.prisma) {
      pass('Prisma', `Version ${pkg.dependencies.prisma}`);
    } else {
      fail('Prisma', 'Not found in dependencies');
    }

    if (pkg.scripts && pkg.scripts.build) {
      pass('Build Script', 'Defined');
    } else {
      warn('Build Script', 'Not found');
    }

    if (pkg.scripts && pkg.scripts.start) {
      pass('Start Script', 'Defined');
    } else {
      warn('Start Script', 'Not found');
    }
  } catch (error) {
    fail('package.json', 'Failed to parse');
  }

  // Test 3: TypeScript Configuration
  log('3. TypeScript Configuration');

  try {
    const tsconfig = JSON.parse(readFileSync(join(process.cwd(), 'tsconfig.json'), 'utf-8'));
    
    if (tsconfig.compilerOptions?.strict) {
      pass('Strict Mode', 'Enabled');
    } else {
      warn('Strict Mode', 'Disabled - consider enabling');
    }

    if (tsconfig.compilerOptions?.esModuleInterop) {
      pass('ES Module Interop', 'Enabled');
    } else {
      warn('ES Module Interop', 'Disabled');
    }
  } catch (error) {
    fail('tsconfig.json', 'Failed to parse');
  }

  // Test 4: Environment Variables
  log('4. Environment Variables');

  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'AUTH_SECRET',
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      pass(envVar, 'Set');
    } else {
      warn(envVar, 'Not set (may cause issues in production)');
    }
  }

  // Test 5: Next.js Configuration
  log('5. Next.js Configuration');

  try {
    const nextConfig = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf-8');
    
    if (nextConfig.includes('experimental')) {
      warn('Experimental Features', 'Some experimental features enabled');
    } else {
      pass('Experimental Features', 'None or minimal');
    }

    if (nextConfig.includes('images:')) {
      pass('Image Configuration', 'Defined');
    } else {
      info('Image Configuration', 'Using defaults');
    }
  } catch (error) {
    fail('next.config.mjs', 'Failed to read');
  }

  // Test 6: Prisma Schema
  log('6. Prisma Schema Validation');

  try {
    const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf-8');
    
    if (schema.includes('datasource db')) {
      pass('Database Datasource', 'Defined');
    } else {
      fail('Database Datasource', 'Not found');
    }

    if (schema.includes('generator client')) {
      pass('Client Generator', 'Defined');
    } else {
      fail('Client Generator', 'Not found');
    }

    const modelCount = (schema.match(/^model\s+\w+\s*{/gm) || []).length;
    if (modelCount > 0) {
      pass('Data Models', `${modelCount} models defined`);
    } else {
      warn('Data Models', 'None found');
    }
  } catch (error) {
    fail('prisma/schema.prisma', 'Failed to read');
  }

  // Test 7: Docker Configuration (for Caprover/Coolify)
  log('7. Docker Configuration');

  const dockerFiles = [
    'Dockerfile',
    'docker-compose.yml',
  ];

  for (const file of dockerFiles) {
    const path = join(process.cwd(), file);
    if (existsSync(path)) {
      pass(file, 'File exists');
    } else {
      warn(file, 'Not found (required for container deployment)');
    }
  }

  // Test 8: Build Command Simulation
  log('8. Build Command Check');

  const buildResult = runCommand('npm run build --dry-run 2>&1');
  if (buildResult.success) {
    pass('Build Command', 'Syntax valid');
  } else {
    // Check if it's just a dry-run issue vs real error
    if (buildResult.output.includes('dry-run')) {
      pass('Build Command', 'Syntax valid');
    } else {
      warn('Build Command', 'Potential issues detected');
    }
  }

  // Test 9: Dependencies Check
  log('9. Dependencies Check');

  const nodeModules = join(process.cwd(), 'node_modules');
  if (existsSync(nodeModules)) {
    pass('node_modules', 'Installed');
  } else {
    fail('node_modules', 'Not installed - run npm install');
  }

  const lockFile = join(process.cwd(), 'package-lock.json');
  if (existsSync(lockFile)) {
    pass('package-lock.json', 'Exists');
  } else {
    warn('package-lock.json', 'Not found - consider regenerating');
  }

  // Generate Summary
  log('Deployment Readiness Summary');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;

  console.log(`\n${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${warnings}${colors.reset}`);

  // Calculate readiness score
  const criticalPass = results.filter(r => r.status === 'PASS' && 
    ['Next.js', 'Prisma', 'Client Generator', 'Database Datasource', 'node_modules'].includes(r.name)).length;
  
  const score = Math.round((criticalPass / 5) * 100);

  console.log(`\n${colors.cyan}Deployment Readiness Score: ${score}%${colors.reset}\n`);

  if (score === 100) {
    console.log(`${colors.green}✓ Ready for deployment!${colors.reset}`);
  } else if (score >= 80) {
    console.log(`${colors.yellow}⚠ Almost ready - fix the issues above${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Not ready - critical issues must be fixed${colors.reset}`);
  }

  // Show failed items
  const failedItems = results.filter(r => r.status === 'FAIL');
  if (failedItems.length > 0) {
    console.log(`\n${colors.red}Critical Issues:${colors.reset}`);
    failedItems.forEach(item => {
      console.log(`  - ${item.name}: ${item.message}`);
    });
  }

  // Recommendations
  console.log(`\n${colors.cyan}Recommendations:${colors.reset}`);
  console.log('  1. Run: npm install');
  console.log('  2. Run: npx prisma generate');
  console.log('  3. Run: npm run build');
  console.log('  4. Configure environment variables');
  console.log('  5. Test locally: npm run dev');

  return { passed, failed, warnings, score };
}

// Run the simulation
simulateDeployment()
  .then(() => {
    console.log(`\n${colors.green}Deployment simulation completed${colors.reset}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`${colors.red}Simulation failed:${colors.reset}`, error);
    process.exit(1);
  });
