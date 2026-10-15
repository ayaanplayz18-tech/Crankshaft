"use client";

import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Compass,
  Filter,
  Grid,
  Layers,
  LayoutGrid,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getThemeForCategory, POSTER_CATEGORIES } from "@/lib/categories";
import { useCart } from "../components/CartContext";

export interface ProductData {
  _id: string;
  name: string;
  price: number;
  category?: string;
  imageUrl: string;
  createdAt: string;
}

const PRICE_RANGES = [
  { id: "all", label: "All Prices", min: 0, max: Infinity },
  { id: "under-200", label: "Under ₹200", min: 0, max: 199.99 },
  { id: "200-250", label: "₹200 – ₹250", min: 200, max: 250 },
  { id: "250-500", label: "₹250 – ₹500", min: 250, max: 500 },
  { id: "500-plus", label: "₹500+", min: 500, max: Infinity },
];

export default function ExploreGrid({ products }: { products: ProductData[] }) {
  const { addToCart, items } = useCart();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState<
    "newest" | "price-asc" | "price-desc" | "name-asc"
  >("newest");
  const [gridDensity, setGridDensity] = useState<"compact" | "spacious">(
    "compact",
  );

  // Collapsible Filters Menu state
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Category Explorer Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalSearch, setCategoryModalSearch] = useState("");

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCategoryModalOpen) {
        setIsCategoryModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCategoryModalOpen]);

  // Compute product count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category?.trim() || "Cars and automotive";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Categories currently populated in the database
  const activeCategoriesInCatalog = useMemo(() => {
    return Object.keys(categoryCounts)
      .filter((cat) => (categoryCounts[cat] || 0) > 0)
      .sort((a, b) => (categoryCounts[b] || 0) - (categoryCounts[a] || 0));
  }, [categoryCounts]);

  // Compute product count per theme
  const themeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: products.length };
    products.forEach((p) => {
      const cat = p.category?.trim() || "Cars and automotive";
      const theme = getThemeForCategory(cat);
      counts[theme] = (counts[theme] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filtered categories for the category explorer modal
  const filteredModalThemes = useMemo(() => {
    const q = categoryModalSearch.trim().toLowerCase();
    if (!q) return POSTER_CATEGORIES;

    return POSTER_CATEGORIES.map((theme) => {
      const matchingSub = theme.subcategories.filter(
        (sub) =>
          sub.toLowerCase().includes(q) || theme.name.toLowerCase().includes(q),
      );
      return {
        ...theme,
        subcategories: matchingSub,
      };
    }).filter(
      (theme) =>
        theme.subcategories.length > 0 || theme.name.toLowerCase().includes(q),
    );
  }, [categoryModalSearch]);

  // Filtered & Sorted products list
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const currentPriceRange =
      PRICE_RANGES.find((r) => r.id === selectedPriceRange) || PRICE_RANGES[0];

    return products
      .filter((p) => {
        const productCategory = p.category?.trim() || "Cars and automotive";
        const productTheme = getThemeForCategory(productCategory);

        // Search query filter (matches title, category, or theme)
        const matchesQuery =
          !query ||
          p.name.toLowerCase().includes(query) ||
          productCategory.toLowerCase().includes(query) ||
          productTheme.toLowerCase().includes(query);

        // Theme filter
        const matchesTheme =
          selectedTheme === "All" ||
          productTheme.toLowerCase() === selectedTheme.toLowerCase();

        // Subcategory filter
        const matchesCategory =
          selectedCategory === "All" ||
          productCategory.toLowerCase() === selectedCategory.toLowerCase();

        // Price filter
        const price = Number(p.price);
        const matchesPrice =
          price >= currentPriceRange.min && price <= currentPriceRange.max;

        return matchesQuery && matchesTheme && matchesCategory && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [
    products,
    searchQuery,
    selectedTheme,
    selectedCategory,
    selectedPriceRange,
    sortBy,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedTheme !== "All" ||
    selectedCategory !== "All" ||
    selectedPriceRange !== "all";

  // Count active non-search filters for the badge on the toggle button
  const activeFilterCount =
    (selectedTheme !== "All" ? 1 : 0) +
    (selectedCategory !== "All" ? 1 : 0) +
    (selectedPriceRange !== "all" ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedTheme("All");
    setSelectedCategory("All");
    setSelectedPriceRange("all");
    setSortBy("newest");
  };

  const handleSelectQuickCategory = (cat: string) => {
    if (cat === "All") {
      setSelectedCategory("All");
      setSelectedTheme("All");
    } else {
      setSelectedCategory(cat);
      setSelectedTheme(getThemeForCategory(cat));
    }
  };

  const handleSelectQuickTheme = (themeName: string) => {
    if (themeName === "All") {
      setSelectedTheme("All");
      setSelectedCategory("All");
    } else {
      setSelectedTheme(themeName);
      setSelectedCategory("All");
    }
  };

  return (
    <div className="space-y-8">
      {/* ─── REFINED FILTER & DISCOVERY HUB ────────────────────────────── */}
      <div className="relative rounded-3xl bg-neutral-900/50 backdrop-blur-2xl border border-white/[0.08] p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Ambient background glow */}
        <div
          aria-hidden
          className="absolute -top-12 -left-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"
        />

        {/* TOP ROW: Search Bar + Collapsible Filter Toggle & Quick Actions */}
        <div className="relative z-10 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Enhanced Search Input */}
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-indigo-400 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posters by title, car, theme or category..."
              className="
                w-full pl-10 pr-24 py-3 rounded-2xl
                bg-black/60 text-sm text-white placeholder-neutral-500
                border border-white/[0.08]
                focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20
                outline-none transition-all
              "
            />
            {/* Inside input: clear button & match indicator */}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[11px] font-mono text-neutral-400 bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/[0.05]">
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "poster" : "posters"}
              </span>
            </div>
          </div>

          {/* Controls: Collapsible Filter Button, 35+ Categories Button, Density Toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* COLLAPSIBLE FILTERS TOGGLE BUTTON */}
            <button
              type="button"
              onClick={() => setIsFiltersOpen((prev) => !prev)}
              aria-expanded={isFiltersOpen}
              className={`
                flex items-center gap-2 px-3.5 py-3 rounded-2xl text-xs font-semibold
                transition-all cursor-pointer select-none active:scale-95 shadow-sm
                ${
                  isFiltersOpen || activeFilterCount > 0
                    ? "bg-indigo-600 text-white shadow-indigo-600/20 border border-indigo-500"
                    : "bg-black/60 text-neutral-300 border border-white/[0.08] hover:text-white hover:border-white/20"
                }
              `}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/25 text-white font-bold">
                  {activeFilterCount}
                </span>
              )}
              {isFiltersOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-neutral-200" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              )}
            </button>

            {/* Quick 35+ Categories Trigger */}
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="
                flex items-center gap-1.5 px-3.5 py-3 rounded-2xl
                bg-black/60 hover:bg-neutral-800/80 text-neutral-300 hover:text-white
                border border-white/[0.08] hover:border-white/20
                text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-sm
              "
              title="Open full category browser"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">35+ Categories</span>
              <span className="md:hidden">Categories</span>
            </button>

            {/* Grid Density Toggle */}
            <div className="hidden sm:flex items-center rounded-2xl bg-black/60 border border-white/[0.08] p-1">
              <button
                type="button"
                onClick={() => setGridDensity("compact")}
                title="Compact View (4 columns)"
                className={`
                  p-2 rounded-xl text-xs transition-colors cursor-pointer
                  ${
                    gridDensity === "compact"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-neutral-400 hover:text-white"
                  }
                `}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setGridDensity("spacious")}
                title="Spacious View (3 columns)"
                className={`
                  p-2 rounded-xl text-xs transition-colors cursor-pointer
                  ${
                    gridDensity === "spacious"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-neutral-400 hover:text-white"
                  }
                `}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── COLLAPSIBLE FILTER MENU PANEL ─────────────────────────────── */}
        {isFiltersOpen && (
          <div className="relative z-10 pt-4 mt-2 border-t border-white/[0.08] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Row A: Price Range & Sort Options */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Price Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  Price:
                </span>
                <div className="relative flex-1 sm:flex-initial">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <select
                    value={selectedPriceRange}
                    onChange={(e) => setSelectedPriceRange(e.target.value)}
                    className="
                      w-full sm:w-auto pl-8.5 pr-8 py-2 rounded-xl
                      bg-black/60 text-xs font-medium text-neutral-200
                      border border-white/[0.08]
                      hover:border-white/20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                      outline-none cursor-pointer
                      transition-all appearance-none
                    "
                  >
                    {PRICE_RANGES.map((range) => (
                      <option
                        key={range.id}
                        value={range.id}
                        className="bg-neutral-950 text-white"
                      >
                        {range.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
                </div>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  Sort:
                </span>
                <div className="relative flex-1 sm:flex-initial">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="
                      w-full sm:w-auto pl-8.5 pr-8 py-2 rounded-xl
                      bg-black/60 text-xs font-medium text-neutral-200
                      border border-white/[0.08]
                      hover:border-white/20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                      outline-none cursor-pointer
                      transition-all appearance-none
                    "
                  >
                    <option
                      value="newest"
                      className="bg-neutral-950 text-white"
                    >
                      Latest Added
                    </option>
                    <option
                      value="price-asc"
                      className="bg-neutral-950 text-white"
                    >
                      Price: Low to High
                    </option>
                    <option
                      value="price-desc"
                      className="bg-neutral-950 text-white"
                    >
                      Price: High to Low
                    </option>
                    <option
                      value="name-asc"
                      className="bg-neutral-950 text-white"
                    >
                      Title: A to Z
                    </option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
                </div>
              </div>
            </div>

            {/* Row B: Category & Theme Quick Pills (Completely Emoji-Free) */}
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  Categories & Themes
                </span>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Explore all 35+ categories</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
                {/* All Posters Pill */}
                <button
                  type="button"
                  onClick={() => handleSelectQuickCategory("All")}
                  className={`
                    flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium
                    whitespace-nowrap transition-all duration-150 cursor-pointer select-none shrink-0
                    ${
                      selectedCategory === "All" && selectedTheme === "All"
                        ? "bg-indigo-600 text-white font-bold shadow-md ring-2 ring-indigo-500/30"
                        : "bg-black/50 text-neutral-400 border border-white/[0.08] hover:text-white hover:border-white/20"
                    }
                  `}
                >
                  <Layers className="w-3 h-3 text-indigo-400" />
                  <span>All Posters</span>
                  <span
                    className={`
                      text-[10px] px-1.5 py-0.2 rounded-full font-mono
                      ${
                        selectedCategory === "All" && selectedTheme === "All"
                          ? "bg-black/30 text-white font-bold"
                          : "bg-white/10 text-neutral-300"
                      }
                    `}
                  >
                    {products.length}
                  </span>
                </button>

                {/* Highlighted In-Stock Categories from Catalog (No Emojis) */}
                {activeCategoriesInCatalog.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const count = categoryCounts[cat] || 0;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleSelectQuickCategory(cat)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                        whitespace-nowrap transition-all duration-150 cursor-pointer select-none shrink-0
                        ${
                          isSelected
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold shadow-sm"
                            : "bg-black/50 text-neutral-300 border border-white/[0.08] hover:text-white hover:border-white/20"
                        }
                      `}
                    >
                      <Tag className="w-3 h-3 text-emerald-400" />
                      <span>{cat}</span>
                      <span
                        className={`
                          text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold
                          ${
                            isSelected
                              ? "bg-emerald-500/30 text-emerald-200"
                              : "bg-emerald-500/15 text-emerald-400"
                          }
                        `}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}

                {/* Separator */}
                <div className="h-4 w-[1px] bg-white/10 shrink-0 mx-1" />

                {/* Major Parent Themes (No Emojis) */}
                {POSTER_CATEGORIES.map((theme) => {
                  const isSelected =
                    selectedTheme === theme.name && selectedCategory === "All";
                  const count = themeCounts[theme.name] || 0;

                  return (
                    <button
                      key={theme.name}
                      type="button"
                      onClick={() => handleSelectQuickTheme(theme.name)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                        whitespace-nowrap transition-all duration-150 cursor-pointer select-none shrink-0
                        ${
                          isSelected
                            ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 font-bold shadow-sm"
                            : "bg-black/50 text-neutral-400 border border-white/[0.08] hover:text-white hover:border-white/20"
                        }
                      `}
                    >
                      <span>{theme.name}</span>
                      {count > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/10 text-neutral-300">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── ALWAYS-VISIBLE ACTIVE FILTERS BADGES BAR ───────────────────── */}
        {hasActiveFilters && (
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-white/[0.06] text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-neutral-500 font-mono text-[11px] uppercase tracking-wider">
                Filters:
              </span>

              {/* Search Badge */}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[11px]">
                  <span>"{searchQuery}"</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Theme Badge */}
              {selectedTheme !== "All" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800/80 border border-white/10 text-neutral-200 font-mono text-[11px]">
                  <span>Theme: {selectedTheme}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTheme("All")}
                    className="hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Category Badge */}
              {selectedCategory !== "All" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                  <span>Category: {selectedCategory}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("All")}
                    className="hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Price Badge */}
              {selectedPriceRange !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800/80 border border-white/10 text-neutral-200 font-mono text-[11px]">
                  <span>
                    Price:{" "}
                    {
                      PRICE_RANGES.find((r) => r.id === selectedPriceRange)
                        ?.label
                    }
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPriceRange("all")}
                    className="hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <span className="text-neutral-400 font-mono text-[11px]">
                Showing {filteredProducts.length} of {products.length}
              </span>
            </div>

            {/* Reset All Filters button */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer font-medium ml-auto"
            >
              <RotateCcw className="w-3 h-3 text-indigo-400" />
              <span>Reset all</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── SEARCHABLE 35+ CATEGORY MODAL (NO EMOJIS) ──────────────────── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop blur */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => setIsCategoryModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#080d1e] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Browse All Categories
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Explore 35+ collector genres organized across 6 core themes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 sm:px-6 bg-black/40 border-b border-white/[0.06]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={categoryModalSearch}
                  onChange={(e) => setCategoryModalSearch(e.target.value)}
                  placeholder="Search 35+ categories (e.g. Anime, Motorsport, Minimalist, Sci-fi)..."
                  className="
                    w-full pl-10 pr-9 py-2.5 rounded-xl
                    bg-neutral-900/90 text-sm text-white placeholder-neutral-500
                    border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                    outline-none transition-all
                  "
                  autoFocus
                />
                {categoryModalSearch && (
                  <button
                    type="button"
                    onClick={() => setCategoryModalSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* In-stock quick filter row inside modal */}
              {activeCategoriesInCatalog.length > 0 && !categoryModalSearch && (
                <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                  <span className="text-[11px] font-mono text-emerald-400 shrink-0 font-semibold uppercase">
                    In Catalog Now:
                  </span>
                  {activeCategoriesInCatalog.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        handleSelectQuickCategory(cat);
                        setIsCategoryModalOpen(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-medium cursor-pointer transition-colors shrink-0"
                    >
                      <Tag className="w-3 h-3 text-emerald-400" />
                      <span>{cat}</span>
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded-full bg-emerald-500/20 font-bold">
                        {categoryCounts[cat]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Body: Theme Cards with Subcategories (No Emojis) */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
              {filteredModalThemes.map((theme) => {
                const totalInTheme = themeCounts[theme.name] || 0;

                return (
                  <div
                    key={theme.name}
                    className="rounded-2xl bg-black/40 border border-white/[0.06] p-4 space-y-3"
                  >
                    {/* Theme Header with quick select */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-sm font-bold text-white tracking-wide">
                          {theme.name}
                        </h3>
                        {totalInTheme > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                            {totalInTheme} in stock
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleSelectQuickTheme(theme.name);
                          setIsCategoryModalOpen(false);
                        }}
                        className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                      >
                        Select Theme
                      </button>
                    </div>

                    {/* Subcategories Buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {theme.subcategories.map((subcat) => {
                        const count = categoryCounts[subcat] || 0;
                        const isSelected = selectedCategory === subcat;

                        return (
                          <button
                            key={subcat}
                            type="button"
                            onClick={() => {
                              handleSelectQuickCategory(subcat);
                              setIsCategoryModalOpen(false);
                            }}
                            className={`
                              flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                              transition-all cursor-pointer select-none text-left
                              ${
                                isSelected
                                  ? "bg-indigo-600 text-white font-bold shadow-md ring-2 ring-indigo-500/40"
                                  : count > 0
                                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20"
                                    : "bg-white/[0.04] text-neutral-400 border border-white/[0.05] hover:text-white hover:bg-white/[0.08]"
                              }
                            `}
                          >
                            <span>{subcat}</span>
                            {count > 0 && (
                              <span
                                className={`
                                  text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold
                                  ${
                                    isSelected
                                      ? "bg-black/30 text-white"
                                      : "bg-emerald-500/25 text-emerald-300"
                                  }
                                `}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {filteredModalThemes.length === 0 && (
                <div className="py-12 text-center text-neutral-400 space-y-2">
                  <p className="text-sm">
                    No categories found matching "{categoryModalSearch}"
                  </p>
                  <button
                    type="button"
                    onClick={() => setCategoryModalSearch("")}
                    className="text-xs text-indigo-400 underline cursor-pointer"
                  >
                    Clear search query
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:px-6 border-t border-white/[0.08] bg-black/60 flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-mono">
                {POSTER_CATEGORIES.reduce(
                  (acc, t) => acc + t.subcategories.length,
                  0,
                )}{" "}
                total categories available
              </span>
              <button
                type="button"
                onClick={() => {
                  handleSelectQuickCategory("All");
                  setIsCategoryModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Reset to All Categories
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── POSTERS GRID ─────────────────────────────────────────────────── */}
      <div
        className={`grid gap-6 ${
          gridDensity === "compact"
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
        }`}
      >
        {filteredProducts.map((p) => {
          const inCartItem = items.find((item) => item.id === p._id);
          const categoryName = p.category?.trim() || "Cars and automotive";
          const themeName = getThemeForCategory(categoryName);

          return (
            <div
              key={p._id}
              className="
                group rounded-2xl border border-white/[0.08] bg-[#080d1e]/90
                overflow-hidden shadow-xl hover:border-indigo-500/40
                transition-all duration-300 flex flex-col hover:shadow-indigo-500/5
              "
            >
              {/* Poster Image */}
              <div className="relative aspect-[3/4] bg-neutral-900 overflow-hidden">
                <Image
                  src={p.imageUrl}
                  alt={p.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />

                {/* Category & Theme Pill Badges on Poster */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-white border border-white/10 shadow-lg">
                    <Tag className="w-2.5 h-2.5 text-indigo-400" />
                    {categoryName}
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-neutral-400 border border-white/[0.06]">
                    {themeName}
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                    {p.name}
                  </h3>
                  <span className="text-[11px] font-mono text-neutral-500 block mt-1">
                    Added {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                  <span className="text-base font-mono font-bold text-white">
                    ₹{Number(p.price).toFixed(2)}
                  </span>

                  {/* ADD TO CART BUTTON */}
                  <button
                    type="button"
                    onClick={() => addToCart(p)}
                    className={`
                      flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold
                      transition-all duration-150 cursor-pointer active:scale-95 select-none
                      ${
                        inCartItem
                          ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                          : "bg-white text-black hover:bg-neutral-200 shadow-sm"
                      }
                    `}
                  >
                    {inCartItem ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>In Cart ({inCartItem.quantity})</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add to Cart</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty Search/Filter Results */}
        {filteredProducts.length === 0 && products.length > 0 && (
          <div className="col-span-full py-16 px-6 text-center border border-dashed border-white/10 rounded-3xl bg-neutral-900/30 backdrop-blur-md space-y-4 max-w-xl mx-auto my-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Search className="w-7 h-7" />
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-100">
                No matching posters found
              </p>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                {searchQuery
                  ? `No posters matching "${searchQuery}" in ${selectedCategory !== "All" ? selectedCategory : "the selected filters"}.`
                  : "No posters match the current filter selection."}
              </p>
            </div>

            {/* Helpful Category Suggestions */}
            {activeCategoriesInCatalog.length > 0 && (
              <div className="pt-2">
                <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
                  Try browsing categories with active posters:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {activeCategoriesInCatalog.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleSelectQuickCategory(cat)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-xs text-neutral-200 border border-white/10 transition-colors cursor-pointer"
                    >
                      <Tag className="w-3 h-3 text-emerald-400" />
                      <span>{cat}</span>
                      <span className="font-mono text-[10px] text-emerald-400 font-bold">
                        ({categoryCounts[cat]})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg active:scale-95"
              >
                Reset all filters
              </button>
            </div>
          </div>
        )}

        {/* Global Empty State (no products in db) */}
        {products.length === 0 && (
          <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-3xl bg-neutral-900/30 backdrop-blur-md">
            <p className="text-base font-bold text-neutral-300">
              Catalog is currently empty
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Posters can be added with categories via the{" "}
              <Link href="/admin" className="text-indigo-400 underline">
                Admin Dashboard
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
