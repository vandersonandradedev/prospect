'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Building2,
  Kanban,
  Clock,
  Sparkles,
  BarChart3,
  Settings,
  ShieldAlert,
  Radio,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/busca', label: 'Nova Pesquisa', icon: Search },
  { href: '/leads', label: 'Base de Leads', icon: Building2 },
  { href: '/crm', label: 'CRM Kanban', icon: Kanban },
  { href: '/jobs', label: 'Trabalhos de Coleta', icon: Radio },
  { href: '/agenda', label: 'Histórico & Agenda', icon: Clock },
  { href: '/ai', label: 'Assistente IA', icon: Sparkles },
  { href: '/relatorios', label: 'Relatórios do Funil', icon: BarChart3 },
  { href: '/configuracoes', label: 'Fontes & LGPD', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-sky-500/20 ring-1 ring-sky-500/30 group-hover:scale-105 transition-transform bg-slate-800">
            <Image
              src="/logo.png"
              alt="Vision Solutions Logo"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight text-white tracking-tight group-hover:text-sky-300 transition-colors">
              Vision Solutions
            </h1>
            <p className="text-xs text-sky-400 font-medium">LeadHunter B2B</p>
          </div>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* LGPD Compliance Footer Badge */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Conformidade LGPD Ativa</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Somente dados reais de fontes públicas autorizadas.
        </p>
      </div>
    </aside>
  );
}
