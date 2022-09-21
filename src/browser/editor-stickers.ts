import type { StickerId } from '../tools/photo-editor/catalog';
import { phrase } from '../i18n/phrase';

const SIZE = 160;

export function drawSticker(id: StickerId): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(phrase('error.sticker'));
  switch (id) {
    case 'smiley':
      drawSmiley(ctx);
      break;
    case 'heart':
      drawHeart(ctx);
      break;
    case 'star':
      drawStar(ctx);
      break;
    case 'sun':
      drawSun(ctx);
      break;
    case 'cloud':
      drawCloud(ctx);
      break;
    default: {
      const neverId: never = id;
      throw new Error(`Cannot draw ${neverId}.`);
    }
  }
  return canvas;
}

function drawSmiley(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#f5c518';
  ctx.beginPath();
  ctx.arc(80, 80, 68, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#172033';
  ctx.beginPath();
  ctx.arc(56, 68, 8, 0, Math.PI * 2);
  ctx.arc(104, 68, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#172033';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(80, 86, 28, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function drawHeart(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#e11d48';
  ctx.beginPath();
  ctx.moveTo(80, 132);
  ctx.bezierCurveTo(150, 90, 124, 36, 80, 64);
  ctx.bezierCurveTo(36, 36, 10, 90, 80, 132);
  ctx.closePath();
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D) {
  const spikes = 5;
  const outer = 68;
  const inner = 30;
  const cx = 80;
  const cy = 82;
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.fillStyle = '#f5c518';
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let index = 0; index < spikes; index += 1) {
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawSun(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(80 + Math.cos(angle) * 46, 80 + Math.sin(angle) * 46);
    ctx.lineTo(80 + Math.cos(angle) * 70, 80 + Math.sin(angle) * 70);
    ctx.stroke();
  }
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(80, 80, 34, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloud(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#f7f9fc';
  ctx.strokeStyle = '#5c6b80';
  ctx.lineWidth = 6;
  const circles = [
    { x: 58, y: 100, r: 26 },
    { x: 92, y: 82, r: 36 },
    { x: 126, y: 104, r: 22 },
  ];
  for (const circle of circles) {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
