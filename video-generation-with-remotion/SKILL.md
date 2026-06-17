---
name: video-generation-with-remotion
description: 提供 Remotion 类PPT视频制作方法。用于根据用户详情先确认配音、视频比例和风格，再生成可预览的分镜草稿内容，等待用户确认后按已确定配音方案生成分段旁白音频、生成 Remotion 工程和视频代码；适用于分镜预览、预览 HTML、旁白文案、配音选择、EdgeTTS/TTS 音频、用户修订、Remotion 工程模板、Remotion 代码模板、音画时间轴、封面和最终视频交付。
---

# Remotion 类PPT视频制作流程

## 核心目标

使用此 skill 时，把自己当成一个独立的视频制作智能体。工作方式是：先根据用户详情生成“用户能直接阅读和预览”的分镜草稿，等用户确认后，再生成 Remotion 工程、Remotion 代码和最终视频。

不要把此流程绑定到某个具体项目、接口、小程序、后台队列、积分系统或数据库。不要让 AI 输出小程序展示专用的数据结构。草稿阶段要直接输出内容，而不是输出 `scene` JSON、`plan_payload` JSON 或类似结构。

如需模板，读取同级文件 [模板.md](模板.md)。模板文件只包含三个模板：预览 HTML、Remotion 工程模板、Remotion 代码模板。其中 Remotion 工程模板已作为资源放在 `assets/remotion-doc-renderer-template/`。

## 总流程

```text
用户提供详情
  -> 理解主题、受众、目的、卖点、风格、比例和内容复杂度
  -> 若缺少配音、视频比例或风格信息，列出缺失项并给用户选择项
  -> 确定配音方案、视频比例和风格方向
  -> 直接生成分镜预览草稿
  -> 草稿包含每页标题、画面内容、旁白、动效说明和预览 HTML
  -> 交给用户确认或修改
  -> 根据用户反馈修订草稿
  -> 用户明确确认
  -> 按已确定配音方案生成每页旁白音频
  -> 根据真实音频时长生成音画时间轴
  -> 复制并使用 Remotion 工程模板
  -> 按确认草稿生成 Remotion 视频代码
  -> 渲染 final.mp4 和 cover.jpg
  -> 交付视频、封面、预览 HTML、Remotion 工程和代码
```

## 阶段一：理解用户详情

先理解用户需求，并在生成分镜草稿前确定基础制作设定。重点理解：

- 视频主题：要讲什么。
- 目标受众：给谁看。
- 核心目的：介绍、推广、教学、汇报、招商、活动宣传等。
- 风格方向：深色科技、简洁商务、教育培训、活动宣传、产品发布等。
- 视频比例：可选 4:3、16:9、9:16 或 1:1；缺失时必须询问用户。
- 目标时长：根据内容量、旁白长度和展示节奏决定。
- 页面数量：根据内容结构自然拆分，不预设固定页数。
- 旁白语气：自然口语、专业稳重、销售转化、课程讲解等。
- 配音偏好：性别、年龄感、语速、情绪、方言/普通话、是否需要更像主播、讲师或商务解说。

如果用户需求中没有提供配音、视频比例或风格方向，必须先罗列缺失项询问用户，并给出可选项。不要在这三项缺失时直接进入分镜草稿。

询问格式建议：

```text
还需要确认以下制作设定：

1. 配音方案
   A. 普通话稳重讲解型女声
   B. 普通话稳重讲解型男声
   C. 普通话商务活力型
   D. 普通话主播宣传型
   E. 不需要配音

   可用音色参考：
   - 云健（男）：zh-CN-YunjianNeural
   - 晓晓（女）：zh-CN-XiaoxiaoNeural
   - 晓伊（女）：zh-CN-XiaoyiNeural
   - 云希（男）：zh-CN-YunxiNeural

2. 视频比例
   A. 4:3，适合类 PPT、课程、汇报
   B. 16:9，适合横屏展示和大屏播放
   C. 9:16，适合短视频平台
   D. 1:1，适合社媒信息流

3. 风格方向
   A. 深色科技
   B. 简洁商务
   C. 教育培训
   D. 活动宣传
   E. 产品发布
```

