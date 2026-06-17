import React from 'react';
import {FadeIn, Metric, Shell, Timed, TimedBlock, labelStyle, titleStyle, tones} from './shared';

const textOf = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return textOf(item.text ?? item.content ?? item.title ?? item.label ?? item.value ?? '');
  }
  return '';
};

const normalizeMetric = (metric: unknown): Metric => {
  const item = (metric || {}) as Record<string, unknown>;
  return {
    label: textOf(item.label ?? item.title ?? item.name),
    value: textOf(item.value ?? item.number ?? item.text),
    detail: textOf(item.detail ?? item.description ?? item.content),
    tone: item.tone as Metric['tone'],
  };
};

export const MetricCardsBlock: React.FC<Timed & {title: string; metrics: unknown[]}> = ({
  from,
  duration,
  title,
  metrics,
}) => {
  const safeMetrics = Array.isArray(metrics) ? metrics.map(normalizeMetric) : [];
  return (
    <TimedBlock from={from} duration={duration}>
      <Shell>
        <div style={{position: 'absolute', inset: '175px 150px'}}>
          <FadeIn>
            <div style={labelStyle}>关键数据</div>
            <h2 style={{...titleStyle, fontSize: 56, marginTop: 16}}>{textOf(title)}</h2>
          </FadeIn>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, marginTop: 78}}>
            {safeMetrics.map((metric) => {
            const [accent, bg] = tones[metric.tone || 'blue'];
            return (
              <div
                key={`${metric.label}-${metric.value}`}
                style={{background: bg, border: `1px solid ${accent}66`, borderRadius: 8, padding: 34}}
              >
                <div style={{fontSize: 24, color: '#b8c7db', fontWeight: 800}}>{metric.label}</div>
                <div style={{fontSize: 78, color: accent, fontWeight: 950, marginTop: 24}}>
                  {metric.value}
                </div>
                <div style={{fontSize: 25, color: '#d8e5f6', lineHeight: 1.45, marginTop: 20}}>
                  {metric.detail}
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </Shell>
    </TimedBlock>
  );
};
