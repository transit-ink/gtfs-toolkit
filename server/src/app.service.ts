import { Injectable, OnModuleInit } from '@nestjs/common';
import { DbSyncService } from './utils/db-sync.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly dbSyncService: DbSyncService) {}

  async onModuleInit() {
    try {
      await this.dbSyncService.syncAllEntities();
      await this.dbSyncService.installPgExtensions();
    } catch (error) {
      console.error('Database sync failed on startup:', error);
      throw error;
    }
  }
}
