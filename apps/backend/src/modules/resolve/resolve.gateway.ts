import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { ResolveStatus } from '@lower-thirds/shared';
import { ResolveService } from './resolve.service';

/**
 * Pushes link state to the UI.
 *
 * Status is broadcast only when it changes (see StatusPollerService), so the
 * indicator is push-driven rather than polled from the browser.
 */
@WebSocketGateway({ cors: { origin: ['http://localhost:5173'], credentials: true } })
export class ResolveGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ResolveGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(private readonly resolve: ResolveService) {}

  /** Paint the indicator immediately, without waiting for the next poll tick. */
  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
    client.emit('resolve:status', this.resolve.getLastStatus());
  }

  broadcastStatus(status: ResolveStatus): void {
    this.server.emit('resolve:status', status);
  }

  /** Client-initiated re-check, e.g. after the user launches Resolve. */
  @SubscribeMessage('resolve:refresh')
  async handleRefresh(): Promise<void> {
    const status = await this.resolve.fetchStatus();
    this.broadcastStatus(status);
  }
}
