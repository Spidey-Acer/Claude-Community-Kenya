# Claude Community Kenya

> Africa's only Claude developer community — official community website.

**Live site:** [claudekenya.org](https://www.claudekenya.org)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://typescriptlang.org)

---

## About

Claude Community Kenya (CCK) is an Anthropic-supported developer community based in Nairobi, Kenya, with chapters expanding across Africa. This repository is the source code for the community website — a hub for events, resources, projects, blog posts, and community submissions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + CSS variables |
| Animations | Framer Motion |
| Database | PostgreSQL via Prisma |
| Auth | NextAuth v5 |
| Storage | Supabase Storage |
| Rate Limiting | Upstash Redis |
| Email | Resend |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js v22 LTS
- npm
- PostgreSQL database
- Supabase project (for file uploads)
- Upstash Redis (for rate limiting)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Spidey-Acer/Claude-Community-Kenya.git
cd Claude-Community-Kenya

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials (see Environment Variables below)

# 4. Generate Prisma client and run migrations
npx prisma migrate dev

# 5. Seed the database (optional)
npx prisma db seed

# 6. Start the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
# Database
DATABASE_URL=postgresql://...

# Auth (NextAuth)
AUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Supabase (image uploads)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Email (Resend)
RESEND_API_KEY=
```

> **Supabase Storage:** Create a public bucket named `cck-bucket` in your Supabase project under **Storage → Buckets**.

## Project Structure

```
src/
├── app/                  # Next.js App Router (45+ routes)
│   ├── admin/            # Admin panel (auth-protected)
│   ├── api/              # API routes
│   ├── community/        # Community hub (submissions, voting)
│   ├── events/           # Events listing and detail pages
│   ├── blog/             # Blog posts
│   ├── resources/        # Resource hub (7 sub-pages)
│   └── ...               # About, FAQ, Join, Projects, etc.
├── components/
│   ├── admin/            # Admin UI components
│   ├── community/        # Community hub components
│   ├── layout/           # Navbar, Footer, PageTransition
│   ├── sections/         # Page section components
│   ├── terminal/         # Terminal effects (typing, matrix, glitch)
│   └── ui/               # Reusable UI (Button, Card, Badge, etc.)
├── data/                 # Static TypeScript data files
├── lib/                  # Utilities, constants, RBAC, sanitization
└── generated/            # Prisma generated client
prisma/
├── schema.prisma         # Database schema
├── migrations/           # Migration history
└── seed.ts               # Database seeder
docs/
├── RELEASE_NOTES.md      # Version history
└── archive/              # Internal dev prompts (historical reference)
```

## Available Scripts

```bash
npm run dev          # Start development server (Turbopack)
npm run build        # Production build (prisma generate + next build)
npm run lint         # ESLint
npm run db:migrate   # Run Prisma migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed the database
```

## Contributing

Contributions are welcome! Please read the [Contributing Guide](./CONTRIBUTING.md) before submitting a pull request.

- Report bugs via [GitHub Issues](https://github.com/Spidey-Acer/Claude-Community-Kenya/issues)
- Request features via [GitHub Issues](https://github.com/Spidey-Acer/Claude-Community-Kenya/issues)
- Join the community on [Discord](https://discord.gg/CkD9QWjsHm)

## Community Links

| Platform | Link |
|----------|------|
| Discord | [discord.gg/CkD9QWjsHm](https://discord.gg/CkD9QWjsHm) |
| WhatsApp | [Join group](https://chat.whatsapp.com/Hpx42q1ADsrFNN3hHtZcQa) |
| Events (Nairobi) | [luma.com/sbsa789m](https://luma.com/sbsa789m) |
| Events (Mombasa) | [luma.com/vsf5re14](https://luma.com/vsf5re14) |

## License

[MIT](./LICENSE) — Claude Community Kenya, 2026.
