import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PricingService } from '../../src/pricing/pricing.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const priceEntry = (
  overrides: Partial<Record<string, unknown>> = {},
) => ({
  id: 'price-gpt-4o',
  model: 'gpt-4o',
  provider: 'openai',
  inputPer1k: new Prisma.Decimal('0.0025'),
  outputPer1k: new Prisma.Decimal('0.01'),
  ...overrides,
});

describe('PricingService', () => {
  let service: PricingService;
  const findUnique = jest.fn();
  const findMany = jest.fn();

  beforeEach(async () => {
    findUnique.mockReset();
    findMany.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: { priceEntry: { findUnique, findMany } } },
      ],
    }).compile();
    service = moduleRef.get(PricingService);
  });

  describe('getPrice', () => {
    it('returns the price entry for a known model', async () => {
      findUnique.mockResolvedValue(priceEntry());
      await expect(service.getPrice('gpt-4o')).resolves.toEqual(priceEntry());
      expect(findUnique).toHaveBeenCalledWith({ where: { model: 'gpt-4o' } });
    });

    it("throws NotFoundException when the model has no price entry", async () => {
      findUnique.mockResolvedValue(null);
      await expect(service.getPrice('unknown-model')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('calculateCost', () => {
    it('computes input + output cost from per-1k rates', async () => {
      findUnique.mockResolvedValue(priceEntry());
      const cost = await service.calculateCost('gpt-4o', 1000, 500);
      expect(cost.toString()).toBe('0.0075');
    });

    it('rounds fractional results to 8 decimal places', async () => {
      findUnique.mockResolvedValue(priceEntry());
      const cost = await service.calculateCost('gpt-4o', 1, 1);
      expect(cost.toString()).toBe('0.0000125');
    });

    it('costs zero tokens as zero', async () => {
      findUnique.mockResolvedValue(priceEntry({ inputPer1k: new Prisma.Decimal('0.0025') }));
      const cost = await service.calculateCost('gpt-4o', 0, 0);
      expect(cost.toString()).toBe('0');
    });

    it('costs a free model as zero', async () => {
      findUnique.mockResolvedValue(
        priceEntry({ inputPer1k: new Prisma.Decimal(0), outputPer1k: new Prisma.Decimal(0) }),
      );
      const cost = await service.calculateCost('free-model', 5000, 5000);
      expect(cost.toString()).toBe('0');
    });
  });

  describe('listPrices', () => {
    it('returns all price entries ordered by model', async () => {
      findMany.mockResolvedValue([priceEntry(), priceEntry({ model: 'gpt-4o-mini' })]);
      await service.listPrices();
      expect(findMany).toHaveBeenCalledWith({ orderBy: { model: 'asc' } });
    });
  });
});