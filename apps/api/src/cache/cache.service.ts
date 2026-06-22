import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private redis!: Redis;
  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.redis = new Redis(this.config.get<string>('REDIS_URL')!);
  }

  async onModuleDestroy() {
    if (this.redis) await this.redis.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async invalidate(prefix: string): Promise<void> {
    const keys = await this.redis.keys(`${prefix}*`);
    if (keys.length) await this.redis.del(...keys);
  }
}