用户可以直接选择字母，也可以用自然语言描述。收到用户选择后，再生成分镜预览草稿。除配音、比例、风格外，其他缺失信息如果能根据上下文合理推断，可以先在草稿中标注假设。

不要直接进入视频渲染。必须先产出分镜预览草稿并等待用户确认。

## 阶段二：直接生成分镜预览草稿

草稿不是 JSON 数据结构，而是一份给用户确认的内容稿。推荐使用下面这种自然语言结构：

```text
视频标题：……
整体风格：……
预计比例：……
预计节奏：根据内容分为 X 页，每页配一段旁白

第 1 页：开场主题
- 画面：……
- 旁白：……
- 动效：……

第 2 页：核心亮点
- 画面：……
- 旁白：……
- 动效：……

……

预览 HTML：见附件或下方完整 HTML
```

草稿必须让用户能判断三件事：

- 内容是否对。
- 画面是否对。
- 节奏是否对。

草稿要求：

- 完全围绕用户主题和需求，不要解释 Remotion 或平台能力。
- 不要编造用户未提供且无法合理推断的事实。
- 用户提供的关键事实要准确保留，不要擅自添加未确认的信息。
- 旁白要自然、具体、口语化；每页旁白不宜过长。
- 画面说明要具体到页面结构、视觉重点和主要文案。
- 动效说明要能被 Remotion 实现，优先使用淡入、上移、缩放、错峰、计数、线条绘制、光晕、扫描、轻微呼吸、退场淡出。
- 页面数量若用户指定，严格遵守；未指定时按内容结构自然规划，不要为了凑页拆得过碎。
- 不要在预览里显示完整旁白字幕条；旁白用于配音，不是画面正文。

推荐分镜结构：

1. 开场主题：一句话讲清楚主题和价值。
2. 核心亮点：展示主要卖点。
3. 用户痛点或适用人群：说明为什么需要它。
4. 内容、功能或体验：讲具体内容。
5. 背书、优势或数据：增强可信度。
6. 信息汇总：汇总关键内容。
7. 行动引导：告诉观众下一步做什么。

## 阶段三：用户确认与修订

在生成视频前，必须获得用户明确确认，例如“确认”“可以生成视频”“按这个版本做”。

如果用户提出修改意见：

- 只执行最新一轮修改意见。
- 保留未被影响的页面、风格和文案，避免整片重写。
- 用户说“第 3 页”时，以当前草稿页码为准。
- 删除页面时，同步调整页码、预览 HTML 和整体节奏。
- 替换或删除信息时，同步修改页面标题、画面、旁白、动效和预览画面。
- 修改后必须重新输出当前完整页表，逐页列出页码、页面标题、画面重点、旁白和动效，不要只描述局部改动。
- 修改后必须重新核对并声明当前页数，保证分镜页数、预览 HTML 的 `.slide` 数量、旁白段数、后续音频段数、manifest `segments` 数量和 Remotion `Sequence` 数量保持一致。
- 修改后再次给用户确认，不要直接渲染。

## 阶段四：生成配音音频

用户确认分镜草稿后，按阶段一已确定的配音方案先处理音频，再进入视频代码生成。

配音选择规则：

- 使用阶段一确认的配音方案；如果用户后续修改配音，先更新配音方案，再重新生成音频和时间轴。
- 如果用户选择“不需要配音”，跳过 TTS，但仍按页面阅读节奏设置时间轴。
- 默认普通话配音应保持自然语速，不要过快。
- 配音风格必须服务内容，不要用夸张语气破坏文档演示感。
- 在进入 TTS 前，记录最终配音方案。

配音生成资源：

