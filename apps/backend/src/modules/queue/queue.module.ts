import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueListEntity } from './entities/queue-list.entity';
import { QueueItemEntity } from './entities/queue-item.entity';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { ImportExportService } from './import-export.service';

@Module({
  imports: [TypeOrmModule.forFeature([QueueListEntity, QueueItemEntity])],
  controllers: [QueueController],
  providers: [QueueService, ImportExportService],
  exports: [QueueService],
})
export class QueueModule {}
