# Ximage UI 重构任务 Prompt

> 把下面整段（从「背景」到「验收」）作为 Prompt 交给新 Agent。建议在仓库根目录 `/Users/ximing/project/mygithub/ximage` 下启动。

---

## 背景

Ximage 是一个纯浏览器端（on-device）的图片工具站，13 个工具：抠背景、压缩、缩放、裁剪、旋转、转 JPG、JPG 转出、HTML 转图片、照片编辑器、放大、水印、Meme、人脸模糊。技术栈：React 19 + `@rabjs/react`（Service/observer 模式）+ react-router（HashRouter）+ pnpm + vitest。i18n 双语（zh/en），`src/locales/zh.ts` 和 `en.ts` 键集合必须严格对称（`tests/locale.test.ts` 会校验）。

**视觉的唯一标准是 `docs/design/mockup.html`**（自包含 HTML，含 4 个屏：首页 / 工具·待上传 / 工具·处理队列 / 照片编辑器，支持明暗主题切换）。上一轮已按它粗实现了一版，但有偏差。你的任务是：**1) 拆分全局样式到模块；2) 消除实现与 mockup 的差异；3) 打磨每个工具页内部的样式**。

## 当前状态（上一轮已做的）

- `src/styles.css`：全部样式堆在这一个全局文件里（token、shell、首页、bench 工作台、editor 等都在内）——**这是要拆掉的**。
- 布局骨架已就位：Shell 顶栏（logo/面包屑/语言/主题）、首页分组目录、工具页三段式 bench（画布 + 右侧选项栏 + 底部胶片条）、照片编辑器四区网格（左工具栏/顶栏/画布/右面板/状态栏）。
- `src/components/tool-workspace.tsx` 是 10 个工具页共用的工作台组件；`src/pages/studio`（抠背景）、`src/pages/photo-editor`、`src/pages/html-to-image` 是各自独立布局。
- `src/components/icons.tsx`：全部线性 SVG 图标。
- `src/tools/registry.ts`：每个工具有 `group / color / formats / badge` 元数据。

## 任务 A：拆分 styles.css 到各模块

- 保留一个小的全局文件（如 `src/styles/tokens.css`）：只放设计 token（CSS 变量、明暗主题）、reset、字体栈、`focus-visible`、`prefers-reduced-motion`。
- 其余按归属拆分并就近放置，由各组件/页面自己 import，例如：
  - `src/shell.tsx` → `src/shell.css`（顶栏、面包屑、lang-seg、icon-btn）
  - `src/pages/home/` → `home.css`（hero、分组目录、tool-card）
  - `src/components/tool-workspace.tsx` → 同目录 `tool-workspace.css`（bench 网格、hero/drop、rail、strip/thumb、status/result-chip、通用 settings 控件：field/choices/check/slider-row/select）
  - `src/pages/studio/`、`src/pages/photo-editor/`、`src/pages/html-to-image/` 各自的 css；crop/blur-face 等页面级特殊样式（crop-frame、blur-stage…）放到对应页面目录。
- 类名保持现有语义前缀（`tool-`、`bench`、`rail`、`thumb`、`e-` 等），不要引入 CSS Modules 构建改动；拆分后全局不应再有「什么都往里放」的样式文件。
- 拆分时顺手删掉已无引用者的死样式（用 grep 验证）。

## 任务 B：消除与 mockup 的差异

先打开 mockup 对照（可用 headless Chrome 截图，命令见文末）。已知差异清单（不限于此，发现更多就一起修）：

1. **工具页右侧栏控件形态**：mockup 的选项控件是「竖排分段选择（带描述小字）/ 统一样式 select / 自定义 checkbox（方块带勾）/ 带数值读数的 slider-row」；现在各工具页还是原生 range、朴素 choices 芯片、原生 checkbox。把现有控件**按 mockup 的控件词汇重画**（在 tool-workspace.css 里提供 `.seg` / `.seg-col` / `.select` / `.check-row` / `.slider-row` 等通用类，页面按需换用）。
   - 注意：**不要发明没有功能的后端空控件**。mockup 里「压缩策略/输出格式」这类当前 service 没有对应状态的，不要硬造；把 service 已有的真实状态（如 quality slider、resize mode、output format）用 mockup 的形态呈现。
