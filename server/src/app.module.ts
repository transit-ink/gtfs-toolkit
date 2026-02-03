import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SentryModule } from '@sentry/nestjs/setup';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  openaiConfig,
  uiConfig,
  whatsappConfig,
} from './config/configuration';
import { getDatabaseConfig } from './config/database.config';
import { ChangesetModule } from './changeset/changeset.module';
import { GroupModule } from './group/group.module';
import { GtfsModule } from './gtfs/gtfs.module';
import { UtilsModule } from './utils/utils.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
      load: [
        databaseConfig,
        appConfig,
        jwtConfig,
        whatsappConfig,
        openaiConfig,
        uiConfig,
      ],
    }),
    ScheduleModule.forRoot(),
    TerminusModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    GtfsModule,
    GroupModule,
    ChangesetModule,
    AuthModule,
    AdminModule,
    UtilsModule,
    WhatsAppModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
