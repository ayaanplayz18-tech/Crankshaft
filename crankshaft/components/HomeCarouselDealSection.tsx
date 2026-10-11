"use client";

import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Plus,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/app/components/CartContext";
import CircularCarousel from "./CircularCarousel";

const items = [
  {
    src: "/images/valley.jpg",
    alt: "Mist drifting through a valley",
    title: "Valley",
    subtitle: "Landscape",
  },
  {
    src: "/images/portrait.jpg",
    alt: "A studio portrait",
    title: "Portrait",
    subtitle: "Studio",
  },
  {
    src: "/images/towers.jpg",
    alt: "Glass towers from street level",
    title: "Towers",
    subtitle: "Architecture",
  },
];

interface CatalogPoster {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  tagline: string;
}

// Available catalog artworks for the Mix & Match builder
const AVAILABLE_POSTERS: CatalogPoster[] = [
  {
    id: "6acbfcd87b091947113e42a8",
    name: "MusicFest",
    category: "Music Festivals",
    price: 200,
    imageUrl: "posters-ex.png",
    tagline: "A celebration of sound",
  },
  {
    id: "6aca6577cd43588f072f7978",
    name: "Black Clover (Premium Edition)",
    category: "Anime and manga",
    price: 200,
    imageUrl: "/api/images/6aca6577cd43588f072f7976",
    tagline: "High-octane shonen energy on velvet paper",
  },
  {
    id: "6acbfcd87b091947113e42a9",
    name: "Alpine Valley Mist",
    category: "Landscapes and nature",
    price: 200,
    imageUrl: "/images/valley.jpg",
    tagline: "Ethereal morning alpine serenity",
  },
  {
    id: "6acbfcd87b091947113e42aa",
    name: "Cyberpunk Studio Portrait",
    category: "Style and visual design",
    price: 200,
    imageUrl: "/images/portrait.jpg",
    tagline: "Futuristic neon visual styling and grit",
  },
];

