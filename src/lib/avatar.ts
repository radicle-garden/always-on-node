import { browser } from "$app/environment";
import { cached } from "$lib/cache";

export const cachedRepoAvatar = cached(
  async (key: string) => {
    return await renderRepoAvatar(key);
  },
  key => key,
  { max: 2000 },
);

export const cachedUserAvatar = cached(
  async (key: string) => {
    return await renderUserAvatar(key);
  },
  key => key,
  { max: 2000 },
);

async function renderRepoAvatar(key: string): Promise<string> {
  if (!browser) {
    return "";
  }

  const p5Module = await import("p5");
  const p5 = p5Module.default;

  return new Promise(resolve => {
    new p5(sketch => {
      // p5.js sketch: solid initials, textured background with strict 3-color atom logic
      // Color logic:
      //   A: square = Color1
      //   B: square = Color1, circle = Color2
      //   C: square = Color2, circle = Color3
      //   D: square = Color3
      // Letters: solid-only (A or D). Background: other three atoms.
      // Single initial: 2x2 expansion (10x14). Two initials: 5x7 each.

      sketch.setup = () => {
        sketch.noCanvas();
        renderInitialsAvatar(key);
      };

      const PALETTE = [
        "#00D4DA", // teal
        "#886BF2", // purple
        "#FFA5FF", // pink
        "#009F67", // green
        "#CCFF38", // lime
        "#585600", // olive
      ];

      // 5x7 glyphs
      const LETTER_5X7 = createGlyphs5x7();

      // Canvas/grid
      const GRID = 16;
      const CELL = 32; // upscale for crisp preview
      const W = GRID * CELL;
      const H = GRID * CELL;

      let gfx: ReturnType<typeof sketch.createGraphics>;
      type Graphics = ReturnType<typeof sketch.createGraphics>;

      // Core render
      function renderInitialsAvatar(nameKey: string = "color bright") {
        const initials = getInitials(nameKey);
        const seed = hash32(nameKey.toLowerCase());
        const rnd = mulberry32(seed);

        // Select three distinct colors deterministically (Color1, Color2, Color3)
        const [c1, c2, c3] = chooseK(PALETTE, 3, rnd);

        // Choose letter solid atom: 'A' or 'D' (deterministic)
        const letterSolidAtom = ((seed >>> 7) & 1) === 0 ? "A" : "D";

        // Background atom set = all others
        const bgAtoms = ["A", "B", "C", "D"].filter(a => a !== letterSolidAtom);

        // Deterministic per-cell background atom pick
        function pickBgAtom(gx: number, gy: number): string {
          const k = (gy * 131 + gx * 197 + seed) >>> 0;
          return bgAtoms[k % bgAtoms.length];
        }

        // Offscreen buffer
        gfx = sketch.createGraphics(W, H);
        gfx.pixelDensity(2);
        gfx.noSmooth();

        // 1) Background: fill with bgAtoms using strict color mapping
        for (let gy = 0; gy < GRID; gy++) {
          for (let gx = 0; gx < GRID; gx++) {
            const atom = pickBgAtom(gx, gy);
            drawAtom(gfx, atom, gx, gy, c1, c2, c3);
          }
        }

        // 2) Letters: solid-only atom across glyph pixels, strict mapping (A uses c1, D uses c3)
        const glyphW = 5,
          glyphH = 7;

        function placeSolidLetter(
          glyph: number[][],
          startX: number,
          startY: number,
          scale2x: boolean,
        ) {
          if (scale2x) {
            // 2x2 expansion → 10x14
            for (let r = 0; r < glyphH; r++) {
              for (let c = 0; c < glyphW; c++) {
                if (!glyph[r][c]) continue;
                const gx = startX + c * 2;
                const gy = startY + r * 2;
                if (letterSolidAtom === "A") {
                  drawAtomA(gfx, gx, gy, c1);
                  drawAtomA(gfx, gx + 1, gy, c1);
                  drawAtomA(gfx, gx, gy + 1, c1);
                  drawAtomA(gfx, gx + 1, gy + 1, c1);
                } else {
                  drawAtomD(gfx, gx, gy, c3);
                  drawAtomD(gfx, gx + 1, gy, c3);
                  drawAtomD(gfx, gx, gy + 1, c3);
                  drawAtomD(gfx, gx + 1, gy + 1, c3);
                }
              }
            }
          } else {
            // 1x scale
            for (let r = 0; r < glyphH; r++) {
              for (let c = 0; c < glyphW; c++) {
                if (!glyph[r][c]) continue;
                const gx = startX + c;
                const gy = startY + r;
                if (letterSolidAtom === "A") {
                  drawAtomA(gfx, gx, gy, c1);
                } else {
                  drawAtomD(gfx, gx, gy, c3);
                }
              }
            }
          }
        }

        if (initials.length === 1) {
          // Single initial: 2x2 expansion → 10x14, centered
          const glyph = LETTER_5X7[initials[0]] || LETTER_5X7["?"];
          const startX = Math.floor((GRID - 10) / 2);
          const startY = Math.floor((GRID - 14) / 2);
          placeSolidLetter(glyph, startX, startY, true);
        } else {
          // Two initials: 5x7 each, side-by-side with spacing
          const leftGlyph = LETTER_5X7[initials[0]] || LETTER_5X7["?"];
          const rightGlyph = LETTER_5X7[initials[1]] || LETTER_5X7["?"];
          const spacing = 2;
          const totalW = 5 * 2 + spacing; // 12
          const totalH = 7;
          const startX = Math.floor((GRID - totalW) / 2);
          const startY = Math.floor((GRID - totalH) / 2);
          placeSolidLetter(leftGlyph, startX, startY, false);
          placeSolidLetter(rightGlyph, startX + 5 + spacing, startY, false);
        }

        const canvas = gfx.elt;
        resolve(canvas.toDataURL());
      }

      // Hash + PRNG
      function mulberry32(a: number) {
        return function () {
          let t = (a += 0x6d2b79f5);
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }

      function hash32(str: string) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
          h ^= str.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      }

      function chooseK<T>(arr: T[], k: number, rnd: () => number): T[] {
        const pool = arr.slice();
        const out = [];
        for (let i = 0; i < k; i++) {
          const idx = Math.floor(rnd() * pool.length);
          out.push(pool.splice(idx, 1)[0]);
        }
        return out;
      }

      // Atoms with strict mapping: (c1, c2, c3)
      function drawAtomA(pg: Graphics, gx: number, gy: number, c1: string) {
        const x = gx * CELL,
          y = gy * CELL;
        pg.noStroke();
        pg.fill(c1);
        pg.rect(x, y, CELL, CELL);
      }

      function drawAtomB(
        pg: Graphics,
        gx: number,
        gy: number,
        c1: string,
        c2: string,
      ) {
        const x = gx * CELL,
          y = gy * CELL;
        pg.noStroke();
        pg.fill(c1);
        pg.rect(x, y, CELL, CELL);
        pg.fill(c2);
        pg.circle(x + CELL / 2, y + CELL / 2, CELL * 0.55);
      }

      function drawAtomC(
        pg: Graphics,
        gx: number,
        gy: number,
        c2: string,
        c3: string,
      ) {
        const x = gx * CELL,
          y = gy * CELL;
        pg.noStroke();
        pg.fill(c2);
        pg.rect(x, y, CELL, CELL);
        pg.fill(c3);
        pg.circle(x + CELL / 2, y + CELL / 2, CELL * 0.67);
      }

      function drawAtomD(pg: Graphics, gx: number, gy: number, c3: string) {
        const x = gx * CELL,
          y = gy * CELL;
        pg.noStroke();
        pg.fill(c3);
        pg.rect(x, y, CELL, CELL);
      }

      function drawAtom(
        pg: Graphics,
        atom: string,
        gx: number,
        gy: number,
        c1: string,
        c2: string,
        c3: string,
      ) {
        switch (atom) {
          case "A":
            drawAtomA(pg, gx, gy, c1);
            break;
          case "B":
            drawAtomB(pg, gx, gy, c1, c2);
            break;
          case "C":
            drawAtomC(pg, gx, gy, c2, c3);
            break;
          case "D":
            drawAtomD(pg, gx, gy, c3);
            break;
        }
      }

      // Parse initials (up to 2)
      function getInitials(name: string): string[] {
        if (!name || typeof name !== "string") return ["?"];
        const cleaned = name.trim().replace(/\s+/g, " ");
        const parts = cleaned.split(/[^A-Za-z0-9]+/).filter(Boolean);
        const first = parts[0] ? parts[0][0].toUpperCase() : "?";
        const second = parts[1] ? parts[1][0].toUpperCase() : null;
        return second ? [first, second] : [first];
      }

      function createGlyphs5x7(): Record<string, number[][]> {
        const L: Record<string, number[][]> = {};
        const r = (s: string[]) =>
          s.map(row => row.split("").map(ch => (ch === "1" ? 1 : 0)));
        L["A"] = r([
          "01110",
          "10001",
          "10001",
          "11111",
          "10001",
          "10001",
          "10001",
        ]);
        L["B"] = r([
          "11110",
          "10001",
          "10001",
          "11110",
          "10001",
          "10001",
          "11110",
        ]);
        L["C"] = r([
          "01111",
          "10000",
          "10000",
          "10000",
          "10000",
          "10000",
          "01111",
        ]);
        L["D"] = r([
          "11110",
          "10001",
          "10001",
          "10001",
          "10001",
          "10001",
          "11110",
        ]);
        L["E"] = r([
          "11111",
          "10000",
          "10000",
          "11110",
          "10000",
          "10000",
          "11111",
        ]);
        L["F"] = r([
          "11111",
          "10000",
          "10000",
          "11110",
          "10000",
          "10000",
          "10000",
        ]);
        L["G"] = r([
          "01111",
          "10000",
          "10000",
          "10111",
          "10001",
          "10001",
          "01111",
        ]);
        L["H"] = r([
          "10001",
          "10001",
          "10001",
          "11111",
          "10001",
          "10001",
          "10001",
        ]);
        L["I"] = r([
          "11111",
          "00100",
          "00100",
          "00100",
          "00100",
          "00100",
          "11111",
        ]);
        L["J"] = r([
          "11111",
          "00001",
          "00001",
          "00001",
          "10001",
          "10001",
          "01110",
        ]);
        L["K"] = r([
          "10001",
          "10010",
          "10100",
          "11000",
          "10100",
          "10010",
          "10001",
        ]);
        L["L"] = r([
          "10000",
          "10000",
          "10000",
          "10000",
          "10000",
          "10000",
          "11111",
        ]);
        L["M"] = r([
          "10001",
          "11011",
          "10101",
          "10001",
          "10001",
          "10001",
          "10001",
        ]);
        L["N"] = r([
          "10001",
          "11001",
          "10101",
          "10011",
          "10001",
          "10001",
          "10001",
        ]);
        L["O"] = r([
          "01110",
          "10001",
          "10001",
          "10001",
          "10001",
          "10001",
          "01110",
        ]);
        L["P"] = r([
          "11110",
          "10001",
          "10001",
          "11110",
          "10000",
          "10000",
          "10000",
        ]);
        L["Q"] = r([
          "01110",
          "10001",
          "10001",
          "10001",
          "10101",
          "10010",
          "01101",
        ]);
        L["R"] = r([
          "11110",
          "10001",
          "10001",
          "11110",
          "10100",
          "10010",
          "10001",
        ]);
        L["S"] = r([
          "01111",
          "10000",
          "11110",
          "00001",
          "00001",
          "10001",
          "11110",
        ]);
        L["T"] = r([
          "11111",
          "00100",
          "00100",
          "00100",
          "00100",
          "00100",
          "00100",
        ]);
        L["U"] = r([
          "10001",
          "10001",
          "10001",
          "10001",
          "10001",
          "10001",
          "01110",
        ]);
        L["V"] = r([
          "10001",
          "10001",
          "10001",
          "01010",
          "01010",
          "00100",
          "00100",
        ]);
        L["W"] = r([
          "10001",
          "10001",
          "10001",
          "10101",
          "10101",
          "11011",
          "10001",
        ]);
        L["X"] = r([
          "10001",
          "01010",
          "00100",
          "00100",
          "00100",
          "01010",
          "10001",
        ]);
        L["Y"] = r([
          "10001",
          "01010",
          "00100",
          "00100",
          "00100",
          "00100",
          "00100",
        ]);
        L["Z"] = r([
          "11111",
          "00001",
          "00010",
          "00100",
          "01000",
          "10000",
          "11111",
        ]);
        L["0"] = r([
          "01110",
          "10001",
          "10011",
          "10101",
          "11001",
          "10001",
          "01110",
        ]);
        L["1"] = r([
          "00100",
          "01100",
          "00100",
          "00100",
          "00100",
          "00100",
          "01110",
        ]);
        L["2"] = r([
          "01110",
          "10001",
          "00001",
          "00110",
          "01000",
          "10000",
          "11111",
        ]);
        L["3"] = r([
          "11110",
          "00001",
          "01110",
          "00001",
          "00001",
          "00001",
          "11110",
        ]);
        L["4"] = r([
          "10010",
          "10010",
          "10010",
          "11111",
          "00010",
          "00010",
          "00010",
        ]);
        L["5"] = r([
          "11111",
          "10000",
          "11110",
          "00001",
          "00001",
          "00001",
          "11110",
        ]);
        L["6"] = r([
          "01110",
          "10000",
          "11110",
          "10001",
          "10001",
          "10001",
          "01110",
        ]);
        L["7"] = r([
          "11111",
          "00001",
          "00010",
          "00100",
          "01000",
          "01000",
          "01000",
        ]);
        L["8"] = r([
          "01110",
          "10001",
          "01110",
          "10001",
          "10001",
          "10001",
          "01110",
        ]);
        L["9"] = r([
          "01110",
          "10001",
          "10001",
          "01111",
          "00001",
          "00001",
          "11110",
        ]);
        L["?"] = r([
          "11111",
          "00001",
          "01110",
          "00000",
          "00100",
          "00000",
          "00100",
        ]);
        return L;
      }
    });
  });
}

