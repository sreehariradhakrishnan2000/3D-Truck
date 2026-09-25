'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Truck, ArrowRight, Lock, Mail, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.post<{ accessToken: string }>('/auth/login', {
        email,
        password,
      });
      login(data.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.message || 'Invalid email or password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword(roleEmail.startsWith('admin') ? 'Admin123!' : roleEmail.startsWith('planner') ? 'Planner123!' : 'Driver123!');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-apple-md shadow-blue-500/20">
            <Truck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">CargoFlow</h1>
          <p className="mt-1 text-sm text-slate-500">Real-time 3D Truck & Trailer Load Planning</p>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-apple-lg">
          <h2 className="text-lg font-semibold text-slate-900">Sign in to your account</h2>
          <p className="mt-1 text-xs text-slate-500">Enter your credentials to access the load planning workspace</p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-600 leading-relaxed shadow-sm">
              <div className="font-semibold flex items-center gap-1.5 text-red-700">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{error.includes('NEXT_PUBLIC_API_URL') ? 'Backend Endpoint Required' : 'Authentication Error'}</span>
              </div>
              <p className="mt-1 text-red-600">{error}</p>
              {error.includes('NEXT_PUBLIC_API_URL') && (
                <div className="mt-2.5 pt-2 border-t border-red-200/80 text-[11px] text-slate-700 space-y-1.5">
                  <p className="font-semibold text-slate-800">To connect your backend:</p>
                  <p>1. <strong>Quick Tunnel (Free Preview):</strong> Run <code className="bg-red-100/80 text-red-900 px-1 py-0.5 rounded font-mono text-[10px]">npm run tunnel:api</code> on your server.</p>
                  <p>2. <strong>Cloudflare Workers:</strong> In Cloudflare Dashboard → <code className="bg-red-100/80 text-red-900 px-1 py-0.5 rounded font-mono text-[10px]">3d-truck</code> → <strong>Settings</strong> → <strong>Variables and Secrets</strong>, add variable <code className="bg-red-100/80 text-red-900 px-1 py-0.5 rounded font-mono text-[10px]">NEXT_PUBLIC_API_URL</code>.</p>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">Email Address</label>
              <div className="relative mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cargoflow.demo"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 pl-10 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                />
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Password</label>
              <div className="relative mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 pl-10 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                />
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-center text-xs font-medium text-slate-400">Or sign in with a demo account</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin@cargoflow.demo')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('planner@cargoflow.demo')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Planner
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('driver@cargoflow.demo')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Driver
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Need an organization account?{' '}
          <Link href="/register" className="font-semibold text-blue-600 hover:underline">
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
}
