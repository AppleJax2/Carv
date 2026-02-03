# Carv Website

The official website for [Carv](https://github.com/AppleJax2/Carv) - professional CNC design software that just works.

## Features

- **Landing Page**: Modern dark-themed landing page with hero, features, app showcase, pricing, and testimonials
- **Download Page**: Platform detection, GitHub Releases integration, system requirements
- **Changelog**: Automatic changelog from GitHub Releases API
- **Pricing**: Free vs Pro comparison with Stripe checkout for one-time purchases
- **Account Dashboard**: User profile, license keys, purchase history
- **Authentication**: Email/password auth with JWT sessions

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database**: [PostgreSQL](https://www.postgresql.org/) via [Supabase](https://supabase.com/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Payments**: [Stripe](https://stripe.com/) (one-time purchases)
- **UI**: [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- **Hosting**: [Netlify](https://netlify.com/)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase recommended)
- Stripe account

### Installation

```bash
cd website
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `BASE_URL` | Your site URL (http://localhost:3000 for dev) |
| `AUTH_SECRET` | Random 32+ character string for JWT signing |
| `GITHUB_TOKEN` | (Optional) GitHub PAT for higher API rate limits |

### Database Setup

Run migrations:

```bash
npm run db:migrate
```

Seed with test data (optional):

```bash
npm run db:seed
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Stripe Webhooks (Local)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Deployment

### Netlify

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add all environment variables in Netlify dashboard
5. Deploy!

### Environment Variables for Production

- `BASE_URL`: Your production domain (https://carv.app)
- `POSTGRES_URL`: Production database URL
- `STRIPE_SECRET_KEY`: Production Stripe key (sk_live_...)
- `STRIPE_WEBHOOK_SECRET`: Production webhook secret
- `AUTH_SECRET`: Secure random string

### Stripe Webhook Setup

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events: `checkout.session.completed`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

## Project Structure

```
website/
├── app/
│   ├── (dashboard)/      # Authenticated pages
│   │   ├── dashboard/    # User dashboard
│   │   └── layout.tsx    # Dashboard layout
│   ├── (login)/          # Auth pages
│   ├── api/              # API routes
│   │   ├── checkout/     # Stripe checkout
│   │   ├── license/      # License verification
│   │   ├── releases/     # GitHub releases proxy
│   │   └── user/         # User data endpoints
│   ├── changelog/        # Changelog page
│   ├── download/         # Download page
│   └── pricing/          # Pricing page
├── components/
│   ├── landing/          # Landing page sections
│   ├── ui/               # shadcn/ui components
│   ├── footer.tsx
│   ├── logo.tsx
│   └── navbar.tsx
├── lib/
│   ├── auth/             # Authentication
│   ├── db/               # Database schema & queries
│   ├── payments/         # Stripe integration
│   ├── github.ts         # GitHub API helpers
│   └── license.ts        # License key utilities
└── public/
```

## License

MIT