async function renderUserAvatar(key: string): Promise<string> {
  if (!browser) {
    return "";
  }

  const p5Module = await import("p5");
  const p5 = p5Module.default;

  return new Promise(resolve => {
    new p5(sketch => {
      const TILE = 32;
      const DEFAULT_GRID = 10; // try 14–20
      const PALETTE = [
        "#00D4DA",
        "#886BF2",
        "#FFA5FF",
        "#009F67",
        "#CCFF38",
        "#585600",
      ];

      let gfx: ReturnType<typeof sketch.createGraphics>;

      // --- Seeded RNG ---
      function xmur3(str: string): () => number {
        let h = 1779033703 ^ str.length;
        for (let i = 0; i < str.length; i++) {
          h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
          h = (h << 13) | (h >>> 19);
        }
        return function () {
          h = Math.imul(h ^ (h >>> 16), 2246822507);
          h = Math.imul(h ^ (h >>> 13), 3266489909);
          return (h ^= h >>> 16) >>> 0;
        };
      }
      function mulberry32(a: number): () => number {
        return function () {
          let t = (a += 0x6d2b79f5);
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      function makeRNG(key: string): () => number {
        return mulberry32(xmur3(key)());
      }
      function pick<T>(rng: () => number, arr: T[]): T {
        return arr[Math.floor(rng() * arr.length)];
      }

      // --- Atoms (exact color mapping) ---
      function atomA(x: number, y: number, c1: string): void {
        gfx.fill(c1);
        gfx.rect(x, y, TILE, TILE);
      }
      function atomB(x: number, y: number, c1: string, c2: string): void {
        gfx.fill(c1);
        gfx.rect(x, y, TILE, TILE);
        gfx.fill(c2);
        gfx.ellipse(x + TILE / 2, y + TILE / 2, 17, 17);
      }
      function atomC(x: number, y: number, c2: string, c3: string): void {
        gfx.fill(c2);
        gfx.rect(x, y, TILE, TILE);
        gfx.fill(c3);
        gfx.ellipse(x + TILE / 2, y + TILE / 2, 21, 21);
      }
      function atomD(x: number, y: number, c3: string): void {
        gfx.fill(c3);
        gfx.rect(x, y, TILE, TILE);
      }

      // Edge-to-edge integer placement
      function drawAt(
        fn: (x: number, y: number) => void,
        gx: number,
        gy: number,
      ): void {
        fn(gx * TILE, gy * TILE);
      }

      // Strict 4-way symmetry (quadrant mirroring)
      function drawQuad(
        fn: (x: number, y: number) => void,
        gx: number,
        gy: number,
        grid: number,
      ): void {
        const N = grid - 1;
        drawAt(fn, gx, gy);
        drawAt(fn, N - gx, gy);
        drawAt(fn, gx, N - gy);
        drawAt(fn, N - gx, N - gy);
      }

      // Polar helpers in grid space
      function polarFromCell(
        gx: number,
        gy: number,
        cx: number,
        cy: number,
      ): { r: number; a: number } {
        const x = gx - cx + 0.5;
        const y = gy - cy + 0.5;
        const r = Math.hypot(x, y);
        let a = Math.atan2(y, x);
        if (a < 0) a += 2 * Math.PI;
        return { r, a };
      }

      // Shape models (distinct silhouettes)
      function shapeRose(theta: number, petals: number, tol: number): boolean {
        const sector = Math.PI / petals;
        const nearest = Math.round(theta / sector) * sector;
        let diff = Math.abs(theta - nearest);
        diff = Math.min(diff, 2 * Math.PI - diff);
        return diff <= tol;
      }
      function shapeStarburst(
        theta: number,
        petals: number,
        softness: number,
      ): boolean {
        const period = (2 * Math.PI) / petals;
        const local = theta % period;
        const d = Math.min(local, period - local) / (period / 2); // 0..1
        const response = Math.pow(Math.cos((d * Math.PI) / 2), softness); // 1..0
        return response > 0.5;
      }
      function shapeRinged(
        theta: number,
        petals: number,
        ringPhase: number,
        tol: number,
      ): boolean {
        const sector = (2 * Math.PI) / petals;
        const k = Math.floor(theta / sector);
        const center = k * sector + sector * ringPhase;
        let diff = Math.abs(theta - center);
        diff = Math.min(diff, 2 * Math.PI - diff);
        return diff <= tol;
      }
      function shapeTip(
        theta: number,
        petals: number,
        tol: number,
        t: number,
      ): boolean {
        return shapeRose(theta, petals, tol * (0.5 + 1.0 * t)) && t > 0.45; // outer only
      }
      function shapeNotched(
        theta: number,
        petals: number,
        tol: number,
        notchDepth: number = 0.25,
      ): boolean {
        const sector = (2 * Math.PI) / petals;
        const local = (theta % sector) / sector;
        const notch = Math.abs(local - 0.5);
        return shapeRose(theta, petals, tol) && notch > notchDepth;
      }
      function shapeHollow(
        theta: number,
        petals: number,
        tol: number,
        t: number,
        inner: number = 0.28,
        outer: number = 0.9,
      ): boolean {
        return shapeRose(theta, petals, tol) && t > inner && t < outer;
      }

      // Sector gating: pick subset of sectors
      function sectorGate(
        theta: number,
        petals: number,
        mask: boolean[],
      ): boolean {
        const sector = (2 * Math.PI) / petals;
        const k = Math.floor(theta / sector);
        return mask[k % mask.length];
      }

      // Draw by atom type
      function drawAtomByType(
        type: string,
        x: number,
        y: number,
        c1: string,
        c2: string,
        c3: string,
      ): void {
        if (type === "A") atomA(x, y, c1);
        else if (type === "B") atomB(x, y, c1, c2);
        else if (type === "C") atomC(x, y, c2, c3);
        else atomD(x, y, c3);
      }

      // Make assigner among active petal atoms (exclude background atom)
      function makeAssigner(
        mode: string,
        activeAtoms: string[],
      ): (rCell: number, theta?: number, sectorIdx?: number) => string {
        if (mode === "bands-ABC")
          return (rCell: number) => activeAtoms[rCell % 3];
        if (mode === "angle-stripes")
          return (_rCell: number, _theta?: number, sectorIdx?: number) =>
            activeAtoms[(sectorIdx || 0) % activeAtoms.length];
        if (mode === "parity-ACB")
          return (rCell: number) => activeAtoms[rCell % 2 ? 1 : 0];
        if (mode === "balanced-rand")
          return (rCell: number, theta?: number, sectorIdx?: number) => {
            const v =
              (Math.sin(
                (theta || 0) * 13.37 + rCell * 2.17 + (sectorIdx || 0) * 0.73,
              ) +
                1) /
              2;
            if (v < 0.33) return activeAtoms[0];
            if (v < 0.66) return activeAtoms[1];
            return activeAtoms[2];
          };
        return (rCell: number) => activeAtoms[rCell % 3];
      }

      function generateFlower(key: string, grid: number = DEFAULT_GRID): void {
        // Always ensure no stroke (prevents white seams)
        gfx.noStroke();
        gfx.clear();

        const rng = makeRNG(key);

        // Colors (deterministic)
        const picked = PALETTE.slice().sort(() => rng() - 0.5);
        const [c1, c2, c3] = picked.slice(0, 3);

        // Choose background atom and active petal atoms
        const allAtoms = ["A", "B", "C", "D"];
        const bgAtom = pick(rng, allAtoms);
        const petalAtoms = allAtoms
          .filter(a => a !== bgAtom)
          .sort(() => rng() - 0.5);

        // Geometry & variety
        const cx = Math.floor(grid / 2),
          cy = Math.floor(grid / 2);
        const maxR = Math.min(cx, cy);
        const petals = pick(rng, [5, 6, 7, 8, 9, 10]);
        const petalDepth = Math.max(5, Math.floor(maxR * (0.6 + 0.35 * rng())));
        const radialThickness = pick(rng, [1, 2, 2, 3, 3]);
        const shapeModel = pick(rng, [
          "rose",
          "starburst",
          "ringed",
          "tip",
          "notched",
          "hollow",
        ]);
        const atomMode = pick(rng, [
          "bands-ABC",
          "angle-stripes",
          "parity-ACB",
          "balanced-rand",
        ]);
        const assignAtom = makeAssigner(atomMode, petalAtoms);
        // const sectorPeriod = (2 * Math.PI) / petals; // unused

        // Angle tolerances
        const angleTolNear = (Math.PI / 28) * (0.7 + rng() * 1.2);
        const angleTolFar = (Math.PI / 7) * (0.7 + rng() * 1.2);
        const softness = 1.2 + rng() * 3.0;
        const ringPhase = rng() * 0.6 + 0.2;

        // Sector gating mask (~70% sectors on), ensures bold shapes
        const sectorMask = Array.from({ length: petals }, () => rng() > 0.3);
        if (sectorMask.every(v => !v))
          sectorMask[Math.floor(petals / 2)] = true;

        // 0) Base pass: paint every tile once with background atom to avoid gaps
        for (let gy = 0; gy < grid; gy++) {
          for (let gx = 0; gx < grid; gx++) {
            drawAt(
              (x: number, y: number) =>
                drawAtomByType(bgAtom, x, y, c1, c2, c3),
              gx,
              gy,
            );
          }
        }

        // 1) Outer edge circumference (1–2 tiles thick) reinforced in background atom
        const edgeThickness = pick(rng, [1, 1, 2]);
        for (let t = 0; t < edgeThickness; t++) {
          // const r = grid - 1 - t; // unused
          for (let i = 0; i < grid; i++) {
            const coords: [number, number][] = [
              [i, t],
              [i, grid - 1 - t],
              [t, i],
              [grid - 1 - t, i],
            ];
            coords.forEach(([gx, gy]: [number, number]) => {
              drawAt(
                (x: number, y: number) =>
                  drawAtomByType(bgAtom, x, y, c1, c2, c3),
                gx,
                gy,
              );
            });
          }
        }

        // 2) Background atom structural accents inside (deterministic):
        //    - a mid ring (optional) and a few gated spokes to help define silhouette.
        if (rng() < 0.7) {
          const midR = Math.floor(petalDepth * (0.5 + 0.2 * rng())); // mid ring
          for (let i = 0; i < grid; i++) {
            (
              [
                [cx - midR, i],
                [cx + midR, i],
                [i, cy - midR],
                [i, cy + midR],
              ] as [number, number][]
            ).forEach(([gx, gy]: [number, number]) => {
              if (gx >= 0 && gy >= 0 && gx < grid && gy < grid) {
                drawQuad(
                  (x: number, y: number) =>
                    drawAtomByType(bgAtom, x, y, c1, c2, c3),
                  gx,
                  gy,
                  grid,
                );
              }
            });
          }
        }
        if (rng() < 0.6) {
          // gated spokes in background atom (every Nth sector)
          const gateEvery = pick(rng, [2, 3, 4]);
          for (let s = 0; s < petals; s++) {
            if (s % gateEvery !== 0) continue;
            const theta = s * ((2 * Math.PI) / petals);
            // walk outward cells along this sector line
            for (let r = 1; r <= petalDepth; r++) {
              const gx = Math.round(cx + r * Math.cos(theta));
              const gy = Math.round(cy + r * Math.sin(theta));
              if (gx >= 0 && gy >= 0 && gx < grid && gy < grid) {
                drawQuad(
                  (x: number, y: number) =>
                    drawAtomByType(bgAtom, x, y, c1, c2, c3),
                  gx,
                  gy,
                  grid,
                );
              }
            }
          }
        }

        // 3) Strong center cluster (guarantee coverage; seed form)
        const centerCluster: [number, number, string][] = [
          [0, 0, "D"],
          [0, -1, petalAtoms[0]],
          [1, 0, petalAtoms[1]],
          [0, 1, petalAtoms[2]],
          [-1, 0, petalAtoms[0]],
        ];
        centerCluster.forEach(([dx, dy, t]: [number, number, string]) => {
          const gx = cx + dx,
            gy = cy + dy;
          if (gx < 0 || gy < 0 || gx >= grid || gy >= grid) return;
          drawQuad(
            (x: number, y: number) => drawAtomByType(t, x, y, c1, c2, c3),
            gx,
            gy,
            grid,
          );
        });

        // 4) Petals (TL quadrant → mirror)
        const half = Math.ceil(grid / 2);
        for (let gy = 0; gy < half; gy++) {
          for (let gx = 0; gx < half; gx++) {
            const { r, a } = polarFromCell(gx, gy, cx, cy);
            const rCell = Math.floor(r);
            if (rCell === 0 || rCell > petalDepth) continue;

            const t = rCell / petalDepth;
            const tol = angleTolNear * (1 - t) + angleTolFar * t;

            // sector gating
            const sectorIdx = Math.floor(a / ((2 * Math.PI) / petals));
            if (!sectorGate(a, petals, sectorMask)) continue;

            // choose model
            let inside = false;
            if (shapeModel === "rose") inside = shapeRose(a, petals, tol);
            else if (shapeModel === "starburst")
              inside = shapeStarburst(a, petals, softness);
            else if (shapeModel === "ringed")
              inside = shapeRinged(a, petals, ringPhase, tol * 0.7);
            else if (shapeModel === "tip") inside = shapeTip(a, petals, tol, t);
            else if (shapeModel === "notched")
              inside = shapeNotched(a, petals, tol, 0.24);
            else inside = shapeHollow(a, petals, tol, t, 0.28, 0.92);

            if (!inside) continue;

            const type = assignAtom(rCell, a, sectorIdx); // one of petalAtoms

            for (let dr = 0; dr < radialThickness; dr++) {
              const x1 = gx + dr,
                y1 = gy + dr;
              const coords: [number, number][] = [
                [x1, y1],
                [grid - 1 - x1, y1],
                [x1, grid - 1 - y1],
                [grid - 1 - x1, grid - 1 - y1],
              ];
              coords.forEach(([ix, iy]: [number, number]) => {
                if (ix < 0 || iy < 0 || ix >= grid || iy >= grid) return;
                drawAt(
                  (x: number, y: number) =>
                    drawAtomByType(type, x, y, c1, c2, c3),
                  ix,
                  iy,
                );
              });
            }
          }
        }

        // 5) Ensure all three petal atoms appear at least once
        const accents: [number, number, string][] = [
          [cx, cy - 2, petalAtoms[0]],
          [cx + 1, cy, petalAtoms[1]],
          [cx, cy + 2, petalAtoms[2]],
        ];
        accents.forEach(([gx, gy, t]: [number, number, string]) => {
          if (gx < 0 || gy < 0 || gx >= grid || gy >= grid) return;
          drawQuad(
            (x: number, y: number) => drawAtomByType(t, x, y, c1, c2, c3),
            gx,
            gy,
            grid,
          );
        });

        // 6) Final safety: ensure center 6×6 px is covered via 2×2 cluster
        const cluster: [number, number, string][] = [
          [0, 0, "D"],
          [1, 0, petalAtoms[1]],
          [0, 1, petalAtoms[2]],
          [1, 1, petalAtoms[0]],
        ];
        cluster.forEach(([dx, dy, t]: [number, number, string]) => {
          const gx = cx + dx,
            gy = cy + dy;
          if (gx < 0 || gy < 0 || gx >= grid || gy >= grid) return;
          drawQuad(
            (x: number, y: number) => drawAtomByType(t, x, y, c1, c2, c3),
            gx,
            gy,
            grid,
          );
        });
      }

      // Public API (edge-to-edge)
      function drawFlowerForKey(
        key: string,
        grid: number = DEFAULT_GRID,
      ): void {
        const canvasPx = grid * TILE;

        // Offscreen buffer
        gfx = sketch.createGraphics(canvasPx, canvasPx);
        gfx.pixelDensity(2);
        gfx.noSmooth();

        generateFlower(key, grid);
      }

      sketch.setup = () => {
        sketch.noCanvas();
        drawFlowerForKey(key, DEFAULT_GRID);

        const canvas = gfx.elt;
        resolve(canvas.toDataURL());
      };
    });
  });
}
