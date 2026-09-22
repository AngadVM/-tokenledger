import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TeamModule } from '../teams/team.module';
import { ApiKeyModule } from '../api-keys/api-key.module';
import { TeamsController } from './teams.controller';
import { ApiKeysController } from './api-keys.controller';

@Module({
  imports: [AuthModule, TeamModule, ApiKeyModule],
  controllers: [TeamsController, ApiKeysController],
})
export class AdminModule {}