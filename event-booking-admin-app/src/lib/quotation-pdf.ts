/**
 * Quotation PDF generation. Builds an HTML template, then defers actual
 * PDF rendering to `expo-print`'s native pipeline.
 *
 * Usage:
 *   const html = renderQuotationHtml({ ... });
 *   const { uri } = await Print.printToFileAsync({ html });
 *   await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
 */

import { APP_NAME } from "@/lib/config";
import { formatDate, formatINR } from "@/lib/format";
import type { BookingRecord, QuotationData } from "@/lib/types";

interface RenderArgs {
  booking: Pick<
    BookingRecord,
    | "bookingId"
    | "name"
    | "phone"
    | "email"
    | "date"
    | "eventType"
    | "numberOfAttendees"
  >;
  quotation: QuotationData;
}

function escape(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderQuotationHtml({ booking, quotation }: RenderArgs): string {
  const items = quotation.items.map(
    (it, idx) => `
      <tr>
        <td class="num">${idx + 1}</td>
        <td>${escape(it.particular)}</td>
        <td class="num">${escape(it.quantity ?? "")}</td>
        <td>${escape(it.unit ?? "")}</td>
        <td class="num">${it.rate != null ? formatINR(it.rate) : ""}</td>
        <td class="num">${it.amount != null ? formatINR(it.amount) : ""}</td>
      </tr>
    `
  );

  const balance =
    (quotation.totalAmount ?? 0) - (quotation.advanceAmount ?? 0);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Quotation ${escape(booking.bookingId)}</title>
  <style>
    @page { size: A4; margin: 24mm 18mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: #111827;
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #dd5616;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .brand { font-size: 22px; font-weight: 800; color: #dd5616; }
    .meta { text-align: right; font-size: 11px; color: #4b5563; }
    .meta strong { display: block; font-size: 16px; color: #111827; }
    h2 { margin: 18px 0 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card { background: #f9fafb; border-radius: 8px; padding: 12px; border: 1px solid #e5e7eb; }
    .card .label { font-size: 10px; text-transform: uppercase; color: #6b7280; }
    .card .value { font-size: 13px; font-weight: 600; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    thead th {
      background: #fff7ed;
      color: #92400e;
      text-align: left;
      padding: 8px 6px;
      border-bottom: 2px solid #ec6f20;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    tbody td { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-top: 12px; margin-left: auto; width: 50%; }
    .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .row.total { border-top: 2px solid #111827; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: 14px; }
    .notes { margin-top: 18px; padding: 12px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 11px; }
    .footer { margin-top: 24px; font-size: 10px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 8px; }
    .status-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .pill-DRAFT { background: #f3f4f6; color: #374151; }
    .pill-SENT { background: #dbeafe; color: #1e3a8a; }
    .pill-FINALIZED { background: #dcfce7; color: #065f46; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${escape(APP_NAME)}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Banquet & Event Bookings</div>
    </div>
    <div class="meta">
      <strong>Quotation</strong>
      <div>Booking #${escape(booking.bookingId)}</div>
      <div>Date: ${escape(formatDate(quotation.createdAt))}</div>
      <div style="margin-top:4px;">
        <span class="status-pill pill-${escape(quotation.status)}">${escape(quotation.status)}</span>
      </div>
    </div>
  </div>

  <h2>Customer</h2>
  <div class="grid">
    <div class="card">
      <div class="label">Name</div>
      <div class="value">${escape(booking.name)}</div>
      <div class="label" style="margin-top:6px;">Phone</div>
      <div class="value">${escape(booking.phone)}</div>
      ${
        booking.email
          ? `<div class="label" style="margin-top:6px;">Email</div>
             <div class="value">${escape(booking.email)}</div>`
          : ""
      }
    </div>
    <div class="card">
      <div class="label">Event</div>
      <div class="value">${escape(booking.eventType)}</div>
      <div class="label" style="margin-top:6px;">Date</div>
      <div class="value">${escape(formatDate(booking.date))}</div>
      <div class="label" style="margin-top:6px;">Guests</div>
      <div class="value">${escape(booking.numberOfAttendees)}</div>
    </div>
  </div>

  <h2>Items</h2>
  <table>
    <thead>
      <tr>
        <th class="num" style="width: 32px;">#</th>
        <th>Particular</th>
        <th class="num" style="width: 56px;">Qty</th>
        <th style="width: 64px;">Unit</th>
        <th class="num" style="width: 90px;">Rate</th>
        <th class="num" style="width: 110px;">Amount</th>
      </tr>
    </thead>
    <tbody>${items.join("")}</tbody>
  </table>

  <div class="totals">
    <div class="row">
      <span>Subtotal</span>
      <span>${escape(formatINR(quotation.totalAmount))}</span>
    </div>
    <div class="row">
      <span>Advance</span>
      <span>${escape(formatINR(quotation.advanceAmount))}</span>
    </div>
    <div class="row total">
      <span>Balance due</span>
      <span>${escape(formatINR(balance))}</span>
    </div>
  </div>

  ${
    quotation.notes
      ? `<div class="notes"><strong>Notes:</strong> ${escape(quotation.notes)}</div>`
      : ""
  }

  <div class="footer">
    Generated by ${escape(APP_NAME)} Admin · This is a system-generated quotation.
  </div>
</body>
</html>`;
}
