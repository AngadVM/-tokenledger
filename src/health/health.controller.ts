import { Controller, Get, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    let db: 'up' | 'down';
    let redis: 'up' | 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }

    try {
      const pong = await this.redis.ping();
      redis = pong === 'PONG' ? 'up' : 'down';
    } catch {
      redis = 'down';
    }

    return {
      status: db === 'up' && redis === 'up' ? 'ok' : 'degraded',
      db,
      redis,
      uptime: process.uptime(),
    };
  }
}