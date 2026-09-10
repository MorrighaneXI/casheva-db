const http = require('http');

async function testSecurity() {
  console.log('--- TESTING CASHEVA SECURITY STACK ---');

  // 1. Test Login
  const loginPayload = JSON.stringify({ username: 'admin', password: 'Password123!' });
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: loginPayload,
  });

  const loginJson = await loginRes.json();
  console.log('1. Login status:', loginRes.status, '| User:', loginJson.user?.namaLengkap);
  const token = loginJson.accessToken;

  // 2. Test Backup Status (Admin Access)
  const statusRes = await fetch('http://localhost:3000/api/backup/status', {
    headers: { Authorization: `Bearer ${token}`, 'X-Requested-With': 'XMLHttpRequest' },
  });
  const statusJson = await statusRes.json();
  console.log('2. Backup Status (AES-256):', statusRes.status, statusJson);

  // 3. Test Encrypted Backup Export
  const exportRes = await fetch('http://localhost:3000/api/backup/export-encrypted', {
    headers: { Authorization: `Bearer ${token}`, 'X-Requested-With': 'XMLHttpRequest' },
  });
  const exportJson = await exportRes.json();
  console.log('3. Export Encrypted Cipher:', exportJson.cipher, '| Checksum:', exportJson.checksum?.slice(0, 16) + '...');

  // 4. Test RBAC: Login as Anggota, try accessing Backup Status (Should be 403 Forbidden)
  const anggotaLoginPayload = JSON.stringify({ username: '1102123401', password: 'Password123!' });
  const anggotaLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: anggotaLoginPayload,
  });
  const anggotaLoginJson = await anggotaLoginRes.json();
  const anggotaToken = anggotaLoginJson.accessToken;

  const anggotaBackupRes = await fetch('http://localhost:3000/api/backup/status', {
    headers: { Authorization: `Bearer ${anggotaToken}`, 'X-Requested-With': 'XMLHttpRequest' },
  });
  console.log('4. RBAC Check (Anggota accessing Admin Backup):', anggotaBackupRes.status, anggotaBackupRes.status === 403 ? '✅ BLOCKED (403 FORBIDDEN)' : 'FAILED');

  console.log('--- ALL AUTOMATED SECURITY TESTS COMPLETE ---');
}

testSecurity().catch(console.error);
