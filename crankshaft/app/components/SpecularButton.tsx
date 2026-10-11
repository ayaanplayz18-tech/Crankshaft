"use client";

import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";

/* ─── Types ─────────────────────────────────────────────────────────────── */

type Size = "sm" | "md" | "lg" | "xl";

interface SpecularButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: Size;
  radius?: number;
  /** Tint colour blended over the base fill */
  tint?: string;
  tintOpacity?: number;
  textColor?: string;
  /** Colour of the specular highlight rim */
  lineColor?: string;
  /** Base button fill colour */
  baseColor?: string;
  /** Active (cursor-nearby) shine intensity 0-1 */
  intensity?: number;
  /** Idle shine intensity 0-1 */
  idleIntensity?: number;
  /** Width of the bright specular line in px */
  shineSize?: number;
  /** Softness / fade of the shine in px */
  shineFade?: number;
  /** Border stroke thickness in px */
  thickness?: number;
  /** Glow strength multiplier */
  glow?: number;
  /** Whether the shine follows the real mouse cursor */
  followMouse?: boolean;
  /** Mouse proximity radius (px) to activate full intensity */
  proximity?: number;
}

/* ─── Size presets ──────────────────────────────────────────────────────── */

const SIZE: Record<
  Size,
  { px: number; py: number; fontSize: number; minW: number }
> = {
  sm: { px: 14, py: 7, fontSize: 13, minW: 80 },
  md: { px: 20, py: 10, fontSize: 15, minW: 110 },
  lg: { px: 28, py: 13, fontSize: 17, minW: 140 },
  xl: { px: 36, py: 18, fontSize: 20, minW: 180 },
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const n = parseInt(
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean,
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function cssColor(hex: string, alpha = 1): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function SpecularButton({
  children,
  size = "md",
  radius = 12,
  tint = "#ffffff",
  tintOpacity = 0.04,
  textColor = "#f5f5f5",
  lineColor = "#ffffff",
  baseColor = "#525252",
  intensity = 1,
  idleIntensity = 0.35,
  shineSize = 10,
  shineFade = 34,
  thickness = 1.2,
  glow = 1,
  followMouse = true,
  proximity = 250,
  onClick,
  style,
  ...rest
}: SpecularButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Mutable refs so the draw loop doesn't re-subscribe on each render
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const propsRef = useRef({
    radius,
    tint,
    tintOpacity,
    lineColor,
    baseColor,
    intensity,
    idleIntensity,
    shineSize,
    shineFade,
    thickness,
    glow,
    followMouse,
    proximity,
  });
  propsRef.current = {
    radius,
    tint,
    tintOpacity,
    lineColor,
    baseColor,
    intensity,
    idleIntensity,
    shineSize,
    shineFade,
    thickness,
    glow,
    followMouse,
    proximity,
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const p = propsRef.current;
    const W = canvas.width;
    const H = canvas.height;
    const r = Math.min(p.radius, W / 2, H / 2);

    ctx.clearRect(0, 0, W, H);

    // ── Base fill ──
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, r);
    ctx.fillStyle = cssColor(p.baseColor);
    ctx.fill();

    // ── Tint overlay ──
    if (p.tintOpacity > 0) {
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, r);
      ctx.fillStyle = cssColor(p.tint, p.tintOpacity);
      ctx.fill();
    }

    // ── Specular rim ──
    const rect = canvas.getBoundingClientRect();
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    // Angle from button centre to mouse
    const cx = rect.left + W / 2;
    const cy = rect.top + H / 2;
    const dist = Math.hypot(mx - cx, my - cy);
    const inProx = mx !== -9999 && dist < p.proximity;
    const curIntensity = inProx ? p.intensity : p.idleIntensity;

    // Map angle → position around the border path
    const angle = inProx ? Math.atan2(my - cy, mx - cx) : -Math.PI / 2;

    // Perimeter parametric: map angle to a point on the rounded rect border
    const perimPoint = angleToPerim(W, H, r, angle);

    // Stroke gradient centred on that point
    const half = W * 0.55;
    const gx0 = perimPoint.x - Math.cos(angle) * half;
    const gy0 = perimPoint.y - Math.sin(angle) * half;
    const gx1 = perimPoint.x + Math.cos(angle) * half;
    const gy1 = perimPoint.y + Math.sin(angle) * half;

    const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
    const [lr, lg, lb] = hexToRgb(p.lineColor);
    const fadeStops = Math.max(0.01, p.shineFade / 100);
    const coreStops = Math.max(0.01, p.shineSize / 2 / 100);

    grad.addColorStop(0, `rgba(${lr},${lg},${lb},0)`);
    grad.addColorStop(
      Math.max(0, 0.5 - fadeStops - coreStops),
      `rgba(${lr},${lg},${lb},0)`,
    );
    grad.addColorStop(
      Math.max(0, 0.5 - coreStops),
      `rgba(${lr},${lg},${lb},${curIntensity})`,
    );
    grad.addColorStop(0.5, `rgba(${lr},${lg},${lb},${curIntensity})`);
    grad.addColorStop(
      Math.min(1, 0.5 + coreStops),
      `rgba(${lr},${lg},${lb},${curIntensity})`,
    );
    grad.addColorStop(
      Math.min(1, 0.5 + coreStops + fadeStops),
      `rgba(${lr},${lg},${lb},0)`,
    );
    grad.addColorStop(1, `rgba(${lr},${lg},${lb},0)`);

    ctx.beginPath();
    ctx.roundRect(
      p.thickness / 2,
      p.thickness / 2,
      W - p.thickness,
      H - p.thickness,
      r,
    );
    ctx.strokeStyle = grad;
    ctx.lineWidth = p.thickness;
    ctx.stroke();

    // ── Glow ──
    if (p.glow > 0 && curIntensity > 0) {
      ctx.save();
      ctx.shadowColor = cssColor(p.lineColor, curIntensity * 0.6 * p.glow);
      ctx.shadowBlur = 14 * p.glow;
      ctx.beginPath();
      ctx.roundRect(
        p.thickness / 2,
        p.thickness / 2,
        W - p.thickness,
        H - p.thickness,
        r,
      );
      ctx.strokeStyle = cssColor(p.lineColor, curIntensity * 0.25 * p.glow);
      ctx.lineWidth = p.thickness;
      ctx.stroke();
      ctx.restore();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  // Resize canvas to match element
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ro = new ResizeObserver(() => {
      canvas.width = wrap.offsetWidth;
      canvas.height = wrap.offsetHeight;
    });
    ro.observe(wrap);
    canvas.width = wrap.offsetWidth;
    canvas.height = wrap.offsetHeight;

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  // Global mouse tracking
  useEffect(() => {
    if (!followMouse) return;
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [followMouse]);

  const preset = SIZE[size];

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: preset.minW,
        borderRadius: radius,
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Canvas draws the border + specular glow */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: radius,
        }}
      />
      <button
        {...rest}
        onClick={onClick}
        style={{
          position: "relative",
          zIndex: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `${preset.py}px ${preset.px}px`,
          fontSize: preset.fontSize,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: textColor,
          background: "transparent",
          border: "none",
          borderRadius: radius,
          cursor: "pointer",
          outline: "none",
          whiteSpace: "nowrap",
          width: "100%",
        }}
      >
        {children}
      </button>
    </div>
  );
}

