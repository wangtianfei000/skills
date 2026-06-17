import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {FadeIn, Shell, Timed, TimedBlock, clamp, subStyle, titleStyle} from './shared';

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

export const CtaBlock: React.FC<Timed & {
  title: string;
  subtitle?: string;
  bullets?: unknown[];
  buttonText?: string;
  description?: string;
}> = ({
  from,
  duration,
  title,
  subtitle,
  bullets,
  buttonText,
  description,
}) => {
  const frame = useCurrentFrame();
  const safeBullets = Array.isArray(bullets) ? bullets.map(textOf).filter(Boolean) : [buttonText, description].map(textOf).filter(Boolean);
  const glow = interpolate(Math.sin(frame / 18), [-1, 1], [0.35, 0.85], clamp);
  return (
    <TimedBlock from={from} duration={duration}>
      <Shell>
        <AbsoluteFill
          style={{justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 180px'}}
        >
          <div
            style={{
              opacity: glow,
              position: 'absolute',
              width: 560,
              height: 560,
              borderRadius: '50%',
              background: '#0ea5e9',
              filter: 'blur(120px)',
            }}
          />
          <FadeIn>
            <h2 style={{...titleStyle, fontSize: 68, position: 'relative'}}>{textOf(title)}</h2>
            <p style={{...subStyle, marginTop: 28, position: 'relative'}}>{textOf(subtitle || description || '')}</p>
          </FadeIn>
          <FadeIn delay={28}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 18,
                marginTop: 56,
                position: 'relative',
              }}
            >
              {safeBullets.map((bullet, index) => (
                <div
                  key={`${bullet}-${index}`}
                  style={{
                    border: '1px solid rgba(125, 211, 252, 0.42)',
                    borderRadius: 8,
                    padding: '22px 28px',
                    background: 'rgba(8, 47, 73, 0.52)',
                    fontSize: 24,
                    fontWeight: 850,
                  }}
                >
                  {bullet}
                </div>
              ))}
            </div>
          </FadeIn>
        </AbsoluteFill>
      </Shell>
    </TimedBlock>
  );
};
