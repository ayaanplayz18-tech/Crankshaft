# CrankShaft — Automotive Posters Store

A modern Next.js 16 e-commerce web application with **UPIlerify** automated bank credit-alert verification via delayed-cron IMAP.

## Architecture

This project is organized into two isolated services:

```text
projects/
├── payment-app/ (or crankshaft/)   → Customer-facing Next.js App Router store (deployed to Vercel)
│   ├── app/
│   │   ├── api/create-payment/     → Initiates order & micro-offset paisa
│   │   ├── api/payment-status/     → Polling fallback
│   │   ├── api/webhooks/upilerify/ → HMAC-SHA256 verified webhook receiver
│   │   ├── api/verify-utr/         → 12-digit manual UTR fallback
│   │   ├── pay/                    → Dedicated checkout & payment status
│   │   └── admin/                  → Poster management & orders dashboard
│   ├── components/                 → CartDrawer, SlideCommit, Navbar
│   └── lib/models/                 → Order, Poster, AdminLog, User
│
└── upilerify-backend/              → Standalone UPIlerify microservice (deployed to Render Free)
    ├── lib/
    │   ├── db.js                   → MongoDB Atlas persistent order & UTR storage
    │   ├── imapScanner.js          → Per-cron request Gmail IMAP scanner
    │   ├── utrParser.js            → Multi-bank regex parser (12-digit UTR & amounts)
    │   └── webhook.js              → HMAC-SHA256 signature generator & dispatcher
    ├── server.js                   → Express server with /health, /api/check-emails, etc.
    └── README.md                   → Render deployment & cron-job.org instructions
```

---

## 🚀 Quick Start

### 1. Run Main Next.js Store
```bash
npm install
npm run dev
# Running on http://localhost:3000
```

### 2. Run UPIlerify Backend
```bash
cd upilerify-backend
npm install
npm run dev
# Running on http://localhost:3001
```

---

## 🛠️ Key Endpoints

### Main App (`http://localhost:3000`)
- `POST /api/create-payment` - Creates an order in MongoDB with `PENDING` status and retrieves the UPI intent URI.
- `GET /api/payment-status?orderId=...` - Returns verification state (`PENDING` or `PAID`).
- `POST /api/webhooks/upilerify` - Validates `X-Upilerify-Signature` and settles orders idempotently.
- `POST /api/verify-utr` - Validates 12-digit UTR and verifies with UPIlerify without blind client trust.

### UPIlerify Backend (`http://localhost:3001` or Render)
- `GET /health` - Health check endpoint for Render (`{"status":"ok"}`).
- `GET /api/check-emails` - Protected by `Authorization: Bearer <CRON_SECRET>`; scans Gmail for bank credit alerts, matches UTRs, and fires signed webhooks.
- `POST /api/orders/create` - Creates UPI intent and checkout URLs with paisa offsets.
- `GET /api/orders/:orderId/status` - Checks order status.
- `POST /api/verify-utr` - Manual UTR verification against bank credit records.

---

## 📖 Deployment Guides

- For complete **Render Free Tier**, **cron-job.org (1-minute schedule)**, and **Gmail App Password** instructions, see [upilerify-backend/README.md](file:///Users/ayaansyed/Desktop/Ayaan/Projects/Websites/crankshaft/upilerify-backend/README.md).