/* ─── Utility: map angle → a point on the rounded-rect perimeter ────────── */

function angleToPerim(
  W: number,
  H: number,
  r: number,
  angle: number,
): { x: number; y: number } {
  // Cast a ray from the centre in the given direction and intersect the
  // rounded-rect border (simplified: we use the ellipse approximation on
  // corners and straight lines on edges).
  const cx = W / 2;
  const cy = H / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Max t for straight edges
  const tx = cos !== 0 ? (cos > 0 ? W / 2 - r : -(W / 2 - r)) / cos : Infinity;
  const ty = sin !== 0 ? (sin > 0 ? H / 2 - r : -(H / 2 - r)) / sin : Infinity;
  const t = Math.min(Math.abs(tx), Math.abs(ty));

  let x = cx + cos * t;
  let y = cy + sin * t;

  // Clamp into the rounded rect corners
  const clampX = Math.max(r, Math.min(W - r, x));
  const clampY = Math.max(r, Math.min(H - r, y));

  if (x !== clampX || y !== clampY) {
    // We're in a corner arc — project outward to the arc
    const cornerCx = clampX;
    const cornerCy = clampY;
    const dx = cx - cornerCx;
    const dy = cy - cornerCy;
    const cornerAngle = Math.atan2(
      sin * Math.abs(dy) + cos * Math.abs(dx) > 0
        ? cy - cornerCy
        : cornerCy - cy,
      cx - cornerCx > 0 ? -1 : 1,
    );
    void cornerAngle;
    const toMouse = Math.atan2(cy - cornerCy, cx - cornerCx) + Math.PI;
    x = cornerCx + Math.cos(toMouse) * r;
    y = cornerCy + Math.sin(toMouse) * r;
  }

  return { x, y };
}
