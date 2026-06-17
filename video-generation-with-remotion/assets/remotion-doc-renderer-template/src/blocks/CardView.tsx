import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {Card, tones} from './shared';

const textOf = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return textOf(item.text ?? item.content ?? item.description ?? item.body ?? item.title ?? '');
  }
  return '';
};

export const CardView: React.FC<{card: Card | Record<string, unknown>; index: number}> = ({card, index}) => {
  const frame = useCurrentFrame();
  const rawCard = (card || {}) as Record<string, unknown>;
  const safeCard = {
    title: textOf(rawCard.title ?? rawCard.label ?? rawCard.name),
    body: textOf(rawCard.body ?? rawCard.description ?? rawCard.text ?? rawCard.detail),
    tone: rawCard.tone as Card['tone'],
  };
  const [accent, bg] = tones[safeCard.tone || 'blue'];
  const progress = spring({
    frame: frame - index * 9,
    fps: 60,
    config: {damping: 18},
  });

  return (
    <div
      style={{
        transform: `translateY(${interpolate(progress, [0, 1], [70, 0])}px)`,
        opacity: interpolate(progress, [0, 1], [0, 1]),
        background: `linear-gradient(150deg, ${bg}, rgba(15, 23, 42, 0.88))`,
        border: `1px solid ${accent}66`,
        borderRadius: 8,
        padding: 34,
        minHeight: 300,
        boxShadow: `0 24px 80px ${accent}18`,
      }}
    >
      <div
        style={{
          width: 58,
          height: 5,
          background: accent,
          borderRadius: 999,
          marginBottom: 28,
        }}
      />
      <h3 style={{margin: 0, fontSize: 38, lineHeight: 1.18, color: '#f8fbff'}}>
        {safeCard.title}
      </h3>
      <p style={{margin: '24px 0 0', fontSize: 25, lineHeight: 1.55, color: '#bfcee1'}}>
        {safeCard.body}
      </p>
    </div>
  );
};
