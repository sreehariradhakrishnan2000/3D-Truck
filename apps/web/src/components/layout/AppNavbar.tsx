'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Truck,
  Layers,
  Box,
  LayoutDashboard,
  LogOut,
  User,
  Users,
  Globe,
  Search,
  Bell,
  Grid,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';

export function AppNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { unitSystem, toggleUnitSystem } = useSettingsStore();

  const navItems = [
    { label: 'Home', href: '/dashboard', icon: null },
    { label: 'Transportations', href: '/loads', icon: Truck, isPrimary: true },
    { label: 'Freight Units', href: '/packages', icon: null },
    { label: 'Trucks', href: '/vehicles', icon: null },
    { label: 'Load Planning', href: '/loads', icon: null },
    { label: 'Load Distribution', href: '/dashboard', icon: null },
    { label: 'Info & Rates', href: '/dashboard', icon: null },
    { label: 'Settings', href: '/team', icon: null },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="w-full flex h-16 items-center justify-between px-6">
        {/* Brand & Main Navigation */}
        <div className="flex items-center gap-8">
          {/* Logo matching "Truck&Co" in reference image */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-sm tracking-tighter shadow-sm">
              T
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              Truck&Co
            </span>
          </Link>

          {/* Navigation Pills */}
          <nav className="hidden xl:flex items-center gap-1.5">
            {navItems.map((item, idx) => {
              const isActive =
                item.isPrimary ||
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname?.startsWith(`${item.href}`));

              const Icon = item.icon;

              return (
                <Link
                  key={`${item.label}-${idx}`}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs transition font-medium',
                    isActive
                      ? 'bg-slate-900 text-white font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Icons & User Profile */}
        <div className="flex items-center gap-3">
          {/* Search Icon */}
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition">
            <Search className="h-4 w-4" />
          </button>

          {/* Notification with Red Badge */}
          <button className="relative w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
          </button>

          {/* Grid Layout Icon */}
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition">
            <Grid className="h-4 w-4" />
          </button>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Unit Toggle Button */}
          <button
            onClick={toggleUnitSystem}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-sm"
            title="Toggle Metric / Imperial"
          >
            <Globe className="w-3 h-3 text-purple-600" />
            <span className="capitalize">{unitSystem}</span>
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
            <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[10px]">
              {user?.email ? user.email.slice(0, 1).toUpperCase() : 'U'}
            </div>
            <span className="font-medium text-slate-800 hidden sm:inline">
              {user?.email ? user.email.split('@')[0] : 'Dispatcher'}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Log out"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-red-600 shadow-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
