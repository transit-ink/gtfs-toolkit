import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Change } from './entities/change.entity';
import { Changeset } from './entities/changeset.entity';
import { ChangesetController } from './changeset.controller';
import { ChangesetService } from './changeset.service';
import { ChangesetHelperService } from './changeset-helper.service';

@Module({
  imports: [TypeOrmModule.forFeature([Changeset, Change])],
  controllers: [ChangesetController],
  providers: [ChangesetService, ChangesetHelperService],
  exports: [ChangesetService, ChangesetHelperService],
})
export class ChangesetModule {}
