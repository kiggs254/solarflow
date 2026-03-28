# SolarFlow CRM

A production-ready SaaS CRM and solar proposal generator platform built with Next.js, TypeScript, Tailwind CSS, and PostgreSQL.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Auth.js v5 (email/password with role-based access)
- **Maps**: Google Maps JavaScript API + Google Solar API
- **PDF**: @react-pdf/renderer
- **Charts**: Recharts
- **Data Fetching**: SWR

## Features

- **Dashboard** with metrics: total leads, conversion rate, revenue, active installations
- **CRM Pipeline** with drag-style board view and table view (New Lead → Won/Lost)
- **Project Management** with task tracking per project (Design → Completed)
- **Solar Analysis** workspace with Google Maps integration, building insights, and roof overlays
- **System Design Engine** for panel/battery/inverter configuration with real-time calculations
- **Financial Model** calculating install cost, savings, payback period, and 25-year ROI
- **Proposal Generator** with downloadable PDF including customer info, system specs, and financials
- **Role-based Access** (Admin and Sales Rep roles)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google Maps API key (optional, mock data available)
- Google Solar API key (optional, mock data available)

### Setup

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

```bash
cp .env.example .env
# Edit .env with your database URL and API keys
```

3. **Set up the database:**

```bash
npm run db:push
npm run db:seed
```

4. **Start the development server:**

```bash
npm run dev
```

5. **Open** [http://localhost:3000](http://localhost:3000)

### Demo Credentials

| Role      | Email                | Password    |
|-----------|----------------------|-------------|
| Admin     | admin@solarflow.com  | password123 |
| Sales Rep | sarah@solarflow.com  | password123 |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login page
│   ├── (dashboard)/        # Protected dashboard pages
│   └── api/                # API route handlers
├── components/
│   ├── ui/                 # Reusable UI primitives
│   ├── layout/             # Sidebar, topbar, mobile nav
│   ├── dashboard/          # Dashboard widgets
│   ├── leads/              # Lead components
│   ├── projects/           # Project components
│   ├── proposals/          # Proposal components + PDF
│   ├── solar/              # Solar map + analysis
│   └── tasks/              # Task components
├── hooks/                  # SWR-based data hooks
├── lib/                    # Utilities, auth, API clients
└── types/                  # TypeScript type definitions
```

## API Routes

| Endpoint                          | Methods           | Description          |
|-----------------------------------|-------------------|----------------------|
| `/api/leads`                      | GET, POST         | List/create leads    |
| `/api/leads/[id]`                | GET, PUT, DELETE   | Lead CRUD            |
| `/api/projects`                   | GET, POST         | List/create projects |
| `/api/projects/[id]`             | GET, PUT, DELETE   | Project CRUD         |
| `/api/proposals`                  | GET, POST         | List/create proposals|
| `/api/proposals/[id]`            | GET, PUT, DELETE   | Proposal CRUD        |
| `/api/proposals/[id]/pdf`        | GET               | Download proposal PDF|
| `/api/tasks`                      | GET, POST         | List/create tasks    |
| `/api/tasks/[id]`               | GET, PUT, DELETE   | Task CRUD            |
| `/api/solar/building-insights`   | GET               | Solar API proxy      |
| `/api/dashboard/stats`           | GET               | Dashboard metrics    |

## Scripts

| Command           | Description                              |
|-------------------|------------------------------------------|
| `npm run dev`     | Start development server                 |
| `npm run build`   | Build for production                     |
| `npm run start`   | Start production server                  |
| `npm run db:push` | Push schema to database                  |
| `npm run db:seed` | Seed database with sample data           |
| `npm run db:studio` | Open Prisma Studio                     |
| `npm run db:reset` | Reset database and re-seed              |
