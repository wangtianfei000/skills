# Skills

这是一个用于存放 Codex / AI 工作流技能的仓库。目前包含文档生成和视频生成相关的自定义 skill。

## 目录

| 目录 | 说明 |
| --- | --- |
| `ai-doc-html/` | 将 AI 生成的 Markdown 内容渲染为单文件 HTML 文档，支持 Mermaid、代码高亮和图文排版。 |
| `video-generation-with-remotion/` | 基于 Remotion 的类 PPT 视频制作流程，覆盖分镜草稿、配音、工程模板和最终视频生成。 |

## 使用方式

将需要使用的 skill 目录放入 Codex 的 skills 目录中，或在当前仓库中直接维护后同步到对应环境。

每个 skill 目录通常包含：

- `SKILL.md`：skill 的核心说明和触发规则。
- `README.md` 或参考文档：面向维护者的说明。
- `assets/`：模板、示例工程或静态资源。
- `scripts/`：辅助脚本。

## 维护建议

- 修改 skill 行为时，优先更新对应目录下的 `SKILL.md`。
- 新增模板、脚本或示例时，在对应 skill 的说明文档中补充入口。
- 保持根目录 README 只做总览，详细用法放在各 skill 目录内。
