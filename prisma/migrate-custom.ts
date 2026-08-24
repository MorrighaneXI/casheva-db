import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // 1. Add KHUSUS to JenisSimpanan enum
    try {
      await pool.query(`ALTER TYPE "JenisSimpanan" ADD VALUE 'KHUSUS';`);
      console.log('Added KHUSUS to JenisSimpanan enum');
    } catch (err: any) {
      console.log('Enum note:', err.message);
    }

    // 2. Add dynamic simpanan columns to tb_pengaturan_koperasi
    await pool.query(`
      ALTER TABLE "tb_pengaturan_koperasi" 
      ADD COLUMN IF NOT EXISTS "nominalSimpananPokok" DECIMAL(18,2) DEFAULT 50000,
      ADD COLUMN IF NOT EXISTS "nominalSimpananWajib" DECIMAL(18,2) DEFAULT 100000,
      ADD COLUMN IF NOT EXISTS "nominalSimpananKhusus" DECIMAL(18,2) DEFAULT 0;
    `);
    console.log('Dynamic simpanan columns added to tb_pengaturan_koperasi.');

    const res = await pool.query('SELECT * FROM tb_pengaturan_koperasi LIMIT 1');
    console.log('Current setting row:', res.rows[0]);
  } catch (e: any) {
    console.error('Migration error:', e.message);
  } finally {
    await pool.end();
  }
}

run();
