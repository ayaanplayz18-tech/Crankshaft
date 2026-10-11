import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import DisplaySetting from "@/lib/models/DisplaySetting";
import { connectDB } from "@/lib/mongodb";
import Navbar from "./components/Navbar";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "CrankShaft — Drive Your Investments",
  description:
    "Explore, share, and invest in the automotive world with CrankShaft — the premium platform for car enthusiasts and investors.",
};

async function getActivePoster(): Promise<{ url: string; name: string }> {
  try {
    await connectDB();
    const setting = await DisplaySetting.findOne({ key: "home_poster" }).lean();
    if (setting?.posterUrl) {
      return {
        url: setting.posterUrl,
        name: setting.posterName || "CrankShaft poster",
      };
    }
  } catch (err) {
    console.error("[HOME_POSTER_FETCH]", err);
  }
  return {
    url: "/poster-ex.png",
    name: "CrankShaft poster",
  };
}

export default async function HomePage() {
  const poster = await getActivePoster();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030714] text-white">
      {/* Ambient glow blobs */}
      <div
        aria-hidden
        className="
          pointer-events-none fixed inset-0
          [background:radial-gradient(ellipse_80%_60%_at_20%_-20%,rgba(0,90,200,0.28)_0%,transparent_70%),
                      radial-gradient(ellipse_60%_50%_at_80%_100%,rgba(0,180,255,0.18)_0%,transparent_65%)]
        "
      />

      <Navbar />

      {/* ── Hero section ── */}
      <section
        id="hero"
        className="
          relative flex items-center justify-between
          min-h-screen px-12 md:px-20 lg:px-32
          pt-24 pb-16 gap-12
        "
      >
        {/* ── LEFT: Text + CTA ── */}
        <div className="flex flex-col items-start max-w-lg z-10">
          <h1 className="text-5xl sm:text-6xl font-black leading-tight tracking-tight text-white mb-8">
            Invest In Our
            <br />
            Poster Future
          </h1>

          <Link
            href="/explore"
            id="hero-explore-cta"
            className={`
              ${pixelFont.className}
              relative inline-block
              px-7 py-4
              text-[11px] tracking-widest uppercase
              text-black bg-[#22c55e]
              border-0 outline-none
              cursor-pointer select-none
              transition-all duration-100 active:translate-y-[3px]
              [image-rendering:pixelated]
              [box-shadow:
                4px_0_0_0_#15803d,
                -4px_0_0_0_#15803d,
                0_4px_0_0_#15803d,
                0_-4px_0_0_#15803d,
                4px_4px_0_0_#166534,
                -4px_4px_0_0_#166534,
                4px_-4px_0_0_#166534,
                -4px_-4px_0_0_#166534,
                8px_0_0_0_#166534,
                -8px_0_0_0_#166534,
                0_8px_0_0_#166534,
                0_-8px_0_0_#166534]
              hover:[box-shadow:
                4px_0_0_0_#16a34a,
                -4px_0_0_0_#16a34a,
                0_4px_0_0_#16a34a,
                0_-4px_0_0_#16a34a,
                4px_4px_0_0_#15803d,
                -4px_4px_0_0_#15803d,
                4px_-4px_0_0_#15803d,
                -4px_-4px_0_0_#15803d,
                8px_0_0_0_#15803d,
                -8px_0_0_0_#15803d,
                0_8px_0_0_#15803d,
                0_-8px_0_0_#15803d]
              hover:bg-[#4ade80]
            `}
          >
            Explore
          </Link>
        </div>

        {/* ── RIGHT: Poster with 3D border effect ── */}
        <div
          className="
            relative flex-shrink-0 z-10
            w-[340px] md:w-[420px] lg:w-[480px]
          "
        >
          {/* Shadow layers for 3D depth illusion */}
          <div
            aria-hidden
            className="
              absolute inset-0 translate-x-4 translate-y-4
              rounded-xl bg-[rgba(0,100,200,0.35)]
            "
          />
          <div
            aria-hidden
            className="
              absolute inset-0 translate-x-2 translate-y-2
              rounded-xl bg-[rgba(0,140,255,0.2)]
            "
          />

          {/* Poster image */}
          <div
            className="
              relative rounded-xl overflow-hidden
              border-2 border-[rgba(0,210,255,0.6)]
              shadow-[0_0_40px_rgba(0,180,255,0.25),inset_0_0_0_1px_rgba(255,255,255,0.08)]
            "
          >
            <Image
              src={poster.url}
              alt={poster.name}
              width={480}
              height={640}
              className="w-full h-auto object-cover"
              priority
              unoptimized
            />
          </div>
        </div>
      </section>
    </main>
  );
}
