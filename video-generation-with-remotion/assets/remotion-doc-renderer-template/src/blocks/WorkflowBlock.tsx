import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FadeIn, Shell, Timed, TimedBlock, labelStyle, titleStyle} from './shared';

const textOf = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return textOf(item.text ?? item.content ?? item.title ?? item.label ?? item.name ?? '');
  }
  return '';
};

export const WorkflowBlock: React.FC<Timed & {title: string; steps: unknown[]}> = ({
  from,
  duration,
  title,
  steps,
}) => {
  const frame = useCurrentFrame();
  const safeSteps = Array.isArray(steps) ? steps.map(textOf).filter(Boolean) : [];
  return (
    <TimedBlock from={from} duration={duration}>
      <Shell>
        <div style={{position: 'absolute', left: 160, right: 160, top: 185}}>
          <FadeIn>
            <div style={labelStyle}>流程规划</div>
            <h2 style={{...titleStyle, fontSize: 56, marginTop: 16}}>{textOf(title)}</h2>
          </FadeIn>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginTop: 115}}>
            {safeSteps.map((step, index) => {
              const active = frame > 45 + index * 24;
              return (
                <div
                  key={`${step}-${index}`}
                  style={{
                    minHeight: 260,
                    borderRadius: 8,
                    padding: 30,
                    background: active ? 'rgba(8, 47, 73, 0.9)' : 'rgba(15, 23, 42, 0.7)',
                    border: active
                      ? '1px solid rgba(56, 189, 248, 0.7)'
                      : '1px solid rgba(100, 116, 139, 0.25)',
                    transform: `translateY(${active ? 0 : 22}px)`,
                    opacity: active ? 1 : 0.45,
                  }}
                >
                  <div style={{fontSize: 58, color: '#38bdf8', fontWeight: 900}}>{index + 1}</div>
                  <div style={{fontSize: 30, lineHeight: 1.35, marginTop: 35, fontWeight: 800}}>
                    {step}
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
