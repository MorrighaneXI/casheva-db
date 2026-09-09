import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusPinjaman } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreatePinjamanDto {
  @ApiProperty({ description: 'ID Anggota (UUID)' })
  @IsNotEmpty()
  @IsUUID()
  anggotaId!: string;

  @ApiProperty({ example: 10_000_000, minimum: 1_000_000, maximum: 100_000_000 })
  @IsNumber()
  @Min(1_000_000)
  @Max(100_000_000)
  nominal!: number;

  @ApiProperty({ example: 12, minimum: 1, maximum: 36 })
  @IsInt()
  @Min(1)
  @Max(36)
  tenorBulan!: number;

  @ApiPropertyOptional({ example: 'Keperluan renovasi rumah dinas' })
  @IsOptional()
  @IsString()
  catatan?: string;
}

export class UpdateStatusPinjamanDto {
  @ApiProperty({ enum: StatusPinjaman })
  @IsEnum(StatusPinjaman)
  status!: StatusPinjaman;

  @ApiPropertyOptional({ example: 'Dokumen lengkap dan memenuhi syarat' })
  @IsOptional()
  @IsString()
  catatan?: string;

  @ApiPropertyOptional({ example: 'Sisa gaji tidak mencukupi atau berkas tidak memenuhi syarat' })
  @IsOptional()
  @IsString()
  alasanPenolakan?: string;
}

export class CairkanPinjamanDto {
  @ApiPropertyOptional({
    example: '2026-08-07',
    description: 'Tanggal pencairan (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  tanggalCair?: string;
}

export class PelunasanDipercepatDto {
  @ApiPropertyOptional({
    example: '2026-08-07',
    description: 'Tanggal pelunasan (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  tanggalPelunasan?: string;

  @ApiPropertyOptional({
    example: 'Pelunasan dipercepat oleh anggota',
    description: 'Keterangan pelunasan',
  })
  @IsOptional()
  @IsString()
  keterangan?: string;
}

export class UpdateBungaDto {
  @ApiProperty({
    example: 10,
    description: 'Suku bunga pinjaman persen per tahun (misal: 10 untuk 10%, 12 untuk 12%)',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  bungaPersenTahun!: number;

  @ApiPropertyOptional({
    example: 'Penyesuaian suku bunga pinjaman tahun 2026',
    description: 'Keterangan alasan perubahan suku bunga',
  })
  @IsOptional()
  @IsString()
  keterangan?: string;
}

export class BayarAngsuranDinamisDto {
  @ApiProperty({
    example: 110_000,
    description: 'Nominal pembayaran riil yang disetorkan (alokasi prioritas bunga, sisanya ke pokok)',
  })
  @IsNumber()
  @Min(1)
  nominalBayar!: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Angsuran bulan keberapa yang dibayarkan (opsional, default bulan berjalan)',
  })
  @IsOptional()
  @IsInt()
  bulanKe?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Apakah memilih opsi pelunasan dipercepat (sisa pokok + 2x bunga)',
  })
  @IsOptional()
  isPelunasanDipercepat?: boolean;

  @ApiPropertyOptional({
    example: '2026-09-09',
    description: 'Tanggal pembayaran (ISO)',
  })
  @IsOptional()
  @IsDateString()
  tanggalBayar?: string;

  @ApiPropertyOptional({
    example: 'Pembayaran angsuran cicilan via bendahara',
    description: 'Catatan tambahan transaksi',
  })
  @IsOptional()
  @IsString()
  catatan?: string;
}

