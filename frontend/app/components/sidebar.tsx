'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  FileUp,
  ClipboardList,
  CheckSquare,
  Pin,
  PinOff,
  Sparkles,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

type SidebarMode = 'hover' | 'fixed';

// ─── Navigation Config ────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',        href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Upload & Evaluate', href: '/evaluate',    icon: FileUp          },
  { label: 'Evaluation List',  href: '/list',         icon: ClipboardList   },
  { label: 'Human Review',     href: '/humanreview',  icon: CheckSquare     },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const [mode, setMode] = useState<SidebarMode>('hover');
  const [isHovered, setIsHovered] = useState(false);

  // Sidebar is "open" when fixed OR when hovered in hover-mode
  const isOpen = mode === 'fixed' || isHovered;

  const toggleMode = () => setMode((m) => (m === 'hover' ? 'fixed' : 'hover'));

  return (
    <aside
      onMouseEnter={() => mode === 'hover' && setIsHovered(true)}
      onMouseLeave={() => mode === 'hover' && setIsHovered(false)}
      className={[
        // Base layout
        'relative flex flex-col h-screen shrink-0',
        'transition-[width] duration-300 ease-in-out overflow-hidden',
        // Width toggle
        isOpen ? 'w-56' : 'w-[68px]',
        // Colors — Navy bg, cream text
        'bg-[#1A2F5E] text-[#F5F5F0]',
        // Soft right border
        'border-r border-[#243d76]',
      ].join(' ')}
      style={{ borderRadius: '0 1.5rem 1.5rem 0' }}
    >
      {/* ── Logo / Brand ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-6 shrink-0">
        {/* Logo circle */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#F5F5F0] shadow-md">
          <Sparkles className="h-5 w-5 text-[#1A2F5E]" />
        </div>

        {/* Brand name — slides in */}
        <span
          className={[
            'font-bold text-lg tracking-tight whitespace-nowrap',
            'transition-[opacity,transform] duration-300',
            isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none',
          ].join(' ')}
        >
          AI Auditor
        </span>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 flex flex-col gap-1 px-3 pt-2">
        {/* Section label */}
        <p
          className={[
            'text-[10px] font-semibold uppercase tracking-widest text-[#F5F5F0]/40 pl-2 pb-1',
            'transition-[opacity] duration-200',
            isOpen ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          Main Menu
        </p>

        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 rounded-xl px-3 py-2.5',
                'transition-all duration-200 group relative',
                active
                  ? 'bg-[#F5F5F0] text-[#1A2F5E] font-semibold shadow-sm'
                  : 'text-[#F5F5F0]/70 hover:bg-white/10 hover:text-[#F5F5F0]',
              ].join(' ')}
            >
              {/* Icon */}
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 1.8} />

              {/* Label */}
              <span
                className={[
                  'text-sm whitespace-nowrap',
                  'transition-[opacity,transform] duration-300',
                  isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none',
                ].join(' ')}
              >
                {label}
              </span>

              {/* Tooltip when collapsed */}
              {!isOpen && (
                <span className="absolute left-full ml-3 hidden group-hover:flex items-center whitespace-nowrap rounded-lg bg-[#1A2F5E] border border-[#243d76] px-2.5 py-1.5 text-xs font-medium text-[#F5F5F0] shadow-lg z-50">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Mode Toggle ───────────────────────────────────────────────── */}
      <div 
        className={[
          'px-3 py-4 shrink-0 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        ].join(' ')}
      >
        <div
          className={[
            'flex items-center overflow-hidden rounded-xl',
            'bg-white/5 border border-white/10',
            'gap-0',
          ].join(' ')}
        >
          {/* Hover Mode Button */}
          <button
            onClick={() => setMode('hover')}
            title="Hover Mode"
            className={[
              'flex flex-1 items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl',
              'transition-all duration-200',
              mode === 'hover'
                ? 'bg-[#F5F5F0] text-[#1A2F5E]'
                : 'text-[#F5F5F0]/50 hover:text-[#F5F5F0]',
            ].join(' ')}
          >
            <PinOff className="h-3.5 w-3.5 shrink-0" />
            <span
              className={[
                'whitespace-nowrap transition-[opacity,width] duration-300 overflow-hidden',
                isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0',
              ].join(' ')}
            >
              Hover
            </span>
          </button>

          {/* Fixed Mode Button */}
          <button
            onClick={() => setMode('fixed')}
            title="Fixed Mode"
            className={[
              'flex flex-1 items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl',
              'transition-all duration-200',
              mode === 'fixed'
                ? 'bg-[#F5F5F0] text-[#1A2F5E]'
                : 'text-[#F5F5F0]/50 hover:text-[#F5F5F0]',
            ].join(' ')}
          >
            <Pin className="h-3.5 w-3.5 shrink-0" />
            <span
              className={[
                'whitespace-nowrap transition-[opacity,width] duration-300 overflow-hidden',
                isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0',
              ].join(' ')}
            >
              Fixed
            </span>
          </button>
        </div>
      </div>

      {/* ── Footer / Engine badge ─────────────────────────────────────── */}
      <div
        className={[
          'px-4 pb-5 text-[10px] font-medium text-[#F5F5F0]/30 text-center',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        Powered by&nbsp;<span className="text-[#F5F5F0]/60">Typhoon 2.1</span>
      </div>
    </aside>
  );
}
