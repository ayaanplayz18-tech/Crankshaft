"use client";

import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Smartphone,
  Star,
  TrendingUp,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState, useCallback } from "react";
import TearTicket from "@/components/TearTicket";
import Navbar from "../components/Navbar";
import SlideCommit from "../components/SlideCommit";

const TearTicketComponent = TearTicket as React.ComponentType<any>;

// ── Constants ────────────────────────────────────────────────────────────────
const PRICE_PER_SHARE = 20;
const SHARES_PER_PERCENT = 10;
const COMPANY = "CrankShaft";

// ── Mechanical Wheel / DonutChart Component ─────────────────────────────
function DonutChart({
  soldPercent,
  reservedPercent,
  availablePercent,
  soldShares,
  availableShares,
  totalShares,
  animating,
}: {
  soldPercent: number;
  reservedPercent: number;
  availablePercent: number;
  soldShares: number;
  availableShares: number;
  totalShares: number;
  animating: boolean;
}) {
  const r = 86;
  const cx = 120;
  const cy = 120;
  const circumference = 2 * Math.PI * r;
  const gap = 1.8; // degrees gap between segments

  const degToArc = (deg: number) => (deg / 360) * circumference;

  // Degrees
  const reservedDeg = (reservedPercent / 100) * 360; // 216 deg (60%)
  const soldDeg = (soldPercent / 100) * 360;
  const availDeg = (availablePercent / 100) * 360;

  // Radial tick marks (every 6° = 60 ticks)
  const ticks = Array.from({ length: 60 }).map((_, i) => {
    const angleDeg = i * 6 - 90;
    const rad = (angleDeg * Math.PI) / 180;
    const isMajor = i % 5 === 0;
    const rOuter = 112;
    const rInner = isMajor ? 102 : 106;
    return {
      x1: cx + rInner * Math.cos(rad),
      y1: cy + rInner * Math.sin(rad),
      x2: cx + rOuter * Math.cos(rad),
      y2: cy + rOuter * Math.sin(rad),
      isMajor,
    };
  });

  const buildSegment = (
    startDeg: number,
    deg: number,
    color: string,
    id: string,
    glowColor?: string,
  ) => {
    if (deg <= gap + 0.5) return null;
    const startRad = ((startDeg - 90) * Math.PI) / 180;
    const endRad = ((startDeg + deg - gap - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = deg - gap > 180 ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    const arcLen = degToArc(deg - gap);

    return (
      <path
        key={id}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={18}
        strokeLinecap="round"
        strokeDasharray={
          animating
            ? `${arcLen} ${circumference}`
            : `${arcLen} ${circumference}`
        }
        style={{
          transition: "stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          filter: glowColor ? `drop-shadow(0 0 10px ${glowColor})` : "none",
        }}
      />
    );
  };

  const hasSold = soldShares > 0;

  return (
    <div className="relative flex items-center justify-center select-none">
      <svg
        viewBox="0 0 240 240"
        className="w-64 h-64 sm:w-72 sm:h-72 drop-shadow-2xl overflow-visible"
      >
        <defs>
          {/* Radial ambient glow */}
          <radialGradient id="wheelCenterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.22)" />
            <stop offset="70%" stopColor="rgba(15, 23, 42, 0.6)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.9)" />
          </radialGradient>

          {/* Reserved track gradient */}
          <linearGradient
            id="reservedTrackGrad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Available public track gradient */}
          <linearGradient
            id="availTrackGrad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          {/* Sold public track gradient */}
          <linearGradient
            id="soldTrackGrad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Outer Tachometer / Flywheel Tick Marks */}
        {ticks.map((tick) => (
          <line
            key={`tick-${tick.x1}-${tick.y1}`}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={
              tick.isMajor ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"
            }
            strokeWidth={tick.isMajor ? 1.5 : 0.8}
            strokeLinecap="round"
          />
        ))}

        {/* Outer Bezel Rim */}
        <circle
          cx={cx}
          cy={cy}
          r={114}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />

        {/* Background track channel */}
        <circle cx={cx} cy={cy} r={r} fill="url(#wheelCenterGlow)" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#18181b"
          strokeWidth={20}
        />

        {/* 60% Reserved segment (Founders / Core Pool) */}
        {reservedDeg > 2 &&
          buildSegment(
            0,
            reservedDeg,
            "url(#reservedTrackGrad)",
            "reserved",
            "rgba(100, 116, 139, 0.4)",
          )}

        {/* Sold Public Shares (if any) */}
        {hasSold &&
          soldDeg > 2 &&
          buildSegment(
            reservedDeg,
            soldDeg,
            "url(#soldTrackGrad)",
            "sold",
            "rgba(16, 185, 129, 0.65)",
          )}

        {/* Available Public Shares (Electric Indigo 40% pool) */}
        {availDeg > 2 &&
          buildSegment(
            reservedDeg + (hasSold ? soldDeg : 0),
            availDeg,
            "url(#availTrackGrad)",
            "avail",
            "rgba(99, 102, 241, 0.7)",
          )}

        {/* Inner Hub Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r - 18}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1.5}
        />

        {/* Center Flywheel Hub */}
        <circle
          cx={cx}
          cy={cy}
          r={r - 22}
          fill="#090d16"
          stroke="rgba(99, 102, 241, 0.25)"
          strokeWidth={1}
        />

        {/* Center info */}
        <g>
          {/* Badge */}
          <rect
            x={cx - 40}
            y={cy - 38}
            width={80}
            height={16}
            rx={8}
            fill="rgba(99, 102, 241, 0.18)"
            stroke="rgba(99, 102, 241, 0.4)"
            strokeWidth={0.8}
          />
          <text
            x={cx}
            y={cy - 27}
            textAnchor="middle"
            fill="#a5b4fc"
            fontSize="7.5"
            fontWeight="700"
            fontFamily="monospace"
            letterSpacing="0.08em"
          >
            40% PUBLIC POOL
          </text>

          {/* Primary value */}
          <text
            x={cx}
            y={cy + 5}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="24"
            fontWeight="900"
            fontFamily="monospace"
            style={{
              textShadow: "0 0 14px rgba(99, 102, 241, 0.5)",
            }}
          >
            {hasSold ? `${soldPercent.toFixed(1)}%` : "40.0%"}
          </text>

          {/* Status caption */}
          <text
            x={cx}
            y={cy + 19}
            textAnchor="middle"
            fill={hasSold ? "#34d399" : "#818cf8"}
            fontSize="8"
            fontWeight="800"
            fontFamily="monospace"
            letterSpacing="0.06em"
          >
            {hasSold ? "PUBLIC SOLD" : "PUBLIC POOL OPEN"}
          </text>

          {/* Shares count */}
          <text
            x={cx}
            y={cy + 33}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="7.5"
            fontFamily="monospace"
          >
            {soldShares} / {totalShares - 600} SHARES CLAIMED • {availableShares} OPEN
          </text>
        </g>
      </svg>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SharesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    phone?: string;
    role: string;
  } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Stats state
  const [stats, setStats] = useState({
    totalShares: 1000,
    soldShares: 0,
    availableShares: 400,
    maxPublicShares: 400,
    reservedShares: 600,
    pricePerShare: 20,
    sharesPerPercent: 10,
    soldPercent: 0,
    reservedPercent: 60,
    availablePercent: 40,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartAnimating, setChartAnimating] = useState(false);

  // Purchase form state
  const [quantity, setQuantity] = useState(10);
  const [guestName, setGuestName] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  // Payment modal state
  const [paymentData, setPaymentData] = useState<any>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID">(
    "PENDING",
  );
  const [matchedUtr, setMatchedUtr] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [pollSecondsElapsed, setPollSecondsElapsed] = useState(0);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualUtr, setManualUtr] = useState("");
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrError, setUtrError] = useState("");

  // Ticket state (after payment verified)
  const [ticketData, setTicketData] = useState<any>(null);
  const [ticketUsed, setTicketUsed] = useState(false);

  // ── Fetch Stats ─────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/shares/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setChartAnimating(true);
        setTimeout(() => setChartAnimating(false), 1400);
      }
    } catch (e) {
      console.error("[SharesStats]", e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch((err) => {
        console.error("[AUTH_ME_ERROR]", err);
        setCurrentUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, [fetchStats]);

  // ── Generate QR Code ────────────────────────────────────────────────────
  useEffect(() => {
    if (paymentData?.upiIntentUri) {
      QRCode.toDataURL(paymentData.upiIntentUri, {
        margin: 1,
        width: 200,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then(setQrCodeDataUrl)
        .catch(console.error);
    }
  }, [paymentData?.upiIntentUri]);

  // ── Poll Payment Status ─────────────────────────────────────────────────
  useEffect(() => {
    if (!paymentModalOpen || !paymentData?.orderId || paymentStatus === "PAID")
      return;

    setPollSecondsElapsed(0);
    setPollTimedOut(false);

    const timer = setInterval(async () => {
      setPollSecondsElapsed((prev) => {
        const next = prev + 5;
        if (next >= 180) {
          setPollTimedOut(true);
          clearInterval(timer);
        }
        return next;
      });

      try {
        const res = await fetch(
          `/api/payment-status?orderId=${paymentData.orderId}`,
        );
        const data = await res.json();
        if (data.status === "VERIFIED" || data.orderStatus === "PAID") {
          setPaymentStatus("PAID");
          if (data.matchedUtr) setMatchedUtr(data.matchedUtr);
          clearInterval(timer);
          // Show ticket and refresh chart
          setTicketData({
            orderId: paymentData.orderId,
            numberOfShares: paymentData.numberOfShares,
            totalPrice: paymentData.totalPrice,
            expectedAmount: paymentData.expectedAmount,
            username: paymentData.username,
            utr: data.matchedUtr,
          });
          await fetchStats();
        }
      } catch (e) {
        console.error("[Poll error]", e);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [
    paymentModalOpen,
    paymentData?.orderId,
    paymentStatus,
    fetchStats,
    paymentData?.expectedAmount,
    paymentData?.numberOfShares,
    paymentData?.totalPrice,
    paymentData?.username,
  ]);

  // ── Purchase Shares ─────────────────────────────────────────────────────
  const handlePurchase = async () => {
    if (!currentUser) {
      setPurchaseError("Please log in to purchase profit shares.");
      router.push("/auth");
      throw new Error("Please log in to purchase profit shares.");
    }
    if (quantity < 1) throw new Error("Quantity must be at least 1");
    setPurchasing(true);
    setPurchaseError("");

    // If the user doesn't enter a name for the shares, use their username
    const finalName = guestName.trim() || currentUser.username;

    try {
      const res = await fetch("/api/shares/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numberOfShares: quantity,
          name: finalName,
          username: finalName,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setPurchaseError(data.error || "Failed to create share order");
        throw new Error(data.error || "Failed to create share order");
      }

      setPaymentData(data);
      setPaymentStatus("PENDING");
      setMatchedUtr(null);
      setManualUtr("");
      setUtrError("");
      setPaymentModalOpen(true);
      return data;
    } catch (e: any) {
      setPurchaseError(e?.message || "Network error. Please try again.");
      throw e;
    } finally {
      setPurchasing(false);
    }
  };

  // ── Manual UTR ──────────────────────────────────────────────────────────
  const handleVerifyUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData?.orderId) return;

    const clean = manualUtr.trim();
    if (!/^[A-Za-z0-9]{10,25}$/.test(clean)) {
      setUtrError("Enter a valid 12-digit UTR or transaction ID");
      return;
    }

    setUtrSubmitting(true);
    setUtrError("");

    try {
      const res = await fetch("/api/verify-utr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: paymentData.orderId,
          utr: manualUtr.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPaymentStatus("PAID");
        setMatchedUtr(manualUtr.trim());
        setTicketData({
          orderId: paymentData.orderId,
          numberOfShares: paymentData.numberOfShares,
          totalPrice: paymentData.totalPrice,
          expectedAmount: paymentData.expectedAmount,
          username: paymentData.username,
          utr: manualUtr.trim(),
        });
        await fetchStats();
      } else {
        setUtrError(
          data.error || "Verification failed. Check your UTR number.",
        );
      }
    } catch {
      setUtrError("Network error verifying UTR.");
    } finally {
      setUtrSubmitting(false);
    }
  };

  const copyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalCost = quantity * PRICE_PER_SHARE;
  const sharesPercent = (quantity / SHARES_PER_PERCENT).toFixed(1);

  return (
    <main className="min-h-screen bg-[#030714] text-white">
      <Navbar />

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 [background:radial-gradient(ellipse_80%_60%_at_30%_-20%,rgba(99,102,241,0.20)_0%,transparent_70%),radial-gradient(ellipse_50%_40%_at_80%_100%,rgba(139,92,246,0.12)_0%,transparent_65%)]"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-28 pb-20">
        {/* ── Page Header ── */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono mb-4">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Public Profit Share Pool</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            CrankShaft <span className="text-indigo-400">Profit Shares</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* ── LEFT: Donut Chart + Stats ── */}
          <div className="flex flex-col items-center gap-8">
            {statsLoading ? (
              <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border-[16px] border-neutral-800 animate-pulse" />
            ) : (
              <DonutChart
                soldPercent={stats.soldPercent}
                reservedPercent={stats.reservedPercent}
                availablePercent={stats.availablePercent}
                soldShares={stats.soldShares}
                availableShares={stats.availableShares}
                totalShares={stats.totalShares}
                animating={chartAnimating}
              />
            )}

            {/* Legend */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {[
                {
                  color: "#64748b",
                  label: "Reserved (Founders & Core)",
                  value: `${stats.reservedPercent}%`,
                  sub: `${stats.reservedShares.toLocaleString()} shares (600 max)`,
                  glow: "rgba(100, 116, 139, 0.45)",
                },
                {
                  color: "#10b981",
                  label: "Publicly Claimed / Sold",
                  value: `${stats.soldPercent.toFixed(1)}%`,
                  sub: `${stats.soldShares.toLocaleString()} shares claimed`,
                  glow: "rgba(16, 185, 129, 0.5)",
                },
                {
                  color: "#6366f1",
                  label: "Available Public Shares",
                  value: `${stats.availablePercent.toFixed(1)}%`,
                  sub: `${stats.availableShares.toLocaleString()} shares open`,
                  glow: "rgba(99, 102, 241, 0.55)",
                  border: "#818cf8",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] transition-colors"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{
                      background: item.color,
                      boxShadow: `0 0 10px ${item.glow}`,
                      border: item.border
                        ? `1.5px solid ${item.border}`
                        : "none",
                    }}
                  />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-neutral-200">
                      {item.label}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">
                      {item.sub}
                    </div>
                  </div>
                  <span className="text-sm font-black text-white font-mono">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              {[
                { icon: BarChart2, label: "Price / Share", value: "₹20" },
                { icon: Users, label: "10 Shares =", value: "1% profit share" },
                {
                  icon: Star,
                  label: "Max Public",
                  value: `${stats.maxPublicShares} shares`,
                },
                {
                  icon: TrendingUp,
                  label: "Still Available",
                  value: `${stats.availableShares}`,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center"
                >
                  <s.icon className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                  <div className="text-[10px] text-neutral-500 font-mono">
                    {s.label}
                  </div>
                  <div className="text-sm font-black text-white">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Buy Form ── */}
          <div className="w-full">
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Buy Profit Shares
                </h2>
                <p className="text-xs text-neutral-500">
                  Direct UPI payment. No intermediaries. Verified via bank
                  credit-alert.
                </p>
              </div>

              {/* Quantity Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300 block">
                  Number of Shares
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 10))}
                    className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-lg font-bold hover:bg-white/[0.1] transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={stats.availableShares}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.min(
                          stats.availableShares,
                          Math.max(1, parseInt(e.target.value, 10) || 1),
                        ),
                      )
                    }
                    className="flex-1 text-center py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm font-mono font-bold outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(stats.availableShares, q + 10),
                      )
                    }
                    className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-lg font-bold hover:bg-white/[0.1] transition-colors"
                  >
                    +
                  </button>
                </div>
                {/* Quick picks */}
                <div className="flex gap-2 flex-wrap">
                  {[10, 50, 100, 200].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuantity(n)}
                      disabled={n > stats.availableShares}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold border transition-colors disabled:opacity-30 ${
                        quantity === n
                          ? "bg-indigo-500 border-indigo-400 text-white"
                          : "bg-white/[0.04] border-white/[0.08] text-neutral-400 hover:border-indigo-500/50 hover:text-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary box */}
              <div className="p-4 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 space-y-2">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Shares</span>
                  <span className="text-white font-mono font-bold">
                    {quantity}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Profit Share</span>
                  <span className="text-indigo-300 font-mono font-bold">
                    {sharesPercent}%
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-indigo-500/20">
                  <span>Total</span>
                  <span className="font-mono text-xl">
                    ₹{totalCost.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Name field (optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-400 block">
                    Name on Profit Share (optional)
                  </label>
                  {currentUser && (
                    <span className="text-[10px] text-neutral-500 font-mono">
                      Defaults to @{currentUser.username}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={
                    currentUser
                      ? `Default: ${currentUser.username}`
                      : "Log in to set name"
                  }
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  disabled={!currentUser}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white placeholder-neutral-600 outline-none focus:border-indigo-500 transition-colors font-mono disabled:opacity-50"
                />
                {currentUser && !guestName.trim() && (
                  <p className="text-[11px] text-neutral-500">
                    Will be registered under your username:{" "}
                    <span className="text-indigo-400 font-mono font-medium">
                      {currentUser.username}
                    </span>
                  </p>
                )}
              </div>

              {purchaseError && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{purchaseError}</span>
                </div>
              )}

              {/* Availability warning */}
              {stats.availableShares === 0 && (
                <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-center font-semibold">
                  🎉 All public shares have been sold!
                </div>
              )}

              {authLoading ? (
                <div className="w-full py-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center gap-2 text-xs text-neutral-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking account...</span>
                </div>
              ) : !currentUser ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2.5 text-xs text-indigo-300">
                    <UserIcon className="w-4 h-4 shrink-0" />
                    <span>
                      You must be logged in to purchase profit shares.
                    </span>
                  </div>
                  <Link
                    href="/auth"
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-indigo-900/40 text-center"
                  >
                    Log In to Purchase
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-2 w-full">
                  <div className="p-1 rounded-[32px] bg-white/[0.04] border border-white/[0.12] shadow-2xl shadow-black/80 w-full max-w-[340px] flex items-center justify-center">
                    <SlideCommit
                      label={`Slide to pay ₹${totalCost.toLocaleString()}`}
                      doneLabel="Order Created"
                      errorLabel="Payment failed"
                      onConfirm={handlePurchase}
                      onDone={() => console.log("shares order created")}
                      onError={(reason: any) =>
                        console.log("shares order error", reason)
                      }
                      trackColor="#151722"
                      handleColor="#6366f1"
                      successColor="#22c55e"
                      dangerColor="#e5484d"
                      width={332}
                      height={58}
                      radius={29}
                      speed={50}
                      returnBounce={0.38}
                      landingDip={0.026}
                      holdMs={1200}
                      disabled={
                        purchasing ||
                        stats.availableShares === 0 ||
                        quantity < 1
                      }
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-2.5 font-mono text-center flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span>
                      Slide handle across to pay ₹{totalCost.toLocaleString()}{" "}
                      via UPI
                    </span>
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] text-neutral-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
                <span>
                  Direct bank settlement. Verified via HMAC-SHA256 IMAP
                  credit-alert scan.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PAYMENT MODAL ──────────────────────────────────────────────────── */}
      {paymentModalOpen && paymentData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-neutral-950 border border-neutral-800 text-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-bold">
                  UPIlerify
                </span>
                <h3 className="text-sm font-bold text-white">
                  {paymentStatus === "PAID"
                    ? "Payment Verified!"
                    : "Complete UPI Payment"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {paymentStatus === "PAID" ? (
              /* ── SUCCESS STATE ── */
              <div className="py-4 text-center space-y-4 animate-in fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">
                    Payment Verified!
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Your {paymentData.numberOfShares} shares are now recorded.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs font-mono text-left space-y-1.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Order:</span>
                    <span className="text-white font-bold">
                      {paymentData.orderId}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Shares:</span>
                    <span className="text-indigo-300 font-bold">
                      {paymentData.numberOfShares}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Profit Share:</span>
                    <span className="text-indigo-300 font-bold">
                      {(paymentData.numberOfShares / 10).toFixed(1)}%
                    </span>
                  </div>
                  {matchedUtr && (
                    <div className="flex justify-between text-neutral-400">
                      <span>UTR:</span>
                      <span className="text-emerald-400 font-bold">
                        {matchedUtr}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Close & View Ticket
                </button>
              </div>
            ) : (
              /* ── PENDING STATE ── */
              <div className="space-y-4 text-xs">
                {/* 1-2 min banner */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs text-amber-300">
                      Payment verification may take 1–2 minutes
                    </p>
                    <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                      Bank credit-alert emails are scanned automatically via
                      delayed-cron IMAP.
                    </p>
                  </div>
                </div>

                {/* Amount */}
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-center space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 border-b border-neutral-800/80 pb-2 mb-2">
                    <span>ORDER ID</span>
                    <span className="text-white font-bold text-[9px]">
                      {paymentData.orderId}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">
                    Exact Amount to Pay
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    ₹{paymentData.expectedAmount.toFixed(2)}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500">
                    {paymentData.numberOfShares} shares × ₹20 + paisa offset
                  </div>
                  <p className="text-[11px] text-indigo-300 font-medium">
                    Pay exactly ₹{paymentData.expectedAmount.toFixed(2)} —
                    micro-offset paisa uniquely identifies your order.
                  </p>
                </div>

                {/* Desktop QR */}
                {qrCodeDataUrl && (
                  <div className="flex flex-col items-center p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                    <div className="text-[11px] font-semibold text-neutral-300">
                      Scan QR on Desktop with Any UPI App
                    </div>
                    <div className="p-2.5 bg-white rounded-xl">
                      <img
                        src={qrCodeDataUrl}
                        alt="UPI QR"
                        className="w-40 h-40 rounded"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">
                      GPay • PhonePe • Paytm • BHIM • Cred
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  <a
                    href={paymentData.upiIntentUri}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Open UPI App (GPay / PhonePe / Paytm)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copyLink(paymentData.upiIntentUri)}
                    className="w-full py-2 px-3 rounded-xl border border-neutral-800 hover:bg-neutral-900 text-neutral-400 font-mono text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? "Copied!" : "Copy UPI Link"}</span>
                  </button>
                </div>

                {/* Polling status */}
                <div className="p-2.5 rounded-lg bg-neutral-900/40 border border-neutral-800/80 space-y-1">
                  <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400">
                    <Loader2
                      className={`w-3.5 h-3.5 ${pollTimedOut ? "text-amber-400" : "text-indigo-400 animate-spin"}`}
                    />
                    <span>
                      {pollTimedOut
                        ? "Poll ended (3m). Enter UTR below if paid."
                        : `Watching bank credit-alerts... (${Math.max(0, 180 - pollSecondsElapsed)}s)`}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-600 text-center font-mono">
                    Polling every 5s up to 3 minutes
                  </div>
                </div>

                {/* Manual UTR */}
                <div className="pt-2 border-t border-neutral-800 space-y-2">
                  <label className="text-[11px] font-semibold text-neutral-300">
                    Manual UTR Fallback (12 Digits)
                  </label>
                  <form onSubmit={handleVerifyUtr} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={12}
                      value={manualUtr}
                      onChange={(e) =>
                        setManualUtr(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="e.g. 423985172039"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-600 outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={utrSubmitting || manualUtr.length !== 12}
                      className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      {utrSubmitting ? (
                        <Loader2 className="w-3 h-3 animate-spin text-black" />
                      ) : (
                        "Verify"
                      )}
                    </button>
                  </form>
                  {utrError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{utrError}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 text-[10px] text-neutral-600">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70 shrink-0 mt-0.5" />
                  <span>
                    Direct settlement. Zero aggregator fees. Verified via
                    HMAC-SHA256.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TEAR TICKET (after payment) ──────────────────────────────────── */}
      {ticketData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="flex flex-col items-center gap-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-white">
                🎉 Profit Share Secured!
              </h2>
              <p className="text-sm text-neutral-400">
                Tear your ticket to mark it as received.
              </p>
            </div>

            <TearTicketComponent
              stub={
                <div className="flex flex-col justify-center h-full px-2 py-3 space-y-1.5">
                  <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                    CrankShaft Profit Share
                  </div>
                  <div className="text-lg font-black text-white leading-tight">
                    {ticketData.numberOfShares} Shares
                  </div>
                  <div className="text-[11px] font-mono text-indigo-300">
                    {(ticketData.numberOfShares / 10).toFixed(1)}% Profit Share
                  </div>
                  {ticketData.utr && (
                    <div className="text-[9px] font-mono text-neutral-500 mt-1">
                      UTR: {ticketData.utr}
                    </div>
                  )}
                </div>
              }
              orientation="horizontal"
              scrim
              imageRadius={8}
              onTear={() => setTicketUsed(true)}
              width={460}
              height={250}
              stubSize={150}
              radius={16}
              holes={12}
              holeSize={6}
              notch={3}
              roughness={0}
              tearAngle={30}
              stretch={30}
              resistance={0.45}
              rotate={4}
              tilt
              tiltMax={9}
              tiltReach={260}
              parallax={6}
              perspective={1000}
              background="#18181b"
              color="#f5f5f5"
              border
              borderWidth={1}
              recenter
            >
              <div className="flex flex-col items-start justify-center h-full pl-6 space-y-2">
                <div className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest">
                  {COMPANY} — Profit Share Receipt
                </div>
                <div className="text-2xl font-black text-white leading-tight">
                  {ticketData.numberOfShares} Share
                  {ticketData.numberOfShares !== 1 ? "s" : ""}
                </div>
                <div className="text-sm text-neutral-300 font-mono">
                  ₹{ticketData.totalPrice.toLocaleString()} total
                </div>
                {ticketData.username && ticketData.username !== "Anonymous" && (
                  <div className="text-xs text-neutral-400 font-mono">
                    {ticketData.username}
                  </div>
                )}
                <div className="mt-1 text-[9px] font-mono text-neutral-500">
                  {ticketData.orderId}
                </div>
              </div>
            </TearTicketComponent>

            {ticketUsed && (
              <div className="text-center animate-in fade-in space-y-2">
                <p className="text-sm text-emerald-400 font-semibold">
                  ✓ Ticket torn! Your profit shares are officially recorded.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setTicketData(null)}
              className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors border border-white/10"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
