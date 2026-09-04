import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class SimpananMassalDto {
  @ApiPropertyOptional({
    example: '2026-08-05',
    description: 'Tanggal periode (harus tanggal 5 bulan terkait)',
  })
  @IsOptional()
  @IsDateString()
  periode?: string;
}
