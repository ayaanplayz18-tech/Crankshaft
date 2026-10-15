"use client";

import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Compass,
  Plus,
  RotateCw,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/app/components/CartContext";
import CircularCarousel, { type CarouselItem } from "./CircularCarousel";

export interface PosterItem {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  category?: string;
  imageUrl: string;
  tagline?: string;
}

const FALLBACK_POSTERS: PosterItem[] = [
  {
    id: "fb-1",
    name: "Circuit De Monaco",
    category: "Racing and motorsports",
    price: 200,
    imageUrl: "/images/poster-ex.png",
    tagline: "Iconic Monte Carlo harbor hairpin in high-octane contrast",
  },
  {
    id: "fb-2",
    name: "Ford GT40 Le Mans",
    category: "Racing and motorsports",
    price: 200,
    imageUrl: "/images/towers.jpg",
    tagline: "Endurance legend that conquered Circuit de la Sarthe",
  },
  {
    id: "fb-3",
    name: "BMW M5 F90",
    category: "Cars and automotive",
    price: 200,
    imageUrl: "/images/valley.jpg",
    tagline: "Bi-turbo performance beast captured in dark velvet tones",
  },
  {
    id: "fb-4",
    name: "Mercedes G63 AMG",
    category: "Cars and automotive",
    price: 200,
    imageUrl: "/images/portrait.jpg",
    tagline: "Aggressive luxury silhouette on archival matte stock",
  },
];

interface HomeInteractiveShowcaseProps {
  initialProducts?: PosterItem[];
}

