const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('=== USER AUTHENTICATION DIAGNOSTICS ===\n');
  
  try {
    // Test database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✓ Database connection successful\n');
    
    // Get all users
    console.log('2. Fetching all users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        emailVerified: true,
        status: true,
        passwordHash: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Total users: ${users.length}\n`);
    
    // Display user details
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Display Name: ${user.displayName}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Email Verified: ${user.emailVerified}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Password Hash: ${user.passwordHash ? 'Present' : 'MISSING'}`);
      if (user.passwordHash) {
        const hash = user.passwordHash;
        console.log(`  Hash Length: ${hash.length}`);
        console.log(`  Hash Prefix: ${hash.substring(0, 10)}...`);
        // Check if it looks like bcrypt
        const isBcrypt = hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
        console.log(`  Looks like bcrypt: ${isBcrypt}`);
      }
      console.log('');
    });
    
    // Check SUPER_ADMIN users
    const superAdmins = users.filter(u => u.role === 'SUPER_ADMIN');
    console.log(`3. SUPER_ADMIN users: ${superAdmins.length}`);
    superAdmins.forEach(admin => {
      console.log(`   - ${admin.email} (verified: ${admin.emailVerified}, status: ${admin.status})`);
    });
    console.log('');
    
    // Check for potential issues
    console.log('4. Potential authentication issues:');
    
    let issuesFound = false;
    
    // Users without password hash
    const noPassword = users.filter(u => !u.passwordHash);
    if (noPassword.length > 0) {
      console.log(`   ✗ ${noPassword.length} user(s) have no password hash (cannot login with credentials):`);
      noPassword.forEach(u => console.log(`     - ${u.email}`));
      issuesFound = true;
    }
    
    // Users with email not verified (except SUPER_ADMIN)
    const unverified = users.filter(u => u.emailVerified === false && u.role !== 'SUPER_ADMIN');
    if (unverified.length > 0) {
      console.log(`   ⚠ ${unverified.length} non-SUPER_ADMIN user(s) with unverified email (cannot login):`);
      unverified.forEach(u => console.log(`     - ${u.email}`));
      issuesFound = true;
    }
    
    // Users with non-Active status
    const inactive = users.filter(u => u.status !== 'Active');
    if (inactive.length > 0) {
      console.log(`   ⚠ ${inactive.length} user(s) with non-Active status (cannot login):`);
      inactive.forEach(u => console.log(`     - ${u.email} (status: ${u.status})`));
      issuesFound = true;
    }
    
    // Check password hash format
    const invalidHash = users.filter(u => u.passwordHash && !u.passwordHash.startsWith('$2'));
    if (invalidHash.length > 0) {
      console.log(`   ✗ ${invalidHash.length} user(s) with non-bcrypt password hash:`);
      invalidHash.forEach(u => console.log(`     - ${u.email} (hash: ${u.passwordHash.substring(0, 20)}...)`));
      issuesFound = true;
    }
    
    if (!issuesFound) {
      console.log('   ✓ No obvious authentication issues found in user data.');
    }
    
    console.log('\n5. Authentication test instructions:');
    console.log('   To test a specific user\'s password, run:');
    console.log('   node -e "const bcrypt = require(\'bcryptjs\'); bcrypt.compare(\'password\', \'$2a$...\').then(console.log)"');
    console.log('');
    console.log('6. Next steps:');
    console.log('   - Check application logs for [AUTH] and [LOGIN] messages');
    console.log('   - Verify the exact email used for login (case-sensitive)');
    console.log('   - Ensure SUPER_ADMIN bypasses email verification');
    console.log('   - Reset password if hash is incorrect');
    
  } catch (error) {
    console.error('ERROR:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\nDatabase connection failed. The database server is not reachable.');
      console.error('Current DATABASE_URL:', process.env.DATABASE_URL);
      console.error('\nRun: node scripts/fix-super-admin.js for detailed diagnostics.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});