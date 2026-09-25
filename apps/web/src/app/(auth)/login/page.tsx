'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Truck, ArrowRight, Lock, Mail, Globe, Settings, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { envConfig } from '@/lib/config';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [savedUrlSuccess, setSavedUrlSuccess] = useState(false);

  useEffect(() => {
    setApiUrl(envConfig.apiUrl);
  }, []);

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    envConfig.setApiUrl(apiUrl);
    setSavedUrlSuccess(true);
    setTimeout(() => setSavedUrlSuccess(false), 2000);
  };

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
      if (msg.includes('Failed to fetch') || msg.includes('not configured') || msg.includes('NetworkError') || msg.includes('CORS')) {
        setError(
          `Cannot reach API server at "${envConfig.apiUrl || 'unconfigured'}". Please verify your Cloudflare Tunnel or backend URL.`
        );
      } else {
        setError(msg);
      }
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
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 leading-relaxed">
              {error}
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

          {/* API Server Endpoint Settings */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium truncate max-w-[260px]">
                <Globe className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                API: {apiUrl ? apiUrl : 'Not configured'}
              </span>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-blue-600 hover:underline flex items-center gap-1 shrink-0 ml-2"
              >
                <Settings className="h-3 w-3" />
                {showConfig ? 'Hide' : 'Change'}
              </button>
            </div>

            {showConfig && (
              <form onSubmit={handleSaveApiUrl} className="mt-3 flex gap-2">
                <input
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/api"
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                >
                  {savedUrlSuccess ? <Check className="h-3.5 w-3.5" /> : 'Save'}
                </button>
              </form>
            )}
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
