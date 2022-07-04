# Functional requirements

The product is one static page. It removes the background from JPG and PNG images in the browser. It does not include the rest of the iLoveIMG suite (compress, resize, crop, convert, upscale, watermark, meme, face blur, HTML-to-image, stickers, filters), text or font editing, cloud import, accounts, or payments.

## Add images and remove the background

1. The user can add one or more JPG or PNG images from a file picker or by dropping them on the workspace. JPEG and PNG are accepted by MIME type (`image/jpeg`, `image/png`) and, when the browser omits a MIME type, by the `.jpg`, `.jpeg`, or `.png` extension.
2. Any other type is refused. The workspace shows the file name and the reason: only JPG and PNG images can be added.
3. Accepted files stay on that same workspace. There is no upload step and no second page.
4. One action runs background removal for the images that do not yet have a result. Removal uses a published WASM/ONNX library (`@bunnio/rembg-web` on `onnxruntime-web`) and the vendored u2netp model. Image bytes are not sent to an application backend. No application server is required. The model and WASM files are static assets of the site.
5. While the model or the inference runs, the workspace shows a visible progress state (what is happening, and a percent).
6. If the model or WASM runtime fails to load or fails while running, the workspace shows the error. The page does not sit on an endless spinner.
7. A successful result keeps the subject, makes the background transparent, and keeps the source pixel width and height.
8. Each success can be downloaded as its own PNG. When two or more images have succeeded, the user can download them as separate files or as one zip archive.

## Compare and export color

1. For a result, the user can compare the original and the cutout on the workspace.
2. The user can export the cutout with a transparent background or over a chosen solid color (preset white, preset black, or a picked color).
3. The downloaded pixels match that choice. Transparent export is a PNG whose background pixels are transparent and whose subject pixels stay the source color. Solid export fills only the background with the chosen color and keeps fully opaque subject pixels unchanged.
4. Dropping files, running removal, comparing, choosing a color, and downloading all happen on the one workspace.

## App shell

1. The UI is React and TypeScript.
2. The theme, the image queue, and removal/export state live in `@rabjs/react`: a `Service`, components wrapped with `observer`, `useService` to read them, `register` for the theme, and `bindServices` for the page queue. They are not stored in a second state library.
3. A control switches the whole UI between light and dark.
4. The production build is static files. Served over HTTP from a non-root path (a GitHub Pages project site), it shows the workspace and does not need a server process.
5. The built HTML includes a classic script (not `type="module"`). Opened with `file://`, that script shows a visible instruction to serve the folder over HTTP, instead of a blank page. Module scripts do not run from `file://`.
