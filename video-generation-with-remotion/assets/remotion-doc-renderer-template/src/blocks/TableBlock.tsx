import React from 'react';
import {FadeIn, Shell, TableRow, Timed, TimedBlock, labelStyle, titleStyle} from './shared';

type TableLikeRow = TableRow | unknown[];

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

const normalizeRow = (row: TableLikeRow): TableRow => {
  if (Array.isArray(row)) {
    return {
      item: textOf(row[0]),
      before: textOf(row[1]),
      after: textOf(row[2]),
      impact: textOf(row[3]),
    };
  }
  const item = (row || {}) as Record<string, unknown>;
  return {
    item: textOf(item.item ?? item.scene ?? item.name ?? item.title),
    before: textOf(item.before ?? item.point ?? item.value),
    after: textOf(item.after ?? item.method ?? item.content),
    impact: textOf(item.impact ?? item.result ?? item.detail),
  };
};

export const TableBlock: React.FC<Timed & {title: string; rows?: TableLikeRow[]; headers?: string[]}> = ({
  from,
  duration,
  title,
  rows,
}) => {
  const safeRows = Array.isArray(rows) ? rows.map(normalizeRow) : [];
  return (
    <TimedBlock from={from} duration={duration}>
      <Shell>
        <div style={{position: 'absolute', inset: '170px 145px'}}>
          <FadeIn>
            <div style={labelStyle}>信息汇总</div>
            <h2 style={{...titleStyle, fontSize: 54, marginTop: 16}}>{textOf(title)}</h2>
          </FadeIn>
          <div
            style={{
              marginTop: 62,
              border: '1px solid rgba(125, 211, 252, 0.28)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.3fr 1.3fr 1fr',
                background: 'rgba(14, 165, 233, 0.18)',
              }}
            >
              {['场景', '重点', '呈现方式', '价值'].map((head) => (
                <div key={head} style={{padding: 24, fontSize: 24, fontWeight: 900, color: '#7dd3fc'}}>
                  {head}
                </div>
              ))}
            </div>
            {safeRows.map((row) => (
              <div
                key={row.item}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.3fr 1.3fr 1fr',
                  borderTop: '1px solid rgba(148, 163, 184, 0.18)',
                }}
              >
                {[row.item, row.before, row.after, row.impact].map((cell, index) => (
                  <div
                    key={cell}
                    style={{
                      padding: 24,
                      fontSize: 23,
                      lineHeight: 1.45,
                      color: index === 2 ? '#a7f3d0' : '#d7e3f3',
                    }}
                  >
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Shell>
    </TimedBlock>
  );
};
