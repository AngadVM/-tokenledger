import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { TeamService } from '../teams/team.service';
import { CreateTeamDto } from '../dto/create-team.dto';

@Controller('admin/teams')
@UseGuards(AdminGuard)
export class TeamsController {
  constructor(private readonly teams: TeamService) {}

  @Get()
  list() {
    return this.teams.list();
  }

  @Post()
  create(@Body() dto: CreateTeamDto) {
    return this.teams.create(dto.name);
  }
}