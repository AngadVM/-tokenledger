import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env-schema';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { PricingModule } from './pricing/pricing.module';
import { TeamModule } from './teams/team.module';
import { ApiKeyModule } from './api-keys/api-key.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { V1Module } from './v1/v1.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    RedisModule,
    PricingModule,
    TeamModule,
    ApiKeyModule,
    AuthModule,
    AdminModule,
    V1Module,
  ],
  controllers: [HealthController],
})
export class AppModule {}