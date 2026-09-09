import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class GolonganRateDto {
  @ApiProperty({ example: 'Ba/Ta/Pns', description: 'Nama golongan militer (Pati, Pamen, Pama, Ba/Ta/Pns)' })
  @IsString()
  @IsNotEmpty()
  golongan!: string;

  @ApiProperty({ example: 50000, description: 'Nominal Simpanan Pokok per anggota golongan ini' })
  @IsNumber()
  @Min(0)
  nominalPokok!: number;

  @ApiProperty({ example: 100000, description: 'Nominal Simpanan Wajib per anggota golongan ini' })
  @IsNumber()
  @Min(0)
  nominalWajib!: number;
}

export class BatchSimpananGolonganDto {
  @ApiProperty({ type: [GolonganRateDto], description: 'Daftar tarif simpanan per golongan dari file Excel' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GolonganRateDto)
  rates!: GolonganRateDto[];

  @ApiPropertyOptional({ example: '2026-09', description: 'Periode pemotongan (YYYY-MM)' })
  @IsOptional()
  @IsString()
  periode?: string;

  @ApiPropertyOptional({ example: 'Pemotongan Simpanan Pokok & Wajib via Excel Bendahara' })
  @IsOptional()
  @IsString()
  keterangan?: string;
}
