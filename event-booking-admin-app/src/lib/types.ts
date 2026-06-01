/**
 * Domain types shared with the Next.js web app. Mirror of
 * `src/types/index.ts` in event-booking-next-app — keep in sync.
 */

export type BookingStatus =
  | "PENDING"
  | "QUOTATION_SENT"
  | "QUOTATION_FINALIZED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLATION_REQUESTED"
  | "DATE_CHANGE_REQUESTED"
  | "CONFLICTED"
  | "CANCELLED";

export type QuotationStatus = "DRAFT" | "SENT" | "FINALIZED";
export type CommentSender = "ADMIN" | "CUSTOMER";

export interface BookingComment {
  id: string;
  message: string;
  sender: CommentSender;
  createdAt: string;
}

export interface QuotationItemData {
  id?: string;
  particular: string;
  quantity?: number | null;
  unit?: string | null;
  rate?: number | null;
  amount?: number | null;
  order: number;
}

export interface QuotationData {
  id: string;
  status: QuotationStatus;
  totalAmount: number;
  advanceAmount: number;
  notes: string | null;
  items: QuotationItemData[];
  createdAt: string;
  updatedAt: string;
  finalizedAt: string | null;
}

export interface BookingRecord {
  id: string;
  bookingId: string;
  name: string;
  phone: string;
  email: string | null;
  date: string;
  eventType: string;
  numberOfAttendees: number;
  notes: string | null;
  status: BookingStatus;
  adminNote: string | null;
  totalAmount: number | null;
  advanceAmount: number | null;
  notifyViaWhatsapp: boolean;
  notifyViaEmail: boolean;
  cancellationReason: string | null;
  cancelledBy: string | null;
  pendingRequestDecidedAt: string | null;
  requestedNewDate: string | null;
  dateChangeReason: string | null;
  previousDate: string | null;
  dateChangeAcknowledged: boolean;
  conflictedAt: string | null;
  conflictingBookingId: string | null;
  conflictWinner?: {
    bookingId: string;
    name: string;
    date: string;
  } | null;
  comments?: BookingComment[];
  quotation?: QuotationData | null;
  createdAt: string;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pending Review",
  QUOTATION_SENT: "Quotation Sent",
  QUOTATION_FINALIZED: "Quotation Finalized",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLATION_REQUESTED: "Cancellation Requested",
  DATE_CHANGE_REQUESTED: "Date Change Requested",
  CONFLICTED: "Date Conflict",
  CANCELLED: "Cancelled",
};

export const BOOKING_STATUS_COLORS: Record<
  BookingStatus,
  { bg: string; text: string }
> = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-800" },
  QUOTATION_SENT: { bg: "bg-blue-100", text: "text-blue-800" },
  QUOTATION_FINALIZED: { bg: "bg-indigo-100", text: "text-indigo-800" },
  APPROVED: { bg: "bg-green-100", text: "text-green-800" },
  REJECTED: { bg: "bg-red-100", text: "text-red-800" },
  CANCELLATION_REQUESTED: { bg: "bg-orange-100", text: "text-orange-800" },
  DATE_CHANGE_REQUESTED: { bg: "bg-purple-100", text: "text-purple-800" },
  CONFLICTED: { bg: "bg-rose-100", text: "text-rose-800" },
  CANCELLED: { bg: "bg-gray-200", text: "text-gray-700" },
};

export type AdminBookingAction =
  | "approve"
  | "reject"
  | "cancel"
  | "approveCancellation"
  | "declineCancellation"
  | "approveDateChange"
  | "declineDateChange"
  | "acknowledgeDateChange"
  | "forceResolveConflict";
