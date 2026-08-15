import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import type { RenderJobResult, RenderProgressPayload } from '@lower-thirds/shared';

/** Streams render progress so a long batch shows movement instead of a spinner. */
@WebSocketGateway({ cors: { origin: ['http://localhost:5173'], credentials: true } })
export class RenderGateway {
  private readonly logger = new Logger(RenderGateway.name);

  @WebSocketServer()
  private server!: Server;

  progress(payload: RenderProgressPayload): void {
    this.server.emit('render:progress', payload);
  }

  done(jobId: string, result: RenderJobResult): void {
    this.logger.log(
      `Render job ${jobId} finished: ${String(result.files.length)} file(s), ${String(result.failed.length)} failed`,
    );
    this.server.emit('render:done', { jobId, result });
  }
}
