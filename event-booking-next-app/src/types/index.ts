import { z } from "zod";

export const bookingSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format"),
  eventType: z.enum(
    ["wedding", "reception", "birthday", "corporate", "engagement", "other"],
    { message: "Please select an event type" }
  ),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date",
  }),
  numberOfAttendees: z
    .number()
    .int("Must be a whole number")
    .min(1, "At least 1 attendee required")
    .max(2000, "Maximum 2000 attendees"),
  notes: z.string().max(500).optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

export const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "reception", label: "Reception" },
  { value: "birthday", label: "Birthday Party" },
  { value: "corporate", label: "Corporate Event" },
  { value: "engagement", label: "Engagement Ceremony" },
  { value: "other", label: "Other" },
] as const;

export type BookingStatus =
  | "PENDING"
  | "QUOTATION_SENT"
  | "QUOTATION_FINALIZED"
  | "APPROVED"
  | "REJECTED";

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
  date: string;
  eventType: string;
  numberOfAttendees: number;
  notes: string | null;
  status: BookingStatus;
  adminNote: string | null;
  totalAmount: number | null;
  advanceAmount: number | null;
  comments: BookingComment[];
  quotation?: QuotationData | null;
  createdAt: string;
}

export interface CalendarData {
  bookedDates: string[];
  blockedDates: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pending Review",
  QUOTATION_SENT: "Quotation Sent",
  QUOTATION_FINALIZED: "Quotation Finalized",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function getZodErrorMessage(error: z.ZodError): string {
  const issues = error.issues;
  if (issues.length > 0) {
    return issues[0].message;
  }
  return "Validation failed";
}
