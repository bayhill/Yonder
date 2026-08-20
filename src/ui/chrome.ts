/**
 * The browser's own chrome follows the sky: the theme colour (mobile address bar, PWA title bar)
 * and the favicon (a tiny sky-to-meadow gradient) are redrawn whenever the scene's colours change.
 */
export function createBrowserChrome() {
  const theme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const ctx = cv.getContext('2d')!;
  let version = -1, lastTheme = '';
  return {
    update(v: number, sky: { zenith: string; horizon: string }, ground: string, treeline: string) {
      if (v === version) return;
      version = v;
      if (theme && sky.zenith !== lastTheme) { lastTheme = sky.zenith; theme.content = sky.zenith; }
      const g = ctx.createLinearGradient(0, 0, 0, 20);
      g.addColorStop(0, sky.zenith); g.addColorStop(1, sky.horizon);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = treeline;
      ctx.beginPath(); ctx.moveTo(0, 21); ctx.quadraticCurveTo(16, 17, 32, 20); ctx.lineTo(32, 32); ctx.lineTo(0, 32); ctx.fill();
      ctx.fillStyle = ground;
      ctx.beginPath(); ctx.moveTo(0, 24); ctx.quadraticCurveTo(18, 20, 32, 23); ctx.lineTo(32, 32); ctx.lineTo(0, 32); ctx.fill();
      link!.href = cv.toDataURL('image/png');
    },
  };
}
