import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FadeIn, Shell, Timed, TimedBlock, labelStyle, subStyle, titleStyle} from './shared';

const textOf = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return textOf(item.text ?? item.content ?? item.title ?? item.label ?? '');
  }
  return '';
};

export const HeroBlock: React.FC<
  Timed & {title: string; subtitle: string; badges: unknown[]}
> = ({from, duration, title, subtitle, badges}) => {
  const safeBadges = Array.isArray(badges) ? badges.map(textOf).filter(Boolean) : [];
  return (
    <TimedBlock from={from} duration={duration}>
      <Shell>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '0 180px',
          }}
        >
          <FadeIn>
            <div style={labelStyle}>文档演示</div>
          </FadeIn>
          <FadeIn delay={12}>
            <h1 style={{...titleStyle, marginTop: 18}}>{textOf(title)}</h1>
          </FadeIn>
          <FadeIn delay={30}>
            <p style={{...subStyle, marginTop: 28}}>{textOf(subtitle)}</p>
          </FadeIn>
          <FadeIn delay={48}>
            <div style={{display: 'flex', gap: 18, marginTop: 44, justifyContent: 'center'}}>
              {safeBadges.map((badge, index) => (
                <span
                  key={`${badge}-${index}`}
                  style={{
                    border: '1px solid rgba(125, 211, 252, 0.55)',
                    background: 'rgba(14, 165, 233, 0.13)',
                    color: '#c8f3ff',
                    borderRadius: 999,
                    padding: '13px 28px',
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </FadeIn>
        </AbsoluteFill>
      </Shell>
    </TimedBlock>
  );
};
