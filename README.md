# Radicle Garden

A web app for managing your radicle garden.

## Development

```bash
cp .env.example .env
vagrant up
vagrant ssh
```

In vagrant:

```bash
cd /vagrant
pnpm i
pnpm dev
```

## Stripe Integration Setup

The application uses Stripe for subscription payments. Follow these steps to
set up Stripe integration for local development:

### 1. Install Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
```

### 2. Get Your Stripe Test API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Make sure you're in **Sandbox** mode (top-left corner)
3. Navigate to **Settings** > **Developers** > **Manage API keys**
4. Copy your **Secret key**

### 3. Configure Environment Variables

Add your Stripe keys to `.env`:

```bash
STRIPE_SECRET_SERVER_SIDE_KEY=sk_test_…
```

### 4. Run the Setup Script

This script creates the Stripe product, price, and configures the
Customer Portal:

```bash
pnpm setup:stripe
```

The script will:
- Create/find the "Always-On Node Subscription" product
- Create/find the €10/month price with 7-day trial
- Configure the Stripe Customer Portal settings
- Print `STRIPE_PRICE_ID` which you have to add to your .env file

### 5. Login to Stripe CLI

Login to the same Stripe account that your API keys belong to:

```bash
stripe login
```

**Important:** Make sure you select the correct account.
Choose **New Business Sandbox**, not ~~Test Mode~~ from the dropdown.

The account ID in the CLI must match your API keys. You can verify your
account ID in the Stripe Dashboard under **Settings** > **Account details**.

### 6. Start Webhook Listener

In a separate terminal on your host (not Vagrant vm), forward Stripe webhooks
to your local server:

```bash
stripe listen --forward-to localhost:5173/api/stripe/webhook
```

This will output a webhook signing secret like `whsec_…`.
Copy this value and add it to your `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_…
```

**Keep this terminal running** while developing.
It will display webhook events in real-time.

### 7. Test Card Details

Use these test cards in Stripe Checkout:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires authentication:** `4000 0025 0000 3155`

Use any future expiry date (e.g., `12/34`), any 3-digit CVC.

### 9. Testing the Integration

1. Start your dev server `vagrant up`
2. Register a new account and verify your email
3. Go to your profile page - you should see the subscription section
4. Click "Start Free Trial" and complete checkout with test card
5. Verify in the webhook listener terminal that events are being received
6. Check that your containers are running: `podman ps | grep {username}_seed`
