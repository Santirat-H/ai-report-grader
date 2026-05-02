import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { StorageModule } from '../storage/storage.module';
import { GradingService } from '../grading/grading.service';

@Module({
  imports: [StorageModule],
  controllers: [FileController],
  providers: [FileService, GradingService],
})
export class FileModule {}
