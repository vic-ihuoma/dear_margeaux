# Production Deployment Guide

This guide covers deploying Dear Margeaux to production on Cloudflare, with Stripe for payments and AWS SES for email.

## Prerequisites

Before deployment, ensure you have:

- [ ] Cloudflare account with Workers Paid plan ($5/month)
- [ ] Stripe account with business verification complete
- [ ] AWS account with SES access
- [ ] Custom domain (e.g., dearmargeaux.com) with DNS access
- [ ] All migrations applied to D1 database (migrations 001-009)

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Setup                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  dearmargeaux.com (Cloudflare Pages)                        │
│    └── Astro Storefront                                      │
│                                                              │
│  admin.dearmargeaux.com (Cloudflare Pages)                  │
│    └── Astro Admin CMS                                       │
│                                                              │
│  api.dearmargeaux.com (Cloudflare Worker)                   │
│    └── Merchant API                                          │
│        └── D1 Database: dear-margeaux-db                     │
│        └── R2 Bucket: dear-margeaux-images                   │
│                                                              │
│  images.dearmargeaux.com (Cloudflare R2)                    │
│    └── Public R2 bucket                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Cloudflare Infrastructure Setup

### 1.1 Verify D1 Database

The D1 database should already be created (Task 1.3). Verify:

```bash
cd merchant
wrangler d1 list
```

Expected output should show `dear-margeaux-db` with ID `85cf7e89-cb4c-44a1-a039-44200e60913a`.

### 1.2 Apply All Migrations

Ensure all migrations are applied to the production database:

```bash
cd merchant
wrangler d1 migrations list dear-margeaux-db
```

If migrations are pending:

```bash
wrangler d1 migrations apply dear-margeaux-db
```

Expected migrations:

- 001_init.sql (base schema)
- 002-004 (base schema included)
- 005_admin_users.sql (admin authentication)
- 006_add_drops.sql (drops system)
- 007_add_product_drop_link.sql (product-drop relationship)
- 008_add_waitlist.sql (waitlist entries)
- 009_customer_auth.sql (customer accounts)

### 1.3 Configure R2 Bucket for Public Access

1. Go to Cloudflare Dashboard > R2
2. Select `dear-margeaux-images` bucket
3. Go to Settings > Public Access
4. Enable "Public URL access"
5. Set Custom Domain to `images.dearmargeaux.com`
6. Note the public URL format: `https://images.dearmargeaux.com/<key>`

### 1.4 Update Merchant wrangler.jsonc

Update `merchant/wrangler.jsonc` with the R2 public URL:

```jsonc
{
  "vars": {
    "IMAGES_URL": "https://images.dearmargeaux.com",
  },
}
```

---

## Step 2: Stripe Production Configuration

### 2.1 Switch to Live Mode

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle "Test mode" OFF in the header
3. Complete business verification if required

### 2.2 Get Live API Keys

1. Go to Developers > API Keys
2. Copy the **Publishable key** (starts with `pk_live_`)
3. Copy the **Secret key** (starts with `sk_live_`)

### 2.3 Configure Stripe Secrets in Cloudflare

```bash
cd merchant
wrangler secret put STRIPE_SECRET_KEY
# Paste the sk_live_... key when prompted
```

### 2.4 Create Production Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://api.dearmargeaux.com/v1/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `charge.refunded`
5. Copy the Webhook signing secret (starts with `whsec_`)

```bash
wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste the whsec_... key when prompted
```

### 2.5 Test Payment Flow

After deployment, make a test purchase with a real card (you can refund immediately):

1. Add product to cart
2. Complete checkout
3. Verify order appears in admin
4. Verify inventory deducted
5. Issue refund via admin

---

## Step 3: AWS SES Configuration

### 3.1 Verify Sending Domain

1. Go to AWS Console > SES > Verified identities
2. Click "Create identity"
3. Select "Domain"
4. Enter: `dearmargeaux.com`
5. Check "Use custom MAIL FROM domain" (optional)
6. Add the DNS records provided to your domain

Required DNS records:

- DKIM records (3 CNAME records)
- Optional MAIL FROM MX record
- Optional SPF TXT record

### 3.2 Request Production Access

SES starts in "sandbox mode" which only allows sending to verified emails.

1. Go to AWS Console > SES > Account dashboard
2. Click "Request production access"
3. Fill out the form:
   - Mail type: Transactional
   - Website URL: https://dearmargeaux.com
   - Use case: Order confirmations, shipping updates, drop notifications
4. Wait for approval (usually 24-48 hours)

### 3.3 Create IAM User for SES

1. Go to AWS Console > IAM > Users
2. Create user: `dear-margeaux-ses`
3. Attach policy: `AmazonSESFullAccess` (or create custom policy below)
4. Create access key for "Application running outside AWS"
5. Save the Access Key ID and Secret Access Key

