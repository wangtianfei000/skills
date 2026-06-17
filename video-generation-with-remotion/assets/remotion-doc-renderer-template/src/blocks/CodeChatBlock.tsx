import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FadeIn, Shell, Timed, TimedBlock, labelStyle, titleStyle} from './shared';

type MessageLike = string | {role?: string; text?: string; content?: string; message?: string};

const textOf = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return textOf(item.text ?? item.content ?? item.message ?? item.body ?? item.title ?? '');
  }
  return '';
};

export const CodeChatBlock: React.FC<Timed & {title: string; code?: unknown[]; messages?: MessageLike[]}> = ({
  from,
  duration,
  title,
  code,
  messages,
}) => {
  const frame = useCurrentFrame();
  const safeCode = Array.isArray(code) ? code.map(textOf).filter(Boolean) : [];
  const safeMessages = Array.isArray(messages) ? messages.map(textOf).filter(Boolean) : [];
  const visibleLines = Math.min(safeCode.length, Math.floor(frame / 20));
  return (
    <TimedBlock from={from} duration={duration}>
      <Shell>
        <div style={{position: 'absolute', inset: '165px 150px'}}>
          <FadeIn>
            <div style={labelStyle}>画面生成</div>
            <h2 style={{...titleStyle, fontSize: 54, marginTop: 16}}>{textOf(title)}</h2>
          </FadeIn>
          <div style={{display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 34, marginTop: 62}}>
            <div
              style={{
                background: '#050b14',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 8,
                padding: 28,
                minHeight: 430,
              }}
            >
              {safeCode.slice(0, visibleLines).map((line, index) => (
                <div
                  key={`${line}-${index}`}
                  style={{
                    fontFamily: 'Consolas, monospace',
                    fontSize: 24,
                    color: index % 2 ? '#c4b5fd' : '#7dd3fc',
                    lineHeight: 1.7,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
              {safeMessages.map((message, index) => (
                <div
                  key={`${message}-${index}`}
                  style={{
                    background: index % 2 ? 'rgba(21, 128, 61, 0.28)' : 'rgba(14, 165, 233, 0.22)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: 8,
                    padding: '24px 28px',
                    fontSize: 25,
                    lineHeight: 1.45,
                    color: '#e5f4ff',
                  }}
                >
                  {message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    </TimedBlock>
  );
};
