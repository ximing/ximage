# Ximage browser verification

Session: `ximage-verify` (one Chrome tab). Built with `pnpm run build`, then served with `pnpm exec vite preview --host 127.0.0.1 --port 4174 --strictPort`.

Port 4173 was already taken by another agent's whiteboard preview (`vite preview` in `/Users/ximing/project/mygithub/whiteboard/packages/app`, PID 28137). That process was left running. This check used `http://127.0.0.1:4174/#/` so it did not open the other app.

Fixture: `tests/fixtures/subject.png` (160×160 PNG). JPEG copy: `/tmp/ximage-subject.jpg` (160×160 JPEG via `sips`).

## 1. Home `#/`

**Pass.** The grid links are `#/remove-background`, `#/compress`, `#/resize`, `#/crop`, `#/convert-to-jpg`, `#/convert-from-jpg`, `#/photo-editor`, `#/upscale`, `#/watermark`, `#/meme`, `#/rotate`, `#/html-to-image`, `#/blur-face`. Theme toggle changed the page: button text `Light theme` (pressed) with `documentElement.dataset.theme=dark` and body background `rgb(12, 20, 36)` became button text `Dark theme` with `theme=light` and body background `rgb(228, 235, 245)`.

## 2. Compress `#/compress`

**Pass.** Uploaded `subject.png`. Caption: `Original 160 × 160, 570 B. Result 160 × 160, 262 B.` Thumb: `570 B → 262 B`.

## 3. Resize `#/resize`

**Pass.** Uploaded `subject.png`. Pixels mode, lock aspect on. Width set to 80, height became 80. Caption: `Original 160 × 160, 570 B. Result 80 × 80, 992 B.` Result image natural size 80×80.

## 4. Crop `#/crop`

**Pass.** Uploaded `subject.png` and ran Crop with the default rectangle. Caption: `Original 160 × 160, 570 B. Result 128 × 128, 259 B.` Thumb image natural size 128×128 (`blob:` URL) and Download is enabled.

## 5. Rotate `#/rotate`

**Pass.** Uploaded `subject.png`. The 90° control is pressed and the Degrees field is `90`. After Rotate, caption: `Original 160 × 160, 570 B. Result 160 × 160, 258 B.` Download is enabled. No non-square fixture was available, so 90 degrees on this square cannot change dimensions; the action still completed and the result bytes differ from the original (570 B → 258 B).

## 6. Convert to JPG `#/convert-to-jpg`

**Pass.** Uploaded `subject.png` and ran Convert to JPG. Caption: `Original 160 × 160, 570 B. Result 160 × 160, 2.8 KB.` The result blob is `image/jpeg` with signature `ff d8 ff`. The run button reads `Convert to JPG`. The thumb label stays the source name `subject.png`.

## 7. Convert from JPG `#/convert-from-jpg`

**Pass.** Uploading `subject.png` showed `subject.png: Only JPG images can be added.` and added no image. Then uploaded `/tmp/ximage-subject.jpg`, chose PNG (already pressed), and ran Convert. Caption: `Original 160 × 160, 3.0 KB. Result 160 × 160, 9.4 KB.` Result blob `image/png` signature `89 50 4e 47`, natural size 160×160, Download enabled.

## 8. Watermark `#/watermark`

**Pass.** Uploaded `subject.png`. The Watermark button was disabled before any text existed (`disabled=true`, text field absent). After ADD TEXT it stayed disabled while the field was empty. After the text `Ximage`, the button enabled. Caption: `Original 160 × 160, 570 B. Result 160 × 160, 6.7 KB.` Thumb image natural size 160×160 and Download enabled.

## 9. Meme `#/meme`

**Pass.** Uploaded `subject.png`, top caption `Hello`, ran Generate meme. Caption: `Original 160 × 160, 570 B. Result 160 × 160, 1.1 KB.` Thumb image natural size 160×160 and Download enabled.

## 10. Photo editor `#/photo-editor`

**Pass.** Uploaded `subject.png`. Caption: `subject.png · 160 × 160 px`. The Text tool shows a text field, placeholder `Write your text here`. Filter & light → Grayscale was pressed, Apply left no error and enabled Undo. Save downloaded `subject-edited.png` (Save control stayed enabled, no error banner).

## 11. Upscale `#/upscale`

**Pass.** Uploaded `subject.png` and left 2x. Before the run the page showed `160 x 160 px → 320 x 320 px`. After Upscale (about 93s) caption: `Original 160 × 160, 570 B. Result 320 × 320, 32 KB.` Hero and thumb natural size 320×320. No model error. Download enabled.

## 12. Blur face `#/blur-face`

**Pass.** Uploaded `subject.png` (no face). Automatic detection was `Recommended`. `Add blur area` was visible. The run finished (`aria-busy=false`) with note `No face was found. Draw a blur area to cover a face or another object.` Caption: `Original 160 × 160, 570 B. Result 160 × 160, 1.5 KB.` Download enabled. No error banner.

## 13. HTML to image `#/html-to-image`

**Pass.** The HTML box was filled with `<h1 style="font:48px sans-serif">Hello Ximage</h1>` (CSI `fill` threw `fill: Uncaught` on the textarea, so the value was set through the textarea's value setter and an `input` event). JPG was selected. Convert produced an image: caption `3008 x 480 px, JPG`, alt `Converted HTML`, natural size 3008×480, Download enabled. The HTML box was then cleared and URL `https://example.com` was submitted. Visible alert: `The browser could not read that site (network or CORS). Failed to fetch`. Not a hang and not a blank success.

## 14. Remove background `#/remove-background`

**Pass.** Uploaded `subject.png` and ran Remove background. A compare view appeared: original alt `Original` natural 160×160, result alt `Background removed` natural 160×160. Caption: `160 × 160 pixels, the same size as the original.` Download this image enabled. No model error.

## Summary

| Check | Result | Evidence |
|---|---|---|
| Home | Pass | 13 tool links; theme `dark` / `rgb(12, 20, 36)` / `Light theme` became `light` / `rgb(228, 235, 245)` / `Dark theme` |
| Compress | Pass | `Original 160 × 160, 570 B. Result 160 × 160, 262 B.` |
| Resize | Pass | Width 80, height 80; `Result 80 × 80`; natural size 80×80 |
| Crop | Pass | Default crop result `128 × 128`; thumb natural 128×128; Download enabled |
| Rotate | Pass | 90° pressed; square stayed `160 × 160` (570 B → 258 B); Download enabled |
| Convert to JPG | Pass | Result blob `image/jpeg` (`ff d8 ff`), 2.8 KB; button `Convert to JPG` |
| Convert from JPG | Pass | PNG rejected: `Only JPG images can be added.`; JPEG became PNG `89 50 4e 47`, 160×160 |
| Watermark | Pass | Button disabled until text `Ximage`; result 160×160, 6.7 KB |
| Meme | Pass | Top caption `Hello`; result 160×160, 1.1 KB |
| Photo editor | Pass | Text field present; Grayscale applied; Save downloaded `subject-edited.png` |
| Upscale | Pass | Preview `160 x 160 px → 320 x 320 px`; result `320 × 320`, natural 320×320 |
| Blur face | Pass | `No face was found...`; Download enabled; `Add blur area` visible |
| HTML to image | Pass | JPG result `3008 x 480 px`; example.com alert `network or CORS` / `Failed to fetch` |
| Remove background | Pass | Compare view, both images 160×160; `the same size as the original` |
