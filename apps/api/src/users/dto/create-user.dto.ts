import { IsEmail, IsEnum, IsString, MinLength, MaxLength } from 'class-validator';
import { UserRole } from '@zanweb/shared';

export class CreateUserDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(10) @MaxLength(128) password!: string;
  @IsEnum(UserRole) role!: UserRole;
}