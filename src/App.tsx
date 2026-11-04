import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { EnquiriesPage } from './pages/EnquiriesPage';
import { PipelinePage } from './pages/PipelinePage';
import { AIIntakePage } from './pages/AIIntakePage';
import { FollowupsPage } from './pages/FollowupsPage';
import { ToastProvider, useToast } from './components/ui/Toast';
import { storage } from './services/storageAdapter';
import { ManualEnquiryModal } from './components/enquiries/ManualEnquiryModal';
import { useRealtimeSync } from './hooks/useRealtimeSync';

const AppContent: React.FC = () => {
  const location = useLocation();
  const { showToast } = useToast();

  const [enquiryCount, setEnquiryCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Sidebar visibility state with localStorage persistence
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('biai_sidebar_open');
      if (saved !== null) {
        return saved === 'true';
      }
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('biai_sidebar_open', String(next));
      } catch (err) {
        console.error('LocalStorage write error:', err);
      }
      return next;
    });
  };

  // Keyboard shortcut (Cmd/Ctrl + B to toggle, Esc to close on small screens)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key === 'Escape' && isSidebarOpen && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  // Close sidebar on navigation when on mobile viewports
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  const refreshCounts = async () => {
    try {
      const metrics = await storage.getDashboardMetrics();
      setEnquiryCount(metrics.totalEnquiries);
      setLeadCount(metrics.genuineSalesLeads);
      setOverdueCount(metrics.followUpsOverdue);
    } catch (err) {
      console.error('Count update error:', err);
    }
  };

  useEffect(() => {
    refreshCounts();
  }, [location.pathname, refreshKey]);

  useRealtimeSync({
    onDataChange: (event) => {
      refreshCounts();
      if (event.action === 'INSERT' && event.table === 'enquiries' && event.record) {
        const sender = event.record.sender_name || 'Prospect';
        const channel = event.record.source_channel || 'Channel';
        showToast(`🔔 Live Inbound: New enquiry from ${sender} via ${channel}`, 'info');
      }
    },
  });

  const handleResetData = () => {
    storage.resetDemoData();
    setRefreshKey((k) => k + 1);
    showToast('Reset sample data to pristine 20 records', 'info');
  };

  const getPageMeta = () => {
    switch (location.pathname) {
      case '/':
        return {
          title: 'Overview Dashboard',
          description:
            'Executive analytics, multi-channel enquiry volume, and 48-hour SLA status',
        };
      case '/enquiries':
        return {
          title: 'Enquiry Inbox',
          description:
            'Unified stream of all incoming messages with language and intent classification',
        };
      case '/pipeline':
        return {
          title: 'Sales Pipeline',
          description:
            '5-stage Kanban board for genuine programme inquiries with contact deduplication',
        };
      case '/ai-intake':
        return {
          title: 'AI Intake Studio',
          description:
            'Multilingual information extraction and safe reply drafting powered by AI',
        };
      case '/followups':
        return {
          title: 'Follow-ups & SLA',
          description:
            'Overdue tasks and outreach reminders enforcing the 48-hour response threshold',
        };
      default:
        return {
          title: 'BIAI LeadFlow',
          description: 'AI-Powered Multilingual CRM',
        };
    }
  };

  const meta = getPageMeta();

  return (
    <div className="flex h-screen bg-navy-50 overflow-hidden font-sans">
      {/* Collapsible sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        enquiryCount={enquiryCount}
        leadCount={leadCount}
        overdueCount={overdueCount}
        onResetData={handleResetData}
      />

      {/* Main content viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header
          title={meta.title}
          description={meta.description}
          overdueCount={overdueCount}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
          onOpenManualEnquiry={() => setIsManualModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage key={refreshKey} />} />
            <Route path="/enquiries" element={<EnquiriesPage key={refreshKey} />} />
            <Route path="/pipeline" element={<PipelinePage key={refreshKey} />} />
            <Route path="/ai-intake" element={<AIIntakePage key={refreshKey} />} />
            <Route path="/followups" element={<FollowupsPage key={refreshKey} />} />
          </Routes>
        </main>
      </div>

      {/* Global Manual Enquiry Dialog */}
      <ManualEnquiryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onCreated={() => {
          setRefreshKey((k) => k + 1);
          refreshCounts();
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ToastProvider>
  );
};

