import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class UpsertPageDto {
  @IsString() @MinLength(1) @MaxLength(200) slug!: string;
  @IsString() @MinLength(1) @MaxLength(200) titleSw!: string;
  @IsOptional() @IsString() @MaxLength(200) titleEn?: string;
  @IsString() @MinLength(1) bodySw!: string;
  @IsOptional() @IsString() bodyEn?: string;
  @IsOptional() @IsString() parentId?: string;
}