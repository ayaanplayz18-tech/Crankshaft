"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { Suspense, useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";

function PaymentContent() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("orderId");

  const [orderId, setOrderId] = useState<string | null>(initialOrderId);
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"PENDING" | "PAID" | "FAILED">(
    "PENDING",
  );
  const [matchedUtr, setMatchedUtr] = useState<string | null>(null);
  const [manualUtr, setManualUtr] = useState("");
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrError, setUtrError] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [pollSecondsElapsed, setPollSecondsElapsed] = useState(0);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  const checkStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/payment-status?orderId=${id}`);
      const data = await res.json();
      if (data.status === "VERIFIED" || data.orderStatus === "PAID") {
        setStatus("PAID");
        if (data.matchedUtr) setMatchedUtr(data.matchedUtr);
      }
      if (data.expectedAmount) {
        setPayment((prev: any) => ({
          ...prev,
          orderId: id,
          expectedAmount: data.expectedAmount,
          upiIntentUri: data.upiIntentUri || prev?.upiIntentUri,
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // If orderId is in URL, fetch initial status
  useEffect(() => {
    if (orderId) {
      checkStatus(orderId);
    }
  }, [orderId, checkStatus]);

  // Polling fallback every 5s for up to 3 minutes (180s) while PENDING
  useEffect(() => {
    if (!orderId || status === "PAID") return;

    setPollSecondsElapsed(0);
    setPollTimedOut(false);

    const maxSeconds = 180;
    const intervalMs = 5000;

    const interval = setInterval(() => {
      setPollSecondsElapsed((prev) => {
        const next = prev + 5;
        if (next >= maxSeconds) {
          setPollTimedOut(true);
          clearInterval(interval);
        }
        return next;
      });
      checkStatus(orderId);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [orderId, status, checkStatus]);

  // Create payment if starting fresh
  async function handleCreatePayment(amount = 499) {
    setLoading(true);
    try {
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, userId: "guest_buyer" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPayment(data);
        setOrderId(data.orderId);
        setStatus("PENDING");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Submit manual UTR fallback
  async function handleVerifyUtr(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) return;

    if (!/^\d{12}$/.test(manualUtr.trim())) {
      setUtrError("UTR must be exactly 12 digits (e.g. 423985172039)");
      return;
    }

    setUtrSubmitting(true);
    setUtrError("");

    try {
      const res = await fetch("/api/verify-utr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, utr: manualUtr.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("PAID");
        setMatchedUtr(manualUtr.trim());
      } else {
        setUtrError(
          data.error || "Failed to verify UTR. Please check the number.",
        );
      }
    } catch {
      setUtrError("Network error verifying UTR.");
    } finally {
      setUtrSubmitting(false);
    }
  }

  // Copy UPI intent / URI
  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const expectedAmount = payment?.expectedAmount || 499.02;
  const upiIntentUri =
    payment?.upiIntentUri ||
    `upi://pay?pa=ayaan@okaxis&pn=CrankShaft&am=${expectedAmount}&cu=INR&tn=Order_${orderId || "demo"}`;

  // Generate QR Code data URL whenever upiIntentUri changes
  useEffect(() => {
    if (upiIntentUri) {
      QRCode.toDataURL(upiIntentUri, {
        margin: 1,
        width: 220,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error("Error generating QR code:", err));
    }
  }, [upiIntentUri]);

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Explore</span>
        </Link>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-neutral-800 bg-black/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#00d2ff]/10 text-[#00d2ff] font-bold">
                UPIlerify Checkout
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                Zero Intermediary
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1.5">
              Pay via UPI
            </h1>
          </div>

          <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
            <Smartphone className="w-5 h-5 text-[#00d2ff]" />
          </div>
        </div>

        {/* PAID STATE */}
        {status === "PAID" ? (
          <div className="py-10 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Payment Confirmed!
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Your order has been paid and verified directly via bank
                credit-alert.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-left font-mono text-xs space-y-1.5">
              <div className="flex justify-between text-neutral-400">
                <span>Order ID:</span>
                <span className="text-white font-bold">{orderId}</span>
              </div>
              {matchedUtr && (
                <div className="flex justify-between text-neutral-400">
                  <span>Matched UTR:</span>
                  <span className="text-emerald-400 font-bold">
                    {matchedUtr}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-neutral-400">
                <span>Status:</span>
                <span className="text-emerald-400 font-bold">
                  PAID (SETTLED)
                </span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Link
                href="/explore"
                className="flex-1 py-3 px-4 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors text-center"
              >
                Continue Shopping
              </Link>
              <Link
                href="/"
                className="py-3 px-4 rounded-xl border border-neutral-800 text-neutral-300 font-semibold text-xs hover:bg-neutral-900 transition-colors text-center"
              >
                Go to Home
              </Link>
            </div>
          </div>
        ) : !payment && !orderId ? (
          /* START PAYMENT FORM */
          <div className="py-8 space-y-6">
            <p className="text-xs text-neutral-400 leading-relaxed">
              No active payment was found in the session. Click below to create
              a sample UPIlerify order to test the bank email credit-alert flow.
            </p>
            <button
              type="button"
              onClick={() => handleCreatePayment(499)}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Creating UPIlerify Order...</span>
                </>
              ) : (
                <span>Pay ₹499 via UPI</span>
              )}
            </button>
          </div>
        ) : (
          /* ACTIVE PENDING PAYMENT */
          <div className="py-6 space-y-6 animate-in fade-in">
            {/* 1-2 Minute Verification Banner */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-xs text-amber-300">
                  Payment verification may take 1–2 minutes
                </p>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Bank credit-alert emails are scanned automatically via
                  delayed-cron IMAP. Please keep this page open while we verify
                  your transaction.
                </p>
              </div>
            </div>

            {/* Amount Box with Micro-Offset Notice & Order ID */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 border-b border-neutral-800/80 pb-2 mb-2">
                <span>ORDER ID</span>
                <span className="text-white font-bold">{orderId}</span>
              </div>
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-mono">
                Exact Amount to Pay
              </span>
              <div className="text-3xl font-black text-white font-mono flex items-center justify-center gap-1">
                <span>₹{expectedAmount.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-[#00d2ff] font-medium pt-1">
                💡 Pay exactly ₹{expectedAmount.toFixed(2)}. Micro-offset paisa
                matches your order via bank credit-alert.
              </p>
            </div>

            {/* Desktop QR Code */}
            {qrCodeDataUrl && (
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                  <QrCode className="w-4 h-4 text-[#00d2ff]" />
                  <span>Scan QR on Desktop with Any UPI App</span>
                </div>
                <div className="p-3 bg-white rounded-xl shadow-xl border border-neutral-200">
                  <img
                    src={qrCodeDataUrl}
                    alt="UPI QR Code"
                    className="w-48 h-48 object-contain rounded"
                  />
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  GPay • PhonePe • Paytm • BHIM • Cred
                </span>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-3">
              {/* Deep link into mobile UPI app (GPay / PhonePe / Paytm) */}
              <a
                href={upiIntentUri}
                className="w-full py-3 px-4 rounded-xl bg-[#00d2ff] hover:bg-[#00d2ff]/90 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-[#00d2ff]/20"
              >
                <Smartphone className="w-4 h-4" />
                <span>Open UPI App on Mobile (GPay / PhonePe / Paytm)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* Copy URI */}
              <button
                type="button"
                onClick={() => copyText(upiIntentUri)}
                className="w-full py-2.5 px-4 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 text-neutral-300 font-mono text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                <span>
                  {copied ? "Copied UPI Link!" : "Copy UPI Intent Link"}
                </span>
              </button>
            </div>

            {/* Live polling indicator (Every 5s for up to 3 mins) */}
            <div className="p-3 rounded-lg bg-neutral-900/40 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <Loader2
                  className={`w-3.5 h-3.5 ${pollTimedOut ? "text-amber-400" : "text-[#00d2ff] animate-spin"}`}
                />
                <span>
                  {pollTimedOut
                    ? "Verification poll completed (3m). Submit UTR below if paid."
                    : `Watching bank credit-alerts via UPIlerify IMAP... (${Math.max(0, 180 - pollSecondsElapsed)}s left)`}
                </span>
              </div>
              <div className="text-[10px] text-neutral-500 text-center font-mono">
                Polling /api/payment-status every 5s for up to 3 minutes
              </div>
            </div>

            {/* Manual UTR Fallback */}
            <div className="pt-4 border-t border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200">
                  Manual UTR Verification Fallback
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  12 Digits
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                If your bank email is delayed, paste the 12-digit UTR / Ref
                number from your UPI app receipt below:
              </p>

              <form onSubmit={handleVerifyUtr} className="flex gap-2">
                <input
                  type="text"
                  maxLength={12}
                  pattern="\d{12}"
                  value={manualUtr}
                  onChange={(e) =>
                    setManualUtr(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="e.g. 423985172039"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-600 outline-none focus:border-white font-mono"
                />
                <button
                  type="submit"
                  disabled={utrSubmitting || manualUtr.length !== 12}
                  className="px-4 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {utrSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  ) : (
                    "Verify"
                  )}
                </button>
              </form>

              {utrError && (
                <div className="flex items-center gap-2 text-xs text-red-400 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{utrError}</span>
                </div>
              )}
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-900/30 border border-neutral-900 text-[11px] text-neutral-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Direct bank settlement. CrankShaft does not use middleman
                payment gateways. Verified with HMAC-SHA256 webhooks.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <main className="min-h-screen bg-[#030714] text-white">
      <Navbar />
      <div className="pt-24">
        <Suspense
          fallback={
            <div className="text-center py-20 text-neutral-500">
              Loading payment session...
            </div>
          }
        >
          <PaymentContent />
        </Suspense>
      </div>
    </main>
  );
}