export default function HomeCarouselDealSection() {
  const { addToCart, hasDealApplied, comboDiscount } = useCart();
  const [isMounted, setIsMounted] = useState(false);

  // Selected posters in Mix & Match studio
  const [selectedPosterA, setSelectedPosterA] = useState<CatalogPoster>(
    AVAILABLE_POSTERS[0], // Cars and automotive
  );
  const [selectedPosterB, setSelectedPosterB] = useState<CatalogPoster>(
    AVAILABLE_POSTERS[2], // Landscapes and nature
  );
  const [addedSuccess, setAddedSuccess] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check whether the two selected posters belong to DIFFERENT categories
  const isDifferentCategories = useMemo(() => {
    return (
      selectedPosterA.category.trim().toLowerCase() !==
      selectedPosterB.category.trim().toLowerCase()
    );
  }, [selectedPosterA, selectedPosterB]);

  // Handle adding custom pair to cart
  const handleAddBundleToCart = () => {
    addToCart({
      id: selectedPosterA.id,
      name: selectedPosterA.name,
      price: selectedPosterA.price,
      imageUrl: selectedPosterA.imageUrl,
      category: selectedPosterA.category,
    });

    addToCart({
      id: selectedPosterB.id,
      name: selectedPosterB.name,
      price: selectedPosterB.price,
      imageUrl: selectedPosterB.imageUrl,
      category: selectedPosterB.category,
    });

    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2400);
  };

  // Quick preset bundle handler
  const handleAddPresetPair = (poster1: CatalogPoster, poster2: CatalogPoster) => {
    addToCart({
      id: poster1.id,
      name: poster1.name,
      price: poster1.price,
      imageUrl: poster1.imageUrl,
      category: poster1.category,
    });
    addToCart({
      id: poster2.id,
      name: poster2.name,
      price: poster2.price,
      imageUrl: poster2.imageUrl,
      category: poster2.category,
    });
  };

  return (
    <section id="carousel-deals" className="relative w-full py-20 px-6 sm:px-10 lg:px-16 overflow-hidden">
      {/* Background illumination accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_70%_50%_at_50%_20%,rgba(0,180,255,0.12)_0%,transparent_70%),radial-gradient(ellipse_60%_40%_at_50%_80%,rgba(34,197,94,0.08)_0%,transparent_60%)]"
      />

      {/* ─────────────────────────────────────────────────────────────
          PART 1: 3D CIRCULAR CAROUSEL SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto mb-28">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[#00d2ff] text-xs font-mono font-semibold tracking-wider uppercase mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive 3D Carousel</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Spin Through The Archive
          </h2>

          <p className="text-sm text-neutral-400 mt-3">
            Click, drag, or swipe through our signature physical prints rendered in continuous 3D perspective.
          </p>
        </div>

        {/* Carousel Container with exact parameters specified by user */}
        <div className="relative w-full rounded-3xl bg-neutral-950/70 border border-neutral-800/80 p-4 sm:p-6 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div style={{ width: "100%", height: "560px", position: "relative" }}>
            {isMounted ? (
              <CircularCarousel
                items={items}
                preset="cylinder"
                intro="rise"
                cardWidth={220}
                aspectRatio={1}
                speed={14}
                captions={false}
                gap={25}
                tilt={-5}
                curve={1}
                perspective={2500}
                autoplay="drift"
                interval={3}
                direction="left"
                momentum={0.6}
                snap
                pauseOnHover
                focusOnClick
                draggable
                parallax={0.3}
                stretch={0.5}
                fadeColor="#000000"
                depthFade={0.55}
                innerShade={0.6}
                cornerRadius={12}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-neutral-600 font-mono text-xs animate-pulse">
                <div className="w-10 h-10 rounded-full border-2 border-neutral-700 border-t-[#00d2ff] animate-spin" />
                <span>Loading 3D Cylinder Stage...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500 font-mono px-4 pt-3 border-t border-neutral-900">
            <span>Drag or flick to rotate</span>
            <span>Speed: 14 • Cylinder 3D Preset</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PART 2: "TWO FOR 300 DEAL" SHOWCASE ("Make it better")
      ───────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto">
        {/* Deal Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold tracking-widest uppercase mb-4 shadow-[0_0_20px_rgba(34,197,94,0.25)]">
            <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>LIMITED TIME PROMO DROP</span>
          </div>

          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Two For <span className="text-[#22c55e]">₹300</span> Deal
          </h2>

          <p className="text-base text-neutral-300 mt-4 leading-relaxed">
            Mix and match <span className="text-white font-bold underline decoration-emerald-500 underline-offset-4">any 2 posters from different categories</span>, and get both for just <strong className="text-emerald-400 font-mono">₹300</strong> instead of ₹400.
          </p>
          <p className="text-xs font-mono text-neutral-500 mt-2">
            *Offer applies strictly to one pair per order. Auto-calculated in cart & checkout.
          </p>
        </div>

        {/* ─── INTERACTIVE BUNDLE BUILDER STUDIO ─── */}
        <div className="relative rounded-3xl bg-neutral-950/90 border border-neutral-800 p-6 sm:p-10 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] mb-14">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            
            {/* POSTER 1 SELECTOR & PREVIEW */}
            <div className="w-full lg:w-5/12 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-[#00d2ff] tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Poster One</span>
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
                  {selectedPosterA.category}
                </span>
              </div>

              {/* Poster 1 Frame */}
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-neutral-800 bg-black group hover:border-[#00d2ff]/60 transition-all shadow-xl">
                <Image
                  src={selectedPosterA.imageUrl}
                  alt={selectedPosterA.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-5">
                  <h4 className="text-lg font-bold text-white leading-snug">
                    {selectedPosterA.name}
                  </h4>
                  <p className="text-xs text-neutral-300 mt-1 line-clamp-1">
                    {selectedPosterA.tagline}
                  </p>
                  <span className="text-xs font-mono font-bold text-neutral-400 mt-2">
                    Standard Price: ₹{selectedPosterA.price}
                  </span>
                </div>
              </div>

              {/* Selector dropdown for Poster 1 */}
              <div className="relative">
                <select
                  value={selectedPosterA.id}
                  onChange={(e) => {
                    const found = AVAILABLE_POSTERS.find((p) => p.id === e.target.value);
                    if (found) setSelectedPosterA(found);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-black border border-neutral-800 text-xs font-semibold text-white focus:border-[#00d2ff] outline-none appearance-none cursor-pointer pr-10"
                >
                  {AVAILABLE_POSTERS.map((p) => (
                    <option key={`a-${p.id}`} value={p.id}>
                      {p.name} — [{p.category}]
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* CENTER CONNECTOR & LIVE DISCOUNT BADGE */}
            <div className="flex flex-col items-center justify-center shrink-0 space-y-3 py-4 lg:py-0">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2 transition-all duration-300 shadow-xl ${
                  isDifferentCategories
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-[0_0_30px_rgba(34,197,94,0.4)] scale-110"
                    : "bg-neutral-900 text-neutral-500 border-neutral-700"
                }`}
              >
                <Plus className="w-6 h-6" />
              </div>

              {isDifferentCategories ? (
                <div className="text-center animate-in zoom-in-95 duration-200">
                  <span className="inline-block text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500 text-black shadow-md">
                    Save ₹100
                  </span>
                  <p className="text-[10px] font-mono text-emerald-400 mt-1 font-bold">
                    Different Categories!
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Same Category
                  </span>
                  <p className="text-[9px] text-neutral-500 mt-1 max-w-[120px]">
                    Pick 2 different categories for ₹300
                  </p>
                </div>
              )}
            </div>

            {/* POSTER 2 SELECTOR & PREVIEW */}
            <div className="w-full lg:w-5/12 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-[#22c55e] tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Poster Two</span>
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
                  {selectedPosterB.category}
                </span>
              </div>

              {/* Poster 2 Frame */}
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-neutral-800 bg-black group hover:border-[#22c55e]/60 transition-all shadow-xl">
                <Image
                  src={selectedPosterB.imageUrl}
                  alt={selectedPosterB.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-5">
                  <h4 className="text-lg font-bold text-white leading-snug">
                    {selectedPosterB.name}
                  </h4>
                  <p className="text-xs text-neutral-300 mt-1 line-clamp-1">
                    {selectedPosterB.tagline}
                  </p>
                  <span className="text-xs font-mono font-bold text-neutral-400 mt-2">
                    Standard Price: ₹{selectedPosterB.price}
                  </span>
                </div>
              </div>

              {/* Selector dropdown for Poster 2 */}
              <div className="relative">
                <select
                  value={selectedPosterB.id}
                  onChange={(e) => {
                    const found = AVAILABLE_POSTERS.find((p) => p.id === e.target.value);
                    if (found) setSelectedPosterB(found);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-black border border-neutral-800 text-xs font-semibold text-white focus:border-[#22c55e] outline-none appearance-none cursor-pointer pr-10"
                >
                  {AVAILABLE_POSTERS.map((p) => (
                    <option key={`b-${p.id}`} value={p.id}>
                      {p.name} — [{p.category}]
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ─── LIVE PRICE SUMMARY & ADD TO CART ACTION BAR ─── */}
          <div className="mt-10 pt-8 border-t border-neutral-850 flex flex-col sm:flex-row items-center justify-between gap-6 bg-black/40 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div>
                <span className="text-[11px] font-mono uppercase text-neutral-500 block">
                  Original Total
                </span>
                <span className="text-lg font-mono line-through text-neutral-500">
                  ₹{(selectedPosterA.price + selectedPosterB.price).toFixed(2)}
                </span>
              </div>

              <div className="h-8 w-px bg-neutral-800 hidden sm:block" />

              <div>
                <span className="text-[11px] font-mono uppercase text-emerald-400 block font-bold">
                  {isDifferentCategories ? "Deal Price (Unlocked)" : "Standard Total"}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-white">
                    {isDifferentCategories ? "₹300.00" : `₹${(selectedPosterA.price + selectedPosterB.price).toFixed(2)}`}
                  </span>
                  {isDifferentCategories && (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                      -₹100 Off
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Claim CTA Button */}
            <button
              type="button"
              onClick={handleAddBundleToCart}
              className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-sm tracking-tight transition-all duration-200 cursor-pointer select-none flex items-center justify-center gap-2 shadow-xl active:scale-95 ${
                addedSuccess
                  ? "bg-emerald-500 text-black shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                  : isDifferentCategories
                    ? "bg-[#22c55e] text-black hover:bg-[#16a34a] hover:scale-105 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                    : "bg-white text-black hover:bg-neutral-200"
              }`}
            >
              {addedSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-black" />
                  <span>Pair Added to Cart! (Deal Applied)</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>
                    {isDifferentCategories
                      ? "Claim Bundle for ₹300 (Add Both to Cart)"
                      : "Add Both Posters to Cart"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ─── POPULAR 1-CLICK CURATED COMBOS ─── */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Curated Cross-Category Combos</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Hand-picked complementary aesthetic pairs. 1-click add to cart for ₹300.
              </p>
            </div>

            <Link
              href="/explore"
              className="text-xs font-mono text-[#00d2ff] hover:underline flex items-center gap-1"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Combo 1: Track & Street Style */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5 flex flex-col justify-between hover:border-neutral-700 transition-colors shadow-lg">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    Music + Style
                  </span>
                  <span className="text-xs font-mono font-bold text-white">₹300</span>
                </div>
                <h4 className="text-sm font-bold text-white">Spirit & Cyberpunk</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  MusicFest + Cyberpunk Portrait
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-neutral-800">
                    <Image src="/poster-ex.png" alt="GTR" fill className="object-cover" unoptimized />
                  </div>
                  <span className="text-neutral-500 font-bold">+</span>
                  <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-neutral-800">
                    <Image src="/images/portrait.jpg" alt="Portrait" fill className="object-cover" unoptimized />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddPresetPair(AVAILABLE_POSTERS[0], AVAILABLE_POSTERS[3])}
                className="mt-5 w-full py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Add Pair for ₹300
              </button>
            </div>

            {/* Combo 2: Shonen & Horizon */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5 flex flex-col justify-between hover:border-neutral-700 transition-colors shadow-lg">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    Anime + Landscapes
                  </span>
                  <span className="text-xs font-mono font-bold text-white">₹300</span>
                </div>
                <h4 className="text-sm font-bold text-white">Anime & Mountain Mist</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Black Clover Premium + Alpine Valley Mist
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-neutral-800">
                    <Image src="/api/images/6aca6577cd43588f072f7976" alt="Anime" fill className="object-cover" unoptimized />
                  </div>
                  <span className="text-neutral-500 font-bold">+</span>
                  <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-neutral-800">
                    <Image src="/images/valley.jpg" alt="Valley" fill className="object-cover" unoptimized />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddPresetPair(AVAILABLE_POSTERS[1], AVAILABLE_POSTERS[2])}
                className="mt-5 w-full py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Add Pair for ₹300
              </button>
            </div>

            {/* Combo 3: Drift & Anime */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5 flex flex-col justify-between hover:border-neutral-700 transition-colors shadow-lg">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    Music + Anime
                  </span>
                  <span className="text-xs font-mono font-bold text-white">₹300</span>
                </div>
                <h4 className="text-sm font-bold text-white">Festivals & Shonen</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Midnight Neon Dream + Black Clover Premium
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-neutral-800">
                    <Image src="/poster-ex.png" alt="GTR" fill className="object-cover" unoptimized />
                  </div>
                  <span className="text-neutral-500 font-bold">+</span>
                  <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-neutral-800">
                    <Image src="/api/images/6aca6577cd43588f072f7976" alt="Anime" fill className="object-cover" unoptimized />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddPresetPair(AVAILABLE_POSTERS[0], AVAILABLE_POSTERS[1])}
                className="mt-5 w-full py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Add Pair for ₹300
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
