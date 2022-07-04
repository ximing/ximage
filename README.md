# Ximage

Remove the background from JPG and PNG images in the browser. The cutout runs in the tab with ONNX Runtime Web. Nothing is uploaded to an application server.

The static `dist` folder can be hosted on a GitHub Pages project site. Asset URLs are relative.

```bash
npm install
npm test
npm run build
npx serve dist
```

Opening `dist/index.html` with `file://` shows a short instruction instead of a blank page. Serve the folder over HTTP.

See `docs/research.md` for the iLoveIMG pass and the library choices, and `docs/requirements.md` for the behavior of this page.
