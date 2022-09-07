export function assetUrl(path: string): string {
  return new URL(path, window.location.href).href;
}
