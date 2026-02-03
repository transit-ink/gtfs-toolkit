import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangesetModule } from '../../changeset/changeset.module';
import { StopTime } from './stop-time.entity';
import { StopTimesController } from './stop_times.controller';
import { StopTimesService } from './stop_times.service';

@Module({
  imports: [TypeOrmModule.forFeature([StopTime]), ChangesetModule],
  controllers: [StopTimesController],
  providers: [StopTimesService],
  exports: [StopTimesService],
})
export class StopTimesModule {}
