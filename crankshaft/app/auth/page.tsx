"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Phone,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";

import {
  validateIndianPhone,
  validateLoginIdentifier,
  validatePassword,
  validateUsername,
} from "@/lib/validation";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "login" ? "login" : "signup";

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [username, setUsername] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, setIsGooglePending] = useState(false);

  // Format phone digits input strictly to numeric 10 digits
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length <= 10) {
      setPhoneDigits(raw);
      setError(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccess(null);
    setIsGooglePending(true);

    try {
      const { signInWithPopup } = await import("firebase/auth");
      const { auth, googleProvider } = await import("@/lib/firebase");

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const payload = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };

      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Google authentication failed on server.");
        setIsGooglePending(false);
        return;
      }

      setSuccess(`Signed in as @${data.user?.username || "collector"}!`);
      const redirectUrl = searchParams.get("redirect") || "/";
      setTimeout(() => {
        router.push(redirectUrl);
      }, 900);
    } catch (err: any) {
      console.error("[GOOGLE_AUTH_ERROR]", err);
      if (
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request"
      ) {
        setIsGooglePending(false);
        return;
      }
      if (err?.code === "auth/configuration-not-found") {
        setError(
          "Google Sign-In is not enabled yet in your Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method, click Google, and enable it.",
        );
      } else if (err?.code === "auth/unauthorized-domain") {
        setError(
          "Domain not authorized in Firebase Console. Please add localhost / your domain to Firebase Auth authorized domains.",
        );
      } else if (err?.code === "auth/popup-blocked") {
        setError(
          "Pop-up blocked by your browser. Please allow pop-ups for this site and try again.",
        );
      } else {
        setError(err?.message || "Failed to sign in with Google.");
      }
      setIsGooglePending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client side validation
    if (mode === "signup") {
      const usernameVal = validateUsername(username);
      if (!usernameVal.isValid) {
        setError(usernameVal.error || "Please choose a valid username.");
        return;
      }

      const phoneVal = validateIndianPhone(phoneDigits);
      if (!phoneVal.isValid) {
        setError(
          phoneVal.error ||
            "Please enter a valid 10-digit Indian phone number.",
        );
        return;
      }

      const passwordVal = validatePassword(password);
      if (!passwordVal.isValid) {
        setError(passwordVal.error || "Please choose a stronger password.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match. Please re-enter.");
        return;
      }
    } else {
      const loginIdVal = validateLoginIdentifier(username);
      if (!loginIdVal.isValid) {
        setError(
          loginIdVal.error ||
            "Please enter your username or registered phone number.",
        );
        return;
      }

      if (!password) {
        setError("Please enter your password.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const endpoint =
          mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
        const payload =
          mode === "signup"
            ? {
                username: username.trim(),
                phone: `+91${phoneDigits}`,
                password,
              }
            : {
                username: username.trim(),
                password,
              };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "An error occurred. Please try again.");
          return;
        }

        if (mode === "signup") {
          setSuccess("Account successfully created! You can now log in.");
          setTimeout(() => {
            setMode("login");
            setConfirmPassword("");
            setSuccess(null);
          }, 1500);
        } else {
          setSuccess(`Welcome back, ${data.user?.username || username}!`);
          setTimeout(() => {
            router.push("/");
          }, 1200);
        }
      } catch (err: unknown) {
        console.error(err);
        setError("Network or server connection failed. Please try again.");
      }
    });
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div
        className="
          relative rounded-2xl
          bg-black
          border border-neutral-800
          shadow-[0_12px_48px_rgba(0,0,0,0.8)]
          p-7 sm:p-9 text-white
        "
      >
        {/* Top Back Link & Badge */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-900 text-neutral-300 border border-neutral-800">
            <Image
              src="/images/Crankshaft.png"
              alt="CrankShaft"
              width={14}
              height={14}
              className="w-3.5 h-3.5 object-contain"
            />
            <span>CrankShaft Account</span>
          </span>
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 p-2 flex items-center justify-center mb-3 shadow-lg">
            <Image
              src="/images/Crankshaft.png"
              alt="CrankShaft Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {mode === "signup" ? "Get Started" : "Welcome Back"}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-neutral-400">
            {mode === "signup"
              ? "Create your account to start collecting & trading."
              : "Sign in with your registered username or phone."}
          </p>
        </div>

        {/* Tab Switcher (Minimalist Black & White) */}
        <div className="grid grid-cols-2 p-1 mb-6 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setSuccess(null);
              setConfirmPassword("");
            }}
            className={`
              py-2.5 rounded-lg transition-all duration-150
              ${
                mode === "signup"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }
            `}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setSuccess(null);
              setConfirmPassword("");
            }}
            className={`
              py-2.5 rounded-lg transition-all duration-150
              ${
                mode === "login"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }
            `}
          >
            Log In
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs leading-relaxed animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-neutral-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-neutral-900 border border-white/20 text-white text-xs leading-relaxed animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-white" />
            <span>{success}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        <div className="space-y-4 mb-5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGooglePending || isPending}
            className="
              w-full py-2.5 px-4 rounded-xl
              bg-neutral-900 hover:bg-neutral-850
              border border-neutral-700/80 hover:border-neutral-500
              text-white text-sm font-semibold
              flex items-center justify-center gap-3
              transition-all duration-150 active:scale-[0.99]
              shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
              cursor-pointer select-none group
            "
          >
            {isGooglePending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Connecting Google...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>
                  {mode === "signup"
                    ? "Sign up with Google"
                    : "Continue with Google"}
                </span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="w-full border-t border-neutral-800" />
            <span className="absolute px-3 bg-black text-[11px] uppercase tracking-wider font-medium text-neutral-500">
              or
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={
                  mode === "signup"
                    ? "Choose a username (e.g. ayaansyed)"
                    : "Username or Phone (+91)"
                }
                className="
                  w-full pl-10 pr-3.5 py-2.5 rounded-xl
                  bg-black text-sm text-white placeholder-neutral-500
                  border border-neutral-800
                  focus:border-white focus:ring-1 focus:ring-white
                  outline-none transition-all
                "
              />
            </div>
            {mode === "signup" ? (
              username.includes("@") || /@gmail\.com$/i.test(username) ? (
                <p className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Email addresses (including Gmail) cannot be used as
                    username. Please choose an alphanumeric handle.
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-neutral-500">
                  3–30 characters • Letters, numbers, _ and - • No emails
                </p>
              )
            ) : username.includes("@") || /@gmail\.com$/i.test(username) ? (
              <p className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Email entered. Please sign in using your username or phone
                  number (or use Google Sign-In).
                </span>
              </p>
            ) : null}
          </div>

          {/* Phone Number Field (Visible on Sign Up, with +91 badge) */}
          {mode === "signup" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Phone Number
                </label>
                <span className="text-[11px] text-neutral-400">
                  {phoneDigits.length === 10 ? (
                    <span className="text-white font-medium">
                      ✓ 10 digits entered
                    </span>
                  ) : (
                    <span>{phoneDigits.length} / 10 digits</span>
                  )}
                </span>
              </div>
              <div className="relative flex rounded-xl border border-neutral-800 bg-black overflow-hidden focus-within:border-white focus-within:ring-1 focus-within:ring-white transition-all">
                {/* Fixed +91 Badge */}
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-neutral-900 border-r border-neutral-800 text-neutral-400 select-none">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-xs font-semibold text-white tracking-wider">
                    +91
                  </span>
                </div>
                {/* 10-digit Input */}
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                  value={phoneDigits}
                  onChange={handlePhoneChange}
                  placeholder="9876543210"
                  className="
                    w-full px-3.5 py-2.5
                    bg-transparent text-sm text-white placeholder-neutral-500
                    outline-none tracking-wider font-mono
                  "
                />
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                10-digit Indian mobile number (starts with 6, 7, 8, or 9)
              </p>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={
                  mode === "signup"
                    ? "Create a password (min. 8 chars)"
                    : "Enter your password"
                }
                className="
                  w-full pl-10 pr-10 py-2.5 rounded-xl
                  bg-black text-sm text-white placeholder-neutral-500
                  border border-neutral-800
                  focus:border-white focus:ring-1 focus:ring-white
                  outline-none transition-all
                "
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {mode === "signup" && (
              <p className="mt-1 text-[11px] text-neutral-500">
                Minimum 8 characters with letters & numbers
              </p>
            )}
          </div>

          {/* Confirm Password Field (Visible on Sign Up) */}
          {mode === "signup" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Confirm Password
                </label>
                {confirmPassword.length > 0 && (
                  <span className="text-[11px]">
                    {confirmPassword === password ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-neutral-400">
                        Passwords do not match yet
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Re-enter your password"
                  className="
                    w-full pl-10 pr-10 py-2.5 rounded-xl
                    bg-black text-sm text-white placeholder-neutral-500
                    border border-neutral-800
                    focus:border-white focus:ring-1 focus:ring-white
                    outline-none transition-all
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button (Clean Solid White with Black Text) */}
          <button
            type="submit"
            disabled={isPending}
            className="
              w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm
              bg-white text-black
              hover:bg-neutral-200
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2
              transition-all duration-150 active:scale-[0.99]
            "
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>
                  {mode === "signup" ? "Creating Account..." : "Signing In..."}
                </span>
              </>
            ) : (
              <span>{mode === "signup" ? "Create Account" : "Sign In"}</span>
            )}
          </button>
        </form>

        {/* Footer switcher */}
        <div className="mt-6 text-center text-xs text-neutral-400">
          {mode === "signup" ? (
            <p>
              Already registered?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setSuccess(null);
                  setConfirmPassword("");
                }}
                className="font-semibold text-white hover:underline cursor-pointer"
              >
                Log In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account yet?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setSuccess(null);
                  setConfirmPassword("");
                }}
                className="font-semibold text-white hover:underline cursor-pointer"
              >
                Sign Up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-16 bg-[#030714] overflow-hidden">
      {/* Background ambient lighting (Blue-Black page background preserved) */}
      <div
        aria-hidden
        className="
          pointer-events-none fixed inset-0
          [background:radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,90,200,0.32)_0%,transparent_70%),
                      radial-gradient(ellipse_70%_50%_at_50%_110%,rgba(0,180,255,0.18)_0%,transparent_65%)]
        "
      />

      <Suspense
        fallback={
          <div className="flex items-center justify-center text-neutral-400 text-sm gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span>Loading...</span>
          </div>
        }
      >
        <AuthForm />
      </Suspense>
    </main>
  );
}
