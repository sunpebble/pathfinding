'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  CheckSquare,
  Globe,
  Loader2,
  MapPin,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { createBackfillJobs, getBackfillAnalysis } from '@/lib/api';

export default function BackfillPage() {
  const queryClient = useQueryClient();
  const [selectedFieldGuides, setSelectedFieldGuides] = useState<Set<number>>(() => new Set());
  const [selectedDestinations, setSelectedDestinations] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: analysis,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['backfill-analysis'],
    queryFn: getBackfillAnalysis,
  });

  const createMutation = useMutation({
    mutationFn: createBackfillJobs,
    onSuccess: (result) => {
      setSelectedFieldGuides(new Set());
      setSelectedDestinations(new Set());
      setSuccessMessage(`成功创建 ${result.jobsCreated} 个补齐任务`);
      queryClient.invalidateQueries({ queryKey: ['backfill-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['crawl-jobs'] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccessMessage(null);
    },
  });

  const toggleFieldGuide = (id: number) => {
    setSelectedFieldGuides((prev) => {
      const next = new Set(prev);
      if (next.has(id))
        next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDestination = (name: string) => {
    setSelectedDestinations((prev) => {
      const next = new Set(prev);
      if (next.has(name))
        next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleCreateJobs = () => {
    setError(null);
    setSuccessMessage(null);
    createMutation.mutate({
      fieldGapGuideIds: selectedFieldGuides.size > 0 ? Array.from(selectedFieldGuides) : undefined,
      destinationGapCities: selectedDestinations.size > 0 ? Array.from(selectedDestinations) : undefined,
    });
  };

  const totalSelected = selectedFieldGuides.size + selectedDestinations.size;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-64 items-center justify-center text-red-600">
        加载数据失败，请稍后重试
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/jobs"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Backfill</h1>
            <p className="text-gray-500">Analyze gaps and generate crawl tasks to fill missing data</p>
          </div>
        </div>
        <button
          onClick={handleCreateJobs}
          disabled={totalSelected === 0 || createMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending
            ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              )
            : (
                <Plus className="h-4 w-4" />
              )}
          Generate Tasks (
          {totalSelected}
          )
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Field Gaps</p>
              <p className="text-2xl font-bold text-gray-900">{analysis?.totalFieldGaps ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Blank Destinations</p>
              <p className="text-2xl font-bold text-gray-900">{analysis?.totalDestinationGaps ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Field Gap Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-gray-500" />
            Field Gaps — Guides with Missing Data
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Select</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Missing Fields</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Missing Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {analysis?.fieldGaps.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No field gaps found — all guides are complete!
                  </td>
                </tr>
              )}
              {analysis?.fieldGaps.map(gap => (
                <tr key={gap.guideId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedFieldGuides.has(gap.guideId)}
                      onChange={() => toggleFieldGuide(gap.guideId)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{gap.guideId}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{gap.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{gap.platform}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {gap.missingFields.map(f => (
                        <span key={f} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      gap.missingCount >= 5
                        ? 'bg-red-100 text-red-700'
                        : gap.missingCount >= 3
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                    >
                      {gap.missingCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Destination Gap Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            Destination Gaps — Cities with No Guides
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Select</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Current Guides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {analysis?.destinationGaps.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No destination gaps found — all cities have guides!
                  </td>
                </tr>
              )}
              {analysis?.destinationGaps.map(gap => (
                <tr key={gap.cityName} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedDestinations.has(gap.cityName)}
                      onChange={() => toggleDestination(gap.cityName)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{gap.cityName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{gap.countryCode}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {gap.guideCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
