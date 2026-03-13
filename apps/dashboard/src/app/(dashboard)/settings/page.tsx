export default function SettingsPage() {
  const crawlerApiUrl
    = process.env.NEXT_PUBLIC_CRAWLER_API_URL || 'http://localhost:3001';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Configure crawler dashboard settings</p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          API Configuration
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="api_url"
              className="block text-sm font-medium text-gray-700"
            >
              Crawler API URL
            </label>
            <input
              type="text"
              id="api_url"
              defaultValue={crawlerApiUrl}
              disabled
              className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Configure via NEXT_PUBLIC_CRAWLER_API_URL environment variable
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">About</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Version</dt>
            <dd className="font-medium text-gray-900">0.1.0</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Framework</dt>
            <dd className="font-medium text-gray-900">Next.js 15</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">UI</dt>
            <dd className="font-medium text-gray-900">Tailwind CSS 4</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
