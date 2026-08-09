// UX-10c: single source of truth for event-type labels, previously duplicated
// in BookingReceipt.tsx and QuotationPDF.tsx.

export const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  reception: "Reception",
  birthday: "Birthday Party",
  corporate: "Corporate Event",
  engagement: "Engagement Ceremony",
  other: "Other",
};

export function eventTypeLabel(value: string): string {
  return EVENT_TYPE_LABELS[value] || value;
}
