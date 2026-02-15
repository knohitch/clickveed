#!/usr/bin/env node
/**
 * Quick diagnostics script to run inside Docker container
 * Can be pasted directly into container terminal
 */

console.log('=== CONTAINER DIAGNOSTICS ===\n');

// 1. Check environment variables
console.log('1. Checking environment variables...');
const envVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'AUTH_SECRET',
  'NEXTAUTH_URL',
  'ADMIN_EMAILS'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✓' : '✗';
  const displayValue = value ? 
    (varName.includes('SECRET') ? '[SET]' : value.substring(0, 50) + (value.length > 50 ? '...' : '')) : 
    'NOT SET';
  console.log(`  ${status} ${varName}: ${displayValue}`);
});

// 2. Test database connection
console.log('\n2. Testing database connection...');
try {
  // Dynamically import Prisma client
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  await prisma.$queryRaw`SELECT 1`;
  console.log('  ✓ Database connection successful');
  
  // 3. Check super admin user
  console.log('\n3. Checking super admin user...');
  const adminEmail = process.env.ADMIN_EMAILS?.split(',')[0] || 'admin@vyydecourt.site';
  const user = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      emailVerified: true,
      status: true
    }
  });
  
  if (user) {
    console.log(`  ✓ Super admin user found: ${user.email}`);
    console.log(`    Role: ${user.role}`);
    console.log(`    Password hash: ${user.passwordHash ? 'PRESENT' : 'MISSING'}`);
    console.log(`    Email verified: ${user.emailVerified}`);
    console.log(`    Status: ${user.status}`);
  } else {
    console.log(`  ✗ Super admin user not found: ${adminEmail}`);
    
    // List all users
    const allUsers = await prisma.user.findMany({
      select: { email: true, role: true },
      take: 10
    });
    console.log(`  Available users (${allUsers.length}):`);
    allUsers.forEach(u => console.log(`    - ${u.email} (${u.role})`));
  }
  
  await prisma.$disconnect();
} catch (error) {
  console.log(`  ✗ Database error: ${error.message}`);
  if (error.message.includes('connect')) {
    console.log('  Check if PostgreSQL container is running and accessible');
  }
}

console.log('\n=== DIAGNOSTICS COMPLETE ===');