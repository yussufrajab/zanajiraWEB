import { IsArray, IsDateString, IsEnum, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { InterviewType } from '@zanweb/shared';

export class CreateInterviewDto {
  @IsString() @MinLength(3) @MaxLength(300) title!: string;
  @IsString() @MaxLength(200) mda!: string;
  @IsEnum(InterviewType) type!: InterviewType;
  @IsOptional() @IsDateString() publishDate?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsArray() documentIds?: string[];
  @IsOptional() @IsDateString() scheduledPublishAt?: string;
}