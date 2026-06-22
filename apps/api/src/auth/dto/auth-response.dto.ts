import { UserRole, UserStatus } from '@zanweb/shared';

export class AuthResponseDto {
  accessToken!: string;
  mfaRequired!: boolean;
  user!: { id: string; email: string; name: string; role: UserRole; status: UserStatus };
}