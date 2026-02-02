import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GtfsModule } from '../gtfs/gtfs.module';
import { RoutesModule } from '../gtfs/routes/routes.module';
import { StopsModule } from '../gtfs/stops/stops.module';
import { MessageCacheService } from './services/message-cache.service';
import { OpenAIService } from './services/openai.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RoutesModule,
    StopsModule,
    GtfsModule,
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, MessageCacheService, OpenAIService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
