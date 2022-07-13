# iLoveIMG tool catalog

Live pass on 2026-10-09 with CSI (`~/.csi/bin/csi`, daemon already running). Session `ximage-catalog`, one tab. English site `https://www.iloveimg.com/`. A language prompt `更改为中文 (简体)？` was dismissed with `否`. No account was created. Premium, Drive, and Dropbox were not used.

Fixture: `tests/fixtures/subject.png` (PNG, 160×160, 570 bytes). The OS file button on these pages is the browser locale control `选择文件` / `未选择任何文件`, not an English site label.

## Homepage tool list

Nav links: `COMPRESS IMAGE`, `RESIZE IMAGE`, `CROP IMAGE`, `CONVERT TO JPG`, `PHOTO EDITOR`, plus `Login` and `Sign up`. The page cards, in order:

| Card | Visible description |
| --- | --- |
| Compress IMAGE | Compress JPG, PNG, SVG, and GIFs while saving space and maintaining quality. |
| Resize IMAGE | Define your dimensions, by percent or pixel, and resize your JPG, PNG, SVG, and GIF images. |
| Crop IMAGE | Crop JPG, PNG, or GIFs with ease; Choose pixels to define your rectangle or use our visual editor. |
| Convert to JPG | Turn PNG, GIF, TIF, PSD, SVG, WEBP, HEIC, or RAW format images to JPG in bulk with ease. |
| Convert from JPG | Turn JPG images to PNG and GIF. Choose several JPGs to create an animated GIF in seconds! |
| Photo editor | Spice up your pictures with text, effects, frames or stickers. Simple editing tools for your image needs. |
| Upscale Image | Enlarge your images with high resolution. Easily increase the size of your JPG and PNG images while maintaining visual quality. Marked `New!`. |
| Remove background | Quickly remove image backgrounds with high accuracy. Instantly detect objects and cut out backgrounds with ease. Marked `New!`. |
| Watermark IMAGE | Stamp an image or text over your images in seconds. Choose the typography, transparency and position. |
| Meme generator | Create your memes online with ease. Caption meme images or upload your pictures to make custom memes. |
| Rotate IMAGE | Rotate many images JPG, PNG or GIF at same time. Choose to rotate only landscape or portrait images! |
| HTML to IMAGE | Convert webpages in HTML to JPG or SVG. Copy and paste the URL of the page you want and convert it to IMAGE with a click. |
| Blur face | Easily blur out faces in photos. You can also blur licence plates and other objects to hide private information. Marked `New!`. |

## Out of scope

Not part of a local image tool:

- Accounts: `Login`, `Sign up`.
- Payments: `Get Premium`, `Pricing`, and the homepage premium banner. A `Premium` badge is also drawn on the upscale options panel.
- Cloud pickers: `Select images from Google Drive`, `Select images from Dropbox`, and the post-upload `Add more images` entries for those two.
- PDF / API / mobile promos on the homepage: `iLovePDF` (“Switch to document mode”), `iLovePDF Mobile` (“Scan and edit on the go”), `iLoveIMG API`, plus footer `iLoveSign`, `iLoveAPI`, `Google Play`, `App Store`.

Where a tool has `Add more images`, the menu also shows `Upload from your computer`. That item is the same local picker.

On compress and rotate, hovering the file card shows icon buttons titled `Rotate` and `Remove this file`, and a tooltip `570.00 Bytes - 160x160`. Those were not re-checked on every tool.

## Compress image

- URL: `https://www.iloveimg.com/compress-image`
- Accepts: `.jpg,.jpeg,.png,.gif,.svg` (`multiple`). Page copy: JPG, PNG, SVG, GIF. Links on the upload screen: `JPG`, `PNG`, `SVG`, `GIF`.
- Batch: yes. Upload button `Select images`, copy `or drop images here`.
- Primary action: `Compress IMAGES`.
- After upload: file `subject.png`, count `1`, panel title `Compress images`, sentence `All images will be compressed with the best quality and filesize ratio.` No quality, percent, or format control was visible. A hidden `#highres-options` block (`Recommended Quality`, premium `High Quality`) is `display: none` and is not a control that appeared.

## Resize image

- URL: `https://www.iloveimg.com/resize-image`
- Accepts: `.jpg,.jpeg,.gif,.png,.svg` (`multiple`). Copy: JPG, PNG, SVG, GIF. Upload links: `JPG`, `PNG`, `SVG`, `GIF`.
- Batch: yes. `Select images`, `or drop images here`.
- Primary action: `Resize IMAGES`.
- After upload the file card shows `160 x 160` and `160 x 160`. Panel title `Resize options`.
- Tab `By pixels` (default): `Width (px):` number `160` (placeholder `Auto`), `Height (px):` number `160` (placeholder `Auto`), checkbox `Maintain aspect ratio` (checked), checkbox `Do not enlarge if smaller` (unchecked).
- Tab `By percentage`: `25% SMALLER`, `50% SMALLER` (selected), `75% SMALLER`. No custom percent field.

