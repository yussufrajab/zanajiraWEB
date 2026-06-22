import { IsEmail, IsObject, IsOptional } from 'class-validator';

export class CreateSubscriberDto {
  @IsEmail()
  email!: string;

  @IsObject()
  @IsOptional()
  criteria?: Record<string, any>;
}
