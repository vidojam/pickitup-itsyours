# PickItUp-ItsYours

Mobile-responsive PWA for curbside item listings with:

- Private admin CMS for posting items
- Real-time inventory state updates
- Stripe PaymentIntent authorization-only workflow (`$5.00` hold)
- Charge only when user confirms pickup
- Mandatory legal disclaimer in footer and checkout

## Environment Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in values:

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
ADMIN_PASSWORD=your_admin_password
ADMIN_SESSION_SECRET=long_random_secret
```

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## App Routes

- `/` Landing page with exact marketing copy and CTA
- `/items` Available item grid (real-time inventory refresh)
- `/items/[id]` Item detail with hidden address + Stripe authorization
- `/pickup/[reservationId]` On-site decision page (charge or release)
- `/admin/login` Private admin login
- `/admin` Admin CMS to upload photo, set time viewed, address, category, publish

## Stripe Workflow

1. Buyer checks Terms box.
2. Buyer clicks **Unlock Location for $5 (You won't be charged yet).**
3. Stripe creates PaymentIntent with manual capture and confirms card authorization.
4. Item is set to `pending` immediately and removed from public availability.
5. Buyer chooses on-site decision:
	- `I picked it up. Charge me $5.00.` → PaymentIntent captured.
	- `Item was not here. Release the hold.` → PaymentIntent canceled.

## Data Storage

- JSON store at `data/store.json` (items + reservations)
- Uploaded images stored under `public/uploads`

## Build Validation

```bash
npm run lint
npm run build
```

Both pass in this workspace.
