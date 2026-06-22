import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';

@Injectable()
export class MfaService {
  generateSecret(): string {
    return authenticator.generateSecret();
  }
  qrUri(email: string, secret: string): string {
    return authenticator.keyuri(email, 'CSC-ZNZ', secret);
  }
  verify(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }
}