import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
} from 'remotion';

export type Tone = 'red' | 'blue' | 'green' | 'gold' | 'purple';

export type Card = {
  title: string;
  body: string;
  tone?: Tone;
};

export type Metric = {
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
};

export type TableRow = {
  item: string;
  before: string;
  after: string;
  impact: string;
};

export type Timed = {
  from: number;
  duration: number;
};

export const tones: Record<Tone, [string, string]> = {
  red: ['#ef4444', '#45151d'],
  blue: ['#38bdf8', '#102a48'],
  green: ['#34d399', '#10362d'],
  gold: ['#f8c04e', '#3d2b10'],
  purple: ['#a78bfa', '#25194a'],
};

export const font = {
  family: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif',
  color: '#eef7ff',
};

export const page: React.CSSProperties = {
  ...font,
  width: '100%',
  height: '100%',
  background:
    'radial-gradient(circle at 50% 15%, rgba(56, 189, 248, 0.18), transparent 28%), linear-gradient(180deg, #08111f 0%, #0a1424 48%, #07101d 100%)',
  overflow: 'hidden',
};

export const labelStyle: React.CSSProperties = {
  fontSize: 22,
  color: '#7dd3fc',
  letterSpacing: 0,
  fontWeight: 700,
};

export const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 74,
  lineHeight: 1.12,
  fontWeight: 850,
  letterSpacing: 0,
  color: '#f8fbff',
};

export const subStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 30,
  lineHeight: 1.55,
  color: '#b8c7db',
  maxWidth: 1040,
};

export const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const microGrid: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  opacity: 0.28,
  backgroundImage:
    'linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
  backgroundSize: '54px 54px',
};

export const Shell: React.FC<{children: React.ReactNode}> = ({children}) => {
  return (
    <AbsoluteFill style={page}>
      <div style={microGrid} />
      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          top: 52,
          display: 'flex',
          justifyContent: 'space-between',
          color: '#55708d',
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        <span>文档演示视频</span>
        <span>共享渲染工程</span>
      </div>
      {children}
    </AbsoluteFill>
  );
};

export const TimedBlock: React.FC<Timed & {children: React.ReactNode}> = ({
  from,
  duration,
  children,
}) => {
  return (
    <Sequence from={from} durationInFrames={duration}>
      {children}
    </Sequence>
  );
};

export const FadeIn: React.FC<{children: React.ReactNode; delay?: number}> = ({
  children,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 28], [0, 1], clamp);
  const y = interpolate(frame, [delay, delay + 36], [28, 0], clamp);
  return <div style={{opacity, transform: `translateY(${y}px)`}}>{children}</div>;
};
