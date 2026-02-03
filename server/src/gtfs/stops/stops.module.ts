import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangesetModule } from '../../changeset/changeset.module';
import { StopTime } from '../stop_times/stop-time.entity';
import { Trip } from '../trips/trip.entity';
import { Stop } from './stop.entity';
import { StopsController } from './stops.controller';
import { StopsService } from './stops.service';

@Module({
  imports: [TypeOrmModule.forFeature([Stop, StopTime, Trip]), ChangesetModule],
  controllers: [StopsController],
  providers: [StopsService],
  exports: [StopsService],
})
export class StopsModule {}