Custom minimal policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "hello@dearmargeaux.com"
        }
      }
    }
  ]
}
```

### 3.4 Configure SES Secrets

For the Merchant API (if sending from Worker):

```bash
cd merchant
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
wrangler secret put AWS_REGION  # e.g., us-east-1
wrangler secret put SES_FROM_EMAIL  # e.g., hello@dearmargeaux.com
```

---

## Step 4: Deploy Merchant API

### 4.1 Set Admin API Key

Create a secure admin API key for the admin dashboard:

```bash
cd merchant
# Generate a random key
openssl rand -hex 32
# Output: e.g., a1b2c3d4e5f6...

wrangler secret put ADMIN_API_KEY
# Paste the generated key
```

### 4.2 Deploy Worker

```bash
cd merchant
wrangler deploy
```

Expected output:

```
Deployed dear-margeaux-api (1.0.0)
  https://dear-margeaux-api.YOUR-SUBDOMAIN.workers.dev
```

### 4.3 Configure Custom Domain

1. Go to Cloudflare Dashboard > Workers & Pages > dear-margeaux-api
2. Go to Settings > Triggers > Custom Domains
3. Add domain: `api.dearmargeaux.com`
4. Cloudflare will automatically create DNS record

### 4.4 Verify Deployment

```bash
curl https://api.dearmargeaux.com/health
# Expected: {"status":"ok"}

