'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle,
  MapPin,
  Route,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import {
  DashboardCard,
  DashboardPageHeader,
  MetricCard,
} from '@/components/ui/dashboard-primitives';
import { useHealthStatus } from '@/hooks/use-health-status';
import { getItineraries, getPois } from '@/lib/api';

export default function OverviewPage() {
  const { data: health } = useHealthStatus();
  const { data: itinerariesData } = useQuery({
    queryKey: ['itineraries-overview'],
    queryFn: () => getItineraries({ limit: 1 }),
  });
  const { data: poisData } = useQuery({
    queryKey: ['pois-overview'],
    queryFn: () => getPois({ limit: 1 }),
  });

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <DashboardPageHeader
        title="Sunpebble Trips 概览"
        description="查看行程、地点和服务状态"
        icon={Route}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricCard
          label="行程计划"
          value={itinerariesData?.pagination?.total ?? '-'}
          icon={Route}
          tone="blue"
          footer={(
            <Link href="/itineraries" className="text-sm font-medium text-blue-700 hover:underline">
              查看行程 →
            </Link>
          )}
        />

        <MetricCard
          label="兴趣点"
          value={poisData?.pagination?.total ?? '-'}
          icon={MapPin}
          tone="amber"
        />

        <MetricCard
          label="服务状态"
          value={health?.status === 'ok' || health?.status === 'healthy'
            ? '在线'
            : '离线'}
          icon={health?.status === 'ok' || health?.status === 'healthy' ? CheckCircle : XCircle}
          tone={health?.status === 'ok' || health?.status === 'healthy' ? 'emerald' : 'red'}
          footer={(
            <p className="text-sm text-stone-500">
              Sunpebble Trips API
            </p>
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardCard className="p-6">
          <h2 className="text-lg font-semibold text-stone-950">继续规划</h2>
          <p className="mt-2 text-sm text-stone-500">创建、调整和协作编辑行程。</p>
          <Link href="/itineraries" className="mt-4 inline-block text-sm font-medium text-amber-700 hover:underline">
            打开行程计划 →
          </Link>
        </DashboardCard>
      </div>
    </div>
  );
}
