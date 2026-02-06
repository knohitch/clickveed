const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('=== SUPER ADMIN FIX SCRIPT ===');
  
  try {
    // Test database connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('Database connection successful');
    
    // Check if any users exist
    const userCount = await prisma.user.count();
    console.log(`Total users in database: ${userCount}`);
    
    // Check for SUPER_ADMIN users
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { email: true, displayName: true, emailVerified: true, status: true }
    });
    
    console.log(`SUPER_ADMIN users found: ${superAdmins.length}`);
    superAdmins.forEach((admin, i) => {
      console.log(`  ${i+1}. ${admin.email} (${admin.displayName}) - verified: ${admin.emailVerified}, status: ${admin.status}`);
    });
    
    // If no super admin exists, create one
    if (superAdmins.length === 0) {
      console.log('\nNo SUPER_ADMIN found. Creating default super admin...');
      
      const email = 'admin@vyydecourt.site';
      const password = 'Admin123!'; // Default password - should be changed immediately
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Find free plan
      const freePlan = await prisma.plan.findFirst({
        where: { featureTier: 'free' }
      });
      
      if (!freePlan) {
        console.error('ERROR: Free plan not found. Please seed the database first.');
        return;
      }
      
      const superAdmin = await prisma.user.create({
        data: {
          email,
          displayName: 'Super Administrator',
          passwordHash,
          role: 'SUPER_ADMIN',
          status: 'Active',
          emailVerified: true,
          planId: freePlan.id
        }
      });
      
      console.log(`SUPER_ADMIN created successfully!`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      console.log('IMPORTANT: Change this password immediately after login!');
    } else {
      console.log('\nSUPER_ADMIN(s) already exist. No creation needed.');
    }
    
    // Check if ADMIN_EMAILS matches
    const adminEmails = process.env.ADMIN_EMAILS;
    if (adminEmails) {
      console.log(`\nADMIN_EMAILS from environment: ${adminEmails}`);
      const emails = adminEmails.split(',').map(e => e.trim());
      for (const email of emails) {
        const user = await prisma.user.findUnique({
          where: { email },
          select: { role: true }
        });
        if (user) {
          console.log(`✓ ${email} exists as ${user.role}`);
        } else {
          console.log(`✗ ${email} does not exist in database`);
        }
      }
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\nDATABASE CONNECTION FAILED!');
      console.error('The database server is not reachable.');
      console.error('Current DATABASE_URL:', process.env.DATABASE_URL);
      console.error('\nPossible solutions:');
      console.error('1. Check if the database server is running');
      console.error('2. Verify network connectivity to the database host');
      console.error('3. Check firewall settings');
      console.error('4. Use a local database for development:');
      console.error('   - Update .env file with local database URL');
      console.error('   - Run: npx prisma migrate dev');
      console.error('   - Run: npx prisma db seed');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});