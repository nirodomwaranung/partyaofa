// Builds a circular cartoon avatar as a PixiJS Container.
// Photo players get a masked sprite; everyone else gets a colored "bean" face.
// PIXI is passed in because pixi.js is dynamically imported (browser-only).

export function shade(hex: string, p: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = 1 + p / 100;
  r = Math.max(0, Math.min(255, Math.round(r * f)));
  g = Math.max(0, Math.min(255, Math.round(g * f)));
  b = Math.max(0, Math.min(255, Math.round(b * f)));
  return (r << 16) + (g << 8) + b;
}
export const hex = (s: string) => parseInt(s.replace('#', ''), 16);

export function pixiAvatar(
  PIXI: any,
  opts: { color: string; size: number; texture?: any },
): any {
  const s = opts.size;
  const o = 0x2a1b4d;
  const c = new PIXI.Container();

  // drop shadow
  const sh = new PIXI.Graphics();
  sh.ellipse(0, s * 0.5, s * 0.42, s * 0.12).fill({ color: 0x000000, alpha: 0.18 });
  c.addChild(sh);

  // body / head
  const body = new PIXI.Graphics();
  body.circle(0, 0, s * 0.46).fill(hex(opts.color));
  body.circle(0, 0, s * 0.46).stroke({ width: 3, color: o });
  c.addChild(body);

  if (opts.texture) {
    const sp = new PIXI.Sprite(opts.texture);
    sp.anchor.set(0.5);
    const d = s * 0.9;
    sp.width = d; sp.height = d;
    const mask = new PIXI.Graphics();
    mask.circle(0, 0, s * 0.44).fill(0xffffff);
    sp.mask = mask;
    c.addChild(sp, mask);
    const ring = new PIXI.Graphics();
    ring.circle(0, 0, s * 0.46).stroke({ width: 3, color: o });
    c.addChild(ring);
  } else {
    // glossy highlight
    const gl = new PIXI.Graphics();
    gl.ellipse(-s * 0.13, -s * 0.16, s * 0.2, s * 0.13).fill({ color: 0xffffff, alpha: 0.5 });
    c.addChild(gl);
    // eyes
    for (const ex of [-s * 0.15, s * 0.15]) {
      const eye = new PIXI.Graphics();
      eye.ellipse(ex, -s * 0.02, s * 0.1, s * 0.13).fill(0xffffff);
      eye.ellipse(ex, -s * 0.02, s * 0.1, s * 0.13).stroke({ width: 2, color: o });
      eye.circle(ex + s * 0.02, s * 0.01, s * 0.045).fill(o);
      c.addChild(eye);
    }
    // cheeks
    const cheeks = new PIXI.Graphics();
    cheeks.ellipse(-s * 0.24, s * 0.16, s * 0.07, s * 0.045).fill({ color: 0xff7896, alpha: 0.5 });
    cheeks.ellipse(s * 0.24, s * 0.16, s * 0.07, s * 0.045).fill({ color: 0xff7896, alpha: 0.5 });
    c.addChild(cheeks);
  }
  return c;
}

/** Load a texture from a photo URL/dataURL, or null on failure. */
export async function loadTexture(PIXI: any, url?: string | null): Promise<any | null> {
  if (!url) return null;
  try {
    return await PIXI.Assets.load(url);
  } catch {
    return null;
  }
}
