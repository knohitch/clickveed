// Quick check script - copy and paste into container terminal
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('🔍 Quick Diagnostic Check\n');
  
  // 1. Check environment
  console.log('1. Environment Variables:');
  console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Missing');
  console.log('   AUTH_SECRET:', process.env.AUTH_SECRET ? '✓ Set' : '✗ Missing');
  console.log('   NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✓ Set' : '✗ Missing');
  
  // 2. Test database
  console.log('\n2. Database Connection:');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('   ✓ Database is reachable');
  } catch (err) {
    console.log('   ✗ Database error:', err.message);
    return;
  }
  
  // 3. Check super admin
  console.log('\n3. Super Admin User:');
  const email = process.env.ADMIN_EMAILS?.split(',')[0] || 'admin@vyydecourt.site';
  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true, role: true, passwordHash: true }
  });
  
  if (user) {
    console.log(`   ✓ Found: ${user.email}`);
    console.log(`     Role: ${user.role}`);
    console.log(`     Password hash: ${user.passwordHash ? '✓ Present' : '✗ Missing'}`);
  } else {
    console.log(`   ✗ Not found: ${email}`);
    console.log('   Creating super admin...');
    const bcrypt = require('bcryptjs');
    const password = 'admin123'; // Change this!
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        passwordHash: hashed,
        role: 'SUPER_ADMIN',
        emailVerified: true,
        status: 'Active'
      }
    });
    console.log(`   ✓ Created with password: ${password}`);
  }
  
  await prisma.$disconnect();
  console.log('\n✅ Diagnostic complete!');
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});