import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configuration } from './config/configuration';
import { typeOrmConfig } from './config/typeorm.config';
import { HealthController } from './health.controller';
import { ResolveModule } from './modules/resolve/resolve.module';
import { QueueModule } from './modules/queue/queue.module';
import { PresetsModule } from './modules/presets/presets.module';
import { RenderModule } from './modules/render/render.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', load: [configuration] }),
    TypeOrmModule.forRootAsync({ useFactory: typeOrmConfig }),
    ResolveModule,
    QueueModule,
    PresetsModule,
    RenderModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
