import { cn } from '@/lib/utils';

const PLATFORM_NAMES: Record<string, string> = {
  ctrip: '携程',
  xiaohongshu: '小红书',
  weibo: '微博',
  tongcheng: '同程旅行',
  mafengwo: '马蜂窝',
  qunar: '去哪儿',
};

const PLATFORM_COLORS: Record<string, string> = {
  ctrip: 'bg-blue-100 text-blue-800 border-blue-200',
  xiaohongshu: 'bg-red-100 text-red-800 border-red-200',
  weibo: 'bg-orange-100 text-orange-800 border-orange-200',
  tongcheng: 'bg-green-100 text-green-800 border-green-200',
  mafengwo: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  qunar: 'bg-purple-100 text-purple-800 border-purple-200',
};

interface PlatformBadgeProps {
  platform: string;
  /** 'sm' = compact (text-xs), 'lg' = larger with border (text-sm). Default: 'sm' */
  size?: 'sm' | 'lg';
}

export function PlatformBadge({ platform, size = 'sm' }: PlatformBadgeProps) {
  const name = PLATFORM_NAMES[platform] ?? platform;
  const colorClass = PLATFORM_COLORS[platform] ?? 'bg-gray-100 text-gray-800 border-gray-200';

  const sizeClass = size === 'lg'
    ? 'px-3 py-1 text-sm border'
    : 'px-2 py-0.5 text-xs';

  return (
    <span className={cn('rounded-full font-medium', sizeClass, colorClass)}>
      {name}
    </span>
  );
}
