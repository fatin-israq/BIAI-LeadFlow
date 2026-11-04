import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  KanbanSquare,
  Sparkles,
  ClockAlert,
  RotateCcw,
  CheckCircle2,
  Database,
  ExternalLink,
  PanelLeftClose,
} from 'lucide-react';
import { storage } from '../../services/storageAdapter';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  enquiryCount: number;
  leadCount: number;
  overdueCount: number;
  onResetData: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  enquiryCount,
  leadCount,
  overdueCount,
  onResetData,
}) => {
  const isDemo = storage.isUsingDemo();

  const navItems = [
    {
      to: '/',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/enquiries',
      label: 'Enquiry Inbox',
      icon: Inbox,
      badge: enquiryCount > 0 ? enquiryCount : null,
      badgeColor: 'bg-navy-100 text-navy-700',
    },
    {
      to: '/pipeline',
      label: 'Sales Pipeline',
      icon: KanbanSquare,
      badge: leadCount > 0 ? leadCount : null,
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      to: '/ai-intake',
      label: 'AI Intake Studio',
      icon: Sparkles,
      badge: 'AI',
      badgeColor: 'bg-brand-100 text-brand-700 font-bold',
      highlight: true,
    },
    {
      to: '/followups',
      label: 'Follow-ups & SLA',
      icon: ClockAlert,
      badge: overdueCount > 0 ? `${overdueCount} Overdue` : null,
      badgeColor: 'bg-rose-100 text-rose-700 font-semibold',
    },
  ];

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-navy-950/40 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-300"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Main sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 lg:static lg:z-auto bg-white border-r border-navy-200 flex flex-col h-screen select-none shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen
            ? 'w-64 translate-x-0 opacity-100 shadow-xl lg:shadow-none'
            : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0 opacity-0 border-r-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="w-64 flex flex-col h-full shrink-0">
          {/* Brand Header */}
          <div className="p-4 sm:p-5 border-b border-navy-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-sm font-bold text-lg tracking-wider">
                B
              </div>
              <div>
                <div className="font-bold text-navy-900 tracking-tight flex items-center gap-1.5">
                  <span>BIAI</span>
                  <span className="text-brand-600 font-semibold">LeadFlow</span>
                </div>
                <p className="text-[11px] text-navy-600 font-medium tracking-wide">
                  AI Multilingual CRM
                </p>
              </div>
            </div>

            {/* Hide sidebar toggle button */}
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-100 transition-colors cursor-pointer"
              title="Hide sidebar menu (Ctrl+B)"
              aria-label="Hide sidebar menu"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Navigation */}
          <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
            <div className="px-3 py-2 text-[11px] font-semibold text-navy-600 uppercase tracking-wider">
              Main Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
                        : 'text-navy-600 hover:text-navy-900 hover:bg-navy-50'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 ${
                        item.highlight ? 'text-brand-600' : 'text-current'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${item.badgeColor || 'bg-navy-100 text-navy-700'}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* System Status & Data Layer */}
          <div className="p-4 border-t border-navy-100 bg-navy-50/50 space-y-3">
            <div className="bg-white p-3 rounded-lg border border-navy-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-navy-500 font-medium flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-brand-600" />
                  Data Source
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isDemo
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isDemo ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                  {isDemo ? 'Demo Mode (Local)' : 'Supabase Live'}
                </span>
              </div>
              <p className="text-[11px] text-navy-600 mt-1.5 leading-relaxed">
                {isDemo
                  ? 'Persisting sample data and state in browser localStorage.'
                  : 'Connected to Supabase PostgreSQL workspace.'}
              </p>
              <div className="mt-2 pt-2 border-t border-navy-100 flex items-center justify-between text-[10px] text-emerald-700 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Real-time Sync Active
                </span>
                <span className="text-navy-400 font-mono text-[9px] uppercase">
                  {isDemo ? 'Broadcast' : 'WebSocket'}
                </span>
              </div>
            </div>

            {isDemo && (
              <button
                onClick={onResetData}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-navy-700 bg-white border border-navy-200 hover:bg-navy-100 rounded-lg transition-colors cursor-pointer"
                title="Reloads the pristine 20 sample enquiries and demo state"
              >
                <RotateCcw className="w-3.5 h-3.5 text-navy-500" />
                Reset Sample Data (20 rows)
              </button>
            )}

            {/* User Info */}
            <div className="pt-2 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-xs border border-brand-200">
                BI
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-navy-800 truncate">
                  BIAI Admissions Team
                </p>
                <p className="text-[10px] text-navy-500 truncate">
                  Dhaka, Bangladesh (+06)
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

