'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/apprenants', label: 'Apprenants', icon: Users },
  { href: '/a-valider', label: 'À valider', icon: CheckCircle },
  { href: '/anomalies', label: 'Anomalies', icon: AlertTriangle },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/settings', label: 'Paramètres', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`flex flex-col border-r border-line bg-bg-1 transition-[width] duration-200 ease-out shrink-0 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      <div
        className={`h-14 flex items-center border-b border-line px-3 ${
          collapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {!collapsed && (
          <span className="font-serif italic text-amber text-base tracking-wide">
            MARIANNE
          </span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Ouvrir le menu' : 'Fermer le menu'}
          className="p-1 text-text-2 hover:text-text-0 hover:bg-bg-2 rounded transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 mx-1.5 my-0.5 px-2.5 py-2 rounded text-sm transition-colors ${
                active
                  ? 'bg-bg-3 text-amber'
                  : 'text-text-1 hover:bg-bg-2 hover:text-text-0'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line px-3 py-2 text-[10px] text-text-3 font-mono">
        {!collapsed ? 'v0.1 · POSTE CLIENT' : 'v0.1'}
      </div>
    </aside>
  );
}
