"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SpecularButton from "./SpecularButton";

export default function Navbar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    avatar?: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    setCurrentUser(null);
    router.refresh();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav
        className="
          mx-auto flex items-center justify-between
          px-6 py-4
          bg-[rgba(3,7,20,0.72)]
          backdrop-blur-md
          border-b border-[rgba(255,255,255,0.08)]
          shadow-[0_4px_32px_rgba(0,0,0,0.5)]
        "
      >
        {/* ── LEFT: Brand logo & name ── */}
        <Link
          href="/"
          id="nav-logo"
          className="flex items-center gap-2.5 text-white text-xl font-bold tracking-wide hover:opacity-85 transition-opacity duration-200 select-none group"
        >
          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-black/40 border border-white/10 group-hover:border-[#00d2ff]/50 transition-colors">
            <Image
              src="/images/Crankshaft.png"
              alt="CrankShaft Logo"
              width={32}
              height={32}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <span>CrankShaft</span>
        </Link>

        {/* ── CENTER: nav links (desktop) ── */}
        <div
          className="hidden md:flex items-center gap-8"
          id="nav-center-links"
        >
          {["Explore", "Shares"].map((label) => (
            <Link
              key={label}
              href={`/${label.toLowerCase()}`}
              id={`nav-${label.toLowerCase()}`}
              className="text-sm font-medium text-white hover:opacity-70 transition-opacity duration-200"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* ── RIGHT: SpecularButton CTA or User Profile ── */}
        <div className="hidden md:flex items-center gap-4" id="nav-auth">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-800 shadow-sm">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className="w-5 h-5 rounded-full object-cover border border-neutral-700"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    {currentUser.username[0]}
                  </div>
                )}
                <span className="text-xs font-semibold text-neutral-200">
                  @{currentUser.username}
                </span>
              </div>

              {(currentUser.role === "admin" ||
                currentUser.role === "ghost") && (
                <Link
                  href="/admin"
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700 transition-colors"
                >
                  Dashboard
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <SpecularButton
              size="lg"
              radius={18}
              tint="#ffffff"
              tintOpacity={0.04}
              textColor="#f5f5f5"
              lineColor="#ffffff"
              baseColor="#000000"
              intensity={1}
              idleIntensity={0.35}
              shineSize={10}
              shineFade={34}
              thickness={1.2}
              glow={1}
              followMouse
              proximity={250}
              onClick={() => router.push("/auth")}
            >
              Get Started
            </SpecularButton>
          )}
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          type="button"
          id="nav-mobile-toggle"
          aria-label="Toggle navigation"
          className="md:hidden flex flex-col gap-1.5 p-1"
          onClick={() => setMobileOpen((p) => !p)}
        >
          <span
            className={`block w-6 h-0.5 bg-white transition-transform duration-300 ${mobileOpen ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            className={`block w-6 h-0.5 bg-white transition-opacity duration-200 ${mobileOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block w-6 h-0.5 bg-white transition-transform duration-300 ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </nav>

      {/* ── Mobile drawer ── */}
      <div
        className={`
          md:hidden overflow-hidden transition-all duration-300
          bg-[rgba(3,7,20,0.95)] backdrop-blur-md
          border-b border-[rgba(255,255,255,0.08)]
          ${mobileOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}
        `}
      >
        <div className="flex flex-col px-6 py-4 gap-4">
          {["Explore", "Shares"].map((label) => (
            <Link
              key={label}
              href={`/${label.toLowerCase()}`}
              className="text-sm font-medium text-white hover:opacity-70 transition-opacity duration-200"
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2">
            {currentUser ? (
              <div className="flex flex-col gap-3 py-2 border-t border-neutral-800">
                <div className="flex items-center gap-2">
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.username}
                      className="w-6 h-6 rounded-full object-cover border border-neutral-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                      {currentUser.username[0]}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-neutral-200">
                    @{currentUser.username}
                  </span>
                </div>
                {(currentUser.role === "admin" ||
                  currentUser.role === "ghost") && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="text-xs text-neutral-300 hover:text-white"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="text-left text-xs text-red-400 hover:text-red-300"
                >
                  Logout
                </button>
              </div>
            ) : (
              <SpecularButton
                size="md"
                radius={14}
                tint="#ffffff"
                tintOpacity={0.04}
                textColor="#f5f5f5"
                lineColor="#ffffff"
                baseColor="#000000"
                intensity={1}
                idleIntensity={0.35}
                shineSize={10}
                shineFade={34}
                thickness={1.2}
                glow={1}
                followMouse
                proximity={250}
                onClick={() => {
                  setMobileOpen(false);
                  router.push("/auth");
                }}
              >
                Get Started
              </SpecularButton>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
