import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { ApiKey } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guard';
import { ApiKeyService } from '../api-keys/api-key.service';
import { MintKeyDto } from '../dto/mint-key.dto';

type KeyView = Pick<ApiKey, 'id' | 'teamId' | 'label' | 'prefix' | 'status' | 'monthlyBudgetUsd' | 'createdAt'>;

@Controller('admin/keys')
@UseGuards(AdminGuard)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeyService) {}

  @Get()
  async list(@Query('teamId') teamId?: string) {
    const keys = await this.apiKeys.list(teamId ? { teamId } : undefined);
    return keys.map((key) => ({ ...this.toView(key), teamName: key.team?.name ?? null }));
  }

  @Post()
  async mint(@Body() dto: MintKeyDto) {
    const { rawKey, apiKey } = await this.apiKeys.mint({
      teamId: dto.teamId,
      label: dto.label,
      monthlyBudgetUsd: dto.monthlyBudgetUsd,
    });
    // rawKey is shown only on mint — it's gone from the API afterwards forever.
    return { ...this.toView(apiKey), rawKey };
  }

  @Post(':id/revoke')
  async revoke(@Param('id') id: string) {
    const apiKey = await this.apiKeys.revoke(id);
    if (!apiKey) {
      throw new NotFoundException('Key not found');
    }
    return this.toView(apiKey);
  }

  // Never let hashedKey escape: emit only the public fields.
  private toView(apiKey: ApiKey): KeyView {
    return {
      id: apiKey.id,
      teamId: apiKey.teamId,
      label: apiKey.label,
      prefix: apiKey.prefix,
      status: apiKey.status,
      monthlyBudgetUsd: apiKey.monthlyBudgetUsd,
      createdAt: apiKey.createdAt,
    };
  }
}