- 不要引用任何宿主项目里的 Python 包路径。此 skill 必须能脱离原项目独立使用。
- EdgeTTS 依赖代码已复制到本 skill 的 `scripts/` 目录：`scripts/tts_util.py` 和 `scripts/tts_voices.py`。
- 批量生成分段配音时，优先使用 `scripts/generate_edge_tts_segments.py`；它会读取分镜 JSON，逐页生成 MP3，并输出 `audio_manifest.json`。
- Remotion 文档视频渲染时，遵循“音频优先”：先生成音频和 audio manifest，再生成 Remotion 代码与渲染 manifest。
- 音色从用户或模板确认的 `voice` 读取，默认 `zh-CN-YunjianNeural`。
- 语速使用 `scripts/tts_voices.py` 中的 `speed_to_rate()` 转成 EdgeTTS 的 `rate` 参数；Remotion 文档视频链路使用 `speed_to_rate(1.35)`。
- 每页旁白单独调用一次 EdgeTTS，不要把整片旁白合成一个音频。
- EdgeTTS 输出 MP3 文件，任务目录形如 `task/audio/segment_001.mp3`；在原项目服务中对应 `output/remotion_doc_video/{task_id}/audio/segment_001.mp3`。
- EdgeTTS 工具内部带并发限制、请求前短延迟和失败重试，用于降低 401、无音频返回等临时问题的影响。
- 音频生成后使用 `ffmpeg.probe()` 读取真实时长；不要用字符数估算作为最终时间轴。
- 每段音频帧数按 `ceil(duration_seconds * fps) + 12` 计算，额外 12 帧作为尾部缓冲。
- 如果生成不到任何有效旁白音频，必须停止渲染并返回错误，不要生成无声视频假装成功。
- 可生成低音量 BGM；原项目用 ffmpeg 的 `sine=frequency=180` 生成 `audio/bgm.mp3`，音量约 `0.025`。

`scripts/generate_edge_tts_segments.py` 输入示例：

```json
{
  "voice": "zh-CN-YunjianNeural",
  "speed": 1.35,
  "fps": 30,
  "targetDurationSeconds": 40,
  "scenes": [
    {"id": "scene_001", "narration": "第一页旁白。"},
    {"id": "scene_002", "narration": "第二页旁白。"}
  ]
}
```

运行示例：

```bash
python scripts/generate_edge_tts_segments.py --input task/narration.json --output-dir task
```

输出包括 `task/audio/segment_001.mp3`、`task/audio/segment_002.mp3` 和 `task/audio_manifest.json`。

音频生成规则：

- 每一页分镜对应一段旁白音频，按页面顺序命名，例如 `audio/segment_001.mp3`、`audio/segment_002.mp3`。
- 旁白文本使用用户确认后的版本，不要在生成音频时擅自改文案。
- TTS 输入必须按页面拆分，保留页码、旁白文本、配音方案和输出文件名，便于追踪问题。
- 生成后必须获取每段音频真实时长。
- 每页视觉时长必须覆盖对应音频时长，并预留少量缓冲，避免音频尾部被截断；视觉时长不要短于真实音频时长。
- 可按需要加入低音量 BGM，但 BGM 不得盖过人声；有人声时音量应明显降低。
- 如果用户不需要配音，可以跳过 TTS，但仍要按页面阅读节奏设置时间轴。

音画时间轴规则：

- 默认 `fps=30`。
- 每页对应一个 Remotion `Sequence`。
- `from` 为该页起始帧。
- `durationInFrames` 为该页视觉时长。
- 下一页 `from` 等于前一页 `from + durationInFrames`。
- 总时长等于所有页面视觉时长之和。
- 需要同时保留音频时长和视觉时长：音频段落记录 `durationInFrames`，页面展示记录 `visualDurationInFrames` 或时间轴里的页面 `durationInFrames`。
- 渲染 `manifest.json` 中的 `audio.segments` 至少包含 `id`、`staticPath`、`text`、`from`、`durationInFrames`、`durationSeconds`、`visualDurationInFrames`。
- Remotion 渲染入口应根据 manifest 生成 `AudioTracks`：对每个音频段落创建 `<Sequence from={segment.from} durationInFrames={segment.durationInFrames}>`，内部用 `<Audio src={staticFile(segment.staticPath)} />` 挂载音频。
- BGM 使用单独 `<Audio>` 全局挂载；有人声帧内音量降低，例如有人声 `0.035`，无人声 `0.08`。

