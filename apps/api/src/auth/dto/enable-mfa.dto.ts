import { IsString, MinLength, MaxLength } from 'class-validator';
export class EnableMfaDto {
  @IsString() @MinLength(16) secret!: string;
  @IsString() @MinLength(6) @MaxLength(6) code!: string;
}