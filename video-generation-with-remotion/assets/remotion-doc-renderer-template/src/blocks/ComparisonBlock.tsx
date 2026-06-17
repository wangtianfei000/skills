import React from 'react';
import {CardView} from './CardView';
import {Card, FadeIn, Shell, Timed, TimedBlock, labelStyle, titleStyle} from './shared';

type ComparisonProps = Timed & {
  title: string;
  left?: Card;
  right?: Card;
  leftTitle?: string;
  rightTitle?: string;
  leftItems?: unknown[];
  rightItems?: unknown[];
};

const joinItems = (items: unknown) => {
  if (!Array.isArray(items)) return '';
  return items
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number') return String(item);
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        return String(row.text ?? row.content ?? row.title ?? row.label ?? '');
      }
      return '';
    })
    .filter(Boolean)
    .join('，');
};

const textOf = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return textOf(item.text ?? item.content ?? item.title ?? item.label ?? '');
  }
  return '';
};

export const ComparisonBlock: React.FC<ComparisonProps> = ({
  from,
  duration,
  title,
  left,
  right,
  leftTitle,
  rightTitle,
  leftItems,
  rightItems,
}) => {
  const leftCard = left || {title: leftTitle || '', body: joinItems(leftItems), tone: 'red' as const};
  const rightCard = right || {title: rightTitle || '', body: joinItems(rightItems), tone: 'green' as const};
  return (
    <TimedBlock from={from} duration={duration}>
      <Shell>
        <div style={{position: 'absolute', inset: '170px 150px'}}>
          <FadeIn>
            <div style={labelStyle}>对比呈现</div>
            <h2 style={{...titleStyle, fontSize: 56, marginTop: 16}}>{textOf(title)}</h2>
          </FadeIn>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 42, marginTop: 70}}>
            <CardView card={{...leftCard, tone: 'red'}} index={0} />
            <CardView card={{...rightCard, tone: 'green'}} index={1} />
          </div>
        </div>
      </Shell>
    </TimedBlock>
  );
};
