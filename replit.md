# Digital Signage Management Platform

## Overview

This is a digital signage management platform built for managing screens, media content, and scheduling displays. The application features an Arabic RTL interface designed for managing multiple display screens, uploading media content (images/videos), and scheduling content playback across different screens.

**Core Features:**
- Screen management (add, view, delete display screens)
- Media library (upload images/videos via file upload or URL)
- Content scheduling (assign media to screens with timing)
- Public player view for displaying scheduled content on screens
- Dashboard with analytics overview
- Subscription system with screen limits and pricing (screens x 50 SAR x years)
- Screen activation via /activate with 6-character codes
- **Super Admin Panel** for platform management

## Super Admin Panel

The admin panel (/admin) provides complete platform control for the owner:

### Access
- Accessed via Shield icon in sidebar (visible only to admins)
- Protected by `requireAdmin` middleware on backend
- Admin roles stored in `admins` table with user reference

### Admin Features
1. **Dashboard** (/admin) - System statistics and overview
2. **Users Management** (/admin/users) - View all users, add screens WITHOUT subscription (owner override)
3. **Invoices** (/admin/invoices) - Create/manage invoices, update payment status
4. **Subscriptions** (/admin/subscriptions) - View/create subscriptions for users
5. **Screens** (/admin/screens) - View all screens across all users
6. **Activity Log** (/admin/activity) - Audit trail of all admin actions
7. **Admins** (/admin/admins) - Manage admin accounts

### Admin Override Feature
Admin can add screens to users **without a subscription** - these screens:
- Are intentionally not subject to subscription expiry
- Bypass normal screen limit restrictions
- Are for platform owner to manually provision as needed

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme (purple/blue palette)
- **Animations**: Framer Motion for page transitions
- **Language/Layout**: Arabic language with RTL (right-to-left) support
- **Font**: Tajawal (Arabic-optimized Google Font)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints with typed route definitions in `shared/routes.ts`
- **Authentication**: Replit Auth integration via OpenID Connect (Passport.js)
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple
- **File Uploads**: Multer with disk storage to `public/uploads`

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` for shared types, `shared/models/auth.ts` for auth tables
- **Key Tables**:
  - `users` - User accounts (Replit Auth managed)
  - `sessions` - Session storage (required for Replit Auth)
  - `screens` - Display screen definitions
  - `mediaItems` - Uploaded media content
  - `schedules` - Content-to-screen assignments

### Build System
- **Development**: Vite dev server with HMR
- **Production Build**: esbuild for server, Vite for client
- **Output**: `dist/` directory with `index.cjs` (server) and `public/` (client assets)

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/ui/   # shadcn/ui components
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Route page components
│   └── lib/             # Utilities and query client
├── server/              # Express backend
│   ├── replit_integrations/auth/  # Replit Auth setup
│   ├── routes.ts        # API route handlers
│   └── storage.ts       # Database operations
├── shared/              # Shared types and schemas
│   ├── schema.ts        # Drizzle database schema
│   ├── routes.ts        # API route type definitions
│   └── models/auth.ts   # Auth-related tables
└── migrations/          # Drizzle database migrations
```

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with schema push (`npm run db:push`)

### Authentication
- **Replit Auth**: OpenID Connect integration for user authentication
- **Required Environment Variables**:
  - `DATABASE_URL` - PostgreSQL connection string
  - `SESSION_SECRET` - Express session encryption key
  - `ISSUER_URL` - OIDC issuer (defaults to Replit's OIDC)
  - `REPL_ID` - Replit environment identifier

### Third-Party Services
- **Google Fonts**: Tajawal font for Arabic typography

### Key NPM Dependencies
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `@tanstack/react-query` - Data fetching and caching
- `framer-motion` - Animation library
- `date-fns` - Date formatting (with Arabic locale support)
- `multer` - File upload handling
- `passport` / `openid-client` - Authentication