## Crop image

- URL: `https://www.iloveimg.com/crop-image`
- Accepts: `.jpg,.jpeg,.gif,.png` (`multiple` is false). Copy: JPG, PNG, GIF. Upload button is singular: `Select image`. Copy still says `or drop images here`. Links: `JPG`, `PNG`, `GIF`.
- Batch: no. A second attach of the same PNG produced `Sorry! iLoveIMG can't process all your files in one task` / `Your task exceeds the maximum files limit per task.` with `Close`. The editor for the first file was already on the page.
- Primary action: `Crop IMAGE`.
- After upload: `Crop options`, number fields `Width (px)` `128`, `Height (px)` `128`, `Position X (px)` `16`, `Position Y (px)` `16`, and a visual crop rectangle (cropper.js). No aspect-ratio presets.

## Convert to JPG

- URL: `https://www.iloveimg.com/convert-to-jpg`
- Accepts: `.gif,.tif,.tiff,.png,.crw,.cr2,.dng,.raf,.nef,.nrw,.orf,.rw2,.pef,.arw,.srf,.sr2,.raw,.psd,.svg,.webp,.heic` (`multiple`). Not JPG. Copy and upload links: PNG, GIF, TIF, PSD, SVG, WEBP, HEIC, RAW.
- Batch: yes. `Select images`, `or drop images here`.
- Primary action: `Convert to JPG`.
- After `subject.png`: panel `Convert options`, sentence `All images will be converted to JPG.` No quality or size control was visible.

## Convert from JPG

- URL: `https://www.iloveimg.com/jpg-to-image`
- Accepts: `.jpg,.jpeg` only (`multiple`). Button `Select JPG images`, copy `or drop JPG images here`. Output links on the upload screen: `PNG`, `GIF`.
- Batch: yes. Animated GIF needs two or more files.
- `subject.png` was rejected on the upload screen: `Upload error` / `Sorry, this extension is not allowed` / `subject.png`. The post-upload UI was then opened with a JPEG made from that same fixture (`/tmp/ximage-subject.jpg`), and a second copy of that JPEG for the animated-GIF case.
- Primary action: `Convert IMAGE`.
- Panel `JPG conversion`:
  - `CONVERT TO PNG` — `All images will be converted to PNG format` (default).
  - `CONVERT TO GIF` — `All images will be converted to GIF format`. Opens `Convert to GIF` with `Back`.
- GIF modes: `Static GIF` (default) and `Animated GIF`. With one file, Animated GIF is disabled and its tooltip is `Select 2 or more images to activate!`.
- With two JPEGs, `Animated GIF` enables: `Seconds per image:` number `0.5`, checkbox `Loop` (checked). Sentence: `All your selected JPG images will be converted to GIF format.`

## Photo editor

- URL: `https://www.iloveimg.com/photo-editor`
- Accepts: file input `accept="image/x-png,image/jpeg"`, `multiple` false. Button `Select image`. Subtitle: `Add text, stickers, effects and filters to your photos. Edit your photos online.` No Drive or Dropbox links on this upload screen.
- Batch: no.
- `subject.png` opened the editor. There is no single process button. Actions are `Open`, `Save`, and per-tool `Apply` / `Cancel` / `Close`.
- Toolbar: `FILTER & LIGHT`, `RESIZE`, `CROP`, `TRANSFORM`, `DRAW`, `TEXT`, `SHAPES`, `STICKERS`, `FRAME`, `CORNERS`, `BACKGROUND` (disabled), `MERGE` (disabled on first load). A later click on `MERGE` did not open a merge panel. `BACKGROUND` stayed disabled.
- Chrome: `Zoom` `100%`, unlabeled zoom-out / zoom-in icons, `undo` and `redo` disabled, unlabeled history and layers icons. Format next to save: `png` (active) and `jpg`. Visible text includes `Save png`. The save button label is `Save`. Save was not clicked.

Drawers that opened:

