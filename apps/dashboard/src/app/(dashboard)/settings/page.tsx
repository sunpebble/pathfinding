import { Settings } from 'lucide-react';
import { DashboardCard, DashboardPageHeader } from '@/components/ui/dashboard-primitives';

export default function SettingsPage() {
  const crawlerApiUrl
    = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="设置"
        description="配置 Sunpebble Trips 控制台"
        icon={Settings}
      />

      <DashboardCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">
          API 配置
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="api_url"
              className="block text-sm font-medium text-stone-700"
            >
              Sunpebble Trips API 地址
            </label>
            <input
              type="text"
              id="api_url"
              defaultValue={crawlerApiUrl}
              disabled
              className="dashboard-control mt-1 block w-full bg-stone-50 text-stone-500"
            />
            <p className="mt-1 text-xs text-stone-500">
              通过 NEXT_PUBLIC_API_URL 环境变量配置
            </p>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">关于</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-500">版本</dt>
            <dd className="font-medium text-stone-900">0.1.0</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">框架</dt>
            <dd className="font-medium text-stone-900">Next.js 15</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">UI</dt>
            <dd className="font-medium text-stone-900">Tailwind CSS 4</dd>
          </div>
        </dl>
      </DashboardCard>
    </div>
  );
}
