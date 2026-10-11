# UPIlerify Backend Microservice

A production-ready, self-hosted UPI payment verification microservice powered by **delayed-cron Gmail IMAP polling** and **HMAC-SHA256 signed webhooks**. Built to deploy seamlessly onto **Render Free Tier** without relying on persistent local storage or persistent IMAP connections.

---

## ⚡ How It Works

```text
Customer places order (₹499)
       ↓
Main App calls POST /api/orders/create
       ↓
UPIlerify assigns micro-offset paisa (₹499.04) + unique Order ID
       ↓
Customer pays ₹499.04 via Google Pay / PhonePe / Paytm / BHIM
       ↓
Bank sends Credit Alert Email to Gmail
       ↓
cron-job.org pings GET /api/check-emails every 1 minute
       ↓
UPIlerify connects to Gmail via IMAP, parses 12-digit UTR & exact paisa amount
       ↓
Matches payment to pending order & sends HMAC-SHA256 signed webhook
       ↓
Main app marks order as PAID idempotently
```

---

## 🚀 1. Local Development Setup

### Prerequisites
- Node.js 18+
- A Gmail account with 2-Factor Authentication enabled
- MongoDB Atlas cluster (free tier) or local MongoDB instance

### Installation

```bash
cd upilerify-backend
npm install
```

### Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your variables in `.env`:

```env
# Server Configuration
PORT=3001
HOST=0.0.0.0
SERVICE_URL=http://localhost:3001

# UPI Merchant Details
DEFAULT_UPI_ID=yourname@okaxis
DEFAULT_UPI_NAME="Your Business Name"

# Gmail IMAP Credentials (Requires Google App Password)
GMAIL_ADDRESS=youraccount@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

# Webhook Dispatched to Main Customer-Facing App
WEBHOOK_URL=http://localhost:3000/api/webhooks/upilerify
WEBHOOK_SECRET=whsec_your_long_random_hmac_secret_32_chars

# Protected Cron Secret for cron-job.org / external scheduler
CRON_SECRET=cronsec_your_long_random_cron_secret_32_chars

# Persistence (MongoDB Atlas for Render stateless containers)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/crankshaft?retryWrites=true&w=majority
```

### Start the Service

```bash
# Start server
npm start

# Or with automatic reload during development
npm run dev
```

The service binds to `http://0.0.0.0:3001`.

---

## ☁️ 2. Render Deployment Instructions (Free Tier)

### Step 1: Create a GitHub Repository
Push `upilerify-backend` to its own GitHub repository (e.g. `your-username/upilerify-backend`).

