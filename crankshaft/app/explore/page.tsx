import type { Metadata } from "next";
import Product from "@/lib/models/Product";
import { connectDB } from "@/lib/mongodb";
import Navbar from "../components/Navbar";
import ExploreGrid from "./ExploreGrid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Explore Posters — CrankShaft",
  description:
    "Browse the curated collection of premium posters and collector pieces.",
};

async function getProducts() {
  try {
    await connectDB();
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(products));
  } catch (err) {
    console.error("[EXPLORE_PRODUCTS_FETCH]", err);
    return [];
  }
}

export default async function ExplorePage() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-[#030714] text-white">
      {/* Ambient background lighting */}
      <div
        aria-hidden
        className="
          pointer-events-none fixed inset-0
          [background:radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.22)_0%,transparent_70%),
                      radial-gradient(ellipse_70%_50%_at_50%_110%,rgba(139,92,246,0.12)_0%,transparent_65%)]
        "
      />

      <Navbar />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-24 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-mono font-semibold tracking-widest uppercase text-indigo-400">
              CATALOG & ARTWORK
            </span>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mt-2 text-white">
              Explore Posters
            </h1>
            <p className="text-sm text-neutral-400 mt-2 max-w-xl">
              Curated limited edition art. Add posters to your cart to collect
              and order.
            </p>
          </div>

          <div className="text-xs font-mono text-neutral-400">
            Showing <strong className="text-white">{products.length}</strong>{" "}
            items
          </div>
        </div>

        {/* Interactive Products Grid with Add to Cart buttons */}
        <ExploreGrid products={products} />
      </div>
    </main>
  );
}
