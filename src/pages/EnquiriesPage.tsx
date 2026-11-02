import React, { useState, useEffect } from 'react';
import { Enquiry, SourceChannel, DetectedLanguage, EnquiryCategory, PriorityLevel, HandlingStatus } from '../types';
import { storage } from '../services/storageAdapter';
import {
  formatDateTime,
  formatTimeAgo,
  getCategoryBadge,
  getPriorityBadge,
  getLanguageBadge,
} from '../lib/utils';
import {
  Search,
  Filter,
  Plus,
  RotateCcw,
  Phone,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronDown,
  X,
} from 'lucide-react';
import { EnquiryDetailModal } from '../components/enquiries/EnquiryDetailModal';
import { ManualEnquiryModal } from '../components/enquiries/ManualEnquiryModal';

export const EnquiriesPage: React.FC = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  useEffect(() => {
    loadEnquiries();
  }, [search, channelFilter, languageFilter, categoryFilter, priorityFilter, statusFilter]);

  const loadEnquiries = async () => {
    setIsLoading(true);
    try {
      const data = await storage.getEnquiries({
        search: search.trim() || undefined,
        channel: channelFilter !== 'all' ? (channelFilter as SourceChannel) : undefined,
        language: languageFilter !== 'all' ? (languageFilter as DetectedLanguage) : undefined,
        category: categoryFilter !== 'all' ? (categoryFilter as EnquiryCategory) : undefined,
        priority: priorityFilter !== 'all' ? (priorityFilter as PriorityLevel) : undefined,
        handlingStatus: statusFilter !== 'all' ? (statusFilter as HandlingStatus) : undefined,
      });
      setEnquiries(data);
    } catch (err) {
      console.error('Failed to load enquiries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setChannelFilter('all');
    setLanguageFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters =
    search ||
    channelFilter !== 'all' ||
    languageFilter !== 'all' ||
    categoryFilter !== 'all' ||
    priorityFilter !== 'all' ||
    statusFilter !== 'all';

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Search and Action Bar */}
      <div className="bg-white p-5 rounded-xl border border-navy-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-navy-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by sender name, phone number, or message text..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-navy-50/70 border border-navy-200 rounded-lg text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-navy-400 hover:text-navy-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Inbound</span>
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-navy-100 text-xs">
          <div className="flex items-center gap-1 text-navy-500 font-medium mr-1">
            <Filter className="w-3.5 h-3.5 text-navy-400" />
            <span>Filters:</span>
          </div>

          {/* Channel */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-white border border-navy-200 rounded-lg text-navy-700 focus:outline-none"
          >
            <option value="all">All Channels</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Facebook Messenger">Facebook Messenger</option>
            <option value="Facebook comment">Facebook comment</option>
            <option value="Website form">Website form</option>
            <option value="Phone call note">Phone call note</option>
          </select>

          {/* Language */}
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-white border border-navy-200 rounded-lg text-navy-700 focus:outline-none"
          >
            <option value="all">All Languages</option>
            <option value="bangla">Bangla (বাংলা)</option>
            <option value="banglish">Banglish</option>
            <option value="english">English</option>
            <option value="mixed">Mixed</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-white border border-navy-200 rounded-lg text-navy-700 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="sales_enquiry">Sales Enquiry</option>
            <option value="programme_info">Programme Info</option>
            <option value="corporate_training">Corporate Training</option>
            <option value="payment_support">Payment Support</option>
            <option value="refund_cancellation">Refund / Cancellation</option>
            <option value="general_support">General Support / Masterclass</option>
            <option value="job_application">Job Application</option>
            <option value="spam">Spam / Junk</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-white border border-navy-200 rounded-lg text-navy-700 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Handling status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-white border border-navy-200 rounded-lg text-navy-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="unprocessed">Unprocessed</option>
            <option value="processed">Processed</option>
            <option value="escalated">Escalated</option>
            <option value="spam">Spam</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-navy-500 hover:text-navy-800 flex items-center gap-1 px-2 py-1 hover:bg-navy-100 rounded transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}

          <div className="ml-auto text-xs text-navy-500 font-medium">
            Showing <span className="font-bold text-navy-900">{enquiries.length}</span> enquiries
          </div>
        </div>
      </div>

      {/* Main Enquiries Table */}
      <div className="bg-white rounded-xl border border-navy-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-navy-400 animate-pulse">
            Loading enquiries...
          </div>
        ) : enquiries.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm font-semibold text-navy-700">No enquiries found</p>
            <p className="text-xs text-navy-500">
              Try modifying your search keywords or clearing active filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-navy-50/70 border-b border-navy-200/80 text-navy-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Sender / Contact</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Message Snippet</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Interest</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Received Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {enquiries.map((enq) => {
                  const catBadge = getCategoryBadge(enq.category);
                  const priBadge = getPriorityBadge(enq.priority);
                  const langBadge = getLanguageBadge(enq.detected_language);

                  return (
                    <tr
                      key={enq.id}
                      onClick={() => {
                        setSelectedEnquiry(enq);
                        setIsDetailModalOpen(true);
                      }}
                      className="hover:bg-navy-50/50 transition-colors cursor-pointer group"
                    >
                      {/* Sender */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-navy-900">
                          {enq.sender_name || (
                            <span className="text-navy-400 font-normal italic">Anonymous</span>
                          )}
                        </div>
                        {enq.lead_id && (
                          <span className="text-[10px] text-brand-600 font-medium inline-block">
                            Linked to Sales Lead
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-navy-700 font-mono text-[11px]">
                        {enq.phone ? (
                          enq.phone
                        ) : (
                          <span className="text-navy-400 italic">None</span>
                        )}
                      </td>

                      {/* Original Message Preview */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-navy-800 font-mono">
                        {enq.original_message}
                      </td>

                      {/* Channel */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-navy-600">
                        {enq.source_channel}
                      </td>

                      {/* Language */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${langBadge.className}`}>
                          {langBadge.label}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${catBadge.className}`}>
                          {catBadge.label}
                        </span>
                      </td>

                      {/* Programme Interest */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-navy-700 font-medium">
                        {enq.programme_interest !== 'unknown'
                          ? enq.programme_interest.toUpperCase()
                          : '—'}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${priBadge.className}`}>
                          {priBadge.label}
                        </span>
                      </td>

                      {/* Received Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-navy-500 text-[11px]">
                        <div>{formatDateTime(enq.received_at)}</div>
                        <div className="text-[10px] text-navy-400">
                          {formatTimeAgo(enq.received_at)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEnquiry(enq);
                            setIsDetailModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded border border-brand-200 transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <EnquiryDetailModal
        enquiry={selectedEnquiry}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onUpdate={loadEnquiries}
      />

      {/* Manual Entry Modal */}
      <ManualEnquiryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onCreated={loadEnquiries}
      />
    </div>
  );
};

