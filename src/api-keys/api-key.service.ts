import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { KeyStatus, type ApiKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function generateRawKey(): string {
  
  return 'sk-' + randomBytes(32).toString('base64url');
}

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

const PREFIX_LENGTH = 12;

function toPrefix(raw: string): string {
  return raw.slice(0, PREFIX_LENGTH);
}

export interface MintedKey {
  rawKey: string; 
  apiKey: ApiKey;
}

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async mint(input: {
    teamId: string;
    label: string;
    monthlyBudgetUsd?: number;
  }): Promise<MintedKey> {
    const team = await this.prisma.team.findUnique({where: {id: input.teamId}});
    if (!team) {
      throw new NotFoundException(`Team ${input.teamId} not found`);
    }

    const trimmedLabel = input.label.trim();
    if (!trimmedLabel) {
      throw new BadRequestException('Label must not be empty');
    }

    // Budget defaults to 0 and must be a finite, non-negative amount.
    const budget = input.monthlyBudgetUsd ?? 0;
    if (budget < 0 || !Number.isFinite(budget)) {
      throw new BadRequestException('Monthly budget must be a non-negative number');
    }

    const raw = generateRawKey();
    const hashed = hashKey(raw);

    const created = await this.prisma.apiKey.create({
      data: {
        teamId: input.teamId,
        label: trimmedLabel,
        hashedKey: hashed, 
        prefix: toPrefix(raw), 
        status: KeyStatus.ACTIVE,
        monthlyBudgetUsd: budget,
      },
    });
    
    return { rawKey: raw, apiKey: created };
  }

  async revoke(id: string): Promise<ApiKey | null> {
    
    return this.prisma.apiKey.updateMany({
      where: { id, status: KeyStatus.ACTIVE },
      data: { status: KeyStatus.REVOKED },
    }).then(() => this.prisma.apiKey.findUnique({ where: { id } }));
  }

  async findByRawKey(raw: string): Promise<ApiKey | null> {
   
    return this.prisma.apiKey.findUnique({ where: { hashedKey: hashKey(raw) } });
  }

  async list(filter?: { teamId?: string }): Promise<ApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: filter?.teamId ? { teamId: filter.teamId } : undefined,
      include: { team: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}