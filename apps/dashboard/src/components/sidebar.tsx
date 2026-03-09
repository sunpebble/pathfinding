'use client';

import {
  BookOpen,
  Bot,
  Bug,
  Database,
  LayoutDashboard,
  ListTodo,
  MapPin,
  Menu,
  PlusCircle,
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
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'AI 助手', href: '/chat', icon: Bot },
  { name: 'Crawl Jobs', href: '/jobs', icon: ListTodo },
  { name: 'POIs', href: '/pois', icon: MapPin },
  { name: 'Travel Guides', href: '/guides', icon: BookOpen },
  { name: 'Itineraries', href: '/itineraries', icon: Route },
  { name: '费用分摊', href: '/expenses', icon: Receipt },
  { name: 'Training Datasets', href: '/datasets', icon: Database },
  { name: 'Create Job', href: '/jobs/create', icon: PlusCircle },
];

const secondaryNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6">
        <Bug className="h-8 w-8 text-emerald-500" />
        <span className="text-xl font-bold text-white">Crawler</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive
            = pathname === item.href
              || (item.href !== '/' && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t border-gray-800 px-3 py-4">
        {secondaryNavigation.map(item => (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <item.icon className="h-5 w-5" />
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
        className="fixed left-4 top-4 z-40 rounded-lg bg-gray-900 p-2 text-gray-400 hover:text-white lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          {/* Sidebar panel */}
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-gray-900">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden w-64 flex-col bg-gray-900 lg:flex">
        <SidebarContent />
      </div>
    </>
  );
}
