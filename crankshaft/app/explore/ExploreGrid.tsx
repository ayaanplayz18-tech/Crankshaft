"use client";

import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Compass,
  Layers,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
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
  { id: "under-100", label: "Under ₹100", min: 0, max: 100 },
  { id: "100-250", label: "₹100 - ₹250", min: 100, max: 250 },
  { id: "250-500", label: "₹250 - ₹500", min: 250, max: 500 },
  { id: "500-plus", label: "₹500+", min: 500, max: Infinity },
];

const THEME_ICONS: Record<string, string> = {
  "Art and entertainment": "🎭",
  "Vehicles and travel": "🏎️",
  "Sports and activities": "🏆",
  "Nature and science": "🌌",
  "Style and visual design": "🎨",
  "Information and promotion": "📢",
};

export default function ExploreGrid({ products }: { products: ProductData[] }) {
  const { addToCart, items } = useCart();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc">(
    "newest",
  );

  // Subcategories to display based on selected theme
  const visibleSubcategories = useMemo(() => {
    if (selectedTheme === "All") {
      // Collect popular/active categories or all categories
      return POSTER_CATEGORIES.flatMap((t) => t.subcategories);
    }
    const themeObj = POSTER_CATEGORIES.find((t) => t.name === selectedTheme);
    return themeObj ? themeObj.subcategories : [];
  }, [selectedTheme]);

  // Compute product count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category?.trim() || "Cars and automotive";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

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

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedTheme("All");
    setSelectedCategory("All");
    setSelectedPriceRange("all");
    setSortBy("newest");
  };

  const handleSelectTheme = (themeName: string) => {
    setSelectedTheme(themeName);
    setSelectedCategory("All"); // Reset specific category when changing parent theme
  };

  return (
    <div className="space-y-8">
      {/* ─── SEARCH & FILTER CONTROLS ────────────────────────────────────── */}
      <div className="space-y-5 bg-black/60 border border-neutral-800/80 rounded-3xl p-5 md:p-6 backdrop-blur-xl shadow-2xl">
        {/* Row 1: Search Bar + Sort & Price dropdowns */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posters by title, car, theme or category (e.g. Anime, Motorsport, Minimalist)..."
              className="
                w-full pl-10 pr-10 py-3 rounded-2xl
                bg-black text-sm text-white placeholder-neutral-500
                border border-neutral-800
                focus:border-white focus:ring-1 focus:ring-white
                outline-none transition-all
              "
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Category Dropdown Jump Selector */}
          <div className="relative flex items-center shrink-0">
            <div className="absolute left-3 pointer-events-none text-neutral-400">
              <Compass className="w-3.5 h-3.5 text-[#00d2ff]" />
            </div>
            <select
              value={selectedCategory === "All" ? "" : selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setSelectedCategory("All");
                } else {
                  setSelectedCategory(val);
                  setSelectedTheme(getThemeForCategory(val));
                }
              }}
              className="
                pl-8.5 pr-8 py-3 rounded-2xl
                bg-black text-xs font-medium text-white
                border border-neutral-800
                focus:border-white outline-none cursor-pointer
                transition-colors appearance-none max-w-[210px] truncate
              "
            >
              <option value="">Jump to Category...</option>
              {POSTER_CATEGORIES.map((theme) => (
                <optgroup
                  key={theme.name}
                  label={`── ${theme.name.toUpperCase()} ──`}
                  className="bg-neutral-950 text-neutral-400 font-bold"
                >
                  {theme.subcategories.map((cat) => (
                    <option
                      key={cat}
                      value={cat}
                      className="bg-black text-white font-normal text-xs"
                    >
                      {cat}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 pointer-events-none text-neutral-500" />
          </div>

          {/* Price & Sort Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Price Filter Dropdown */}
            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none text-neutral-400">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value)}
                className="
                  pl-8 pr-8 py-3 rounded-2xl
                  bg-black text-xs font-medium text-white
                  border border-neutral-800
                  focus:border-white outline-none cursor-pointer
                  transition-colors appearance-none
                "
              >
                {PRICE_RANGES.map((range) => (
                  <option key={range.id} value={range.id}>
                    {range.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none text-neutral-500" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none text-neutral-400">
                <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="
                  pl-8 pr-8 py-3 rounded-2xl
                  bg-black text-xs font-medium text-white
                  border border-neutral-800
                  focus:border-white outline-none cursor-pointer
                  transition-colors appearance-none
                "
              >
                <option value="newest">Latest Added</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none text-neutral-500" />
            </div>
          </div>
        </div>

        {/* Row 2: LEVEL 1 — THEME TABS */}
        <div className="space-y-2 pt-2 border-t border-neutral-800/80">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold flex items-center gap-1.5 text-neutral-300">
              <Layers className="w-3.5 h-3.5 text-[#00d2ff]" />
              <span>Poster Themes</span>
            </span>
            <span className="text-[11px] font-mono text-neutral-500">
              Select a theme to view categories
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {/* All Themes pill */}
            <button
              type="button"
              onClick={() => handleSelectTheme("All")}
              className={`
                flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium
                whitespace-nowrap transition-all duration-150 cursor-pointer select-none
                ${
                  selectedTheme === "All"
                    ? "bg-white text-black font-bold shadow-md"
                    : "bg-black text-neutral-400 border border-neutral-800 hover:text-white hover:border-neutral-700"
                }
              `}
            >
              <span>🌟</span>
              <span>All Themes</span>
              <span
                className={`
                  text-[10px] px-1.5 py-0.2 rounded-full font-mono
                  ${selectedTheme === "All" ? "bg-black/10 text-black font-bold" : "bg-neutral-800 text-neutral-400"}
                `}
              >
                {products.length}
              </span>
            </button>

            {/* Individual Themes */}
            {POSTER_CATEGORIES.map((theme) => {
              const count = themeCounts[theme.name] || 0;
              const isSelected = selectedTheme === theme.name;
              const icon = THEME_ICONS[theme.name] || "🏷️";

              return (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => handleSelectTheme(theme.name)}
                  className={`
                    flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium
                    whitespace-nowrap transition-all duration-150 cursor-pointer select-none
                    ${
                      isSelected
                        ? "bg-white text-black font-bold shadow-md"
                        : "bg-black text-neutral-400 border border-neutral-800 hover:text-white hover:border-neutral-700"
                    }
                  `}
                >
                  <span>{icon}</span>
                  <span>{theme.name}</span>
                  {count > 0 && (
                    <span
                      className={`
                        text-[10px] px-1.5 py-0.2 rounded-full font-mono
                        ${isSelected ? "bg-black/10 text-black font-bold" : "bg-neutral-800 text-neutral-400"}
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

        {/* Row 3: LEVEL 2 — SPECIFIC CATEGORY PILLS */}
        <div className="space-y-2 pt-2 border-t border-neutral-800/80">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#00d2ff]" />
              <span>
                {selectedTheme === "All"
                  ? "All Categories"
                  : `${selectedTheme} Categories`}
              </span>
            </span>
            {selectedCategory !== "All" && (
              <button
                type="button"
                onClick={() => setSelectedCategory("All")}
                className="text-[11px] text-[#00d2ff] hover:underline cursor-pointer"
              >
                Reset to All in Theme
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none flex-wrap max-h-36 overflow-y-auto">
            {/* "All" button within active theme */}
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className={`
                px-3 py-1 rounded-lg text-xs font-medium
                whitespace-nowrap transition-all duration-150 cursor-pointer select-none
                ${
                  selectedCategory === "All"
                    ? "bg-[#00d2ff] text-black font-bold shadow-xs"
                    : "bg-neutral-900/80 text-neutral-400 border border-neutral-800 hover:text-white hover:border-neutral-700"
                }
              `}
            >
              All {selectedTheme === "All" ? "Types" : selectedTheme}
            </button>

            {/* Subcategories list */}
            {visibleSubcategories.map((subcat) => {
              const count = categoryCounts[subcat] || 0;
              const isSelected = selectedCategory === subcat;

              return (
                <button
                  key={subcat}
                  type="button"
                  onClick={() => setSelectedCategory(subcat)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium
                    whitespace-nowrap transition-all duration-150 cursor-pointer select-none
                    ${
                      isSelected
                        ? "bg-[#00d2ff] text-black font-bold shadow-xs"
                        : "bg-neutral-900/80 text-neutral-400 border border-neutral-800 hover:text-white hover:border-neutral-700"
                    }
                  `}
                >
                  <span>{subcat}</span>
                  {count > 0 && (
                    <span
                      className={`
                        text-[10px] px-1.5 py-0.2 rounded-full font-mono
                        ${isSelected ? "bg-black/20 text-black font-bold" : "bg-neutral-800 text-neutral-400"}
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

        {/* Active Filters Summary Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-3 border-t border-neutral-800 text-neutral-300">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-neutral-500 font-mono">
                Active filters:
              </span>
              {searchQuery && (
                <span className="px-2.5 py-0.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-mono flex items-center gap-1">
                  <span>"{searchQuery}"</span>
                  <X
                    className="w-3 h-3 cursor-pointer text-neutral-400 hover:text-white"
                    onClick={() => setSearchQuery("")}
                  />
                </span>
              )}
              {selectedTheme !== "All" && (
                <span className="px-2.5 py-0.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-mono flex items-center gap-1">
                  <span>Theme: {selectedTheme}</span>
                  <X
                    className="w-3 h-3 cursor-pointer text-neutral-400 hover:text-white"
                    onClick={() => setSelectedTheme("All")}
                  />
                </span>
              )}
              {selectedCategory !== "All" && (
                <span className="px-2.5 py-0.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-mono flex items-center gap-1">
                  <span>Category: {selectedCategory}</span>
                  <X
                    className="w-3 h-3 cursor-pointer text-neutral-400 hover:text-white"
                    onClick={() => setSelectedCategory("All")}
                  />
                </span>
              )}
              {selectedPriceRange !== "all" && (
                <span className="px-2.5 py-0.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-mono flex items-center gap-1">
                  <span>
                    {
                      PRICE_RANGES.find((r) => r.id === selectedPriceRange)
                        ?.label
                    }
                  </span>
                  <X
                    className="w-3 h-3 cursor-pointer text-neutral-400 hover:text-white"
                    onClick={() => setSelectedPriceRange("all")}
                  />
                </span>
              )}
              <span className="text-neutral-400 font-mono">
                ({filteredProducts.length} matching)
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-neutral-400 hover:text-white underline cursor-pointer font-medium ml-auto"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* ─── POSTERS GRID ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.map((p) => {
          const inCartItem = items.find((item) => item.id === p._id);
          const categoryName = p.category?.trim() || "Cars and automotive";
          const themeName = getThemeForCategory(categoryName);

          return (
            <div
              key={p._id}
              className="
                group rounded-2xl border border-neutral-800 bg-black/90
                overflow-hidden shadow-xl hover:border-neutral-700
                transition-all duration-300 flex flex-col
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
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md text-white border border-neutral-700 shadow-md">
                    <Tag className="w-2.5 h-2.5 text-[#00d2ff]" />
                    {categoryName}
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-neutral-900/90 text-neutral-400 border border-neutral-800">
                    {themeName}
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#00d2ff] transition-colors truncate">
                    {p.name}
                  </h3>
                  <span className="text-[11px] font-mono text-neutral-500 block mt-1">
                    Added {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                  <span className="text-base font-mono font-bold text-white">
                    ₹{Number(p.price).toFixed(2)}
                  </span>

                  {/* ADD TO CART BUTTON */}
                  <button
                    type="button"
                    onClick={() => addToCart(p)}
                    className={`
                      flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold
                      transition-all duration-150 cursor-pointer active:scale-95 select-none
                      ${
                        inCartItem
                          ? "bg-white text-black hover:bg-neutral-200"
                          : "bg-white text-black hover:bg-neutral-200 shadow-sm"
                      }
                    `}
                  >
                    {inCartItem ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Add More ({inCartItem.quantity})</span>
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
          <div className="col-span-full py-20 text-center border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/30 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-neutral-200">
              No posters match your criteria
            </p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              We couldn't find any posters matching "{searchQuery}" with the
              selected theme, category, and price filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* Global Empty State (no products in db) */}
        {products.length === 0 && (
          <div className="col-span-full py-20 text-center border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/30">
            <p className="text-base font-bold text-neutral-300">
              Catalog is currently empty
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Posters can be added with categories via the{" "}
              <Link href="/admin" className="text-white underline">
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
