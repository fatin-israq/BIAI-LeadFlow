import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  Clock,
  Search,
  Bell,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface HeaderProps {
  title: string;
  description?: string;
  onOpenManualEnquiry?: () => void;
  overdueCount?: number;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  description,
  onOpenManualEnquiry,
  overdueCount = 0,
  isSidebarOpen = true,
  onToggleSidebar,
}) => {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-navy-200 sticky top-0 z-20 px-4 sm:px-8 py-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title and description with Sidebar Toggle */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`p-2 rounded-lg border transition-all cursor-pointer shrink-0 ${
                isSidebarOpen
                  ? 'border-navy-200 bg-white text-navy-600 hover:text-navy-900 hover:bg-navy-50'
                  : 'border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100 shadow-2xs'
              }`}
              title={isSidebarOpen ? 'Hide sidebar (Ctrl+B)' : 'Show sidebar (Ctrl+B)'}
              aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeftOpen className="w-5 h-5 text-brand-600" />
              )}
            </button>
          )}

          <div>
            <h1 className="text-xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
              {title}
              {overdueCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  {overdueCount} Overdue Follow-ups
                </span>
              )}
            </h1>
            {description && (
              <p className="text-xs text-navy-600 mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Timezone badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-50 text-navy-600 text-xs font-medium border border-navy-200/60">
            <Clock className="w-3.5 h-3.5 text-navy-400" />
            <span>Asia/Dhaka (GMT+6)</span>
          </div>

          {onOpenManualEnquiry && (
            <button
              onClick={onOpenManualEnquiry}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-navy-700 bg-white border border-navy-200 hover:bg-navy-50 hover:text-navy-900 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-navy-500" />
              <span>Add Enquiry</span>
            </button>
          )}

          <button
            onClick={() => navigate('/ai-intake')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-brand-200" />
            <span>AI Intake Studio</span>
          </button>
        </div>
      </div>
    </header>
  );
};

