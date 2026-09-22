import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PriceEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async getPrice(model: string): Promise<PriceEntry> {
    
    const entry = await this.prisma.priceEntry.findUnique({where: {model}});
    if (!entry) {
      throw new NotFoundException(`No price entry for model "${model}"`);
    }
    return entry;
  }

  async calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): Promise<Prisma.Decimal> {
    const { inputPer1k, outputPer1k } = await this.getPrice(model);
  
    
    const cost = new Prisma.Decimal(inputTokens)
      .div(1000)
      .mul(inputPer1k)
      .plus(new Prisma.Decimal(outputTokens).div(1000).mul(outputPer1k))
      .toDecimalPlaces(8);
    return cost;
  }

  async listPrices(): Promise<PriceEntry[]> {
    return this.prisma.priceEntry.findMany({ orderBy: { model: 'asc' } });
  }
}