curl https://api.dearmargeaux.com/v1/products
# Expected: {"products":[],"has_more":false}
```

---

## Step 5: Deploy Storefront

### 5.1 Set Environment Variables

Create production environment file:

```bash
cd apps/storefront
cp .env.example .env.production
```

Edit `.env.production`:

```env
PUBLIC_MERCHANT_API_URL=https://api.dearmargeaux.com
PUBLIC_MERCHANT_API_KEY=pk_live_your_public_key
PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
PUBLIC_SENTRY_ENVIRONMENT=production
```

### 5.2 Build and Deploy

```bash
cd apps/storefront
pnpm build
wrangler pages deploy dist --project-name=dear-margeaux-storefront
```

### 5.3 Configure Custom Domain

1. Go to Cloudflare Dashboard > Pages > dear-margeaux-storefront
2. Go to Custom domains
3. Add domain: `dearmargeaux.com`
4. Add domain: `www.dearmargeaux.com` (redirect to apex)

---

## Step 6: Deploy Admin

### 6.1 Set Environment Variables

```bash
cd apps/admin
cp .env.example .env.production
```

Edit `.env.production`:

```env
MERCHANT_API_URL=https://api.dearmargeaux.com
MERCHANT_ADMIN_KEY=sk_live_your_admin_key
SESSION_SECRET=your_secure_session_secret
```

Generate session secret:

```bash
openssl rand -base64 32
```

### 6.2 Build and Deploy

```bash
cd apps/admin
pnpm build
wrangler pages deploy dist --project-name=dear-margeaux-admin
```

### 6.3 Configure Custom Domain

1. Add custom domain: `admin.dearmargeaux.com`

### 6.4 Create Initial Admin User

After deployment, create the first admin user in D1:

```bash
cd merchant
wrangler d1 execute dear-margeaux-db --command="INSERT INTO admin_users (id, store_id, email, password_hash, name, created_at, updated_at) VALUES ('admin-1', 'YOUR_STORE_ID', 'admin@dearmargeaux.com', 'HASHED_PASSWORD', 'Admin', datetime('now'), datetime('now'));"
```

Or use the auth package to hash the password:

```typescript
import { hashPassword } from '@dear-margeaux/auth';
const hash = await hashPassword('your-secure-password');
```

---

## Step 7: DNS Configuration

Configure your domain DNS (at your registrar or Cloudflare):

| Type  | Name   | Content                       | Proxy   |
| ----- | ------ | ----------------------------- | ------- |
| A     | @      | 192.0.2.1                     | Proxied |
| CNAME | www    | dearmargeaux.com              | Proxied |
| CNAME | api    | dear-margeaux-api.workers.dev | Proxied |
| CNAME | admin  | dear-margeaux-admin.pages.dev | Proxied |
| CNAME | images | public.r2.dev                 | Proxied |

Note: The A record placeholder is required for Cloudflare Pages apex domains.

---

## Step 8: Sentry Error Monitoring

### 8.1 Create Sentry Project

1. Go to [sentry.io](https://sentry.io)
2. Create new project for "JavaScript > Astro"
3. Copy the DSN from project settings

### 8.2 Configure Environment Variables

```env
PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
PUBLIC_SENTRY_ENVIRONMENT=production
PUBLIC_SENTRY_RELEASE=1.0.0
SENTRY_AUTH_TOKEN=your_auth_token
SENTRY_ORG=your_org
```

### 8.3 Set Up Alerts

1. Go to Sentry > Alerts > Create Alert Rule
2. Set up alerts for:
   - Error count spike (> 10 errors in 5 min)
   - New issue detected
   - High-priority errors (payment failures)

---

## Step 9: Post-Deployment Verification

### 9.1 Storefront Checklist

- [ ] Homepage loads correctly
- [ ] Products display with images
- [ ] Product detail pages work
- [ ] Add to cart works
- [ ] Cart drawer opens/closes
- [ ] Checkout redirects to Stripe
- [ ] Payment completes (test with real card)
- [ ] Order confirmation page displays
- [ ] Order confirmation email received
- [ ] Blog posts render
- [ ] Lookbook pages render

### 9.2 Admin Checklist

- [ ] Login page accessible
- [ ] Admin can log in
- [ ] Dashboard shows stats
- [ ] Products list displays
- [ ] Can create/edit products
- [ ] Can upload images
- [ ] Orders list displays
- [ ] Can update order status
- [ ] Inventory management works
- [ ] Drops management works
- [ ] Analytics dashboard works

### 9.3 API Checklist

- [ ] Health endpoint responds
- [ ] Products endpoint works
- [ ] Stripe webhook receives events
- [ ] Cron jobs executing

### 9.4 Security Checklist

- [ ] HTTPS active on all domains
- [ ] Security headers present (check with securityheaders.com)
- [ ] Admin requires authentication
- [ ] API keys working correctly (pk* vs sk*)
- [ ] No secrets in client-side code

---

## Step 10: Go Live

### 10.1 Seed Initial Data

Create your first products and drop:

1. Log into admin at admin.dearmargeaux.com
2. Create products with images
3. Set inventory levels
4. Create a drop
5. Assign products to drop
6. Set drop status to "scheduled" or "active"

### 10.2 Announce Launch

1. Update waitlist subscribers
2. Post on social media
3. Send launch email to mailing list

### 10.3 Monitor

First 24-48 hours:

- Watch Sentry for errors
- Check Cloudflare Analytics for traffic
- Monitor Stripe for payments
- Respond to customer issues quickly

---

## Rollback Procedures

### API Rollback

```bash
cd merchant
wrangler rollback dear-margeaux-api
```

### Storefront Rollback

1. Go to Cloudflare Pages > dear-margeaux-storefront
2. Go to Deployments
3. Click "Rollback" on previous deployment

### Database Rollback

For D1, restore from backup:

```bash
wrangler d1 backup restore dear-margeaux-db BACKUP_ID
```

---

## Environment Variable Reference

### Merchant API (wrangler secrets)

| Variable              | Description                   | Example                |
| --------------------- | ----------------------------- | ---------------------- |
| STRIPE_SECRET_KEY     | Stripe live secret key        | sk_live_xxx            |
| STRIPE_WEBHOOK_SECRET | Stripe webhook signing secret | whsec_xxx              |
| ADMIN_API_KEY         | Admin dashboard API key       | xxx                    |
| AWS_ACCESS_KEY_ID     | AWS IAM access key            | AKIA...                |
| AWS_SECRET_ACCESS_KEY | AWS IAM secret                | xxx                    |
| AWS_REGION            | AWS SES region                | us-east-1              |
| SES_FROM_EMAIL        | Sender email address          | hello@dearmargeaux.com |

### Storefront (.env.production)

| Variable                  | Description      | Example                      |
| ------------------------- | ---------------- | ---------------------------- |
| PUBLIC_MERCHANT_API_URL   | API base URL     | https://api.dearmargeaux.com |
| PUBLIC_MERCHANT_API_KEY   | Public API key   | pk_live_xxx                  |
| PUBLIC_SENTRY_DSN         | Sentry DSN       | https://xxx@sentry.io/xxx    |
| PUBLIC_SENTRY_ENVIRONMENT | Environment name | production                   |

### Admin (.env.production)

| Variable           | Description            | Example                      |
| ------------------ | ---------------------- | ---------------------------- |
| MERCHANT_API_URL   | API base URL           | https://api.dearmargeaux.com |
| MERCHANT_ADMIN_KEY | Admin API key          | sk_live_xxx                  |
| SESSION_SECRET     | Session encryption key | base64-string                |

---

## Troubleshooting

### "Error: Unauthorized" on API calls

- Check API key is correct (pk* for public, sk* for admin)
- Verify secret is set: `wrangler secret list`

### Stripe webhooks failing

- Verify webhook secret is correct
- Check webhook signing in Stripe dashboard > Webhooks > Logs
- Ensure endpoint URL matches exactly

### Images not loading

- Check R2 bucket has public access enabled
- Verify IMAGES_URL is set correctly in wrangler.jsonc
- Check CORS configuration on R2 bucket

### Emails not sending

- Verify SES is out of sandbox mode
- Check IAM credentials have SES permissions
- Verify sender email is verified in SES

### Admin login not working

- Check SESSION_SECRET is set
- Verify admin user exists in database
- Check D1 migration 005 was applied

---

## Support Resources

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Cloudflare Pages Docs: https://developers.cloudflare.com/pages/
- Cloudflare D1 Docs: https://developers.cloudflare.com/d1/
- Stripe Docs: https://stripe.com/docs
- AWS SES Docs: https://docs.aws.amazon.com/ses/
- Sentry Docs: https://docs.sentry.io/
