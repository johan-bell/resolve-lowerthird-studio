import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { FrameRendererService } from './frame-renderer.service';
import { EncoderService } from './encoder.service';
import { RenderService } from './render.service';
import { RenderGateway } from './render.gateway';
import { RenderController } from './render.controller';

@Module({
  imports: [QueueModule],
  controllers: [RenderController],
  providers: [FrameRendererService, EncoderService, RenderService, RenderGateway],
  exports: [RenderService],
})
export class RenderModule {}
