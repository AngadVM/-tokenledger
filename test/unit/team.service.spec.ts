import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TeamService } from '../../src/teams/team.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const teamRow = (name: string) => ({
  id: 'team-1',
  name,
  createdAt: new Date('2026-01-01T00:00:00Z'),
});

describe('TeamService', () => {
  let service: TeamService;
  const create = jest.fn();
  const findMany = jest.fn();

  beforeEach(async () => {
    create.mockReset();
    findMany.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TeamService,
        { provide: PrismaService, useValue: { team: { create, findMany } } },
      ],
    }).compile();
    service = moduleRef.get(TeamService);
  });

  describe('create', () => {
    it('creates a team with the trimmed name', async () => {
      create.mockResolvedValue(teamRow('Engineering'));
      await expect(service.create('  Engineering  ')).resolves.toEqual(teamRow('Engineering'));
      expect(create).toHaveBeenCalledWith({ data: { name: 'Engineering' } });
    });

    it('rejects an empty name without touching the database', async () => {
      await expect(service.create('')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create('   ')).rejects.toBeInstanceOf(BadRequestException);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns teams ordered by newest first', async () => {
      findMany.mockResolvedValue([teamRow('A'), teamRow('B')]);
      await service.list();
      expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
    });
  });
});