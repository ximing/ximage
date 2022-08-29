import { phrase } from '../../i18n/phrase';
export const SCREEN_WIDTH_BY_ID = {
  'desktop-hd': 1920,
  desktop: 1440,
  tablet: 768,
  mobile: 320,
} as const;

export type FixedScreenId = keyof typeof SCREEN_WIDTH_BY_ID;

export type ScreenSizeId = FixedScreenId | 'your-screen';

export const SCREEN_SIZES = [
  { id: 'desktop-hd', label: 'Desktop HD (1920px)', width: SCREEN_WIDTH_BY_ID['desktop-hd'] },
  { id: 'desktop', label: 'Desktop (1440px)', width: SCREEN_WIDTH_BY_ID.desktop },
  { id: 'tablet', label: 'Tablet (768px)', width: SCREEN_WIDTH_BY_ID.tablet },
  { id: 'mobile', label: 'Mobile (320px)', width: SCREEN_WIDTH_BY_ID.mobile },
] as const satisfies readonly { id: FixedScreenId; label: string; width: number }[];

export function screenWidthFor(id: string): number {
  if (Object.prototype.hasOwnProperty.call(SCREEN_WIDTH_BY_ID, id)) {
    return SCREEN_WIDTH_BY_ID[id as FixedScreenId];
  }
  throw new Error(phrase('error.screenUnknown', { id }));
}

export function yourScreenWidth(screenWidth: number, viewportWidth: number): number {
  const screen = Math.round(screenWidth);
  if (Number.isFinite(screen) && screen >= 1) return screen;
  const viewport = Math.round(viewportWidth);
  if (Number.isFinite(viewport) && viewport >= 1) return viewport;
  return SCREEN_WIDTH_BY_ID.mobile;
}
