import { BadRequestException, Injectable } from '@nestjs/common';
import type { Team } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string): Promise<Team> {
   
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Team name must not be empty');
    }
    return this.prisma.team.create({ data: { name: trimmed } });
  }

  async list(): Promise<Team[]> {
    return this.prisma.team.findMany({ orderBy: { createdAt: 'desc' } });
  }
}