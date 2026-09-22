import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { PricingService } from '../pricing/pricing.service';

@Controller('v1/models')
@UseGuards(ApiKeyGuard)
export class ModelsController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  async list() {
    const entries = await this.pricing.listPrices();
    return {
      object: 'list',
      data: entries.map((p) => ({ id: p.model, object: 'model', owned_by: p.provider })),
    };
  }
}
