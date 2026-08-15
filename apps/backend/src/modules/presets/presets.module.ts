import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StylePresetEntity } from './entities/style-preset.entity';
import { PresetsService } from './presets.service';
import { PresetsController } from './presets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StylePresetEntity])],
  controllers: [PresetsController],
  providers: [PresetsService],
  exports: [PresetsService],
})
export class PresetsModule {}
