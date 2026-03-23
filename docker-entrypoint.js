const { execSync } = require('child_process');
const path = require('path');

// Run prisma db push using the prisma binary from node_modules
try {
  console.log('Running prisma db push...');
  execSync(
    path.join(__dirname, 'node_modules', '.bin', 'prisma') + ' db push --skip-generate',
    { stdio: 'inherit', env: { ...process.env, HOME: '/tmp' } }
  );
  console.log('Database schema synced.');
} catch (e) {
  console.error('prisma db push failed:', e.message);
  process.exit(1);
}
