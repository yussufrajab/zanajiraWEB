import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transport?: nodemailer.Transporter;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn('SMTP_HOST not configured — email notifications disabled');
      return;
    }
    this.transport = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async send(to: string, subject: string, text: string) {
    if (!this.transport) {
      this.logger.warn(`Email skipped (no SMTP transport): ${subject}`);
      return;
    }
    await this.transport.sendMail({
      from: this.config.get<string>('SMTP_FROM')!,
      to,
      subject,
      text,
    });
  }
}
