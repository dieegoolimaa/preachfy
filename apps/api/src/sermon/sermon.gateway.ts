import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SermonService } from './sermon.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SermonGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('SermonGateway');

  constructor(private sermonService: SermonService) { }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sync-canvas')
  async handleSyncCanvas(
    @MessageBody() data: { sermonId: string; blocks: any[] },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    this.logger.log(`Syncing canvas for sermon: ${data.sermonId}`);
    await this.sermonService.syncFullSermon(data.sermonId, data.blocks);
    client.broadcast.emit('canvas-updated', data);
  }

  @SubscribeMessage('sync-meta')
  async handleSyncMeta(
    @MessageBody() data: { sermonId: string; meta: any },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    this.logger.log(`Syncing meta for sermon: ${data.sermonId}`);
    // No need to save to DB here as Study mode handles PATCH, 
    // but broadcasting ensures the Pulpit view updates instantly
    client.broadcast.emit('meta-updated', data);
  }

  @SubscribeMessage('pulpit-action')
  async handlePulpitAction(
    @MessageBody() data: { blockId: string; action: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    this.logger.log(`Action ${data.action} on block ${data.blockId}`);

    if (data.action === 'markAsPreached') {
      await this.sermonService.markAsPreached(data.blockId);
    }

    client.broadcast.emit('pulpit-state-changed', data);
  }
}
