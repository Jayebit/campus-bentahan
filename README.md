# Campus Bentahan

A university-exclusive peer-to-peer marketplace for students and faculty.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase Managed PostgreSQL
- **Authentication**: Supabase Auth
- **Realtime**: Supabase Realtime

## Project Structure

```
src/
├── app/           # App Router pages
│   ├── layout.tsx
│   └── page.tsx
├── components/    # UI components
│   ├── ui/        # shadcn/ui components
│   ├── providers/ # Context providers
│   └── search-bar.tsx
├── lib/           # Utilities and clients
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── utils.ts
└── types/         # TypeScript types
    └── supabase.ts
```

## Development

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests with Vitest
npm run type-check   # Run TypeScript type check
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | Application URL |
| `NEXT_PUBLIC_UNIVERSITY_DOMAIN` | Allowed university domain |

## License

MIT