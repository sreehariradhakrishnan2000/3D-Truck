import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { WS_EVENTS } from '@cargoflow/shared-types';
import type { JwtPayload } from '@cargoflow/shared-types';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      const isProduction = process.env.NODE_ENV === 'production';
      const allowedOrigins = (process.env.CORS_ORIGIN || process.env.WEB_URL || (isProduction ? 'https://cargoflow.com' : 'http://localhost:3000'))
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

      const isAllowed =
        allowedOrigins.some((allowed) => {
          if (!isProduction && allowed === '*') return true;
          return origin === allowed || origin.startsWith(allowed);
        }) ||
        origin.endsWith('.pages.dev') ||
        origin.endsWith('.workers.dev') ||
        origin.endsWith('.cargoflow.com');

      if (isAllowed) {
        return callback(null, true);
      }

      // In development mode only, permit localhost and 127.0.0.1
      if (!isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }

      return callback(new Error(`WebSocket origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
  },
  namespace: '/ws',
})
export class LoadGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(LoadGateway.name);
  private connectedUsers = new Map<string, { user: JwtPayload; loadId?: string }>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify<JwtPayload>(token);
      client.user = payload;
      this.connectedUsers.set(client.id, { user: payload });
      this.logger.log(`WS connected: ${client.id} (${payload.email})`);
    } catch {
      this.logger.warn(`Unauthorized WS connection: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userData = this.connectedUsers.get(client.id);
    if (userData?.loadId) {
      client.to(`load:${userData.loadId}`).emit(WS_EVENTS.USER_LEFT, {
        userId: userData.user.sub,
      });
      this.connectedUsers.delete(client.id);
      this.broadcastPresence(userData.loadId);
    } else {
      this.connectedUsers.delete(client.id);
    }
  }

  @SubscribeMessage(WS_EVENTS.JOIN_LOAD)
  handleJoinLoad(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { loadId: string },
  ) {
    if (!client.user) throw new WsException('Unauthorized');

    const prev = this.connectedUsers.get(client.id);
    if (prev?.loadId) {
      client.leave(`load:${prev.loadId}`);
      this.broadcastPresence(prev.loadId);
    }

    client.join(`load:${data.loadId}`);
    const entry = this.connectedUsers.get(client.id);
    if (entry) entry.loadId = data.loadId;

    client.to(`load:${data.loadId}`).emit(WS_EVENTS.USER_JOINED, {
      userId: client.user.sub,
      email: client.user.email,
    });

    this.broadcastPresence(data.loadId);

    return { event: 'joinedLoad', data: { loadId: data.loadId } };
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_LOAD)
  handleLeaveLoad(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { loadId: string },
  ) {
    client.leave(`load:${data.loadId}`);
    const entry = this.connectedUsers.get(client.id);
    if (entry) entry.loadId = undefined;
    client.to(`load:${data.loadId}`).emit(WS_EVENTS.USER_LEFT, { userId: client.user?.sub });
    this.broadcastPresence(data.loadId);
  }

  @SubscribeMessage('cursor.move')
  handleCursorMove(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { loadId: string; position: { x: number; y: number; z: number } },
  ) {
    if (!client.user) return;
    client.to(`load:${data.loadId}`).emit(WS_EVENTS.CURSOR_MOVED, {
      userId: client.user.sub,
      email: client.user.email,
      position: data.position,
    });
  }

  private broadcastPresence(loadId: string) {
    const usersInLoad: Array<{ userId: string; email: string }> = [];
    const seen = new Set<string>();

    for (const data of this.connectedUsers.values()) {
      if (data.loadId === loadId && !seen.has(data.user.sub)) {
        seen.add(data.user.sub);
        usersInLoad.push({ userId: data.user.sub, email: data.user.email });
      }
    }

    this.server.to(`load:${loadId}`).emit(WS_EVENTS.LOAD_PRESENCE, {
      loadId,
      users: usersInLoad,
    });
  }

  /** Broadcast a placement event to all users in a load room (except the sender) */
  broadcastToLoad(loadId: string, event: string, payload: unknown, excludeSocketId?: string) {
    if (excludeSocketId) {
      this.server.to(`load:${loadId}`).except(excludeSocketId).emit(event, payload);
    } else {
      this.server.to(`load:${loadId}`).emit(event, payload);
    }
  }
}

