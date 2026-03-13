import {
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  string,
  { icon: React.ReactNode; iconLg: React.ReactNode; className: string }
> = {
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    iconLg: <Clock className="h-4 w-4" />,
    className: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  running: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    iconLg: <Loader2 className="h-4 w-4 animate-spin" />,
    className: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  generating: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    iconLg: <Loader2 className="h-4 w-4 animate-spin" />,
    className: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  completed: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    iconLg: <CheckCircle className="h-4 w-4" />,
    className: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  failed: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    iconLg: <XCircle className="h-4 w-4" />,
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  cancelled: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    iconLg: <XCircle className="h-4 w-4" />,
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
};

interface StatusBadgeProps {
  status: string;
  /** 'sm' = compact (text-xs), 'lg' = larger (text-sm). Default: 'sm' */
  size?: 'sm' | 'lg';
  /** Whether to show the status icon. Default: true */
  showIcon?: boolean;
}

export function StatusBadge({ status, size = 'sm', showIcon = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.cancelled!;
  const { className } = config;
  const icon = size === 'lg' ? config.iconLg : config.icon;

  const sizeClasses = size === 'lg'
    ? 'gap-2 px-3 py-1 text-sm'
    : 'gap-1.5 px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${className}`}
    >
      {showIcon && icon}
      {status}
    </span>
  );
}
