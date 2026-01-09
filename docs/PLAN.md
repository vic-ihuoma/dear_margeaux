# dear_margeaux - E-commerce Platform Plan

## Project Overview

**dear_margeaux** is a boutique e-commerce website for selling bags through limited "drops" (time-limited collections). The platform includes:
- **Storefront**: Customer-facing website with drop-based shopping
- **Admin CMS**: Dashboard for managing webshop (products, drops, inventory) and blog
- **Blog**: Brand storytelling with standard posts and lookbook/campaign content

### Design Aesthetic
Warm/approachable indie boutique feel, with a custom design system inspired by [oru.club/design-system](https://oru.club/design-system).

---

## Key Requirements Summary

| Requirement | Decision |
|-------------|----------|
| Payment | Stripe |
| Auth | Optional accounts (guest checkout + optional account creation) |
| Scale | Small/bootstrapped (<1000 orders/month) |
| Drop model | Waitlist + notification system |
| Product variants | Custom flexible attributes |
| CMS users | Small mixed-skill team (needs intuitive UI) |
| Blog content | Text/images + lookbooks/campaigns |
| Image storage | Cloudflare R2 |
| Email | AWS SES |
| i18n | Plan for later (English first) |
| Features | Email notifications, analytics, multi-currency, discount codes |

---

## Final Architecture Decision: Hybrid Cloudflare + AWS SES

**Confirmed approach:** Deploy Merchant.dev as commerce backend + Custom Astro frontend + Custom admin CMS + AWS SES for email

### Merchant.dev Clarification

**Merchant.dev is NOT just inspiration - we DEPLOY it as our commerce backend:**

1. Clone/fork from [github.com/ygwyg/merchant](https://github.com/ygwyg/merchant)
2. Deploy to YOUR Cloudflare account as a Worker
3. It creates YOUR D1 database with YOUR products/orders/customers
4. Your storefront calls this API for all commerce operations

**What Merchant.dev provides (we don't build):**
- Product/variant CRUD API
- Inventory tracking (on_hand, reserved, available)
- Shopping cart management
- Stripe Checkout integration
- Order management & fulfillment states
- Customer records from checkout
- Image upload to R2
- Webhook handling (Stripe + outbound)

**What we build custom on top:**
- Astro storefront (frontend calling Merchant API)
- Custom admin CMS (Iheanyi-style, replaces Merchant's basic admin)
- Drops system (extend D1 schema + custom API routes in Merchant)
- Waitlist + email notifications (custom Worker + AWS SES)
- Blog (Astro MDX + admin editor)
- Discount codes (extend Merchant or custom Worker)

**Stack:**
- **Commerce API:** Merchant.dev deployed to our Cloudflare (Workers + D1 + Hono)
- **Frontend:** Astro (deployed to Cloudflare Pages)
- **Admin CMS:** Custom-built Astro + React (Iheanyi-style dashboard)
- **Blog:** Astro Content Collections (MDX)
- **Waitlist/Email:** Custom Cloudflare Worker + AWS SES
- **Images:** Cloudflare R2 (via Merchant)
- **Custom features:** Extend Merchant schema/routes + separate Workers

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Astro Site   │  │ Merchant API │  │ Custom API   │      │
│  │ (Pages)      │  │ (Worker)     │  │ (Worker)     │      │
│  │              │  │              │  │              │      │
│  │ - Storefront │  │ - Products   │  │ - Waitlist   │      │
│  │ - Admin CMS  │  │ - Inventory  │  │ - Drops      │      │
│  │ - Blog       │  │ - Carts      │  │ - Discounts  │      │
│  │              │  │ - Checkout   │  │ - Analytics  │      │
│  │              │  │ - Orders     │  │ - Webhooks   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ D1 Database  │  │ R2 Storage   │                        │
│  │ (SQLite)     │  │ (Images)     │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
     ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
     │   Stripe    │ │   AWS SES   │ │ Cloudflare  │
     │  (Payments) │ │   (Email)   │ │  Analytics  │
     └─────────────┘ └─────────────┘ └─────────────┘
```

---

## Technology Decisions & Trade-offs

### Frontend: Astro

**Why Astro over Next.js/Remix:**
- Static-first with islands architecture = fastest possible storefront
- Perfect for content-heavy sites (drops, blog, lookbooks)
- Built-in MDX support for blog
- Native Tailwind integration
- Deploys to Cloudflare Pages effortlessly
- Can add React components for interactive admin

**Trade-off:** Less ecosystem than Next.js, but simpler mental model.

### Styling: Tailwind CSS

**Why:** Your choice, excellent for rapid UI development, pairs well with Astro.

### Database: Cloudflare D1

**Why over PostgreSQL/PlanetScale:**
- Zero cold starts (always warm at edge)
- Extremely cheap ($5/month base)
- Automatic backups
- Merchant.dev already uses it
- SQLite is actually great for small/medium scale

**Trade-off:** No Prisma support (uses raw SQL or Drizzle ORM). Less powerful than PostgreSQL for complex queries.

### Alternative: If D1 feels limiting, consider:
- **Turso** (libSQL, SQLite-compatible, has Prisma adapter)
- **PlanetScale** (MySQL, serverless, Prisma support)
- **Neon** (PostgreSQL, serverless, Prisma support)

### ORM: Drizzle (for D1) vs Prisma

**Drizzle for D1:**
- Native D1 support
- Type-safe, lightweight
- SQL-like syntax

**Prisma (if using Turso/PlanetScale/Neon):**
- Better DX, more familiar
- Excellent migrations
- Your stated preference

**Recommendation:** Start with Drizzle for D1 (Merchant uses this). If you find it limiting, migrate to Turso + Prisma later.

### tRPC/Effect: Where they fit

**tRPC:**
- Use for custom API routes (waitlist, drops, discounts)
- End-to-end type safety with Astro
- Can run in Cloudflare Workers

**Effect:**
- Use for complex business logic (checkout flows, inventory reservations)
- Great error handling for payment flows
- Optional - adds complexity, evaluate if needed

**Recommendation:** Start without Effect, add later if business logic complexity warrants it.

### Email: AWS SES

**Why (your choice):** Cheapest option ($0.10/1000 emails), you're familiar with AWS.

**Setup required:**
- Domain verification
- Send via API (not SMTP for Workers)
- Use React Email for templates

### Payments: Stripe

**Why:** Industry standard, Merchant.dev has built-in integration.

**Features to implement:**
- Stripe Checkout (hosted payment page)
- Webhooks for order fulfillment
- Stripe Tax for multi-currency
- Stripe Coupons for discount codes

---

## Security Considerations

1. **Authentication:**
   - Admin: Use Clerk or Lucia for secure auth
   - API: API keys with rate limiting (Merchant provides this)

2. **Payments:**
   - Never handle raw card data (Stripe Checkout handles this)
   - Verify webhook signatures

3. **Data:**
   - Input validation on all endpoints
   - SQL injection prevention (parameterized queries)
   - XSS prevention (Astro escapes by default)

4. **Infrastructure:**
   - Cloudflare DDoS protection (free)
   - HTTPS everywhere (automatic)
   - CSP headers

5. **GDPR/Privacy:**
   - Cookie consent
   - Privacy policy
   - Data deletion capability

---

## Cost Estimate (Monthly)

| Service | Cost |
|---------|------|
| Cloudflare Workers (Free tier) | $0 |
| Cloudflare Pages | $0 |
| Cloudflare D1 (25B reads) | $5 |
| Cloudflare R2 (10GB) | $0 (free tier) |
| Stripe | 2.9% + $0.30/transaction |
| AWS SES (1000 emails) | $0.10 |
| Domain | ~$12/year |
| **Total (before sales)** | **~$5-10/month** |

---

## Sources & References

- [Merchant.dev](https://merchant.dev/) - Commerce backend
- [Merchant.dev Docs](https://merchant.dev/docs/) - API documentation
- [Merchant GitHub](https://github.com/ygwyg/merchant) - Source code
- [Oru.club Design System](https://oru.club/design-system) - Design inspiration
- [Cloudflare D1](https://developers.cloudflare.com/d1/) - Database docs
- [Astro](https://astro.build/) - Frontend framework
