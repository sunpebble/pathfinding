'use client';

import {
  Bot,
  LayoutDashboard,
  Menu,
  Receipt,
  Route,
  Settings,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: '总览', href: '/overview', icon: LayoutDashboard },
  { name: 'AI 助手', href: '/chat', icon: Bot },
  { name: '行程计划', href: '/itineraries', icon: Route },
  { name: '费用分摊', href: '/expenses', icon: Receipt },
];

const secondaryNavigation = [
  { name: '设置', href: '/settings', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7B733] text-[#232733] ring-1 ring-[#F7B733]/40">
          <Route className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <span className="block text-xl font-semibold tracking-tight text-white">Sunpebble Trips</span>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Small, polished apps.</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 py-3">
        {navigation.map((item) => {
          const isActive
            = pathname === item.href
              || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all focus-explorer',
                isActive
                  ? 'bg-amber-400/15 text-white ring-1 ring-amber-300/20 shadow-sm shadow-stone-950/20'
                  : 'text-stone-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon className={cn('h-5 w-5 transition-colors', isActive ? 'text-amber-300' : 'text-stone-500 group-hover:text-stone-300')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t border-white/10 px-3 py-4">
        {secondaryNavigation.map(item => (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-400 transition-all hover:bg-white/5 hover:text-white focus-explorer"
          >
            <item.icon className="h-5 w-5 text-stone-500 transition-colors group-hover:text-stone-300" />
            {item.name}
          </Link>
        ))}
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl bg-stone-950/95 p-2 text-stone-300 shadow-lg ring-1 ring-white/10 transition-colors hover:text-white lg:hidden"
        aria-label="打开菜单"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="关闭菜单"
          />
          {/* Sidebar panel */}
          <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-stone-950 shadow-2xl ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 rounded-xl p-1 text-stone-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="关闭菜单"
            >
              <X className="h-6 w-6" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden w-72 flex-col bg-stone-950 shadow-2xl shadow-stone-950/10 ring-1 ring-white/10 lg:flex">
        <SidebarContent />
      </div>
    </>
  );
}