- `FILTER & LIGHT`: `Close`, then `Grayscale`, `Black & White`, `Sharpen`, `Invert`, `Vintage`, `Polaroid`, `Kodachrome`, `Technicolor`, `Brownie`, `Sepia`, `Remove Color`, `Brightness`, `Gamma`, `Noise`, `Pixelate`, `Blur`, `Emboss`, `Blend`, then `Apply`. Clicking `Brightness` did not reveal a slider or other extra field.
- `RESIZE`: `Cancel`, `Width` `160`, `Height` `160`, an unlabeled button between the fields and the checkboxes, `Maintain Aspect Ratio` (checked), `Use Percentages` (unchecked), `Apply`.
- `CROP`: `Cancel`, `Width` `160`, `Height` `90`, ratios `3:2`, `5:3`, `4:3`, `5:4`, `6:4`, `7:5`, `10:8`, `16:9` (`16:9` selected), `Apply`.
- `TRANSFORM`: `Close`, four icon buttons with no text (SVG names `rotate-left`, `rotate-right`, `flip-vertical-custom`, `flip-horizontal-custom`), a slider labeled only by the value `0` (`aria` range 0–360), `Apply`.
- `DRAW`: `Close`, `Brush Color`, `Brush Type`, `Brush Size`, a color-wheel icon, eight unlabeled color swatches, a pencil icon, five unlabeled size dots (second selected), `Apply`.
- `TEXT`: `Close`, `Color Picker` (color wheel plus eight swatches), `Add Text`, font button `Times New Roman`, label `Font`, `Apply`. Clicking `Add Text` did not show a text field. The font menu was not opened. A second open of `TEXT` left an empty drawer (`Close`, disabled `Apply`).
- `SHAPES`: `Close`, `Circle`, `Rectangle`, `Triangle`, `Ellipse`, `Arrow #1`, `Arrow #2`, `Arrow #3`, `Line`, `Star`, `Polygon`, `Badge`, `Apply`.
- `STICKERS`: `Close`, categories `Emoticons`, `doodles`, `Landmarks`, `Stars`, `Clouds`, `Bubbles`, `Transportation`, `Beach`, `Apply`. `Emoticons` opens a grid whose labels are file-style names (`afro-1`, `afro`, `agent`, `alien`, `angel`, `angry`, and more). The full sticker list was not copied.
- `FRAME`: `Close`, `Basic`, `pine`, `oak`, `rainbow`, `grunge #1`, `grunge #2`, `ebony`, `Art #1`, `Art #2`, label `Size`, slider 0–100 at `0`, `Apply`.
- `CORNERS`: `Cancel`, `Radius`, slider 1–300 at `50`, `Apply`.

## Upscale image

- URL: `https://www.iloveimg.com/upscale-image`
- Accepts: `.jpg,.jpeg,.png` (`multiple`). `Select images`, `or drop images here`.
- Batch: yes.
- Primary action: `Upscale`. Not clicked.
- After upload: `Upscale options` with a `Premium` badge, sentence `Select a size multiplier and click "Upscale" to upscale any image smaller than 6MP`, label `Size multiplier`, `2x` (default) and `4x`. Preview for this file: `subject.png`, `160 x 160 px`, then `320 x 320 px` at 2x and `640 x 640 px` at 4x. Choosing `4x` did not open a paywall. `Upscale` itself was not run.

## Watermark image

- URL: `https://www.iloveimg.com/watermark-image`
- Accepts: `.jpg,.jpeg,.png,.gif` (`multiple`). Copy: JPG, PNG, GIF. `Select images`, `or drop images here`.
- Batch: yes.
- Primary action: `Watermark IMAGES`. It was disabled until a watermark existed, then enabled after `ADD TEXT`.
- After upload: `Watermark will be applied to this images`, panel `Watermark images`, buttons `ADD IMAGE` and `ADD TEXT`. `ADD IMAGE` is a file input with the same accept list (the watermark picture). It was not used.
- `ADD TEXT` places a box `Write your text here` on the image. Visible toolbar text is the font name `Arial`. Opening it lists `Arial`, `Impact`, `Arial unicode ms`, `Verdana`, `Courier`, `Comic`, `Times new roman`, `Lohit marathi`, `Lohit devanagari`.
- Other toolbar controls are icons with no accessible name. DOM classes: `bold`, `italic`, `underline`, background, color, align, opacity, `tofront`, `drop` (remove).
- Opened panels: `Font Size:` range and number, min 0, max 150, value `48`. `Opacity:` range and number, min 0, max 100, value `100`. Align opens three unlabeled icons; the middle one is active. No left/center/right words.
- No labeled position or coordinates control. The homepage sentence about position was not matched by a position picker on this screen.

## Meme generator

- URL: `https://www.iloveimg.com/meme-generator`
- Accepts: `.jpg,.jpeg,.png,.gif` (`multiple` false). Upload screen: `Upload image`, `or`, `Select meme template`. Drive and Dropbox links are present. The template picker was not opened.
- Batch: no.
- Primary action: `Generate MEME`.
- After `subject.png`: panel `Meme editor`, modes `Text inside` and `Text outside` (`Text inside` default; `Text outside` selected after a click). Two boxes, both placeholder `Write your text here`, one at the top of the image and one at the bottom. Also `ADD IMAGE` and `ADD TEXT`.
- Focusing a caption shows a toolbar whose only text is `Impact`, plus the same unlabeled icon groups as watermark (bold, italic, underline, background, color, align, opacity, to front, remove). Those submenus were not opened on this page, so font size and opacity values were not read here.