### Step 2: Create Web Service on Render
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Select your repository `upilerify-backend`.
4. Configure service settings:
   - **Name:** `upilerify-backend` (or your chosen name)
   - **Region:** Singapore / Frankfurt / Oregon (choose closest to your bank/users)
   - **Branch:** `main`
   - **Root Directory:** Leave empty (if in its own repo) or `upilerify-backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan Type:** `Free`

### Step 3: Set Environment Variables on Render
Under the **Environment** tab, add the following variables:

| Variable | Value / Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `DEFAULT_UPI_ID` | Your recipient VPA (e.g. `merchant@okaxis` or `name@okhdfcbank`) |
| `DEFAULT_UPI_NAME` | Business / store display name |
| `GMAIL_ADDRESS` | Gmail address receiving bank credit-alerts |
| `GMAIL_APP_PASSWORD` | 16-character Google App Password (without spaces) |
| `WEBHOOK_URL` | `https://<your-vercel-domain>/api/webhooks/upilerify` |
| `WEBHOOK_SECRET` | Strong random secret (matching Vercel's `UPILERIFY_WEBHOOK_SECRET`) |
| `CRON_SECRET` | Strong random secret used by cron-job.org |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `SERVICE_URL` | `https://<render-service-name>.onrender.com` |

> [!NOTE]
> Render automatically injects `PORT`. The server is configured to bind to `0.0.0.0:${PORT}` automatically.

### Step 4: Configure Health Check Path
Under **Advanced**:
- **Health Check Path:** `/health`

Render uses this endpoint to confirm that your microservice is ready and functioning.

### Step 5: Render Free Tier Limitations & How We Solve Them
1. **Sleep after 15 minutes of inactivity:**
   - Render Free spins down services after 15 minutes of no incoming HTTP traffic.
   - **Solution:** Our 1-minute `cron-job.org` schedule continuously wakes and pings `/api/check-emails`, keeping the instance responsive during business hours.
2. **Ephemeral Disk (Files wiped on restart):**
   - Free instances do not preserve local JSON files across restarts.
   - **Solution:** All orders and processed bank credit UTRs are stored in MongoDB Atlas via `lib/db.js`.
3. **No persistent TCP sockets:**
   - Long-lived IMAP IDLE connections are severed when the container sleeps.
   - **Solution:** `lib/imapScanner.js` creates an IMAP connection *per cron request*, reads recent unread alerts, and closes cleanly (`client.logout()`).

---

## ⏰ 3. cron-job.org Setup (1-Minute Delayed-Cron)

To keep Render awake and automate bank email scans without paying for background workers:

1. Create a free account on [cron-job.org](https://cron-job.org).
2. Click **Create Cronjob**.
3. Fill in the fields:
   - **Title:** `UPIlerify Bank Credit Scan`
   - **URL:** `https://<your-render-service>.onrender.com/api/check-emails`
   - **Schedule:** Every 1 minute (`* * * * *`)
   - **Request Method:** `GET`
4. Under **Advanced** → **Headers**:
   - Add Header:
     - **Name:** `Authorization`
     - **Value:** `Bearer <YOUR_CRON_SECRET>`
5. Click **Create**.

Whenever the cron triggers, UPIlerify scans new credit alert emails, matches UTRs to orders, dispatches HMAC-signed webhooks to Vercel, and logs the execution.

---

## 🔑 4. Gmail App Password Setup

Google accounts do not permit standard password authentication over IMAP. You must generate an App Password:

1. Log in to your Gmail account.
2. Go to **Google Account Settings** → **Security**.
3. Under *How you sign in to Google*, ensure **2-Step Verification** is turned **ON**.
4. Visit [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
5. In the App name input, type `UPIlerify` and click **Create**.
6. Copy the generated 16-character string (e.g. `abcd efgh ijkl mnop`).
7. Paste this into `GMAIL_APP_PASSWORD` without spaces (`abcdefghijklmnop`).

Ensure your bank credit alerts are forwarded or sent directly to this Gmail address.

---

## 🔐 5. Webhook Secret Setup

Generate a cryptographically secure 64-character hex key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use this exact secret for:
- `WEBHOOK_SECRET` in `upilerify-backend/.env`
- `UPILERIFY_WEBHOOK_SECRET` in your customer-facing Next.js app (`.env.local` / Vercel Environment Variables)

Every webhook payload dispatched to `POST /api/webhooks/upilerify` will contain:
```http
X-Upilerify-Signature: <hmac-sha256-hex>
Content-Type: application/json
```
The main app validates the signature against the raw request body before fulfilling the order.

---

## 🌐 6. Vercel Environment Variables Checklist

In your main Next.js app on Vercel:

| Variable | Example | Description |
| :--- | :--- | :--- |
| `UPILERIFY_URL` | `https://upilerify-backend.onrender.com` | Public URL of Render microservice |
| `UPILERIFY_WEBHOOK_SECRET` | `whsec_d47a...` | Shared secret for HMAC-SHA256 signature verification |
| `APP_URL` | `https://crankshaft.vercel.app` | Public URL of customer-facing store |
| `MONGODB_URI` | `mongodb+srv://...` | Shared MongoDB Atlas database |

---

## 🧪 7. Testing Checklist with a ₹1 Test Payment

Follow this checklist to verify your end-to-end setup:

- [ ] **1. Health Check:**
  ```bash
  curl -i https://<render-app>.onrender.com/health
  # Should return HTTP 200 {"status":"ok"}
  ```
- [ ] **2. Cron Endpoint Protection:**
  ```bash
  curl -i https://<render-app>.onrender.com/api/check-emails
  # Should return HTTP 401 Unauthorized
  ```
- [ ] **3. Authorized Cron Scan:**
  ```bash
  curl -i -H "Authorization: Bearer <CRON_SECRET>" https://<render-app>.onrender.com/api/check-emails
  # Should return HTTP 200 {"ok":true,"checkedAt":...,"matchedOrders":0,"errors":[]}
  ```
- [ ] **4. Create ₹1 Order:**
  - In your storefront, add a poster or product to cart and slide to pay.
  - Or run:
    ```bash
    curl -X POST https://<vercel-app>/api/create-payment \
      -H "Content-Type: application/json" \
      -d '{"amount": 1.00, "userId": "tester"}'
    ```
  - Note the exact paisa micro-offset (e.g. `₹1.03`) and `orderId`.
- [ ] **5. Send ₹1 Payment:**
  - Using Google Pay, PhonePe, or Paytm, scan the QR code or transfer exactly `₹1.03` to your UPI ID.
- [ ] **6. Verify Bank Email Arrival:**
  - Check your Gmail inbox for the bank credit-alert email (HDFC, ICICI, SBI, Axis, etc.).
- [ ] **7. Trigger / Wait for Cron:**
  - Wait up to 1 minute for cron-job.org to ping `/api/check-emails` (or trigger it manually via curl).
- [ ] **8. Confirm Order Fulfillment:**
  - Verify that the payment modal updates to **PAID** with the matched 12-digit UTR.
  - In your admin dashboard under the **Orders** tab, verify that the order is marked `PAID` with transaction UTR recorded.
- [ ] **9. Manual UTR Fallback Test:**
  - For any order, enter an invalid UTR (e.g. `123`) to ensure it is rejected with 12-digit validation.
  - Enter an already-claimed UTR to ensure replay attacks are blocked.

---

## 🛡️ Security Best Practices
- **No Client Secrets:** `CRON_SECRET`, `WEBHOOK_SECRET`, `GMAIL_APP_PASSWORD`, and database credentials are never exposed to the frontend.
- **Raw Body Signature Verification:** Webhook signatures are calculated using unparsed raw buffer bytes.
- **Idempotency:** Webhooks and UTR submissions will never double-credit or overwrite already settled orders.
- **Replay Protection:** Claimed 12-digit UTRs cannot be reused by malicious clients to steal credits.
