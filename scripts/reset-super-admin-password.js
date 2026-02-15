const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('=== SUPER ADMIN PASSWORD RESET ===\n');
  
  try {
    // Test database connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✓ Database connection successful\n');
    
    // Get all SUPER_ADMIN users
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: {
        id: true,
        email: true,
        displayName: true,
        emailVerified: true,
        status: true
      },
      orderBy: { createdAt: 'asc' }
    });
    
    if (superAdmins.length === 0) {
      console.log('No SUPER_ADMIN users found.');
      console.log('Run: node scripts/fix-super-admin.js to create one.');
      process.exit(1);
    }
    
    console.log(`Found ${superAdmins.length} SUPER_ADMIN user(s):\n`);
    superAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.email}`);
      console.log(`   Display Name: ${admin.displayName}`);
      console.log(`   Email Verified: ${admin.emailVerified}`);
      console.log(`   Status: ${admin.status}\n`);
    });
    
    // Ask which user to reset
    rl.question('Enter the number of the user to reset password (1): ', async (answer) => {
      const choice = parseInt(answer) || 1;
      const selectedUser = superAdmins[choice - 1];
      
      if (!selectedUser) {
        console.error('Invalid selection.');
        process.exit(1);
      }
      
      console.log(`\nSelected: ${selectedUser.email}`);
      
      // Ask for new password
      rl.question('Enter new password (min 6 chars): ', async (newPassword) => {
        if (!newPassword || newPassword.length < 6) {
          console.error('Password must be at least 6 characters.');
          process.exit(1);
        }
        
        // Confirm password
        rl.question('Confirm new password: ', async (confirmPassword) => {
          if (newPassword !== confirmPassword) {
            console.error('Passwords do not match.');
            process.exit(1);
          }
          
          try {
            // Hash the new password
            const passwordHash = await bcrypt.hash(newPassword, 10);
            
            // Update user
            await prisma.user.update({
              where: { id: selectedUser.id },
              data: { passwordHash }
            });
            
            console.log(`\n✓ Password updated successfully for ${selectedUser.email}`);
            console.log(`New password: ${newPassword}`);
            console.log('\nImportant:');
            console.log('1. Use this password to login immediately');
            console.log('2. Change to a more secure password after login');
            console.log('3. Keep this password secure');
            
            // Also ensure user is active and email verified
            await prisma.user.update({
              where: { id: selectedUser.id },
              data: { 
                status: 'Active',
                emailVerified: true 
              }
            });
            
            console.log('\n✓ User status ensured: Active, Email Verified: true');
            
          } catch (error) {
            console.error('Error updating password:', error.message);
          } finally {
            rl.close();
            await prisma.$disconnect();
            process.exit(0);
          }
        });
      });
    });
    
  } catch (error) {
    console.error('ERROR:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\nDatabase connection failed. The database server is not reachable.');
      console.error('Current DATABASE_URL:', process.env.DATABASE_URL);
      console.error('\nThis script must be run FROM INSIDE the Docker container where the database is accessible.');
      console.error('\nSteps:');
      console.error('1. Enter your app container: docker exec -it [container-name] /bin/sh');
      console.error('2. Run: node scripts/reset-super-admin-password.js');
      console.error('3. Follow the prompts to reset password');
    }
    
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Handle Ctrl+C
rl.on('close', () => {
  console.log('\nOperation cancelled.');
  process.exit(0);
});

main();