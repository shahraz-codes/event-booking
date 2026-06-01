# AR Banquets — Admin (React Native / Expo)

Sibling app to `event-booking-next-app`. Provides a mobile admin for managing
bookings, conflicts, cancellations, date-change requests and customer
discussion threads.

## Architecture

- **Reads**: Direct from Supabase via `@supabase/supabase-js`, gated by RLS.
- **Realtime**: `Booking` and `BookingComment` tables push live updates over
  Supabase Realtime channels (see `src/hooks/useRealtime*.ts`).
- **Writes**: Go through the Next.js app's `/api/admin/*` endpoints. The
  app attaches `Authorization: Bearer <supabase-access-token>`; the Next.js
  server verifies it against `admin_users` in Supabase
  (`event-booking-next-app/src/lib/auth.ts`).
- **Auth**: Supabase Email + Password. Admin membership is enforced by the
  `admin_users` table; non-admin sessions are blocked from `(admin)/*`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` → `.env` and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_API_BASE_URL` — your LAN IP for the Next.js dev server
     (e.g. `http://192.168.1.10:3000`). `localhost` will **not** work on
     a physical phone.
   - `EXPO_PUBLIC_CLOUDINARY_*` — only needed once the homepage editor
     module is added (Phase 6 follow-up).
3. Start Expo:
   ```bash
   npm start
   ```
4. Open with Expo Go on your phone (scan the QR), or press `a` / `i` for
   simulator.

## Manual Supabase setup (one-time)

These steps must be done in the Supabase dashboard **before** signing in:

1. Enable Realtime for the `Booking` and `BookingComment` tables
   (Database → Replication → `supabase_realtime`).
2. Apply RLS policies so admin users (members of `admin_users`) can
   `SELECT` from the tables above.
3. Create at least one admin user:
   - Auth → Users → Add user → email + password
   - Run in SQL editor:
     ```sql
     insert into public.admin_users (user_id)
     values ('<uuid-from-step-above>');
     ```

## What's wired

- Bookings list with tabs (Active, Needs Review, Conflicts, Approved, Closed, All) + realtime + pull-to-refresh.
- Booking detail with:
  - Customer info + tap-to-call / WhatsApp.
  - Booking facts with strike-through on previous date / requested new date.
  - Cancel-approved-booking panel.
  - Cancellation request approve / decline.
  - Date change request approve / decline.
  - Conflict panel with force-resolve.
  - Date-change acknowledgement.
  - Customer discussion thread (realtime) + admin reply.
  - **Notify on WhatsApp** click-to-prefill via `wa.me` (Phase 8 v1).
  - Link into the quotation editor.
  - "Review conflicts & approve" link (Phase 6 follow-up).
- Pre-approval conflict review screen: lists every booking that will be
  cascaded to `CONFLICTED` if the current one is approved, with their
  status, opt-in channels and admin notes. Approve here triggers the
  cascade with one tap.
- Quotation editor: line-item grid (particular / qty / unit / rate /
  auto-amount), advance + balance totals, notes; Create → Save → Mark
  sent → Finalize state machine; **Export PDF & share** via `expo-print`
  + `expo-sharing` using a branded HTML template.
- Homepage editor:
  - Hub screen linking to all 6 sub-editors.
  - Hero (subtitle, heading, highlight, description, logo upload).
  - Carousel slides (add via media picker, show/hide, delete).
  - Gallery (image + title + desc, show/hide, delete).
  - Services (title, desc, inline SVG icon; show/hide, delete).
  - Stats (value + suffix + label; show/hide, delete).
  - Media library (upload to Cloudinary, list, delete).
- Calendar tab: list booked dates + add/remove blocked dates.
- Settings tab: full editor for theme (preset/custom hex), contact info,
  WhatsApp toggle + number, Instagram toggle + URL, Google Maps embed +
  directions, about blurb, meta description; plus sign-out.
- Auth gate: only members of `admin_users` can reach `(admin)/*`.

## Cloudinary uploads

Homepage media uses an **unsigned upload preset**. Configure it in the
Cloudinary dashboard (Settings → Upload → Add upload preset, set Signing
Mode to **Unsigned**, restrict folder + max file size), then fill in:

```
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=...
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...
```

The mobile client never sees the Cloudinary API secret. After the
unsigned upload succeeds the app POSTs the response to
`/api/admin/homepage/media` so the file is recorded server-side (and
counted against the 25 GB storage limit). Orphaned uploads are cleaned
up automatically if the server-side save fails.
