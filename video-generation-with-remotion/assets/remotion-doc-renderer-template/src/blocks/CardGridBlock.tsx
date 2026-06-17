import React from 'react';
import {CardView} from './CardView';
import {Card, FadeIn, Shell, Timed, TimedBlock, labelStyle, titleStyle} from './shared';

const textOf = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return textOf(item.text ?? item.content ?? item.title ?? item.label ?? '');
  }
  return '';
};

export const CardGridBlock: React.FC<Timed & {title: string; cards: Card[]}> = ({
  from,
  duration,
  title,
  cards,
}) => {
  const safeCards = Array.isArray(cards) ? cards : [];
  return (
    <TimedBlock from={from} duration={duration}>
      <Shell>
        <div style={{position: 'absolute', left: 150, right: 150, top: 190}}>
          <FadeIn>
            <div style={labelStyle}>核心内容</div>
            <h2 style={{...titleStyle, fontSize: 58, marginTop: 18}}>{textOf(title)}</h2>
          </FadeIn>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.max(1, safeCards.length)}, 1fr)`,
              gap: 28,
              marginTop: 78,
            }}
          >
            {safeCards.map((card, index) => (
              <CardView key={card.title} card={card} index={index} />
            ))}
          </div>
        </div>
      </Shell>
    </TimedBlock>
  );
};
