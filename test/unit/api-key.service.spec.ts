import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { KeyStatus, Prisma } from '@prisma/client';
import { ApiKeyService } from '../../src/api-keys/api-key.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const apiKeyRow = (hashedKey: string, overrides: Record<string, unknown> = {}) => ({
  id: 'key-1',
  teamId: 'team-1',
  label: 'CI runner',
  hashedKey,
  prefix: hashedKey.slice(0, 12),
  status: KeyStatus.ACTIVE,
  monthlyBudgetUsd: new Prisma.Decimal(0),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  const teamFindUnique = jest.fn();
  const keyFindUnique = jest.fn();
  const keyCreate = jest.fn();
  const keyUpdateMany = jest.fn();
  const keyFindMany = jest.fn();

  beforeEach(async () => {
    teamFindUnique.mockReset();
    keyFindUnique.mockReset();
    keyCreate.mockReset();
    keyUpdateMany.mockReset();
    keyFindMany.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: PrismaService,
          useValue: {
            team: { findUnique: teamFindUnique },
            apiKey: {
              findUnique: keyFindUnique,
              create: keyCreate,
              updateMany: keyUpdateMany,
              findMany: keyFindMany,
            },
          },
        },
      ],
    }).compile();
    service = moduleRef.get(ApiKeyService);
  });

  describe('mint', () => {
    const mintInput = { teamId: 'team-1', label: '  CI runner  ' };

    it("throws NotFoundException when the team doesn't exist", async () => {
      teamFindUnique.mockResolvedValue(null);
      await expect(service.mint(mintInput)).rejects.toBeInstanceOf(NotFoundException);
      expect(keyCreate).not.toHaveBeenCalled();
    });

    it('rejects an empty label before creating the key', async () => {
      teamFindUnique.mockResolvedValue({ id: 'team-1' });
      await expect(service.mint({ teamId: 'team-1', label: '   ' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(keyCreate).not.toHaveBeenCalled();
    });

    it('returns the raw key once and persists only its SHA-256 hash', async () => {
      teamFindUnique.mockResolvedValue({ id: 'team-1' });
      keyCreate.mockImplementation(({ data }: { data: { hashedKey: string } }) =>
        Promise.resolve(apiKeyRow(data.hashedKey)),
      );

      const { rawKey, apiKey } = await service.mint(mintInput);

      expect(rawKey).toMatch(/^sk-[A-Za-z0-9_-]{43}$/);
      expect(rawKey.startsWith('sk-')).toBe(true);
      expect(apiKey.status).toBe(KeyStatus.ACTIVE);

      const stored = keyCreate.mock.calls[0][0].data;
      expect(stored.hashedKey).toBe(sha256(rawKey));
      expect(stored.hashedKey).not.toBe(rawKey);
      expect(stored).not.toHaveProperty('rawKey', rawKey);
      expect(stored.label).toBe('CI runner');
    });

    it('derives the stored prefix from the raw key (not from its hash)', async () => {
      teamFindUnique.mockResolvedValue({ id: 'team-1' });
      keyCreate.mockImplementation(({ data }: { data: { hashedKey: string } }) =>
        Promise.resolve(apiKeyRow(data.hashedKey)),
      );

      const { rawKey } = await service.mint(mintInput);
      const stored = keyCreate.mock.calls[0][0].data;

      expect(stored.prefix).toBe(rawKey.slice(0, 12));
    });

    it('mints distinct keys on consecutive calls', async () => {
      teamFindUnique.mockResolvedValue({ id: 'team-1' });
      keyCreate.mockImplementation(({ data }: { data: { hashedKey: string } }) =>
        Promise.resolve(apiKeyRow(data.hashedKey)),
      );

      const first = await service.mint(mintInput);
      const second = await service.mint(mintInput);

      expect(first.rawKey).not.toBe(second.rawKey);
      expect(keyCreate.mock.calls[0][0].data.hashedKey).not.toBe(
        keyCreate.mock.calls[1][0].data.hashedKey,
      );
    });

    it('persists a provided monthly budget', async () => {
      teamFindUnique.mockResolvedValue({ id: 'team-1' });
      keyCreate.mockImplementation(({ data }: { data: { hashedKey: string } }) =>
        Promise.resolve(apiKeyRow(data.hashedKey)),
      );

      await service.mint({ teamId: 'team-1', label: 'prod', monthlyBudgetUsd: 250 });
      expect(keyCreate.mock.calls[0][0].data.monthlyBudgetUsd).toBe(250);
    });

    it('defaults the budget to 0 when omitted', async () => {
      teamFindUnique.mockResolvedValue({ id: 'team-1' });
      keyCreate.mockImplementation(({ data }: { data: { hashedKey: string } }) =>
        Promise.resolve(apiKeyRow(data.hashedKey)),
      );

      await service.mint(mintInput);
      expect(keyCreate.mock.calls[0][0].data.monthlyBudgetUsd).toBe(0);
    });

    it('rejects a negative budget', async () => {
      teamFindUnique.mockResolvedValue({ id: 'team-1' });
      await expect(
        service.mint({ teamId: 'team-1', label: 'x', monthlyBudgetUsd: -5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(keyCreate).not.toHaveBeenCalled();
    });
  });

  describe('findByRawKey', () => {
    it('looks up by the hashed value, never the raw key', async () => {
      const hashed = sha256('sk-secret');
      keyFindUnique.mockResolvedValue(apiKeyRow(hashed));
      const result = await service.findByRawKey('sk-secret');
      expect(result).toEqual(apiKeyRow(hashed));
      expect(keyFindUnique).toHaveBeenCalledWith({ where: { hashedKey: hashed } });
    });

    it('returns null for an unknown key', async () => {
      keyFindUnique.mockResolvedValue(null);
      await expect(service.findByRawKey('sk-unknown')).resolves.toBeNull();
    });
  });

  describe('revoke', () => {
    it('flips only active keys to REVOKED and returns the refreshed row', async () => {
      const hashed = sha256('sk-secret');
      const revoked = apiKeyRow(hashed, { status: KeyStatus.REVOKED });
      keyUpdateMany.mockResolvedValue({ count: 1 });
      keyFindUnique.mockResolvedValue(revoked);

      const result = await service.revoke('key-1');

      expect(keyUpdateMany).toHaveBeenCalledWith({
        where: { id: 'key-1', status: KeyStatus.ACTIVE },
        data: { status: KeyStatus.REVOKED },
      });
      expect(result).toEqual(revoked);
    });

    it('is a no-op for an unknown key and returns null', async () => {
      keyUpdateMany.mockResolvedValue({ count: 0 });
      keyFindUnique.mockResolvedValue(null);
      await expect(service.revoke('nope')).resolves.toBeNull();
      expect(keyUpdateMany).toHaveBeenCalledWith({
        where: { id: 'nope', status: KeyStatus.ACTIVE },
        data: { status: KeyStatus.REVOKED },
      });
    });
  });

  describe('list', () => {
    it('filters by teamId when provided', async () => {
      keyFindMany.mockResolvedValue([]);
      await service.list({ teamId: 'team-1' });
      expect(keyFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teamId: 'team-1' } }),
      );
    });

    it('omits the filter when no teamId is provided', async () => {
      keyFindMany.mockResolvedValue([]);
      await service.list();
      expect(keyFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });
});