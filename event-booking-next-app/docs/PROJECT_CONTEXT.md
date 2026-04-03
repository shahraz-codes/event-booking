Project: Banquet Hall Booking Website (Single Hall)

Core Idea:
- Customer submits booking request
- Admin approves/rejects manually
- No payment integration
- No SMS/WhatsApp (MVP)
- No real-time system (polling or manual refresh only)

Tech Stack:
- Next.js (App Router, fullstack)
- TypeScript
- PostgreSQL (Docker local, Neon production)
- Prisma ORM
- Tailwind CSS

Key Modules:
1. Home Page (gallery, services, location)
2. Availability Calendar
3. Booking Request Form
4. Booking Status Page
5. Admin Dashboard

Booking Flow:
- User submits request → status = PENDING
- Admin approves → date blocked
- Admin rejects → status updated

Rules:
- Prevent double booking (approved + blocked dates)
- Booking ID must be human-readable (BNQ-YYYY-XXXX)
- Keep system simple and maintainable
