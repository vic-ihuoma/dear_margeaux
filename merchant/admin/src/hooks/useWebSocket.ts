import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuth } from '../lib/store';

// ============================================================
// WEBSOCKET HOOK FOR REAL-TIME UPDATES
// ============================================================

export type WebSocketEventType =
  | 'order.created'
  | 'order.updated'
  | 'order.shipped'
  | 'order.refunded'
  | 'inventory.low'
  | 'connected'
  | 'ping'
  | 'pong';

export interface WebSocketMessage {
  type: WebSocketEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  /** Callback when a message is received */
  onMessage?: (message: WebSocketMessage) => void;
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Enable auto-reconnection (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Base delay for reconnection in ms (default: 1000) */
  reconnectDelay?: number;
}

interface UseWebSocketReturn {
  /** Current connection status */
  status: ConnectionStatus;
  /** Last received message */
  lastMessage: WebSocketMessage | null;
  /** Connect to WebSocket */
  connect: () => void;
  /** Disconnect from WebSocket */
  disconnect: () => void;
  /** Whether WebSocket is available (API configured) */
  isAvailable: boolean;
}

/**
 * Hook for real-time WebSocket updates from the merchant API
 * Handles connection, reconnection, and message parsing
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    onMessage,
    onStatusChange,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update status and notify callback
  const updateStatus = useCallback(
    (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

  // Build WebSocket URL from API URL
  const getWebSocketUrl = useCallback(() => {
    const { apiUrl, apiKey } = getAuth();
    if (!apiUrl || !apiKey) return null;

    // Convert HTTP URL to WebSocket URL
    const url = new URL(apiUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/v1/realtime/ws';
    url.searchParams.set('apiKey', apiKey);

    return url.toString();
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Disconnect handler
  const disconnect = useCallback(() => {
    cleanup();
    reconnectAttemptsRef.current = 0;
    updateStatus('disconnected');
  }, [cleanup, updateStatus]);

  // Connect handler
  const connect = useCallback(() => {
    // Cleanup any existing connection
    cleanup();

    const wsUrl = getWebSocketUrl();
    if (!wsUrl) {
      setIsAvailable(false);
      updateStatus('error');
      return;
    }

    setIsAvailable(true);
    updateStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        updateStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
          onMessage?.(message);
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        cleanup();
        updateStatus('disconnected');

        // Auto-reconnect with exponential backoff
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        updateStatus('error');
      };
    } catch {
      updateStatus('error');
    }
  }, [
    cleanup,
    getWebSocketUrl,
    updateStatus,
    onMessage,
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
  ]);

  // Check availability on mount
  useEffect(() => {
    const { apiUrl, apiKey } = getAuth();
    setIsAvailable(Boolean(apiUrl && apiKey));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    lastMessage,
    connect,
    disconnect,
    isAvailable,
  };
}
