"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
  QrCode as QrCodeIcon,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useCart } from "./CartContext";
import SlideCommit from "./SlideCommit";

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    toggleCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalCount,
    subtotal,
    comboDiscount,
    finalTotal,
    hasDealApplied,
    dealPair,
    qualifyingCategories,
  } = useCart();

  // UPIlerify payment state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "PENDING" | "PAID" | "FAILED"
  >("PENDING");
  const [matchedUtr, setMatchedUtr] = useState<string | null>(null);
  const [manualUtr, setManualUtr] = useState("");
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrError, setUtrError] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [pollSecondsElapsed, setPollSecondsElapsed] = useState(0);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  // Generate QR code data URL whenever orderData is created
  useEffect(() => {
    if (orderData?.upiIntentUri) {
      QRCode.toDataURL(orderData.upiIntentUri, {
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
  }, [orderData?.upiIntentUri]);

  // Poll /api/payment-status every 5 seconds for up to 3 minutes (180s)
  useEffect(() => {
    if (!paymentModalOpen || !orderData?.orderId || paymentStatus === "PAID")
      return;

    setPollSecondsElapsed(0);
    setPollTimedOut(false);

    const maxSeconds = 180; // 3 minutes
    const intervalMs = 5000; // 5 seconds

    const timer = setInterval(async () => {
      setPollSecondsElapsed((prev) => {
        const next = prev + 5;
        if (next >= maxSeconds) {
          setPollTimedOut(true);
          clearInterval(timer);
        }
        return next;
      });

      try {
        const res = await fetch(
          `/api/payment-status?orderId=${orderData.orderId}`,
        );
        const data = await res.json();
        if (data.status === "VERIFIED" || data.orderStatus === "PAID") {
          setPaymentStatus("PAID");
          if (data.matchedUtr) setMatchedUtr(data.matchedUtr);
          clearCart();
          clearInterval(timer);
        }
      } catch (e) {
        console.error("[Poll status error]", e);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [paymentModalOpen, orderData?.orderId, paymentStatus, clearCart]);

  // Order payload passed to api.pay(order) - uses final discounted total
  const order = {
    amount: finalTotal,
    items,
    userId: "cart_customer",
  };

  // API helper for SlideCommit onConfirm
  const api = {
    pay: async (orderPayload: typeof order) => {
      if (items.length === 0 || finalTotal <= 0) {
        throw new Error("Cart is empty");
      }

      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not create payment");
      }

      setOrderData(data);
      setPaymentStatus("PENDING");
      setManualUtr("");
      setUtrError("");
      setPaymentModalOpen(true);
      return data;
    },
  };

  // Manual UTR verification
  const handleVerifyUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderData?.orderId) return;

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
        body: JSON.stringify({ orderId: orderData.orderId, utr: clean }),
      });
      const data = await res.json();
      if (res.ok) {
        setPaymentStatus("PAID");
        setMatchedUtr(clean);
        clearCart();
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

  const copyUpiLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* ─── BOTTOM RIGHT FLOATING CART BUTTON ─────────────────────────── */}
      <button
        type="button"
        id="floating-cart-btn"
        aria-label="Open shopping cart"
        onClick={toggleCart}
        className="
          fixed bottom-6 right-6 z-40
          flex items-center gap-2.5
          px-4 py-3.5 rounded-full
          bg-white text-black
          shadow-[0_8px_30px_rgba(0,0,0,0.45)]
          border border-neutral-200
          hover:scale-105 active:scale-95
          transition-all duration-200
          group cursor-pointer select-none
        "
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5 text-black group-hover:rotate-6 transition-transform" />
          {totalCount > 0 && (
            <span
              className="
                absolute -top-2 -right-2.5
                flex items-center justify-center
                min-w-[18px] h-[18px] px-1 rounded-full
                bg-black text-white
                text-[10px] font-bold font-mono
                border-2 border-white
                animate-in zoom-in-50 duration-200
              "
            >
              {totalCount}
            </span>
          )}
        </div>
        <span className="text-xs font-bold tracking-tight pr-0.5">Cart</span>
      </button>

      {/* ─── BACKDROP OVERLAY ───────────────────────────────────────────── */}
      {isOpen && (
        <div
          aria-hidden
          onClick={closeCart}
          className="
            fixed inset-0 z-50
            bg-black/50 backdrop-blur-xs
            transition-opacity duration-300 animate-in fade-in
          "
        />
      )}

      {/* ─── SLIDE-OVER CART DRAWER (WHITE BACKGROUND) ─────────────────── */}
      <aside
        id="cart-drawer-panel"
        aria-label="Shopping Cart Panel"
        className={`
          fixed top-0 right-0 bottom-0 z-50
          w-full sm:w-[440px] max-w-full
          bg-white text-black
          shadow-[-8px_0_40px_rgba(0,0,0,0.3)]
          border-l border-neutral-200
          flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200 bg-white">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-neutral-900" />
            <h2 className="text-lg font-bold text-neutral-900">Your Cart</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-semibold">
              {totalCount} {totalCount === 1 ? "item" : "items"}
            </span>
          </div>

          <button
            type="button"
            aria-label="Close cart"
            onClick={closeCart}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y divide-neutral-100">
          {items.map((item) => {
            const isDealItem =
              hasDealApplied &&
              dealPair?.some((dp) => dp.id === item.id);

            return (
              <div
                key={item.id}
                className="pt-4 first:pt-0 flex items-center gap-4"
              >
                {/* Thumbnail */}
                <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-xs">
                      No image
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-neutral-900 truncate">
                    {item.name}
                  </h3>

                  {/* Category Pill and Deal Tag */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                      {item.category || "General"}
                    </span>
                    {isDealItem && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        2 for ₹300 Pair
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-mono font-semibold text-neutral-600 mt-1">
                    ₹{Number(item.price).toFixed(2)} each
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3 mt-2.5">
                    <div className="flex items-center border border-neutral-200 rounded-lg bg-neutral-50">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 hover:bg-neutral-200 rounded-l-lg transition-colors text-neutral-700"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-mono font-bold text-neutral-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 hover:bg-neutral-200 rounded-r-lg transition-colors text-neutral-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-xs font-mono font-bold text-neutral-900">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  aria-label={`Remove ${item.name} from cart`}
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {/* Empty State */}
          {items.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">
                Your cart is empty
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                Explore our curated poster collection and add your favorite
                artworks to your cart.
              </p>
              <button
                type="button"
                onClick={closeCart}
                className="mt-6 px-5 py-2.5 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Start Browsing
              </button>
            </div>
          )}
        </div>

        {/* Footer with Totals, Deal Promotion, and SlideCommit Button */}
        {items.length > 0 && (
          <div className="p-6 border-t border-neutral-200 bg-neutral-50/70 space-y-4">
            {/* Promo banner: Two for 300 deal status */}
            {hasDealApplied ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <span>🎉</span>
                    <span>Two for ₹300 Deal Applied!</span>
                  </span>
                  <span className="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                    -₹{comboDiscount.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Different categories bundle: {qualifyingCategories?.[0]} +{" "}
                  {qualifyingCategories?.[1]} (1 pair offer)
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold flex items-center gap-1 text-blue-900">
                    <span>💡</span>
                    <span>Two for ₹300 Deal</span>
                  </p>
                  <p className="text-[11px] text-blue-700">
                    {items.length === 1
                      ? "Add 1 poster from a different category to unlock 2 for ₹300!"
                      : "Select posters from 2 different categories to get ₹300 pricing!"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCart}
                  className="shrink-0 text-[11px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                >
                  Browse
                </button>
              </div>
            )}

            {/* Price breakdown */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-600">
                <span>Original Subtotal</span>
                <span
                  className={`font-mono ${
                    hasDealApplied
                      ? "line-through text-neutral-400"
                      : "text-neutral-900 font-bold"
                  }`}
                >
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>

              {hasDealApplied && (
                <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                  <span>Category Pair Discount</span>
                  <span className="font-mono">-₹{comboDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-base font-bold text-neutral-900 pt-1.5 border-t border-neutral-200">
                <span>Total to Pay</span>
                <span className="font-mono text-xl text-neutral-950">
                  ₹{finalTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* SlideCommit Component */}
            <div className="flex flex-col items-center justify-center pt-1">
              <SlideCommit
                label="Slide to pay"
                doneLabel="Paid"
                errorLabel="Payment failed"
                onConfirm={() => api.pay(order)}
                onDone={() => console.log("paid")}
                onError={(reason: any) => console.log(reason)}
                trackColor="#262626"
                handleColor="#f5f5f5"
                successColor="#22c55e"
                dangerColor="#e5484d"
                width={280}
                height={56}
                radius={28}
                speed={50}
                returnBounce={0.38}
                landingDip={0.026}
                holdMs={1500}
                disabled={items.length === 0}
              />
              <p className="text-[10px] text-neutral-500 mt-2 font-mono text-center">
                Slide across to pay directly via UPIlerify
              </p>
            </div>

            <button
              type="button"
              onClick={closeCart}
              className="w-full text-center text-xs text-neutral-500 hover:text-black font-medium transition-colors cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </aside>

      {/* ─── UPILERIFY PAYMENT MODAL ─────────────────────────────────────── */}
      {paymentModalOpen && orderData && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-neutral-950 border border-neutral-800 text-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00d2ff]/10 text-[#00d2ff] font-bold">
                  UPIlerify
                </span>
                <h3 className="text-sm font-bold text-white">
                  Complete UPI Payment
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

            {/* PAYMENT SUCCESS STATE */}
            {paymentStatus === "PAID" ? (
              <div className="py-6 text-center space-y-4 animate-in fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">
                    Payment Verified!
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Your bank credit-alert was parsed and matched via UPIlerify.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs font-mono text-left space-y-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Order:</span>
                    <span className="text-white font-bold">
                      {orderData.orderId}
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
                  <div className="flex justify-between text-neutral-400">
                    <span>Status:</span>
                    <span className="text-emerald-400 font-bold">PAID</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalOpen(false);
                    closeCart();
                  }}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              /* PENDING PAYMENT STATE */
              <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
                {/* 1-2 Minute Verification Banner */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-xs text-amber-300">
                      Payment verification may take 1–2 minutes
                    </p>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      Bank credit-alert emails are scanned automatically via
                      delayed-cron IMAP. Please keep this modal open while we
                      verify your transaction.
                    </p>
                  </div>
                </div>

                {/* Order ID & Expected Amount with Micro-Offset */}
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-center space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 border-b border-neutral-800/80 pb-2 mb-2">
                    <span>ORDER ID</span>
                    <span className="text-white font-bold">
                      {orderData.orderId}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase text-neutral-500">
                    Exact Amount to Pay
                  </span>
                  <div className="text-2xl font-black text-white font-mono">
                    ₹{orderData.expectedAmount.toFixed(2)}
                  </div>
                  <p className="text-[11px] text-[#00d2ff]">
                    Pay exactly ₹{orderData.expectedAmount.toFixed(2)}.
                    Micro-offset paisa matches your order via bank credit-alert.
                  </p>
                </div>

                {/* Desktop QR Code */}
                {qrCodeDataUrl && (
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-300">
                      <QrCodeIcon className="w-3.5 h-3.5 text-[#00d2ff]" />
                      <span>Scan QR on Desktop with Any UPI App</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl shadow-lg border border-neutral-200">
                      <img
                        src={qrCodeDataUrl}
                        alt="UPI QR Code"
                        className="w-44 h-44 object-contain rounded"
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
                    href={orderData.upiIntentUri}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#00d2ff] hover:bg-[#00d2ff]/90 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Open UPI App on Mobile (GPay / PhonePe / Paytm)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {orderData.checkoutUrl && (
                    <a
                      href={orderData.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900 text-neutral-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Continue to UPIlerify Hosted Page</span>
                      <ExternalLink className="w-3 h-3 text-neutral-500" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => copyUpiLink(orderData.upiIntentUri)}
                    className="w-full py-2 px-3 rounded-xl border border-neutral-800 hover:bg-neutral-900 text-neutral-400 font-mono text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>
                      {copied ? "Copied UPI URI!" : "Copy UPI Payment Link"}
                    </span>
                  </button>
                </div>

                {/* Live Polling Status (Every 5s for up to 3 mins) */}
                <div className="p-2.5 rounded-lg bg-neutral-900/40 border border-neutral-800/80 text-[11px] text-neutral-400 space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2
                      className={`w-3.5 h-3.5 ${pollTimedOut ? "text-amber-400" : "text-[#00d2ff] animate-spin"}`}
                    />
                    <span>
                      {pollTimedOut
                        ? "Verification poll completed (3m). Submit UTR below if paid."
                        : `Watching bank credit-alerts... (${Math.max(0, 180 - pollSecondsElapsed)}s left)`}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 text-center font-mono">
                    Polling /api/payment-status every 5s for up to 3 minutes
                  </div>
                </div>

                {/* Manual UTR Fallback */}
                <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-neutral-300">
                      Manual UTR Fallback (12 Digits)
                    </label>
                    <span className="text-[10px] font-mono text-neutral-500">
                      Ref / UPI No.
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    If bank credit email is delayed, paste your 12-digit UPI
                    transaction reference number:
                  </p>
                  <form onSubmit={handleVerifyUtr} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={12}
                      value={manualUtr}
                      onChange={(e) =>
                        setManualUtr(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="e.g. 423985172039"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-600 outline-none focus:border-white font-mono"
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

                {/* Direct bank settlement note */}
                <div className="flex items-start gap-2 pt-1 text-[10px] text-neutral-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Direct settlement into bank account. Zero aggregator fees.
                    Verified via HMAC-SHA256.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
