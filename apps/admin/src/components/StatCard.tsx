export type StatIconType = 'products' | 'orders' | 'revenue' | 'calendar';

export interface StatCardProps {
  /** Title/label for the stat */
  label: string;
  /** The main value to display */
  value: string | number;
  /** Icon type to display */
  iconType: StatIconType;
  /** Background color class for the icon container (e.g., 'bg-primary-100') */
  iconBgColor: string;
  /** Text color class for the icon (e.g., 'text-primary-600') */
  iconColor: string;
  /** Optional link URL */
  href?: string;
  /** Optional subtitle/additional info */
  subtitle?: string;
  /** Whether data is still loading */
  loading?: boolean;
}

function getIcon(type: StatIconType) {
  switch (type) {
    case 'products':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
          />
        </svg>
      );
    case 'orders':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
          />
        </svg>
      );
    case 'revenue':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      );
    case 'calendar':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
          />
        </svg>
      );
  }
}

export function StatCard({
  label,
  value,
  iconType,
  iconBgColor,
  iconColor,
  href,
  subtitle,
  loading = false,
}: StatCardProps) {
  const content = (
    <div className="flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBgColor}`}
      >
        <span className={iconColor}>{getIcon(iconType)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        {loading ? (
          <div className="h-8 w-20 bg-background-tertiary rounded animate-pulse mt-0.5" />
        ) : (
          <p className="text-2xl font-semibold text-text-primary truncate">
            {value}
          </p>
        )}
        {subtitle && !loading && (
          <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );

  const baseClasses =
    'bg-background-secondary rounded-xl p-6 border border-border shadow-sm transition-colors duration-normal';

  if (href) {
    return (
      <a
        href={href}
        className={`${baseClasses} hover:border-primary-300 hover:shadow-md block`}
      >
        {content}
      </a>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}
