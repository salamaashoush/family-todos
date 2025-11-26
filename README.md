# Family Todos

A simple, open-source task management app for families. Organize household chores, track progress, and motivate kids with points and rewards.

## Features

- **Family Members** - Add members with custom avatars and colors
- **Time Slots** - Organize tasks by morning, afternoon, evening, or custom schedules
- **Shareable Links** - Share a private link with your family - kids can check off tasks without creating accounts
- **Points & Rewards** - Earn points for completing tasks, redeem for custom rewards
- **Achievements** - Unlock badges for streaks and milestones
- **Real-time Updates** - See task completions instantly across all devices
- **PWA Support** - Install as an app on mobile devices

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Email**: [Resend](https://resend.com/)
- **Runtime**: [Bun](https://bun.sh/)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Docker](https://www.docker.com/) (for PostgreSQL)

### Development

1. Clone the repository:
   ```bash
   git clone https://github.com/salamaashoush/family-todos.git
   cd family-todos
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the database:
   ```bash
   docker compose up -d
   ```

4. Run database migrations:
   ```bash
   bun run db:push
   ```

5. Start the development server:
   ```bash
   bun run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/family_todos

# Session
SESSION_SECRET=your-secret-key-at-least-32-characters

# Email (optional - for password reset and email verification)
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=noreply@yourdomain.com
APP_URL=http://localhost:3000
```

## Production

### Build

```bash
bun run build
```

### Run

```bash
bun run start
```

### Docker

```bash
docker build -t family-todos .
docker run -p 3000:3000 --env-file .env family-todos
```

## Database

### Migrations

Generate a migration after schema changes:
```bash
bun run db:generate
```

Apply migrations:
```bash
bun run db:push
```

Open Drizzle Studio:
```bash
bun run db:studio
```

## License

MIT
