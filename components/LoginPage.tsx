"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, KeyRound, ArrowRight, AlertCircle } from "lucide-react";
import { loginJson } from "@/lib/api";

type Props = {
  onSuccess: (accessToken: string) => void;
};

export default function LoginPage({ onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("homework_login_email");
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const normalized = email.trim().toLowerCase();
      const { access_token } = await loginJson(normalized, password);
      if (rememberMe) {
        localStorage.setItem("homework_login_email", normalized);
      } else {
        localStorage.removeItem("homework_login_email");
      }
      onSuccess(access_token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid email or password";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030304] flex selection:bg-violet-500/30 overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden border-r border-zinc-800/80 bg-[#09090c]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(124, 58, 237, 0.25), transparent 55%), radial-gradient(ellipse 60% 50% at 70% 60%, rgba(167, 139, 250, 0.12), transparent 50%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 flex flex-col items-center text-center max-w-[320px] px-8"
        >
          <img src="/logo.png" alt="" className="h-40 w-auto object-contain mb-6 opacity-95" />
          <p className="text-zinc-500 text-sm font-medium leading-relaxed">
            Next Best Action intelligence for your CRM pipeline.
          </p>
        </motion.div>
        <div className="absolute top-0 right-0 w-32 h-32 border-t border-r border-zinc-800/90 m-8 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 border-b border-l border-zinc-800/90 m-8 pointer-events-none" />
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-16 lg:px-28 relative">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px] mx-auto"
        >
          <div className="lg:hidden mb-10 flex justify-center">
            <img src="/logo.png" alt="" className="h-20 w-auto object-contain" />
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-space)] font-extrabold text-white mb-3 tracking-tight">
              Welcome <span className="text-violet-400 lowercase font-medium">back.</span>
            </h2>
            <p className="text-zinc-500 text-sm font-medium">Sign in to open your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-zinc-500 text-[12px] font-semibold tracking-wide block">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-colors group-focus-within:text-violet-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-0 border-b border-zinc-800 rounded-none pl-8 h-12 text-sm focus:ring-0 focus:border-violet-500 transition-all placeholder:text-zinc-800 text-white outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-zinc-500 text-[12px] font-semibold tracking-wide block">
                Password
              </label>
              <div className="relative group">
                <KeyRound className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-colors group-focus-within:text-violet-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-0 border-b border-zinc-800 rounded-none pl-8 h-12 text-sm focus:ring-0 focus:border-violet-500 transition-all placeholder:text-zinc-800 text-white outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  className="peer h-4 w-4 shrink-0 rounded-sm border border-zinc-800 bg-transparent focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-500/40 appearance-none cursor-pointer checked:bg-violet-600 checked:border-violet-600 transition-all"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <svg
                  className="absolute left-0 top-0 hidden h-4 w-4 text-white peer-checked:block pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <label
                htmlFor="remember"
                className="text-xs font-medium text-zinc-500 cursor-pointer select-none hover:text-zinc-400 transition-colors"
              >
                Remember me
              </label>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-3"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-full h-12 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
