// Prisma client generator helper
// This script sets the DATABASE_URL and generates Prisma client

const { execSync } = require('child_process');

// Set a default DATABASE_URL for generation
// You should update this with your actual database credentials
const databaseUrl = process.env.DATABASE_URL || 
  'mysql://root:password@localhost:3306/freight_shipping';

try {
  console.log('🔧 Generating Prisma Client...');
  console.log(`Database URL: ${databaseUrl.replace(/:[^:]*@/, ':****@')}`);
  
  // Set environment variable and run prisma generate
  process.env.DATABASE_URL = databaseUrl;
  
  execSync('npx prisma generate --schema=./prisma/schema.prisma', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl }
  });
  
  console.log('✅ Prisma Client generated successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Create .env file with your DATABASE_URL');
  console.log('2. Run: npm run dev');
  console.log('3. Test your carrier service endpoint\n');
  
} catch (error) {
  console.error('❌ Error generating Prisma Client:', error.message);
  console.error('\n💡 Try setting DATABASE_URL manually:');
  console.error('   $env:DATABASE_URL="mysql://user:pass@localhost:3306/freight_shipping"');
  console.error('   npx prisma generate --schema=./prisma/schema.prisma\n');
  process.exit(1);
}
