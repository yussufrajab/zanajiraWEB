import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private client!: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET')!;
    this.client = new S3Client({
      endpoint: this.config.get<string>('S3_ENDPOINT'),
      region: this.config.get<string>('S3_REGION') ?? 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY')!,
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY')!,
      },
    });
  }

  onModuleInit() { /* client created eagerly above */ }

  buildKey(ownerType: string, ownerId: string, filename: string): string {
    const safe = filename.replace(/[^A-Za-z0-9.\-_]+/g, '-');
    return `${ownerType}/${ownerId}/${randomUUID()}-${safe}`;
  }

  async put(key: string, body: Buffer, mimeType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: body, ContentType: mimeType,
    }));
  }

  async getStream(key: string): Promise<Readable> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return res.Body as Readable;
  }

  publicUrl(key: string): string {
    const base = this.config.get<string>('S3_PUBLIC_BASE_URL')!;
    return `${base}/${key}`;
  }
}