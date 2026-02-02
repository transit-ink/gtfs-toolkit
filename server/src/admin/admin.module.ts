import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UtilsModule } from '../utils/utils.module';

@Module({
  imports: [UtilsModule],
  controllers: [AdminController],
})
export class AdminModule {}
