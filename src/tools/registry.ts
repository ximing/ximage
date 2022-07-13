export type ToolGroup = 'smart' | 'basic' | 'convert' | 'create';

export type Tool = {
  id: string;
  path: string;
  title: string;
  description: string;
  group: ToolGroup;
  color: string;
  formats: readonly string[];
  badge?: string;
};

export const toolGroups: readonly ToolGroup[] = ['smart', 'basic', 'convert', 'create'];

export const tools: readonly Tool[] = [
  {
    id: 'remove-background',
    path: '/remove-background',
    title: 'Remove background',
    description: 'Background removal, on this device',
    group: 'smart',
    color: '#8b7bff',
    formats: ['JPG', 'PNG'],
    badge: 'AI',
  },
  {
    id: 'upscale',
    path: '/upscale',
    title: 'Upscale',
    description: 'Increase the pixel size of an image.',
    group: 'smart',
    color: '#37c8c3',
    formats: ['JPG', 'PNG'],
    badge: 'AI',
  },
  {
    id: 'blur-face',
    path: '/blur-face',
    title: 'Blur face',
    description: 'Blur faces in a photo.',
    group: 'smart',
    color: '#ff8a5c',
    formats: ['JPG', 'PNG'],
    badge: 'AI',
  },
  {
    id: 'compress',
    path: '/compress',
    title: 'Compress',
    description: 'Reduce the file size of a JPG, PNG, SVG, or GIF.',
    group: 'basic',
    color: '#34c77b',
    formats: ['JPG', 'PNG', 'GIF', 'SVG'],
  },
  {
    id: 'resize',
    path: '/resize',
    title: 'Resize',
    description: 'Change the pixel width and height of a JPG, PNG, SVG, or GIF.',
    group: 'basic',
    color: '#3b9eff',
    formats: ['JPG', 'PNG', 'GIF', 'SVG'],
  },
  {
    id: 'crop',
    path: '/crop',
    title: 'Crop',
    description: 'Cut a JPG, PNG, or GIF down to the area you keep.',
    group: 'basic',
    color: '#e8b93f',
    formats: ['JPG', 'PNG', 'GIF'],
  },
  {
    id: 'rotate',
    path: '/rotate',
    title: 'Rotate',
    description: 'Turn a JPG, PNG, or GIF by a set angle.',
    group: 'basic',
    color: '#8fd14f',
    formats: ['JPG', 'PNG', 'GIF'],
  },
  {
    id: 'convert-to-jpg',
    path: '/convert-to-jpg',
    title: 'Transcode',
    description: 'Turn common images and camera files into JPG, PNG, WebP, GIF, BMP, or TIFF.',
    group: 'convert',
    color: '#f06292',
    formats: ['JPG', 'PNG', 'WEBP', 'GIF', 'BMP', 'TIFF'],
  },
  {
    id: 'convert-from-jpg',
    path: '/convert-from-jpg',
    title: 'Change format',
    description: 'Turn an image into another format. Several images can become one animated GIF.',
    group: 'convert',
    color: '#b98cff',
    formats: ['JPG', 'PNG', 'WEBP', 'GIF', 'BMP', 'TIFF'],
  },
  {
    id: 'html-to-image',
    path: '/html-to-image',
    title: 'HTML to image',
    description: 'Render HTML as an image.',
    group: 'convert',
    color: '#9ba7ff',
    formats: ['JPG', 'SVG'],
  },
  {
    id: 'photo-editor',
    path: '/photo-editor',
    title: 'Photo editor',
    description: 'Adjust a photo before you save it.',
    group: 'create',
    color: '#ff5a1f',
    formats: ['JPG', 'PNG'],
  },
  {
    id: 'watermark',
    path: '/watermark',
    title: 'Watermark',
    description: 'Stamp text or a mark onto an image.',
    group: 'create',
    color: '#6aa9ff',
    formats: ['JPG', 'PNG', 'GIF'],
  },
  {
    id: 'meme',
    path: '/meme',
    title: 'Meme',
    description: 'Add a caption to an image.',
    group: 'create',
    color: '#ffd23f',
    formats: ['JPG', 'PNG', 'GIF'],
  },
];
