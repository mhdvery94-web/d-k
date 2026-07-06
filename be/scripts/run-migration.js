const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🔄 Running migration: add email to users...');

  try {
    // Add email column as nullable first
    await prisma.$executeRaw`
      ALTER TABLE users ADD COLUMN email VARCHAR(100) NULL
    `;
    console.log('✅ Added email column');

    // Update existing admin user with default email
    await prisma.$executeRaw`
      UPDATE users SET email = 'admin@dapurkemas.com' WHERE username = 'admin'
    `;
    console.log('✅ Updated admin user with default email');

    // Make email NOT NULL
    await prisma.$executeRaw`
      ALTER TABLE users MODIFY COLUMN email VARCHAR(100) NOT NULL
    `;
    console.log('✅ Made email column NOT NULL');

    // Add unique constraint
    await prisma.$executeRaw`
      ALTER TABLE users ADD UNIQUE INDEX users_email_key(email)
    `;
    console.log('✅ Added unique constraint on email');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