## Rotate image

- URL: `https://www.iloveimg.com/rotate-image`
- Accepts: `.jpg,.jpeg,.gif,.png` (`multiple`). Copy: JPG, PNG, GIF. Upload links: `JPG`, `PNG`, `GIF`. `Select images`, `or drop images here`.
- Batch: yes.
- Primary action: `Rotate IMAGES`.
- After upload: title `Rotate IMAGE`. Sentence: `Mouse over IMAGE file below and a icon will appear, click on it to rotate your IMAGEs.`
- `Select files to rotate:` `All` (selected), `Portrait`, `Landscape`. Link `Reset all`.
- `Rotation`: buttons `RIGHT` and `LEFT`.
- No degree number was shown. A trusted click on `RIGHT` left the file card `data-rotate` at `0`. The hover icon is titled `Rotate` and also stays at `0`.

## HTML to image

- URL: `https://www.iloveimg.com/html-to-image`
- Accepts: no image file input. One website URL. Upload links on the first screen: `JPG`, `SVG`. Subtitle: `Convert web pages to JPG or SVG and maintain the visual aspect.`
- Batch: no.
- First screen button: `Add HTML`. Dialog title `Add website to convert`, tab `Url`, label `Write the website URL`, textbox placeholder `Example: https://iloveimg.com`, button `Add`. No other tab was visible. A paste-HTML textarea exists in the DOM at height 0 and was not shown.
- After adding `https://iloveimg.com` (the placeholder example, not processed): heading `HTML to IMAGE`, label `Website Url` with that URL, an unlabeled button `#refreshUrl` (refresh icon, no accessible name), label `Screen size` with `Your screen (1650px)` selected, `Desktop HD (1920px)`, `Desktop (1440px)`, `Tablet (768px)`, `Mobile (320px)`, label `Convert to` with `JPG` selected and `SVG`, heading `HTML Settings:`, checkbox `Try to block ads` (unchecked), checkbox `Remove overlay popups` (unchecked).
- Primary action on that screen: `Convert HTML`. Not clicked. `1650px` is this browser’s reported screen width, not a fixed site default.

## Blur face

- URL: `https://www.iloveimg.com/blur-face`
- Accepts: the uploader input is `.jpg,.jpeg,.png` (`multiple`). A second empty `#img-input` (`multiple` false, no `accept`) did not start the tool. Button `Select images`, copy `or drop images here`. Subtitle mentions anonymizing faces and blurring specific sections. It does not name plates on this page.
- Batch: the working input allows multiple files. Only one file was uploaded.
- Primary action: `Blur face`.
- After `subject.png`: `Blur face options`.
- `Automatic detection` (default): `RECOMMENDED` (selected), `LOW DETECTION`, `HIGH DETECTION`, button `Add blur area`.
- `Customised detection`: `Add a clear image of the face that you want to anonymize in your uploaded photos`, `Add portrait`, `Blur this face` (selected), `Exclude this face`.
- No control labeled face-vs-plate, licence plate, or object appeared. `Add blur area` did not reveal extra labels. The homepage line about licence plates and other objects was not on this tool’s controls.

## Remove background

Already shipped in this app. English page only, for the catalog.

- URL: `https://www.iloveimg.com/remove-background`
- Accepts: `.jpg,.jpeg,.png` (`multiple`). Copy: JPG and PNG. `Select images`, `or drop images here`.
- Batch: yes (`Add more images` after upload).
- Primary action: `Remove background`.
- After `subject.png`: file combobox `subject.png`, panel text `Remove background`, and the same button. No other controls (no color, brush, or tolerance). The button was not clicked.

## Not observed

- Compress: no visible quality or compression-level control.
- Photo editor: no slider after `Brightness`; `BACKGROUND` disabled; `MERGE` did not open; `Add Text` did not show a text field; font list on `TEXT` was not opened; sticker names beyond the Emoticons sample were not listed.
- Watermark: no labeled position control. Alignment icons have no left/center/right text.
- Meme: template gallery not opened. Caption font-size and opacity popovers not opened.
- Rotate: no degree readout. `RIGHT` did not change the visible angle.
- HTML to image: paste-HTML tab/textarea never became visible. `Convert HTML` was not run.
- Blur face: no plate or object mode. `Blur face` was not run.
- Remove background: result and download page were not opened.
- Upscale: `Upscale` was not run. The `Premium` badge was not clicked.
