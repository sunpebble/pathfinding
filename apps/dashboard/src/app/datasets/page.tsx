'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Database,
  Download,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { getTrainingDatasets } from '@/lib/api';
import { formatDateTime, shortId } from '@/lib/utils';

export default function DatasetsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const {
    data: datasetsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['training-datasets', typeFilter, statusFilter],
    queryFn: () =>
      getTrainingDatasets({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        limit: 50,
      }),
  });

  const datasets = datasetsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Training Datasets
          </h1>
          <p className="text-gray-500">Manage ML training data exports</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="ner">NER (Named Entity Recognition)</option>
          <option value="classification">Classification</option>
          <option value="embedding">Embedding</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="generating">Generating</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <span className="text-sm text-gray-500">
          {datasetsData?.pagination?.total ?? 0}
          {' '}
          datasets total
        </span>
      </div>

      {/* Datasets Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Records
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading
              ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                    </td>
                  </tr>
                )
              : datasets.length === 0
                ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        <Database className="mx-auto h-8 w-8 text-gray-300" />
                        <p className="mt-2">No datasets found</p>
                      </td>
                    </tr>
                  )
                : (
                    datasets.map(dataset => (
                      <tr key={dataset.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-500">
                          {shortId(dataset.id)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {dataset.name}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                            {dataset.type}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <StatusBadge status={dataset.status} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {dataset.statistics?.total_records ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {formatDateTime(dataset.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          {dataset.status === 'completed' && dataset.file_path && (
                            <button
                              onClick={() => {
                                // Trigger download via API
                                const url = `/api/training-datasets/download?id=${dataset.id}`;
                                window.open(url, '_blank');
                              }}
                              className="rounded-lg bg-blue-100 p-2 text-blue-600 hover:bg-blue-200"
                              title="Download dataset"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
