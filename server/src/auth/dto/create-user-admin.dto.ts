import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserAdminDto {
  @ApiProperty({ description: 'Username for the user' })
  @IsString()
  @MinLength(3)
  @Transform(({ value }) => value?.trim())
  @Type(() => String)
  username: string;

  @ApiProperty({ description: 'Email for the user', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string') return undefined;
    const trimmed = value.trim().toLowerCase();
    return trimmed === '' ? undefined : trimmed;
  })
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Password for the user' })
  @IsString()
  @MinLength(6)
  @Type(() => String)
  password: string;

  @ApiProperty({ description: 'User roles', enum: UserRole, isArray: true })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
