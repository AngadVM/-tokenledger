import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { KeyStatus, type ApiKey } from '@prisma/client';
import { Request } from 'express';
import { ApiKeyService } from './api-key.service';

export interface ApiKeyRequest extends Request {
  apiKey: ApiKey;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeyService) {}

async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ApiKeyRequest>();
    if (!req.headers.authorization) throw new UnauthorizedException();
    const raw = req.headers.authorization.split(' ')[1];
    if (!raw) throw new UnauthorizedException();
    const apiKey = await this.apiKeys.findByRawKey(raw);
    if (!apiKey || apiKey.status !== KeyStatus.ACTIVE) throw new UnauthorizedException();
    req.apiKey = apiKey;
    return true;
  }
}