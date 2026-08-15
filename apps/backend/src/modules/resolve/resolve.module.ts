import { Module } from '@nestjs/common';
import { PythonRunnerService } from './python-runner.service';
import { ResolveService } from './resolve.service';
import { ResolveGateway } from './resolve.gateway';
import { StatusPollerService } from './status-poller.service';
import { ResolveController } from './resolve.controller';

/**
 * The only part of the backend that knows DaVinci Resolve exists. Everything
 * outside this module talks to ResolveService, never to Python.
 */
@Module({
  controllers: [ResolveController],
  providers: [PythonRunnerService, ResolveService, ResolveGateway, StatusPollerService],
  exports: [ResolveService],
})
export class ResolveModule {}
