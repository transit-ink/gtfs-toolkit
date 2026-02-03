import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UtilsModule } from '../utils/utils.module';
import { AgencyModule } from './agency/agency.module';
import { CalendarModule } from './calendar/calendar.module';
import { CalendarDatesModule } from './calendar_dates/calendar_dates.module';
import { GtfsController } from './gtfs.controller';
import { GtfsExportController } from './gtfs-export.controller';
import { GtfsService } from './gtfs.service';
import { RoutesModule } from './routes/routes.module';
import { ShapesModule } from './shapes/shapes.module';
import { StopTime } from './stop_times/stop-time.entity';
import { StopTimesModule } from './stop_times/stop_times.module';
import { StopsModule } from './stops/stops.module';
import { TripsModule } from './trips/trips.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StopTime]),
    UtilsModule,
    StopsModule,
    RoutesModule,
    TripsModule,
    CalendarModule,
    CalendarDatesModule,
    ShapesModule,
    AgencyModule,
    StopTimesModule,
  ],
  controllers: [GtfsController, GtfsExportController],
  providers: [GtfsService],
  exports: [GtfsService],
})
export class GtfsModule {}
