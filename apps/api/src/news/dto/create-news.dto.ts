import { IsArray, IsDateString, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateNewsDto {
  @IsString() @MinLength(3) @MaxLength(200) titleSw!: string;
  @IsOptional() @IsString() @MaxLength(200) titleEn?: string;
  @IsString() @MinLength(3) bodySw!: string;
  @IsOptional() @IsString() bodyEn?: string;
  @IsOptional() @IsDateString() publishDate?: string;
  @IsOptional() @IsString() coverImageKey?: string;
  @IsOptional() @IsArray() documentIds?: string[];
  @IsOptional() @IsDateString() scheduledPublishAt?: string;
}