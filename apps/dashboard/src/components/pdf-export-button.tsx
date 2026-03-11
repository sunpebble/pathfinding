'use client';

import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { getStoredAuthToken } from '@/lib/api/client';
import { cn } from '@/lib/utils';

type ExportState = 'idle' | 'loading' | 'error';

interface PdfExportButtonProps {
  itineraryId: string;
  className?: string;
}

export function PdfExportButton({ itineraryId, className }: PdfExportButtonProps) {
  const [state, setState] = useState<ExportState>('idle');

  const handleExport = async () => {
    setState('loading');

    const url = `/api/export-pdf?itineraryId=${encodeURIComponent(itineraryId)}`;

    try {
      const token = getStoredAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });

      if (response.ok && response.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        // Revoke after a short delay to allow the browser to open it
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
        setState('idle');
      }
      else if (!response.ok) {
        let message = 'PDF 导出失败';
        try {
          const data = await response.json();
          if (data?.error) {
            message = data.error;
          }
        }
        catch {
          // Response is not JSON, use default message
        }
        // eslint-disable-next-line no-alert
        alert(message);
        setState('error');
      }
      else {
        // Response OK but not PDF content-type, try direct open as fallback
        window.open(url, '_blank');
        setState('idle');
      }
    }
    catch {
      // Fetch failed entirely, try direct open as fallback
      window.open(url, '_blank');
      setState('error');
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={state === 'loading'}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
        'bg-emerald-600 text-white hover:bg-emerald-700',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {state === 'loading'
        ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              生成中...
            </>
          )
        : (
            <>
              <FileDown className="h-4 w-4" />
              导出 PDF
            </>
          )}
    </button>
  );
}
