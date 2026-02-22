'use client';

import type { AiDay, AiPoi, GuideWithAI } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  ExternalLink,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  Route,
  Star,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';
import { useState } from 'react';
import { GeocodingConfidenceBadge } from '@/components/geocoding-confidence-badge';
import { PoiEditor } from '@/components/poi-editor';
import { getTravelGuide } from '@/lib/api';
import { cn } from '@/lib/utils';

const FALLBACK_IMAGE_SRC
  = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="12">No Image</text></svg>';

function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.src = FALLBACK_IMAGE_SRC;
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    ctrip: 'bg-blue-100 text-blue-800 border-blue-200',
    xiaohongshu: 'bg-red-100 text-red-800 border-red-200',
    weibo: 'bg-orange-100 text-orange-800 border-orange-200',
    tongcheng: 'bg-purple-100 text-purple-800 border-purple-200',
    mafengwo: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    qunar: 'bg-green-100 text-green-800 border-green-200',
  };
  const names: Record<string, string> = {
    ctrip: '携程',
    xiaohongshu: '小红书',
    weibo: '微博',
    tongcheng: '同程旅行',
    mafengwo: '马蜂窝',
    qunar: '去哪儿',
  };
  return (
    <span
      className={cn(
        'px-3 py-1 rounded-full text-sm font-medium border',
        colors[platform] || 'bg-gray-100 text-gray-800 border-gray-200',
      )}
    >
      {names[platform] || platform}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
      <Icon className={cn('h-6 w-6 mx-auto mb-2', color)} />
      <div className="text-2xl font-bold text-gray-900">
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

function formatDate(dateString?: string) {
  if (!dateString)
    return 'Unknown';
  try {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  catch {
    return dateString;
  }
}

export default function GuideDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [editingPoi, setEditingPoi] = useState<{
    dayNumber: number;
    poiIndex: number;
    poi: AiPoi;
  } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['guide', id],
    queryFn: () => getTravelGuide(id),
    enabled: !!id,
  });

  const guide = data?.data as unknown as GuideWithAI | undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="space-y-4">
        <Link
          href="/guides"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Guides
        </Link>
        <div className="bg-red-50 text-red-700 p-6 rounded-lg text-center">
          <p className="font-medium">Guide not found</p>
          <p className="text-sm mt-1">
            The guide you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  const qualityPercent = Math.round(guide.quality_score * 100);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Button */}
      <Link
        href="/guides"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Guides
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <PlatformBadge platform={guide.source_platform} />
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm font-medium">
                  {qualityPercent}
                  % Quality
                </span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {guide.title || 'Untitled Guide'}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {guide.author_name && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {guide.author_name}
                </span>
              )}
              {guide.published_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(guide.published_at)}
                </span>
              )}
            </div>
          </div>

          {/* Source Link */}
          {guide.source_url && (
            <a
              href={guide.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View Original
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Heart}
          label="Likes"
          value={guide.likes_count}
          color="text-red-500"
        />
        <StatCard
          icon={Eye}
          label="Views"
          value={guide.views_count}
          color="text-blue-500"
        />
        <StatCard
          icon={MessageCircle}
          label="Comments"
          value={guide.comments_count}
          color="text-green-500"
        />
        <StatCard
          icon={Bookmark}
          label="Saves"
          value={guide.saves_count}
          color="text-purple-500"
        />
      </div>

      {/* Destinations & Tags */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-emerald-600" />
          Destinations & Tags
        </h2>

        {guide.destinations && guide.destinations.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Destinations
            </h3>
            <div className="flex flex-wrap gap-2">
              {guide.destinations.map((dest: string) => (
                <span
                  // eslint-disable-next-line react/no-array-index-key
                  key={dest}
                  className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium"
                >
                  {dest}
                </span>
              ))}
            </div>
          </div>
        )}

        {guide.tags && guide.tags.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {guide.tags.map((tag: string) => (
                <span
                  // eslint-disable-next-line react/no-array-index-key
                  key={tag}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  #
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {(!guide.destinations || guide.destinations.length === 0)
          && (!guide.tags || guide.tags.length === 0) && (
          <p className="text-gray-500 text-sm">
            No destinations or tags available
          </p>
        )}
      </div>

      {/* AI Summary & Tips */}
      {(guide.aiSummary || guide.aiTips || guide.aiBestTime) && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-purple-600">✨</span>
            AI 分析摘要
          </h2>

          {guide.aiSummary && (
            <div className="mb-4">
              <p className="text-gray-700 leading-relaxed">
                {guide.aiSummary}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {guide.aiDuration && (
              <div className="bg-white/80 rounded-lg p-3 border border-purple-100">
                <div className="text-xs text-gray-500 mb-1">⏱ 建议行程</div>
                <div className="font-medium text-gray-900">{guide.aiDuration}</div>
              </div>
            )}
            {guide.aiBudget && (
              <div className="bg-white/80 rounded-lg p-3 border border-purple-100">
                <div className="text-xs text-gray-500 mb-1">💰 预算参考</div>
                <div className="font-medium text-gray-900">{guide.aiBudget}</div>
              </div>
            )}
            {guide.aiBestTime && (
              <div className="bg-white/80 rounded-lg p-3 border border-purple-100">
                <div className="text-xs text-gray-500 mb-1">📅 最佳时间</div>
                <div className="font-medium text-gray-900">{guide.aiBestTime}</div>
              </div>
            )}
          </div>

          {guide.aiTips && guide.aiTips.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">💡 实用贴士</h3>
              <ul className="space-y-1.5">
                {guide.aiTips.map((tip: string, i: number) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Content</h2>
        {guide.content_html
          ? (
              // Render rich text HTML content
              <div
                className="prose prose-gray max-w-none prose-img:rounded-lg prose-img:max-h-96 prose-img:object-cover prose-a:text-emerald-600 prose-headings:text-gray-900"
                // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
                dangerouslySetInnerHTML={{ __html: guide.content_html }}
              />
            )
          : guide.content
            ? (
                // Plain text with paragraph formatting
                <div className="prose prose-gray max-w-none">
                  {guide.content.split(/\n{2,}/).map((paragraph: string, i: number) => (
                    <p key={i} className="text-gray-700 leading-relaxed mb-4">
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>
              )
            : (
                <p className="text-gray-400 italic">暂无内容</p>
              )}
      </div>

      {/* Images */}
      {guide.image_urls && guide.image_urls.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Images (
            {guide.image_urls.length}
            )
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {guide.image_urls.slice(0, 9).map((url: string) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
              >
                <img
                  src={url}
                  alt="Guide image"
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </a>
            ))}
          </div>
          {guide.image_urls.length > 9 && (
            <p className="text-sm text-gray-500 mt-3 text-center">
              +
              {guide.image_urls.length - 9}
              {' '}
              more images
            </p>
          )}
        </div>
      )}

      {/* AI-Extracted Itinerary */}
      {guide.ai_days && guide.ai_days.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Route className="h-5 w-5 text-emerald-600" />
                AI-Extracted Itinerary
              </h2>
              {guide.geocoding_metrics && (
                <p className="text-sm text-gray-500 mt-1">
                  {guide.geocoding_metrics.total_pois}
                  {' '}
                  POIs •
                  {' '}
                  {Math.round(guide.geocoding_metrics.average_confidence * 100)}
                  % avg confidence
                  {guide.geocoding_metrics.low_confidence_count > 0 && (
                    <span className="text-amber-600 font-medium ml-2">
                      {guide.geocoding_metrics.low_confidence_count}
                      {' '}
                      need review
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {(guide.ai_days || guide.aiDays || []).map((day: AiDay) => (
              <div
                key={day.dayNumber}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-sm">
                    Day
                    {' '}
                    {day.dayNumber}
                  </div>
                  {day.theme && (
                    <span className="text-sm text-gray-600">{day.theme}</span>
                  )}
                </div>

                <div className="space-y-2">
                  {day.pois.map((poi: AiPoi, poiIndex: number) => {
                    const isLowConfidence
                      = poi.geocodeConfidence !== undefined
                        && poi.geocodeConfidence < 0.5;

                    return (
                      <div
                        // eslint-disable-next-line react/no-array-index-key
                        key={`poi-${day.dayNumber}-${poiIndex}`}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                          isLowConfidence && !poi.isManuallyVerified
                            ? 'border-amber-200 bg-amber-50'
                            : 'border-gray-200 bg-gray-50',
                        )}
                      >
                        <div className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {poiIndex + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {poi.name}
                              </h4>
                              <p className="text-xs text-gray-500 uppercase mt-0.5">
                                {poi.type}
                              </p>
                              {poi.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {poi.description}
                                </p>
                              )}
                              {poi.address && (
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {poi.address}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1 font-mono">
                                {poi.latitude.toFixed(6)}
                                ,
                                {' '}
                                {poi.longitude.toFixed(6)}
                              </p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              {poi.geocodeConfidence !== undefined && (
                                <GeocodingConfidenceBadge
                                  confidence={poi.geocodeConfidence}
                                  source={poi.geocodeSource}
                                  isManuallyVerified={poi.isManuallyVerified}
                                  onClick={() =>
                                    setEditingPoi({
                                      dayNumber: day.dayNumber,
                                      poiIndex,
                                      poi,
                                    })}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* POI Editor Modal */}
      {editingPoi && (
        <PoiEditor
          isOpen={true}
          onClose={() => {
            setEditingPoi(null);
            // Refetch to get updated data
            refetch();
          }}
          guideId={id}
          dayNumber={editingPoi.dayNumber}
          poiIndex={editingPoi.poiIndex}
          poi={editingPoi.poi}
          verifiedBy="admin"
        />
      )}

      {/* Metadata */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Metadata</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Guide ID</dt>
            <dd className="font-mono text-gray-900">
              {(guide.id || guide._id).slice(0, 8)}
              ...
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">External ID</dt>
            <dd className="font-mono text-gray-900">
              {guide.source_external_id?.slice(0, 20) || 'N/A'}
              ...
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Crawled At</dt>
            <dd className="text-gray-900">
              {guide.crawled_at ? formatDate(guide.crawled_at) : 'N/A'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Last Updated</dt>
            <dd className="text-gray-900">
              {guide.updated_at ? formatDate(guide.updated_at) : 'N/A'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