export default function HomeInteractiveShowcase({
  initialProducts = [],
}: HomeInteractiveShowcaseProps) {
  const {
    addToCart,
    items: cartItems,
    totalCount,
    subtotal,
    openCart,
  } = useCart();

  // Combine initial products or fallbacks
  const postersList: PosterItem[] = useMemo(() => {
    if (initialProducts && initialProducts.length > 0) {
      return initialProducts.map((p) => ({
        ...p,
        id: p._id || p.id || String(Math.random()),
      }));
    }
    return FALLBACK_POSTERS;
  }, [initialProducts]);

  // Selected poster displayed on the left
  const [selectedPoster, setSelectedPoster] = useState<PosterItem>(() => {
    return postersList[0] || FALLBACK_POSTERS[0];
  });

  // Search & Filter state for the right search box
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const previewSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update selected poster if postersList loads and nothing was selected
  useEffect(() => {
    if (postersList.length > 0 && !selectedPoster) {
      setSelectedPoster(postersList[0]);
    }
  }, [postersList, selectedPoster]);

  // Extract unique categories for quick filter pills
  const categories = useMemo(() => {
    const set = new Set<string>();
    postersList.forEach((p) => {
      if (p.category?.trim()) {
        set.add(p.category.trim());
      }
    });
    return ["All", ...Array.from(set)];
  }, [postersList]);

  // Filtered posters based on search query and category
  const filteredPosters = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return postersList.filter((poster) => {
      const matchesCategory =
        selectedCategory === "All" ||
        (poster.category &&
          poster.category.toLowerCase() === selectedCategory.toLowerCase());

      const matchesSearch =
        !query ||
        poster.name.toLowerCase().includes(query) ||
        Boolean(poster.category?.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [postersList, searchQuery, selectedCategory]);

  // Check if current chosen poster is in cart
  const chosenPosterCartItem = useMemo(() => {
    if (!selectedPoster) return null;
    const chosenId = selectedPoster.id || selectedPoster._id;
    return cartItems.find((item) => item.id === chosenId) || null;
  }, [cartItems, selectedPoster]);

  // Add chosen poster to cart
  const handleAddChosenToCart = (posterToAdd = selectedPoster) => {
    if (!posterToAdd) return;
    addToCart({
      id: posterToAdd.id || posterToAdd._id,
      name: posterToAdd.name,
      price: posterToAdd.price,
      imageUrl: posterToAdd.imageUrl,
      category: posterToAdd.category,
    });
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2000);
  };

  // Build carousel items from user's live cart
  const carouselItems: CarouselItem[] = useMemo(() => {
    if (!cartItems || cartItems.length === 0) {
      return [];
    }

    const baseItems: CarouselItem[] = cartItems.map((item) => ({
      src: item.imageUrl,
      alt: item.name,
      title: item.name,
      subtitle: `₹${item.price} • ${item.quantity} in cart`,
    }));

    // CircularCarousel renders a 3D cylinder. To look round and smooth,
    // we need at least 4 items. If user has 1 or 2 items, we repeat them.
    if (baseItems.length === 1) {
      return [baseItems[0], baseItems[0], baseItems[0], baseItems[0]];
    }
    if (baseItems.length === 2) {
      return [baseItems[0], baseItems[1], baseItems[0], baseItems[1]];
    }
    if (baseItems.length === 3) {
      return [
        baseItems[0],
        baseItems[1],
        baseItems[2],
        baseItems[0],
        baseItems[1],
        baseItems[2],
      ];
    }

    return baseItems;
  }, [cartItems]);

  return (
    <div className="relative w-full overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: POSTER EXPLORER & SEARCH
          - Left: Chosen poster high-definition preview & action bar
          - Right: Search box, category pills, & poster selection cards
      ───────────────────────────────────────────────────────────── */}
      <section
        id="poster-search"
        ref={previewSectionRef}
        className="relative w-full py-16 px-6 sm:px-10 lg:px-16"
      >
        {/* Subtle background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_80%_50%_at_50%_15%,rgba(0,180,255,0.08)_0%,transparent_70%)]"
        />

        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[#00d2ff] text-xs font-mono font-semibold tracking-wider uppercase mb-3 shadow-sm">
              <Compass className="w-3.5 h-3.5" />
              <span>Choose Your Print</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Inspect & Select A Poster
            </h2>
            <p className="text-sm text-neutral-400 mt-3">
              Search our curated artwork archive on the right to inspect its
              physical print styling on the left.
            </p>
          </div>

          {/* Two-column Layout: Left = Chosen Poster, Right = Search Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ─── LEFT: Chosen Poster Display ─── */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#00d2ff] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Selected Poster Preview</span>
                </span>
                {selectedPoster?.category && (
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
                    {selectedPoster.category}
                  </span>
                )}
              </div>

              {/* Chosen Poster Frame with 3D Depth Styling */}
              <div className="relative group rounded-3xl bg-neutral-950/90 border border-neutral-800/90 p-5 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                {/* Layered depth accent borders */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-[#00d2ff]/20 via-transparent to-[#22c55e]/15 opacity-70 blur-sm group-hover:opacity-100 transition-opacity"
                />

                <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden border-2 border-neutral-800 bg-black shadow-inner">
                  {selectedPoster?.imageUrl ? (
                    <Image
                      src={selectedPoster.imageUrl}
                      alt={selectedPoster.name}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      unoptimized
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600 font-mono text-xs">
                      No poster selected
                    </div>
                  )}

                  {/* Gradient bottom overlay with specs */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-transparent flex flex-col justify-end p-6">
                    <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-neutral-300 border border-white/10 w-fit mb-2 backdrop-blur-md">
                      Museum-Grade Archival Print
                    </span>
                    <h3 className="text-2xl font-black text-white leading-tight tracking-tight">
                      {selectedPoster?.name || "Select a Poster"}
                    </h3>
                    {selectedPoster?.tagline && (
                      <p className="text-xs text-neutral-300 mt-1 line-clamp-2">
                        {selectedPoster.tagline}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-800/80">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-neutral-400 block">
                          Standard Price
                        </span>
                        <span className="text-2xl font-black font-mono text-[#22c55e]">
                          ₹{selectedPoster?.price ?? 200}
                        </span>
                      </div>

                      {chosenPosterCartItem ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-xs font-mono font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{chosenPosterCartItem.quantity} In Cart</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-neutral-400">
                          In Stock • Ready to Print
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAddChosenToCart()}
                    className={`flex-1 py-4 px-6 rounded-2xl font-bold text-sm tracking-tight transition-all duration-200 cursor-pointer select-none flex items-center justify-center gap-2 shadow-xl active:scale-95 ${
                      addedSuccess
                        ? "bg-emerald-500 text-black shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                        : "bg-[#22c55e] text-black hover:bg-[#16a34a] hover:shadow-[0_0_25px_rgba(34,197,94,0.35)]"
                    }`}
                  >
                    {addedSuccess ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-black" />
                        <span>Added to Cart! (Check 3D Carousel Below)</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>
                          {chosenPosterCartItem
                            ? "Add Another to Cart"
                            : "Add Poster to Cart"}
                        </span>
                      </>
                    )}
                  </button>

                  {chosenPosterCartItem && (
                    <button
                      type="button"
                      onClick={openCart}
                      aria-label="Open Cart Drawer"
                      className="p-4 rounded-2xl bg-neutral-900 border border-neutral-700 text-neutral-200 hover:text-white hover:border-neutral-500 transition-colors cursor-pointer"
                      title="Open cart drawer"
                    >
                      <ShoppingBag className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 px-2 mt-3">
                  <span>300 GSM Matte Velvet Paper</span>
                  <span>Instant 3D Preview Below</span>
                </div>
              </div>
            </div>

            {/* ─── RIGHT: Search Box & Poster Selection ─── */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-[#00d2ff]" />
                  <span>Poster Search & Filter</span>
                </span>
                <span className="text-xs font-mono text-neutral-500">
                  Showing{" "}
                  <strong className="text-white">
                    {filteredPosters.length}
                  </strong>{" "}
                  of {postersList.length}
                </span>
              </div>

              {/* Search Box Panel */}
              <div className="rounded-3xl bg-neutral-950/90 border border-neutral-800/90 p-5 sm:p-7 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col space-y-5">
                {/* Search Input Bar */}
                <div className="relative">
                  <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by poster name, car model, or category..."
                    className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-black border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] outline-none transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Category Pills Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-xs font-mono whitespace-nowrap px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#00d2ff]/15 border-[#00d2ff] text-[#00d2ff] font-bold shadow-[0_0_12px_rgba(0,210,255,0.25)]"
                            : "bg-black/60 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Scrollable List of Poster Options */}
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {filteredPosters.length > 0 ? (
                    filteredPosters.map((poster) => {
                      const isSelected =
                        (selectedPoster?.id || selectedPoster?._id) ===
                        (poster.id || poster._id);
                      const inCart = cartItems.find(
                        (i) => i.id === (poster.id || poster._id),
                      );

                      return (
                        <div
                          key={poster.id || poster._id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedPoster(poster)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedPoster(poster);
                            }
                          }}
                          className={`group relative rounded-2xl p-3 border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 select-none ${
                            isSelected
                              ? "bg-neutral-900/90 border-[#00d2ff] shadow-[0_0_20px_rgba(0,210,255,0.18)] translate-x-1"
                              : "bg-black/50 border-neutral-850 hover:border-neutral-700 hover:bg-neutral-900/40"
                          }`}
                        >
                          {/* Left: Thumbnail + Metadata */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative w-14 h-18 shrink-0 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-sm">
                              <Image
                                src={poster.imageUrl}
                                alt={poster.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                unoptimized
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4
                                  className={`text-sm font-bold truncate ${
                                    isSelected
                                      ? "text-white"
                                      : "text-neutral-200 group-hover:text-white"
                                  }`}
                                >
                                  {poster.name}
                                </h4>
                                {isSelected && (
                                  <span className="shrink-0 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40">
                                    Viewing
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-neutral-400 truncate mt-0.5">
                                {poster.category || "Classic"}
                              </p>

                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-xs font-mono font-bold text-[#22c55e]">
                                  ₹{poster.price}
                                </span>
                                {inCart && (
                                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.2 rounded">
                                    {inCart.quantity} in cart
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Quick Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddChosenToCart(poster);
                              }}
                              title="Quick add to cart"
                              className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-black hover:bg-[#22c55e] hover:border-[#22c55e] transition-all cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>

                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${
                                isSelected
                                  ? "text-[#00d2ff] translate-x-0.5"
                                  : "text-neutral-600 group-hover:text-neutral-400"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-neutral-800 bg-black/40">
                      <Search className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-neutral-300">
                        No posters found
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Try searching for another keyword or clear your filter.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCategory("All");
                        }}
                        className="mt-4 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-mono text-neutral-300 hover:text-white"
                      >
                        Reset Search & Filters
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer link to explore all catalog */}
                <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-500 font-mono">
                  <span>Click any card to inspect on left</span>
                  <Link
                    href="/explore"
                    className="text-[#00d2ff] hover:underline flex items-center gap-1"
                  >
                    <span>View All in Explore</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: 3D CART CAROUSEL (Moved Down)
          - Renders images of the posters the user has added to cart
          - Dynamic real-time update when user adds/removes items
      ───────────────────────────────────────────────────────────── */}
      <section
        id="cart-carousel"
        className="relative w-full py-20 px-6 sm:px-10 lg:px-16 overflow-hidden border-t border-neutral-900/80"
      >
        {/* Illumination gradient accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_70%_50%_at_50%_20%,rgba(0,180,255,0.12)_0%,transparent_70%),radial-gradient(ellipse_60%_40%_at_50%_80%,rgba(34,197,94,0.08)_0%,transparent_60%)]"
        />

        <div className="max-w-6xl mx-auto">
          {/* Carousel Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[#00d2ff] text-xs font-mono font-semibold tracking-wider uppercase mb-4 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {cartItems.length > 0
                  ? `Your Cart in 3D (${totalCount} item${totalCount === 1 ? "" : "s"})`
                  : "Interactive 3D Cart Archive"}
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {cartItems.length > 0
                ? "Your Cart In 3D Motion"
                : "Your 3D Cart Showcase"}
            </h2>

            <p className="text-sm text-neutral-400 mt-3">
              {cartItems.length > 0
                ? "Here are the posters currently added in your cart, spinning in continuous 3D cylinder perspective. Drag, rotate, or flick to explore your selection."
                : "Posters you add to your cart appear here in real-time continuous 3D perspective. Add posters from above to activate the cylinder."}
            </p>
          </div>

          {/* Carousel Container */}
          <div className="relative w-full rounded-3xl bg-neutral-950/70 border border-neutral-800/80 p-4 sm:p-6 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div
              style={{ width: "100%", height: "560px", position: "relative" }}
            >
              {isMounted ? (
                cartItems.length > 0 ? (
                  <CircularCarousel
                    items={carouselItems}
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
                    onItemClick={(item) => {
                      // Find item in postersList and select it in preview
                      const match = postersList.find(
                        (p) => p.imageUrl === item.src || p.name === item.title,
                      );
                      if (match) {
                        setSelectedPoster(match);
                        previewSectionRef.current?.scrollIntoView({
                          behavior: "smooth",
                        });
                      } else {
                        openCart();
                      }
                    }}
                  />
                ) : (
                  /* Ultra-sleek empty cart state within cylinder stage */
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 sm:p-12">
                    <div className="relative mb-6">
                      <div
                        aria-hidden
                        className="absolute -inset-4 rounded-full bg-[#00d2ff]/20 blur-xl animate-pulse"
                      />
                      <div className="relative w-20 h-20 rounded-2xl bg-neutral-900 border border-neutral-700 flex items-center justify-center shadow-2xl">
                        <ShoppingBag className="w-10 h-10 text-[#00d2ff]" />
                      </div>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      Your 3D Cart is Empty
                    </h3>

                    <p className="text-sm text-neutral-400 max-w-md mt-2 leading-relaxed">
                      You haven't added any posters to your cart yet. Choose a
                      poster from the search box above to watch it take center
                      stage here in 3D.
                    </p>

                    <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleAddChosenToCart()}
                        className="px-6 py-3 rounded-xl bg-[#22c55e] text-black font-bold text-xs tracking-wider uppercase hover:bg-[#16a34a] transition-all flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add "{selectedPoster?.name}" to Cart</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          previewSectionRef.current?.scrollIntoView({
                            behavior: "smooth",
                          });
                        }}
                        className="px-5 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 font-mono text-xs hover:text-white hover:border-neutral-500 transition-colors cursor-pointer"
                      >
                        Search & Browse Posters ↑
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-neutral-600 font-mono text-xs animate-pulse">
                  <div className="w-10 h-10 rounded-full border-2 border-neutral-700 border-t-[#00d2ff] animate-spin" />
                  <span>Loading 3D Cylinder Stage...</span>
                </div>
              )}
            </div>

            {/* Carousel Bottom Control & Cart Status Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400 font-mono px-4 pt-3 border-t border-neutral-900">
              <div className="flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 text-[#00d2ff]" />
                <span>
                  {cartItems.length > 0
                    ? `Showing ${totalCount} cart poster${totalCount === 1 ? "" : "s"} • Drag or flick to spin`
                    : "Live 3D Carousel synchronizes with your cart items"}
                </span>
              </div>

              {cartItems.length > 0 && (
                <div className="flex items-center gap-4">
                  <span>
                    Subtotal:{" "}
                    <strong className="text-white">
                      ₹{subtotal.toFixed(2)}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={openCart}
                    className="px-4 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-bold hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#00d2ff]" />
                    <span>View Bag ({totalCount})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
