export type ActivityType = 'order' | 'product' | 'inventory';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  href?: string;
  /** For orders: the order status */
  status?: string;
  /** For orders: total amount */
  amount?: string;
}

export interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case 'order':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
          />
        </svg>
      );
    case 'product':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
          />
        </svg>
      );
    case 'inventory':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
          />
        </svg>
      );
  }
}

function getActivityIconStyle(type: ActivityType) {
  switch (type) {
    case 'order':
      return {
        bg: 'bg-accent-100',
        text: 'text-accent-600',
      };
    case 'product':
      return {
        bg: 'bg-primary-100',
        text: 'text-primary-600',
      };
    case 'inventory':
      return {
        bg: 'bg-status-info/20',
        text: 'text-status-info',
      };
  }
}

function getStatusBadgeStyle(status: string) {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'delivered':
      return 'bg-status-success/10 text-status-success';
    case 'processing':
    case 'shipped':
      return 'bg-status-info/10 text-status-info';
    case 'pending':
      return 'bg-status-warning/10 text-status-warning';
    case 'refunded':
    case 'canceled':
      return 'bg-status-error/10 text-status-error';
    default:
      return 'bg-background-tertiary text-text-secondary';
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-background-tertiary" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-background-tertiary rounded" />
            <div className="h-3 w-1/2 bg-background-tertiary rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  message,
  description,
}: {
  message: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-background-tertiary flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6 text-text-muted"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </div>
      <p className="text-sm text-text-secondary">{message}</p>
      <p className="text-xs text-text-muted mt-1">{description}</p>
    </div>
  );
}

export function ActivityFeed({
  activities,
  loading = false,
  emptyMessage = 'No recent activity',
  emptyDescription = 'Orders and product updates will appear here',
}: ActivityFeedProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (activities.length === 0) {
    return <EmptyState message={emptyMessage} description={emptyDescription} />;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const iconStyle = getActivityIconStyle(activity.type);
        const content = (
          <div className="flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconStyle.bg}`}
            >
              <span className={iconStyle.text}>
                {getActivityIcon(activity.type)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 truncate">
                    {activity.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                  {activity.status && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${getStatusBadgeStyle(activity.status)}`}
                    >
                      {activity.status}
                    </span>
                  )}
                </div>
              </div>
              {activity.amount && (
                <p className="text-sm font-medium text-text-primary mt-1">
                  {activity.amount}
                </p>
              )}
            </div>
          </div>
        );

        if (activity.href) {
          return (
            <a
              key={activity.id}
              href={activity.href}
              className="block p-2 -m-2 rounded-lg hover:bg-background-tertiary transition-colors duration-normal"
            >
              {content}
            </a>
          );
        }

        return <div key={activity.id}>{content}</div>;
      })}
    </div>
  );
}
