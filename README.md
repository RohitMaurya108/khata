# Khata – Business Cashbook

Next.js 14 + Supabase. Google sign-in only. Accounts stay inactive until you switch them on (payment is taken offline).

## Setup

1. Create a project at supabase.com.
2. SQL Editor: paste and run `schema.sql`.
3. Google Cloud Console: create an OAuth client (Web). Add the redirect URL shown in Supabase under Authentication > Providers > Google. Paste the client ID and secret into Supabase.
4. Supabase > Authentication > URL Configuration: set Site URL to your deployed URL (and http://localhost:3000 for local testing).
5. Copy `.env.local.example` to `.env.local` and fill in the values (Project Settings > API).
6. `npm install` then `npm run dev`.
7. Sign in once with your own Google account, then in the SQL Editor run:
   `update profiles set is_admin = true, is_active = true where email = 'you@gmail.com';`
8. Reload. You now see an Admin button where you can activate or switch off other users.

## Features

Cashbook (edit, search, date filters, P&L), parties with WhatsApp reminders, GST invoices (CGST/SGST or IGST, print to PDF, auto stock deduction, receive payments), items and stock with low-stock alerts, business details on invoices, CSV and JSON backup, Hindi, installable as a phone app (PWA manifest).

## Upgrading from the first version

If you already ran `schema.sql` earlier, run only `schema_v2.sql` in the SQL Editor. New projects: run `schema.sql` (it already includes v2).

## Deploy

Push to GitHub, import the repo in Vercel, add the three env vars, deploy.

## Notes

- Row level security means each user sees only their own books, and only while active.
- Hindi toggle is in the header. Add more strings in `lib/i18n.js`.
- PDF uses the browser print dialog (choose "Save as PDF").
