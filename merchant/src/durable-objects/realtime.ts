// ============================================================
// REALTIME DURABLE OBJECT
// ============================================================
// Manages WebSocket connections for real-time order events
// Each store has its own Durable Object instance for isolation

export interface WebSocketMessage {
  type:
    | 'order.created'
    | 'order.updated'
    | 'order.shipped'
    | 'order.refunded'
    | 'inventory.low'
    | 'ping'
    | 'pong';
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface ConnectionInfo {
  apiKey: string;
  storeId: string;
  connectedAt: string;
}

export class RealtimeDO implements DurableObject {
  private connections: Map<WebSocket, ConnectionInfo> = new Map();
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request, url);
    }

    // Handle broadcast from API
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      return this.handleBroadcast(request);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          connections: this.connections.size,
          ok: true,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleWebSocketUpgrade(request: Request, url: URL): Promise<Response> {
    // Extract auth from query params (passed during upgrade)
    const apiKey = url.searchParams.get('apiKey');
    const storeId = url.searchParams.get('storeId');

    if (!apiKey || !storeId) {
      return new Response('Missing authentication', { status: 401 });
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection
    this.state.acceptWebSocket(server);

    // Store connection info
    this.connections.set(server, {
      apiKey,
      storeId,
      connectedAt: new Date().toISOString(),
    });

    // Send welcome message
    server.send(
      JSON.stringify({
        type: 'connected',
        payload: {
          message: 'Connected to real-time updates',
          storeId,
        },
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    try {
      const { storeId, type, payload } = (await request.json()) as {
        storeId: string;
        type: WebSocketMessage['type'];
        payload: Record<string, unknown>;
      };

      const message: WebSocketMessage = {
        type,
        payload,
        timestamp: new Date().toISOString(),
      };

      const messageStr = JSON.stringify(message);
      let sent = 0;

      // Broadcast to all connections for this store
      for (const [ws, info] of this.connections) {
        if (info.storeId === storeId) {
          try {
            ws.send(messageStr);
            sent++;
          } catch {
            // Connection might be closed, will be cleaned up
            this.connections.delete(ws);
          }
        }
      }

      return new Response(JSON.stringify({ sent }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Handle incoming WebSocket messages
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;

    try {
      const data = JSON.parse(message);

      // Handle ping/pong for keepalive
      if (data.type === 'ping') {
        ws.send(
          JSON.stringify({
            type: 'pong',
            payload: {},
            timestamp: new Date().toISOString(),
          })
        );
      }
    } catch {
      // Ignore malformed messages
    }
  }

  // Handle WebSocket close
  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    this.connections.delete(ws);
  }

  // Handle WebSocket error
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    this.connections.delete(ws);
  }
}