2. **结果芯片 result-chip**：mockup 是 `文件名 | 1.2 MB → 410 KB −66%`（等宽数字 + 绿色降幅）；现在只是把 caption 文本塞进去。压缩/缩放等有 originalBytes/resultBytes 的工具要按此格式渲染。
3. **对比滑块**：mockup 处理队列屏的画布有「原图 / 压缩后」对比滑块（ReactCompareSlider，依赖已装）。目前只有抠背景页用了。让有结果对比意义的工具页（压缩、缩放、旋转、水印等）在 `status === 'done'` 时也用对比滑块 + 角标。
4. **照片编辑器（上轮基本没做完的部分）**：
   - 滤镜面板：mockup 是**缩略图网格**（每个滤镜一张实时预览小图 + 名称），现在是文字 chips。用当前图片生成低分辨率预览（canvas 缩小后套各滤镜的像素处理），选中态描边 accent；性能上注意缓存/尺寸。
   - 滑杆带数值读数（亮度 112 这种 `.slider-row` 形态）。
   - 状态栏：左侧缩放控件（已有），右侧加「已修改 · 未保存」脏状态（service 里如没有就加一个 hasImage 后的 dirty 标记，apply/save 后清除）。
   - 画布提示文案（滚轮缩放等，没有对应功能就不写）。
5. **首页**：基本接近，检查 tool-card hover 的 `→` 箭头、分组标题的 `· 说明文字`、hero 右侧棋盘格装饰在明暗两主题下的表现。

## 任务 C：每个具体工具页内部打磨

逐页过一遍（上传 `tests/fixtures/subject.png` 实测），重点：

- **crop**：裁剪舞台与四周控制杆的视觉（裁剪框、遮罩、手柄）；宽高/X/Y 输入用 `.field-row` 两列排布。
- **blur-face**：blur-box 矩形框样式、绘制中十字光标、"添加模糊区域"按钮形态。
- **watermark / meme**：图片上的文字框选中态、字体/字号/透明度等浮层控件的样式统一。
- **rotate**：RIGHT/LEFT 大按钮、角度读数。
- **upscale**：2x/4x 选择器 + 前后尺寸预览（`160×160 → 320×320` 等宽读数）。
- **convert-to-jpg / convert-from-jpg**：格式选项用 seg 控件。
- **html-to-image**：右侧栏已竖排，检查 textarea、屏幕尺寸 chips、checkbox 的间距与层级。
- 所有页的空态（`.drop` 虚线面板）已在位，确认每个页的 noun 文案正确（图片/照片/JPG 图片）。

## 硬约束

- **不许破坏任何 `data-testid`**（verify 脚本和测试依赖它们）；`aria-pressed`/`aria-label`/`role` 等无障碍属性保持或增强。
- 新增文案必须 zh/en 双语对称加入 `src/locales/zh.ts`、`en.ts`。
- 改动 Service 逻辑要克制：本任务是 UI 重构，除了滤镜缩略图和 dirty 标记这类 UI 必需的小状态，不动处理管线。
- 每次改完跑：`pnpm exec tsc --noEmit`、`pnpm test`、`pnpm build`，三者全绿才算完。
- 响应式：`@media (max-width: 960px)` 下 bench 变单列、editor 面板下移，别弄坏。

## 验收方式（必须实际执行）

```bash
pnpm dev --port 5199   # 起服务
# 用 CSI 驱动真实 Chrome 截图（daemon 已在跑）：
curl -s -X POST http://127.0.0.1:10088/command -H 'content-type: application/json' \
  -d '{"action":"navigate","args":{"url":"http://localhost:5199/#/compress","newTab":true},"session":"ui-refresh"}'
# 上传测试图：
curl -s -X POST http://127.0.0.1:10088/command -H 'content-type: application/json' \
  -d '{"action":"upload","args":{"selector":"[data-testid=compress-input]","files":["/Users/ximing/project/mygithub/ximage/tests/fixtures/subject.png"]},"session":"ui-refresh"}'
# 点击运行 / 截图：
curl -s -X POST http://127.0.0.1:10088/command -H 'content-type: application/json' \
  -d '{"action":"click","args":{"selector":"[data-testid=compress-run]"},"session":"ui-refresh"}'
curl -s -X POST http://127.0.0.1:10088/command -H 'content-type: application/json' \
  -d '{"action":"screenshot","args":{"path":"/tmp/shot.webp"},"session":"ui-refresh"}'
# mockup 对照截图（headless）：
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --window-size=1440,900 --screenshot=/tmp/mock.png "file://$PWD/docs/design/mockup.html#work"
```

对 4 个 mockup 屏逐一产出「实现截图 vs mockup 截图」对照，并至少实测 6 个工具页的上传后状态（含明暗主题各一次、移动端 390px 一次）。把对照图给我确认后再收尾。
