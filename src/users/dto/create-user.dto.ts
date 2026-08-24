import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  namaLengkap!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsString()
  kotamaId?: string;

  @IsString()
  @IsNotEmpty()
  satminkalId!: string;

  @IsOptional()
  @IsString()
  pangkatId?: string;

  @IsOptional()
  @IsString()
  korpsId?: string;

  @IsOptional()
  @IsString()
  nrpNip?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
