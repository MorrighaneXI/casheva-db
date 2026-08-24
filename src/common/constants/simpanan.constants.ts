import { KategoriPangkat } from '@prisma/client';

export const SIMPANAN_POKOK = 50_000;
export const SIMPANAN_WAJIB = 100_000;

export const SUKARELA_BY_KATEGORI: Record<KategoriPangkat, number> = {
  PATI: 500_000,
  PAMEN: 300_000,
  PAMA: 250_000,
  BINTARA: 200_000,
  BATA_ASN: 150_000,
  PNS: 150_000,
};
