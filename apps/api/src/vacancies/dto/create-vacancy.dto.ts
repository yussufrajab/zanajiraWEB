import { IsArray, IsDateString, IsOptional, IsString, IsUrl, MinLength, MaxLength } from 'class-validator';

export class CreateVacancyDto {
  @IsString() @MinLength(3) @MaxLength(300) title!: string;
  @IsString() @MaxLength(200) mda!: string;
  @IsDateString() closingDate!: string;
  @IsOptional() @IsDateString() publishDate?: string;
  @IsOptional() @IsUrl() applyUrl?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsArray() documentIds?: string[];
  @IsOptional() @IsDateString() scheduledPublishAt?: string;
}