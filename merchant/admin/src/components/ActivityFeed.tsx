import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Radio,
  Wifi,
  WifiOff,
  ShoppingBag,
  Package,
  Truck,
  RefreshCw,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useWebSocket, type WebSocketMessage, type ConnectionStatus } from '../hooks/useWebSocket';
import clsx from 'clsx';

// ============================================================
// ACTIVITY FEED COMPONENT
// ============================================================

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: 'order' | 'shipped' | 'refund' | 'inventory';
}

interface ActivityFeedProps {
  /** Maximum number of items to display */
  maxItems?: number;
}

/**
 * Real-time activity feed showing order events via WebSocket
 */
export function ActivityFeed({ maxItems = 10 }: ActivityFeedProps) {
  const queryClient = useQueryClient();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Convert WebSocket message to activity item
  const messageToActivity = useCallback((message: WebSocketMessage): ActivityItem | null => {
    const { type, payload, timestamp } = message;

    switch (type) {
      case 'order.created': {
        const order = payload.order as Record<string, unknown> | undefined;
        const orderNumber =
          (order?.number as string) || (order?.id as string)?.slice(0, 8) || 'Unknown';
        const email = (order?.customer_email as string) || 'Unknown';
        const total =
          typeof order?.amounts === 'object' && order?.amounts
            ? (order.amounts as Record<string, number>).total_cents || 0
            : 0;
        return {
          id: `${type}-${timestamp}`,
          type,
          title: 'New Order',
          description: `Order ${orderNumber} from ${email} ($${(total / 100).toFixed(2)})`,
          timestamp,
          icon: 'order',
        };
      }
      case 'order.updated': {
        const order = payload.order as Record<string, unknown> | undefined;
        const orderNumber =
          (order?.number as string) || (order?.id as string)?.slice(0, 8) || 'Unknown';
        const newStatus = (order?.status as string) || 'updated';
        const prevStatus = (payload.previous_status as string) || 'unknown';
        return {
          id: `${type}-${timestamp}`,
          type,
          title: 'Order Updated',
          description: `Order ${orderNumber} changed from ${prevStatus} to ${newStatus}`,
          timestamp,
          icon: 'order',
        };
      }
      case 'order.shipped': {
        const order = payload.order as Record<string, unknown> | undefined;
        const orderNumber =
          (order?.number as string) || (order?.id as string)?.slice(0, 8) || 'Unknown';
        return {
          id: `${type}-${timestamp}`,
          type,
          title: 'Order Shipped',
          description: `Order ${orderNumber} has been shipped`,
          timestamp,
          icon: 'shipped',
        };
      }
      case 'order.refunded': {
        const order = payload.order as Record<string, unknown> | undefined;
        const orderNumber =
          (order?.number as string) || (order?.id as string)?.slice(0, 8) || 'Unknown';
        const refund = payload.refund as Record<string, number> | undefined;
        const amount = refund?.amount_cents || 0;
        return {
          id: `${type}-${timestamp}`,
          type,
          title: 'Order Refunded',
          description: `Order ${orderNumber} refunded ($${(amount / 100).toFixed(2)})`,
          timestamp,
          icon: 'refund',
        };
      }
      case 'inventory.low': {
        const sku = (payload.sku as string) || 'Unknown';
        const available = (payload.available as number) || 0;
        return {
          id: `${type}-${timestamp}`,
          type,
          title: 'Low Inventory',
          description: `SKU ${sku} is low (${available} available)`,
          timestamp,
          icon: 'inventory',
        };
      }
      default:
        return null;
    }
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      const activity = messageToActivity(message);
      if (activity) {
        setActivities((prev) => [activity, ...prev].slice(0, maxItems));

        // Invalidate relevant queries to refresh data
        if (message.type.startsWith('order.')) {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
        if (message.type === 'inventory.low') {
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
        }
      }
    },
    [messageToActivity, maxItems, queryClient]
  );

  // WebSocket connection
  const { status, connect, disconnect, isAvailable } = useWebSocket({
    onMessage: handleMessage,
    autoReconnect: true,
    maxReconnectAttempts: 5,
  });

  // Auto-connect on mount if available
  useEffect(() => {
    if (isAvailable) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [isAvailable, connect, disconnect]);

  // Get icon component for activity type
  const getIcon = (icon: ActivityItem['icon']) => {
    switch (icon) {
      case 'order':
        return <ShoppingBag size={14} />;
      case 'shipped':
        return <Truck size={14} />;
      case 'refund':
        return <RefreshCw size={14} />;
      case 'inventory':
        return <AlertTriangle size={14} />;
      default:
        return <Package size={14} />;
    }
  };

  // Status indicator
  const StatusIndicator = () => {
    const statusConfig: Record<
      ConnectionStatus,
      { color: string; icon: React.ReactNode; label: string }
    > = {
      connecting: {
        color: 'text-yellow-500',
        icon: <Radio size={12} className="animate-pulse" />,
        label: 'Connecting...',
      },
      connected: { color: 'text-green-500', icon: <Wifi size={12} />, label: 'Live' },
      disconnected: { color: 'text-gray-400', icon: <WifiOff size={12} />, label: 'Disconnected' },
      error: { color: 'text-red-500', icon: <WifiOff size={12} />, label: 'Error' },
    };

    const config = statusConfig[status];

    return (
      <div className={clsx('flex items-center gap-1 text-xs', config.color)}>
        {config.icon}
        <span>{config.label}</span>
      </div>
    );
  };

  // Format relative time
  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Don't render if WebSocket not available
  if (!isAvailable) {
    return null;
  }

  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 z-50 transition-all duration-200',
        isExpanded ? 'w-80' : 'w-auto'
      )}
    >
      {/* Collapsed button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-colors',
            status === 'connected'
              ? 'bg-green-500/10 hover:bg-green-500/20'
              : 'bg-gray-500/10 hover:bg-gray-500/20'
          )}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <StatusIndicator />
          {activities.length > 0 && (
            <span
              className="flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              {activities.length}
            </span>
          )}
        </button>
      )}

      {/* Expanded feed */}
      {isExpanded && (
        <div
          className="rounded-lg shadow-xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                Activity
              </h3>
              <StatusIndicator />
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Activity list */}
          <div className="max-h-64 overflow-y-auto">
            {activities.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No activity yet. Events will appear here in real-time.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="flex-shrink-0 mt-0.5 p-1 rounded"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                      >
                        {getIcon(activity.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                          {activity.title}
                        </p>
                        <p
                          className="text-xs truncate"
                          style={{ color: 'var(--text-muted)' }}
                          title={activity.description}
                        >
                          {activity.description}
                        </p>
                      </div>
                      <span
                        className="text-xs flex-shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reconnect button when disconnected */}
          {status === 'disconnected' && (
            <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={connect}
                className="w-full px-3 py-1.5 text-sm rounded transition-colors"
                style={{ background: 'var(--bg-hover)', color: 'var(--text)' }}
              >
                Reconnect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