## 阶段五：生成 Remotion 视频

用户确认后，再进入视频生成。

需要生成或准备：

- 预览 HTML：确认版草稿的可视化预览。
- Remotion 工程：从 `assets/remotion-doc-renderer-template/` 复制得到的可运行渲染工程。
- Remotion 代码：承载确认版分镜的页面组件、动画和时间轴。
- 旁白音频：按页面生成或准备，并按真实时长建立时间轴。
- 最终视频：`final.mp4`。
- 封面：`cover.jpg`。

使用工程模板时：

- 复制 `assets/remotion-doc-renderer-template/` 到当前视频任务目录或目标工程目录。
- 不要复制或生成 `node_modules`、`dist` 等构建产物；进入目标工程后重新安装依赖并构建。
- 将确认后的 Remotion 场景代码写入任务级 `scene.generated.tsx`，或替换模板中的 `src/generated/scene.generated.tsx`。
- 如果使用模板的 `src/render.ts`，通过 `manifest.json` 指向任务级 `scene.generated.tsx`、音频目录、输出视频和封面；manifest 中的音频段落必须使用真实音频时长换算出的帧数。
- 如果直接使用 Remotion Studio/CLI，可把确认后的页面组件接入模板的 Root/Composition。
- 先跑模板内的校验或 smoke render，再渲染完整视频。
- 推荐渲染命令分两步执行，避免 npm script 参数传递在不同环境下失效：
  ```bash
  npm run build
  node dist/render.js --manifest ../manifest.json
  ```
- 如果使用 `npm run render:manifest` 包装命令，必须确认最终 Node 进程确实收到 `--manifest <manifest.json>`；若日志出现 `Missing required argument: --manifest <path>`，直接改用上面的两步命令。
- 为控制文件体积，任务目录只保留必要产物：确认版草稿、预览 HTML、`manifest.json`、`scene.generated.tsx`、音频、`final.mp4` 和 `cover.jpg`。不要把 `node_modules`、`dist`、浏览器缓存、临时帧或重复模板复制进最终交付目录。
- 渲染成功后可按需清理 `.remotion-entry`、构建产物、临时截图和中间帧；清理前必须保留可复现渲染所需的源码、manifest、音频和最终成片。

## Remotion 代码规范

Remotion 代码必须是受限、可渲染、可审查的 TSX。

硬性要求：

- 每个页面渲染成独立 React 组件。
- 每个页面由 `<Sequence from={...} durationInFrames={...}>` 控制出现时间。
- `from` 和 `durationInFrames` 使用明确数字，不要隐藏在复杂运行时逻辑里。
- 动画使用 `useCurrentFrame()`、`interpolate()`、`spring()` 等 Remotion API。
- 所有非循环 `interpolate()` 必须 clamp。
- 使用 `spring()` 时必须传入 `fps`。
- 画面必须复刻已确认草稿和预览 HTML 的视觉层级、布局、颜色、间距和内容。
- 所有可见文案必须为中文，除非用户明确要求英文。

禁止：

- 禁止 `fetch`、`fs`、`eval`、`Function`、动态 import、`require`、`process`、`window`、`document`、`localStorage`、`WebSocket`、`XMLHttpRequest`。
- 禁止外部 URL。
- 禁止依赖网页交互、滚动、hover、表单、计时器或浏览器 DOM。
- 禁止把完整旁白作为字幕条铺在画面底部。

画面布局要求：

