'use client';

import type { CreateCrawlJobInput } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createCrawlJob } from '@/lib/api';

export default function CreateJobPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createCrawlJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['crawl-jobs'] });
      router.push(`/jobs/${job.id}`);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    const categories = formData.get('categories') as string;
    const cities = formData.get('cities') as string;

    const input: CreateCrawlJobInput = {
      name: formData.get('name') as string,
      platform: formData.get('platform') as string,
      job_type: (formData.get('job_type') as string) || 'full',
      schedule_cron: (formData.get('schedule_cron') as string) || undefined,
      config: {
        categories: categories
          ? categories.split(',').map(c => c.trim())
          : undefined,
        geographic_scope: cities
          ? { cities: cities.split(',').map(c => c.trim()) }
          : undefined,
        rate_limit: {
          requests_per_second:
            Number.parseFloat(formData.get('rate_limit_rps') as string) || 1,
          max_concurrent:
            Number.parseInt(formData.get('max_concurrent') as string) || 5,
        },
      },
    };

    mutation.mutate(input);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/jobs"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Crawl Job</h1>
          <p className="text-gray-500">Configure a new data crawling task</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl bg-white p-6 shadow-sm"
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Job Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., Tokyo Restaurants Crawl"
              />
            </div>
            <div>
              <label
                htmlFor="platform"
                className="block text-sm font-medium text-gray-700"
              >
                Platform *
              </label>
              <select
                id="platform"
                name="platform"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select platform...</option>
                <option value="amap">Amap (高德地图)</option>
                <option value="openstreetmap">OpenStreetMap</option>
                <option value="overpass">Overpass API</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="job_type"
                className="block text-sm font-medium text-gray-700"
              >
                Job Type
              </label>
              <select
                id="job_type"
                name="job_type"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="full">Full Crawl</option>
                <option value="incremental">Incremental Update</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="schedule_cron"
                className="block text-sm font-medium text-gray-700"
              >
                Schedule (Cron)
              </label>
              <input
                type="text"
                id="schedule_cron"
                name="schedule_cron"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., 0 0 * * * (daily at midnight)"
              />
            </div>
          </div>

          {/* Categories and Cities */}
          <div>
            <label
              htmlFor="categories"
              className="block text-sm font-medium text-gray-700"
            >
              Categories (comma-separated)
            </label>
            <input
              type="text"
              id="categories"
              name="categories"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., restaurant, hotel, attraction"
            />
          </div>

          <div>
            <label
              htmlFor="cities"
              className="block text-sm font-medium text-gray-700"
            >
              Cities (comma-separated)
            </label>
            <input
              type="text"
              id="cities"
              name="cities"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Tokyo, Osaka, Kyoto"
            />
          </div>

          {/* Rate Limiting */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="rate_limit_rps"
                className="block text-sm font-medium text-gray-700"
              >
                Rate Limit (requests/second)
              </label>
              <input
                type="number"
                id="rate_limit_rps"
                name="rate_limit_rps"
                min="0.1"
                step="0.1"
                defaultValue="1"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="max_concurrent"
                className="block text-sm font-medium text-gray-700"
              >
                Max Concurrent Requests
              </label>
              <input
                type="number"
                id="max_concurrent"
                name="max_concurrent"
                min="1"
                defaultValue="5"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create Job
            </button>
            <Link
              href="/jobs"
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
