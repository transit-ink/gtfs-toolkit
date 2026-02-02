import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, IsArray, IsOptional, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../entities/user.entity';

export class UpdateUserAdminDto {
  @ApiProperty({ description: 'Username', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  username?: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    // Allow empty string to pass through (will be converted to null in service)
    return trimmed === '' ? '' : trimmed.toLowerCase();
  })
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'User roles', enum: UserRole, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @ApiProperty({ description: 'Profile URL', required: false })
  @IsOptional()
  @IsString()
  profileUrl?: string;
}
