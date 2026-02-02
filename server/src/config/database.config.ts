import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Agency } from '../gtfs/agency/agency.entity';
import { Stop } from '../gtfs/stops/stop.entity';
import { Route } from '../gtfs/routes/route.entity';
import { Trip } from '../gtfs/trips/trip.entity';
import { StopTime } from '../gtfs/stop_times/stop-time.entity';
import { Calendar } from '../gtfs/calendar/calendar.entity';
import { CalendarDate } from '../gtfs/calendar_dates/calendar-date.entity';
import { Shape } from '../gtfs/shapes/shape.entity';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfig } from './configuration';
import { User } from '../auth/entities/user.entity';
import { Group } from '../group/group.entity';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const dbConfig = configService.get<DatabaseConfig>('database');
  if (!dbConfig) {
    throw new Error('Database configuration is not available');
  }

  return {
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    entities: [
      Agency,
      Stop,
      Route,
      Trip,
      StopTime,
      Calendar,
      CalendarDate,
      Shape,
      User,
      Group,
    ],
    synchronize: process.env.NODE_ENV !== 'production', // Set to false in production
    ssl: {
      rejectUnauthorized: dbConfig.ssl,
    },
    poolSize: dbConfig.maxConnections,
    extra: {
      idleTimeoutMillis: dbConfig.idleTimeout,
    },
  };
};
