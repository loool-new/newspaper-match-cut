# Remotion 报纸 Match Cut

[English](README.md)

这是一个使用 Remotion 生成报纸 / 杂志 Match Cut 片头的 Codex Skill。焦点词始终处在原始标题句子中，程序通过移动整张报纸保持其位置稳定，同时切换完整排版、字体、分栏、裁切和纸张纹理。

## 效果演示

<table>
  <tr>
    <th>创作 · 中文版</th>
    <th>Editing · 英文版</th>
  </tr>
  <tr>
    <td><video src="https://github.com/user-attachments/assets/92f03700-d87c-4ee6-ac41-4b388f29a2ba" controls playsinline></video></td>
    <td><video src="https://github.com/user-attachments/assets/3660b8f5-e801-43a4-bc09-39ce4fb77c9a" controls playsinline></video></td>
  </tr>
</table>

两段示例均为 720 × 1280、30fps、约 8 秒，并按照音乐节奏切换完整报纸版式。

## 功能

- 支持中文和英文。
- 内置中文 / 英文完整标题与正文。
- 支持用户提供 1–24 组自定义标题和正文。
- 焦点词只渲染一次，并保留在标题的正常文字流中。
- 自动测量焦点词，移动整张报纸完成位置对齐。
- 清晰中心、轻模糊过渡层、强模糊外圈三层空间景深。
- 六种字体版式、两栏 / 三栏排版和六种纸张背景。
- 支持调整高亮颜色、模糊强度、焦点位置、缩放与切换速度。
- 可选的确定性节拍检测，提供稀疏、标准、密集三档切换密度。
- 自动裁切指定音乐区间并按节拍切换版式，也支持手动覆盖节奏点。
- 所有动画由 Remotion 帧驱动，可以稳定重复渲染。

## Skill 的首次交互

Skill 每次开始新任务时必须按顺序提问：

1. `这次报纸动画使用中文还是英文？`
2. `文字内容由你提供完整标题和正文，还是使用所选语言的默认文本自动生成？`
3. `版式切换需要跟随音乐节奏，还是使用默认固定间隔？`

Skill 不会跳过这些选择，也不会擅自决定语言、文案来源或时间模式。

## 安装到 Codex

```bash
git clone https://github.com/loool-new/newspaper-match-cut.git \
  ~/.codex/skills/remotion-newspaper-match-cut
```

重新启动 Codex 后，可以直接这样调用：

```text
使用 remotion-newspaper-match-cut 制作一个报纸 Match Cut 片头。
```

## 创建中文默认文案项目

```bash
python3 scripts/create_newspaper_match_cut.py ./my-newspaper-intro \
  --language zh \
  --keyword "创作" \
  --kicker "创作实验室" \
  --width 720 \
  --height 1280
```

## 使用自定义中文文案

每条完整标题必须包含一次 `{{keyword}}`，它用于标记焦点词在原句中的位置。

```bash
python3 scripts/create_newspaper_match_cut.py ./custom-intro \
  --language zh \
  --keyword "剪辑" \
  --headline "如何让{{keyword}}拥有更强的节奏感" \
  --headline "重新理解短视频{{keyword}}的视觉语言" \
  --body "优秀的剪辑不仅连接镜头，也通过节奏和声音组织观众的注意力。" \
  --body "完整的叙事来自清晰的信息层级，以及对画面变化时机的准确判断。"
```

标题和正文数组会分别按照版式序号循环，因此可以只提供一组，也可以为每一种报纸提供不同内容。

## 跟随音乐节奏切换

传入本地音乐文件和需要使用的时间区间。生成器会在创建项目时分析一次节奏，保存确定性的帧切点，把指定区间裁切到项目中，并自动设置合成时长。

```bash
python3 scripts/create_newspaper_match_cut.py ./beat-synced-intro \
  --language zh \
  --keyword "创作" \
  --audio "/path/to/music.mp3" \
  --audio-start 0 \
  --audio-duration 8 \
  --beat-density standard \
  --width 720 \
  --height 1280
```

`--beat-density` 支持 `sparse`、`standard`、`dense`。如果需要准确控制切点，可重复使用 `--beat-frame`，例如 `--beat-frame 10 --beat-frame 19`；手动切点会覆盖自动检测。即使添加了音乐，也可以用 `--timing-mode fixed` 保持固定间隔切换。

## 运行与渲染

```bash
cd my-newspaper-intro
npm install
npm run typecheck
npm run studio
npm run render
```

## 主要参数

| 参数 | 作用 |
| --- | --- |
| `language` | `zh` 或 `en` |
| `keyword` | 唯一清晰并高亮的焦点词 |
| `kicker` | 报纸页眉小字 |
| `topic` | 默认标题中的主题文字 |
| `headlineTemplates` | 包含一次 `{{keyword}}` 的完整标题数组 |
| `bodyParagraphs` | 完整正文段落数组 |
| `accentColor` | 焦点词高亮颜色 |
| `timingMode` | `fixed` 固定间隔或 `beats` 音乐节奏切换 |
| `beatFrames` | 相对于裁切音乐片段的确定性版式切换帧 |
| `audioSrc` | `public/` 目录下的项目内音频路径 |
| `audioDurationSeconds` | 选中音乐片段的时长 |
| `cutIntervalFrames` | 默认版式切换间隔 |
| `focusY` | 焦点词在画面中的纵向位置 |
| `blurMin` / `blurMax` | 中间层与外圈模糊强度 |
| `focusScale` | 报纸整体缩放 |

## 工作原理

1. 每种版式先正常排出完整标题和正文。
2. 标题中的 `{{keyword}}` 被替换成唯一的原生焦点词节点。
3. 程序测量该节点，再平移和缩放整张报纸，使焦点词落在共享锚点。
4. 相同排版被渲染为清晰、轻模糊和强模糊三层。
5. 三层使用围绕焦点词的宽椭圆遮罩混合，模糊随距离增加，但字形不会向外拉伸。
6. 字体、正文分栏、裁切和纸张纹理在切点处整体变化。

## 仓库结构

```text
SKILL.md                         Codex 工作流与视觉规则
agents/openai.yaml               Skill 展示信息和默认提示
assets/remotion-template/        可复用 Remotion 项目模板
examples/                        MP4 示例和预览图
references/visual-recipe.md      时间、排版、模糊和验证指南
scripts/create_newspaper_match_cut.py
scripts/analyze_audio_beats.py     确定性的节奏检测与帧转换
README.md                        默认英文文档
```

## 环境要求

- Python 3
- Node.js 20 或更高版本
- npm
- 使用音乐或自动节拍检测时需要 ffmpeg 和 ffprobe
- Remotion 可用的 Chromium 浏览器

模板使用跨平台系统字体栈，不同操作系统的实际字形可能略有区别。需要精确还原时，请提供已获得授权的本地字体。发布替换字体、报纸扫描图、纸张纹理和音乐前，请确认拥有相应使用权限。