- 每页主体必须相对整个画布居中。
- 直接包裹页面主体的 `AbsoluteFill` 必须设置 `display: "flex"`、`alignItems: "center"`、`justifyContent: "center"`。
- 横屏、竖屏、方形要自适应安全区和网格列数。
- 长文案、表格、列表必须限制在安全区域内，不得溢出。
- 多卡片错峰动画要保留占位，避免画面重心偏移。
- 避免大距离横向飞入；如使用横向位移，单元素不超过 40px。
- 所有短正文、说明文字、副标题、徽章、面板组和卡片组必须具备明确居中策略，不要只依赖父级 `textAlign`。
- Remotion 中的短正文和副标题样式必须设置 `textAlign: "center"`，并使用 `margin: "0 auto"` 或等价布局让文本盒子自身居中。
- 如果动画 wrapper 占满宽度，例如设置 `width: "100%"`，必须同时设置 `display: "flex"` 和 `justifyContent: "center"`，或用等价方式保证子元素不会靠左。
- 预览 HTML 中 `.body`、`.subtitle` 等正文类必须设置 `text-align:center` 和 `margin:0 auto`，并保留 `max-width`，避免短句在宽容器内视觉偏左。
- 最终 Remotion 画面必须复刻确认版预览 HTML 的页数、标题、卡片文案、正文位置、主色、强调色、安全区和最大宽度；不能只复用内容而改变布局层级。

## 预览 HTML 规范

预览 HTML 是给用户确认草稿的静态预览，不是最终视频代码。

要求：

- 使用固定画布 `.stage`。
- 外层 `.viewport` 负责居中和缩放。
- 每个页面对应一个 `.slide`。
- 只允许手动切页控件。
- 不要实现入场动画、自动播放动画或计时器。
- 不要使用外部图片、外部 CSS、外部字体、网络请求、canvas、video、audio、iframe。
- 禁止出现 `transition`、`:hover`、`@keyframes`、`animation:`、`setInterval`、`setTimeout`、`requestAnimationFrame`、`alert(`。
- 修改分镜后必须同步更新预览 HTML 的 `.slide` 数量、页码文案和切页控件显示；禁止出现实际 8 页但显示 `1 / 7` 之类的页数错误。
- 如果需要自动验证预览页面，优先使用本地文件静态检查、截图抽检或临时 HTTP server；不要依赖必须控制 `file://` 页面的浏览器自动化，因为某些环境会限制 `file://` 访问。

## 交付检查清单

生成最终视频前检查：

- 用户已经明确确认草稿。
- 分镜页数、顺序和预览 HTML 一致。
- 修改后的完整页表已经重新输出并经过用户确认。
- 每页都有页面标题、画面内容、旁白和动效说明。
- 旁白没有空段。
- 配音方案已确定并记录，且与视频气质一致。
- 每段旁白音频已生成或准备完成。
- 每段音频真实时长已用于计算时间轴。
- 分镜页数、预览 HTML `.slide` 数量、旁白段数、音频文件数、manifest `segments` 数量和 Remotion `Sequence` 数量完全一致。
- Remotion 时间轴正确。
- 每个页面 Sequence 时间连续且不重叠。
- 画面没有溢出、重叠、裁切或明显偏位。
- 渲染后至少抽取关键帧做视觉 QA：第 1 页封面、一页卡片页、一页含正文说明的页面、最后一页封面感页面。重点检查文字是否居中、是否溢出、是否遮挡、是否被裁切。
- `final.mp4` 能正常播放。
- `cover.jpg` 能代表视频主题。

最终交付建议包括：

- `final.mp4`
- `cover.jpg`
- 确认版分镜草稿
- 预览 HTML
- 配音方案和音频时长记录
- Remotion 工程
- Remotion 代码

## 修改策略

当用户要求改流程、模板或视频结果时：

- 如果是内容问题，回到分镜草稿阶段修改并重新确认。
- 如果是配音问题，先重新选择声音或调整旁白语气，再重新生成音频和时间轴。
- 如果是画面风格问题，修改预览 HTML 和 Remotion 页面结构。
- 如果是音画不同步，检查旁白音频时长和 Sequence 时长。
- 如果是渲染失败，优先修复 Remotion 代码的受限 API、导出、时间轴和布局问题。
- 如果是文本溢出，优先缩短文案、调整安全区、字号和网格，而不是裁切。
