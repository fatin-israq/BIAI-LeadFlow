import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  UserCheck,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ClockAlert,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  Phone,
  Building,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { DashboardMetrics, Enquiry, Lead } from '../types';
import { storage } from '../services/storageAdapter';
import {
  formatDateTime,
  formatTimeAgo,
  getCategoryBadge,
  getPriorityBadge,
  getPipelineStatusColor,
  isOverdue48Hours,
} from '../lib/utils';
import { EnquiryDetailModal } from '../components/enquiries/EnquiryDetailModal';
import { WeeklySummaryCard } from '../components/dashboard/WeeklySummaryCard';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [allEnquiries, setAllEnquiries] = useState<Enquiry[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [recentEnquiries, setRecentEnquiries] = useState<Enquiry[]>([]);
  const [urgentEnquiries, setUrgentEnquiries] = useState<Enquiry[]>([]);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useRealtimeSync({
    onDataChange: () => {
      loadDashboardData();
    },
  });

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [m, all, leads] = await Promise.all([
        storage.getDashboardMetrics(),
        storage.getEnquiries(),
        storage.getLeads(),
      ]);
      setMetrics(m);
      setAllEnquiries(all);
      setAllLeads(leads);
      setRecentEnquiries(all.slice(0, 7));

      const urgent = all.filter(
        (e) =>
          e.requires_human_review ||
          e.category === 'refund_cancellation' ||
          e.category === 'payment_support'
      );
      setUrgentEnquiries(urgent);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = ['#4F46E5', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  if (isLoading || !metrics) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-28 bg-white rounded-xl border border-navy-200" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-navy-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* SLA Alert Banner if follow-ups are overdue */}
      {metrics.followUpsOverdue > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
              <ClockAlert className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900">
                {metrics.followUpsOverdue} Qualified Leads Breached 48-Hour Follow-Up SLA
              </h4>
              <p className="text-xs text-rose-700">
                Prospective students and corporate training inquiries must receive a response within 48 hours to preserve conversion rates.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/followups')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-lg hover:bg-rose-100 transition-colors shrink-0 cursor-pointer"
          >
            <span>Review Overdue Leads</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-navy-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-navy-500 uppercase tracking-wider">
            Total Inbound
          </span>
          <div className="text-2xl font-bold text-navy-900">{metrics.totalEnquiries}</div>
          <span className="text-[10px] text-navy-400 block">All 5 multi-channels</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-navy-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-brand-600 uppercase tracking-wider">
            Sales Leads
          </span>
          <div className="text-2xl font-bold text-brand-700">{metrics.genuineSalesLeads}</div>
          <span className="text-[10px] text-emerald-600 font-medium block">
            Excludes spam & support
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-navy-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
            New Leads
          </span>
          <div className="text-2xl font-bold text-blue-600">{metrics.leadsByStatus.New}</div>
          <span className="text-[10px] text-navy-400 block">Pending outreach</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-navy-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
            Interested
          </span>
          <div className="text-2xl font-bold text-indigo-600">
            {metrics.leadsByStatus.Interested}
          </div>
          <span className="text-[10px] text-navy-400 block">Active discussions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/90 bg-emerald-50/20 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            Paid / Enrolled
          </span>
          <div className="text-2xl font-bold text-emerald-700">{metrics.leadsByStatus.Paid}</div>
          <span className="text-[10px] text-emerald-600 block">Converted students</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-navy-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Lost Leads
          </span>
          <div className="text-2xl font-bold text-slate-600">{metrics.leadsByStatus.Lost}</div>
          <span className="text-[10px] text-navy-400 block">Closed without deal</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">
            Overdue 48h
          </span>
          <div className="text-2xl font-bold text-rose-600">{metrics.followUpsOverdue}</div>
          <span className="text-[10px] text-rose-500 font-semibold block">SLA action required</span>
        </div>
      </div>

      {/* AI Weekly Executive Summary Digest */}
      <WeeklySummaryCard
        metrics={metrics}
        enquiries={allEnquiries}
        leads={allLeads}
      />

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Enquiries by Channel */}
        <div className="bg-white p-5 rounded-xl border border-navy-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Enquiries by Channel</h3>
              <p className="text-xs text-navy-500">Breakdown across WhatsApp, Messenger, Web & Notes</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-navy-50 text-navy-600 border border-navy-100">
              5 Channels
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.enquiriesBySource} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Leads by Pipeline Stage */}
        <div className="bg-white p-5 rounded-xl border border-navy-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Sales Pipeline Health</h3>
              <p className="text-xs text-navy-500">Distribution across the 5 sales stages</p>
            </div>
            <button
              onClick={() => navigate('/pipeline')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View Kanban</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'New', value: metrics.leadsByStatus.New, color: '#3B82F6' },
                    { name: 'Contacted', value: metrics.leadsByStatus.Contacted, color: '#F59E0B' },
                    { name: 'Interested', value: metrics.leadsByStatus.Interested, color: '#6366F1' },
                    { name: 'Paid', value: metrics.leadsByStatus.Paid, color: '#10B981' },
                    { name: 'Lost', value: metrics.leadsByStatus.Lost, color: '#94A3B8' },
                  ]}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {[
                    '#3B82F6',
                    '#F59E0B',
                    '#6366F1',
                    '#10B981',
                    '#94A3B8',
                  ].map((color, idx) => (
                    <Cell key={idx} fill={color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  itemStyle={{
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-48 space-y-1.5 text-xs">
              {Object.entries(metrics.leadsByStatus).map(([status, count]) => {
                const colors = getPipelineStatusColor(status as any);
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-navy-600">
                      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      {status}
                    </span>
                    <span className="font-semibold text-navy-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart 3: Enquiries by Programme Interest */}
        <div className="bg-white p-5 rounded-xl border border-navy-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Enquiry Programme Interest</h3>
              <p className="text-xs text-navy-500">Bootcamp, Fellowship & Corporate Training demand</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.enquiriesByProgramme} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Volume Over Time */}
        <div className="bg-white p-5 rounded-xl border border-navy-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Enquiry Cadence & Lead Velocity</h3>
              <p className="text-xs text-navy-500">Daily incoming volume (Sample Dataset Timeline)</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.volumeOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line type="monotone" dataKey="enquiries" stroke="#4F46E5" strokeWidth={2.5} name="Total Enquiries" />
                <Line type="monotone" dataKey="leads" stroke="#10B981" strokeWidth={2.5} name="Sales Leads" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Urgent Attention / Support & Escalations List */}
      {urgentEnquiries.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-700">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold text-navy-900">
                High-Priority Support & Escalations ({urgentEnquiries.length})
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              Immediate Team Triage
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {urgentEnquiries.map((enq) => {
              const catBadge = getCategoryBadge(enq.category);
              return (
                <div
                  key={enq.id}
                  onClick={() => {
                    setSelectedEnquiry(enq);
                    setIsModalOpen(true);
                  }}
                  className="p-3.5 rounded-lg border border-rose-100 bg-rose-50/30 hover:bg-rose-50/70 transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-navy-900">
                      {enq.sender_name || 'Anonymous'}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${catBadge.className}`}>
                      {catBadge.label}
                    </span>
                  </div>
                  <p className="text-xs text-navy-700 font-mono truncate">
                    "{enq.original_message}"
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-navy-500 pt-1">
                    <span>via {enq.source_channel}</span>
                    <span className="text-rose-600 font-medium">Requires Human Action</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Enquiries Compact Table */}
      <div className="bg-white rounded-xl border border-navy-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-navy-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-navy-900">Recent Incoming Enquiries</h3>
            <p className="text-xs text-navy-500">Live multi-channel incoming stream</p>
          </div>
          <button
            onClick={() => navigate('/enquiries')}
            className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Open Inbox ({metrics.totalEnquiries})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-navy-50/70 border-b border-navy-200/80 text-navy-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Message Snippet</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Interest</th>
                <th className="py-3 px-4">Received</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {recentEnquiries.map((enq) => {
                const catBadge = getCategoryBadge(enq.category);
                return (
                  <tr
                    key={enq.id}
                    className="hover:bg-navy-50/50 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedEnquiry(enq);
                      setIsModalOpen(true);
                    }}
                  >
                    <td className="py-3 px-4 font-semibold text-navy-900 whitespace-nowrap">
                      {enq.sender_name || (
                        <span className="text-navy-400 font-normal italic">Anonymous</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-navy-700 font-mono">
                      {enq.original_message}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-navy-600">
                      {enq.source_channel}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${catBadge.className}`}>
                        {catBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-navy-700 font-medium">
                      {enq.programme_interest !== 'unknown'
                        ? enq.programme_interest.toUpperCase()
                        : '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-navy-500 text-[11px]">
                      {formatTimeAgo(enq.received_at)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEnquiry(enq);
                          setIsModalOpen(true);
                        }}
                        className="text-brand-600 hover:text-brand-800 font-semibold group-hover:underline cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enquiry Detail Modal */}
      <EnquiryDetailModal
        enquiry={selectedEnquiry}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={loadDashboardData}
        onViewLead={(leadId) => {
          navigate('/pipeline');
        }}
      />
    </div>
  );
};

