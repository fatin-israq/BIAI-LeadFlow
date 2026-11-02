import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO, differenceInHours } from 'date-fns';
import { EnquiryCategory, PriorityLevel, DetectedLanguage, SourceChannel, PipelineStatus } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes phone numbers (handles BD prefix +880, 880, spacing, dashes, parentheses)
 * Canonical format: 01XXXXXXXXX (11 digits)
 */
export function normalizePhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  const trimmed = rawPhone.trim();
  if (!trimmed) return null;

  // Remove non-digits
  const digits = trimmed.replace(/\D/g, '');

  if (digits.startsWith('880') && digits.length === 13) {
    return '0' + digits.slice(3);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return digits;
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return '0' + digits;
  }
  return digits.length >= 7 ? digits : null;
}

/**
 * Formats date into readable string, e.g. "26 Oct 2026, 09:12 AM"
 */
export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return format(d, 'dd MMM yyyy, hh:mm a');
  } catch {
    return dateStr;
  }
}

/**
 * Returns human-friendly relative time, e.g., "2 hours ago"
 */
export function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

/**
 * Checks if more than 48 hours have elapsed from the given timestamp
 */
export function isOverdue48Hours(dateStr?: string | null, referenceDate = new Date()): boolean {
  if (!dateStr) return false;
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    const hours = differenceInHours(referenceDate, d);
    return hours >= 48;
  } catch {
    return false;
  }
}

/**
 * Calculates hours elapsed from a timestamp
 */
export function getHoursElapsed(dateStr?: string | null, referenceDate = new Date()): number {
  if (!dateStr) return 0;
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return Math.max(0, differenceInHours(referenceDate, d));
  } catch {
    return 0;
  }
}

/**
 * Determines whether an enquiry category should qualify for the 5-stage Sales Pipeline
 * Rule: Only genuine sales/programme enquiries qualify. Spam, job seekers, support, refunds do NOT.
 */
export function isLeadEligibleCategory(category: EnquiryCategory): boolean {
  const salesCategories: EnquiryCategory[] = [
    'sales_enquiry',
    'programme_info',
    'corporate_training',
  ];
  return salesCategories.includes(category);
}

export function getCategoryBadge(category: EnquiryCategory): {
  label: string;
  className: string;
} {
  switch (category) {
    case 'sales_enquiry':
      return { label: 'Sales Enquiry', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'programme_info':
      return { label: 'Programme Info', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'corporate_training':
      return { label: 'Corporate B2B', className: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold' };
    case 'payment_support':
      return { label: 'Payment Support', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'refund_cancellation':
      return { label: 'Refund / Cancel', className: 'bg-rose-50 text-rose-700 border-rose-200 font-medium' };
    case 'general_support':
      return { label: 'Support / Free Event', className: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'job_application':
      return { label: 'Job Application', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'spam':
      return { label: 'Spam / Junk', className: 'bg-slate-100 text-slate-500 border-slate-300' };
    default:
      return { label: 'Other / Review', className: 'bg-gray-100 text-gray-700 border-gray-300' };
  }
}

export function getPriorityBadge(priority: PriorityLevel): {
  label: string;
  className: string;
} {
  switch (priority) {
    case 'high':
      return { label: 'High Priority', className: 'bg-rose-100 text-rose-700 border-rose-200' };
    case 'medium':
      return { label: 'Medium', className: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'low':
      return { label: 'Low', className: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
}

export function getLanguageBadge(lang: DetectedLanguage): {
  label: string;
  className: string;
} {
  switch (lang) {
    case 'bangla':
      return { label: 'Bangla (বাংলা)', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'banglish':
      return { label: 'Banglish', className: 'bg-blue-50 text-blue-800 border-blue-200' };
    case 'english':
      return { label: 'English', className: 'bg-violet-50 text-violet-800 border-violet-200' };
    case 'mixed':
      return { label: 'Mixed', className: 'bg-amber-50 text-amber-800 border-amber-200' };
  }
}

export function getPipelineStatusColor(status: PipelineStatus): {
  bg: string;
  border: string;
  text: string;
  dot: string;
} {
  switch (status) {
    case 'New':
      return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' };
    case 'Contacted':
      return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' };
    case 'Interested':
      return { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' };
    case 'Paid':
      return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    case 'Lost':
      return { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-600', dot: 'bg-slate-400' };
  }
}
