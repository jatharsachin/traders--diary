import React, { useEffect, useState } from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import { loadChartImage } from '../../utils/chartStorage';

interface ChartPreviewProps {
  chartUrl?: string;
  alt?: string;
  maxHeight?: string;
}

export const ChartPreview: React.FC<ChartPreviewProps> = ({
  chartUrl,
  alt = 'Trade Chart',
  maxHeight = '180px',
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!chartUrl) {
      setResolvedSrc(null);
      return;
    }

    if (!chartUrl.startsWith('idb://')) {
      setResolvedSrc(chartUrl);
      return;
    }

    setLoading(true);
    loadChartImage(chartUrl)
      .then((src) => {
        if (active) setResolvedSrc(src);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [chartUrl]);

  if (!chartUrl) return null;

  if (loading) {
    return (
      <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <ImageIcon size={13} /> Loading chart snapshot...
      </div>
    );
  }

  if (!resolvedSrc) {
    return chartUrl.startsWith('idb://') ? (
      <div style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
        Chart snapshot stored on original device ({chartUrl.slice(6, 18)}...)
      </div>
    ) : null;
  }

  const isRenderableImage =
    resolvedSrc.startsWith('data:image') ||
    resolvedSrc.startsWith('blob:') ||
    /\.(png|jpe?g|webp|gif)(\?|$)/i.test(resolvedSrc) ||
    resolvedSrc.includes('tradingview.com/x/') ||
    chartUrl.startsWith('idb://');

  if (!isRenderableImage) {
    return (
      <a
        href={resolvedSrc}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: 'var(--primary)', marginTop: '4px' }}
      >
        <ExternalLink size={12} /> View TradingView Chart
      </a>
    );
  }

  return (
    <div style={{ marginTop: '6px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', padding: '5px' }}>
      <img
        src={resolvedSrc}
        alt={alt}
        loading="lazy"
        style={{ width: '100%', maxHeight, objectFit: 'contain', borderRadius: '6px', display: 'block', cursor: 'pointer' }}
        onClick={() => window.open(resolvedSrc, '_blank', 'noopener,noreferrer')}
        title="Click to open full-size chart"
      />
    </div>
  );
};
