import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DbSyncService } from './db-sync.service';
import { GtfsExportService } from './gtfs-export.service';
import { Agency } from '../gtfs/agency/agency.entity';
import { Stop } from '../gtfs/stops/stop.entity';
import { Route } from '../gtfs/routes/route.entity';
import { Trip } from '../gtfs/trips/trip.entity';
import { StopTime } from '../gtfs/stop_times/stop-time.entity';
import { Calendar } from '../gtfs/calendar/calendar.entity';
import { CalendarDate } from '../gtfs/calendar_dates/calendar-date.entity';
import { Shape } from '../gtfs/shapes/shape.entity';
import { User } from '../auth/entities/user.entity';
import { Changeset } from '../changeset/entities/changeset.entity';
import { Change } from '../changeset/entities/change.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agency,
      Stop,
      Route,
      Trip,
      StopTime,
      Calendar,
      CalendarDate,
      Shape,
      User,
      Changeset,
      Change,
    ]),
  ],
  providers: [DbSyncService, GtfsExportService],
  exports: [DbSyncService, GtfsExportService],
})
export class UtilsModule {}
