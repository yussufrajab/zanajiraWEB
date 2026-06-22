import { IsEnum, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { UserRole, UserStatus } from '@zanweb/shared';

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}