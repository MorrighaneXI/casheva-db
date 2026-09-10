import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&._-]{6,30}$/, {
    message:
      'Password baru harus mengandung kombinasi huruf besar, huruf kecil, dan angka (minimal 6-12 karakter).',
  })
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
