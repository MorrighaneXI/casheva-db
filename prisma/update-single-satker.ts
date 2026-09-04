import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required in .env');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  console.log('🔄 Mengubah Master Data Kotama & Satminkal menjadi Tunggal...');
  console.log('🏛️ Kotama: KODAM IV/DIPONEGORO');
  console.log('🏢 Satminkal: INFOLAHTADAM IV/DIPONEGORO');

  // 1. Upsert Kotama KODAM IV/DIPONEGORO
  const kotama = await prisma.kotama.upsert({
    where: { kode: '07' },
    create: {
      kode: '07',
      nama: 'KODAM IV/DIPONEGORO',
    },
    update: {
      nama: 'KODAM IV/DIPONEGORO',
    },
  });

  // 2. Upsert Satminkal INFOLAHTADAM IV/DIPONEGORO
  const satminkal = await prisma.satminkal.upsert({
    where: { kode: '685600' },
    create: {
      kode: '685600',
      nama: 'INFOLAHTADAM IV/DIPONEGORO',
      kotamaId: kotama.id,
    },
    update: {
      nama: 'INFOLAHTADAM IV/DIPONEGORO',
      kotamaId: kotama.id,
    },
  });

  console.log(`✅ Kotama ID: ${kotama.id}, Satminkal ID: ${satminkal.id}`);

  // 3. Update all existing Users to this Kotama & Satminkal
  const usersUpdated = await prisma.user.updateMany({
    data: {
      kotamaId: kotama.id,
      satminkalId: satminkal.id,
    },
  });
  console.log(`✅ ${usersUpdated.count} User dialihkan ke KODAM IV/DIPONEGORO & INFOLAHTADAM IV/DIPONEGORO`);

  // 4. Update all existing Anggota to this Satminkal
  const anggotaUpdated = await prisma.anggota.updateMany({
    data: {
      satminkalId: satminkal.id,
    },
  });
  console.log(`✅ ${anggotaUpdated.count} Anggota dialihkan ke INFOLAHTADAM IV/DIPONEGORO`);

  // 5. Update / Upsert Kopstuk
  await prisma.kopstuk.deleteMany();
  await prisma.kopstuk.create({
    data: {
      satminkalId: satminkal.id,
      namaSatuan: 'KOMANDO DAERAH MILITER IV/DIPONEGORO',
      namaBalak: 'INFORMASI DAN PENGOLAHAN DATA',
      alamat: 'Jl. Perintis Kemerdekaan, Watugong, Semarang',
      nomorTelepon: '024-7472249',
    },
  });
  console.log('✅ Kopstuk berhasil diperbarui untuk INFOLAHTADAM IV/DIPONEGORO');

  // 6. Update Pendapatan & PengaturanKoperasi
  await prisma.pendapatan.updateMany({
    data: {
      satminkalId: satminkal.id,
    },
  });

  await prisma.pengaturanKoperasi.updateMany({
    data: {
      satminkalId: satminkal.id,
    },
  });

  // 7. Hapus satminkal selain 685600
  const deletedSatminkal = await prisma.satminkal.deleteMany({
    where: {
      id: { not: satminkal.id },
    },
  });
  console.log(`🧹 ${deletedSatminkal.count} Satminkal lama lainnya telah dibersihkan.`);

  // 8. Hapus kotama selain 07
  const deletedKotama = await prisma.kotama.deleteMany({
    where: {
      id: { not: kotama.id },
    },
  });
  console.log(`🧹 ${deletedKotama.count} Kotama lama lainnya telah dibersihkan.`);

  console.log('🎉 Migrasi master data tunggal selesai sukses!');
  await pool.end();
}

main().catch((e) => {
  console.error('❌ Error migrasi:', e);
  process.exit(1);
});
