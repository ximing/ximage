# iLoveIMG remove-background — research

Live pass on 2026-10-09 with CSI (`~/.csi/bin/csi`, daemon already running, v0.9.0, extension connected). Session `ximage-iloveimg`. Page: `https://www.iloveimg.com/zh-cn/remove-background` (title `图片背景去除器`). No login, cookie wall, or paywall on this run. Snapshot text is in the CSI log for this session.

## What the remove-background flow actually does

The tool is a three-step server wizard: an upload screen, an editor with one process button, then a separate download page. It is not one workspace.

| Flow item | What was on the page |
| --- | --- |
| JPG and PNG | The only format sentence is the marketing subtitle: `去除图像背景。去除JPG和PNG图像的背景，并保持图片质量。` The file input `accept` is `.jpg,.jpeg,.png`. No GIF, WEBP, or HEIC was offered. |
| Multi-image picker | Button `选择多张图片`. The input has `multiple=true`. After one file, the editor shows a `1` badge, a `sample.png` combobox, and `添加更多 图片`. |
| Drag and drop | Copy under the button: `或者将多个图片拖动到这里`. `#dropArea` is on the page. A drag was not performed. |
| One-click cutout | The editor's only process control is the button `去除背景` (`#processTask`). It does not say "AI" or "一键". One click left the editor. |
| Transparent PNG | The downloaded response was `image/png`, indexed color, with a `tRNS` chunk. The page never said "PNG" or "transparent". |
| Pixel dimensions | The sample was 16×16. Both comparison bitmaps were 16×16, the file card title included `16x16`, and the downloaded file was 16×16. Tooltip titles exist (`这个图片的原始尺寸 (以像素为单位)`, `该图片将调整为这个尺寸 (以像素为单位)`) but the size text nodes were empty. The subtitle says 保持图片质量, not pixel dimensions. The match was measured, not claimed in copy. |
| Before/after | On the editor, before the process click, `.img-comparison-slider` showed the source on the left and a different bitmap (partial alpha, checkerboard) on the right. The success page has no compare view. |
| Download | Success page H1 `这个文件已成功处理。` Primary action `下载文件`. Also Drive, Dropbox, a share link, and delete. |
| Processing or failure | No processing screen and no error were captured. A wait for `下载` returned in 6ms because that string was already in hidden DOM. The next visible state was the success page. No failure, paywall, or spinner was shown for this 16×16 file. |

Upload also offers `从你的电脑中上传`, `从Google Drive中选择图像文件`, and `从Dropbox中选择图像文件`. Drive and Dropbox are out of scope.

## Out of scope: the rest of the suite

Visible in the top nav, not part of this flow: `压缩图像文件`, `调整图像的大小`, `裁剪图片`, `转换至JPG文件`, `照片编辑器`, `更多工具`, plus `登录` and `注册`.

In the 更多工具 menu DOM: `提升质量`, `搞笑创意图片生成器`, `旋转一个图片`, `JPG文件转换至`, `HTML转图片`, `给图片加水印`, `模糊面部`. Stickers and filters were not in that menu. The success page pushes `压缩图像文件`, `裁剪图片`, and `给图片加水印` under `继续...`. None of these are in the product we are building.

## Out of scope: shared editor chrome

Not visible and absent from the accessibility tree. Present only as hidden templates on the pre-process page: `不透明`, font names (Arial, Impact), `字体大小`, bold, italic, underline, `Background color`, `Font color`, `Font shadow`. Text, font, shadow, and sticker editing are not part of the remove-background flow.

## How the interaction should differ

iLoveIMG uploads the file, then changes pages for the editor and again for download. The cutout result is a separate download step, and a fast job shows no progress. The new tool stays on one workspace: drop, then act, then compare and export there. Progress has to be visible because the model runs in the tab. A failed model or WASM load has to say so. Export is either the transparent PNG or the same subject on a solid color, without a second editor.

## Libraries

Versions below are the ones the app installs. Cutout, zip, drop, and compare are maintained packages. Matting, the zip format, and the comparison slider are not hand-rolled.

### Cutout — `@bunnio/rembg-web` 1.0.2 (MIT) and `onnxruntime-web` 1.23.0 (MIT)

`@bunnio/rembg-web` is a browser port of [danielgatis/rembg](https://github.com/danielgatis/rembg). `remove()` takes a `Blob` and returns a PNG blob. Inference goes through ONNX Runtime Web, which runs the graph in WebAssembly. `newSession('u2netp')` plus `onProgress` is the shipped entry. The app forces `numThreads: 1` and the WASM execution provider. GitHub Pages does not send COOP/COEP, so `SharedArrayBuffer` and the threaded runtime are unavailable there.

`@imgly/background-removal` 1.7.0 is the other widely used browser cutout. It is AGPL-3.0 (peer `onnxruntime-web` 1.21.0) and its weights are hosted by IMG.LY. A maintained MIT library fits this static app, so the AGPL package is not used. `bg-remove-sdk` is MIT but defaults to `briaai/RMBG-1.4`, whose model license is separate and not a general-purpose grant. That model was not used.

The checkpoint is **u2netp** (4,574,861 bytes, sha256 `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`), the small public U²-Net weight published as a release asset of danielgatis/rembg (`https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx`). U²-Net's code repository (xuebinqin/U-2-Net) is Apache-2.0. The weight file is vendored at `public/models/u2netp.onnx`. GitHub release assets do not send `Access-Control-Allow-Origin`, so a page on GitHub Pages cannot `fetch` them. Serving the file from the same static host is not an application server. The full u2net checkpoint is about 176 MB, which is a poor fit for a project site. u2netp is the library's lightweight general model (320×320 inference) and still returns a mask at the source pixel size (`naiveCutout` sets the output canvas to the input canvas).

### Several files — `fflate` 0.8.3 (MIT)

`zipSync` builds one archive when two or more cutouts are downloaded. A single image uses the browser's `<a download>`, which is not a zip implementation. `fflate` is the small maintained deflate/zip library (about 8 kB). A hand-rolled zip writer was not used.

### Picker and compare — `react-dropzone` 20.1.2 (MIT) and `react-compare-slider` 4.0.0 (MIT)

`react-dropzone`'s `useDropzone` is the multi-file picker and the drop target. Rejection copy is our `acceptFiles` so a non-JPG/PNG gets an explicit reason. `react-compare-slider` is the before/after control on the finished image. Both are current, focused packages. The pointer math for a compare slider was not rewritten.

### State and type — `@rabjs/react` 9.4.1 (MIT), `@fontsource/bricolage-grotesque` 5.3.0, `@fontsource/figtree` 5.3.0

`@rabjs/react` (which depends on `@rabjs/observer` and `@rabjs/service`) holds the theme (`register`) and the image queue (`bindServices`). Theme, queue, and export color are not kept in `useState` or a second state library. Fontsource ships the faces inside the static build, so the page does not call a font CDN.

Build is Vite with `base: './'`, so JS, CSS, the ONNX Runtime WASM asset, and the model resolve on a GitHub Pages project path. The runtime is loaded with a single thread because GitHub Pages does not send COOP/COEP, and `SharedArrayBuffer` is unavailable there. The cutout module is loaded when the user runs removal, not on first paint.
