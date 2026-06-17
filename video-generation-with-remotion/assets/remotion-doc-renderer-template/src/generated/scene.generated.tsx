import React from 'react';
import {
  CardGridBlock,
  CodeChatBlock,
  ComparisonBlock,
  CtaBlock,
  HeroBlock,
  MetricCardsBlock,
  TableBlock,
  WorkflowBlock,
} from '../blocks';

export const meta = {
  width: 1920,
  height: 1440,
  fps: 60,
  durationInFrames: 2400,
  title: 'Remotion 文档视频 MVP',
};

export function GeneratedScene() {
  return (
    <>
      <HeroBlock
        from={0}
        duration={300}
        title="2026 年了，还在把 Markdown 发给客户？"
        subtitle="用共享 Remotion 工程，把文档、演示和讲解视频变成稳定可生成的内容资产。"
        badges={['Remotion', 'AI Code', 'Doc Video']}
      />
      <CardGridBlock
        from={300}
        duration={300}
        title="原始文档的问题，不是内容不够好"
        cards={[
          {title: '阅读成本高', body: '客户需要在长文档里自己找重点，第一眼不够有冲击力。', tone: 'red'},
          {title: '演示不可复用', body: '每次讲解都要重新做 PPT、剪视频、配字幕。', tone: 'gold'},
          {title: '生产链路断开', body: '文案、配音、画面、素材库和历史记录没有连成一条线。', tone: 'purple'},
        ]}
      />
      <ComparisonBlock
        from={600}
        duration={300}
        title="MVP 不复制工程，只复用能力"
        left={{
          title: '每条视频新建工程',
          body: '依赖重复、磁盘膨胀、构建慢，多任务时服务器很快扛不住。',
        }}
        right={{
          title: '共享 Remotion 工程',
          body: '依赖、字体、组件和渲染入口只保留一份，每条任务只生成轻量场景代码。',
        }}
      />
      <WorkflowBlock
        from={900}
        duration={300}
        title="生成链路收敛成四步"
        steps={['用户输入主题', 'AI 生成 TSX 场景', '后端校验代码', 'Remotion 排队渲染']}
      />
      <MetricCardsBlock
        from={1200}
        duration={300}
        title="本版 MVP 锁定清晰边界"
        metrics={[
          {label: '画布', value: '4:3', detail: '固定 1920x1440，适合文档演示。', tone: 'blue'},
          {label: '帧率', value: '60', detail: '保留样例视频的顺滑动效。', tone: 'green'},
          {label: '时长', value: '40s', detail: '先跑通固定总时长，再做动态音频对齐。', tone: 'gold'},
        ]}
      />
      <CodeChatBlock
        from={1500}
        duration={300}
        title="AI 输出代码，但不是任意代码"
        code={[
          'export const meta = {',
          '  width: 1920,',
          '  height: 1440,',
          '  fps: 60,',
          '  durationInFrames: 2400,',
          '};',
          '<HeroBlock from={0} duration={300} />',
          '<CardGridBlock from={300} duration={300} />',
        ]}
        messages={[
          'AI 只负责排版、文案和时间轴编排。',
          '平台用组件白名单、props 校验和编译检查兜底。',
          '渲染进入队列，默认单并发，保护服务器。',
        ]}
      />
      <TableBlock
        from={1800}
        duration={300}
        title="共享工程让后续扩展更稳"
        rows={[
          {item: '依赖', before: '每条视频复制一份', after: '共享 node_modules', impact: '省空间'},
          {item: '组件', before: '散落在任务目录', after: '统一组件库', impact: '可维护'},
          {item: '任务', before: '直接启动渲染', after: '队列和限流', impact: '不压垮'},
          {item: '代码', before: '人工写死模板', after: 'AI 生成受限 TSX', impact: '可生成'},
        ]}
      />
      <CtaBlock
        from={2100}
        duration={300}
        title="Remotion 文档视频 MVP 已进入可验证阶段"
        subtitle="下一步接入后端任务、分段 TTS 和音画同步，就能从样例走向生产链路。"
        bullets={['共享工程', '手写场景', '本地渲染']}
      />
    </>
  );
}
