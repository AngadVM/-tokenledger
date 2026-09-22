import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { ApiKeyModule } from '../api-keys/api-key.module';
import { ModelsController } from './models.controller';

@Module({
  imports: [PricingModule, ApiKeyModule],
  controllers: [ModelsController],
})
export class V1Module {}