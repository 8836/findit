# FindIt — Lost & Found Registry

FindIt is a modern, full-stack lost & found registry. It lets people report lost
or found items, browse a community registry, track claim status, and interact
with the same data through a polished web dashboard, **WhatsApp**, and
**Telegram** bots.

> **Status:** actively maintained demo-quality application built with Next.js,
> Firebase, Cloudinary, Twilio, and Telegram.

---

## ✨ Features

- **World-class UI** — a cohesive design system, responsive layout, accessible
  forms, live search/filter, and polished empty/loading states.
- **Authentication** — signup, login, and password reset via Firebase Auth with
  friendly, localized error messages.
- **Report items** — report a lost **or** found item with an optional photo.
- **Public registry** — browse every reported item with pagination and search.
- **Dashboard** — manage your reports: edit, delete, and mark items as claimed.
- **Profile** — a clean summary of your reports and activity.
- **Support** — submit support tickets with priority levels from the web app.
- **WhatsApp bot** — report, search, claim, and create support tickets.
- **Telegram bot** — same full conversation flow plus photo support.
- **Signal bot** — the same flow through `signal-cli-rest-api` for Signal users.
- **Cloudinary uploads** — validated image uploads with size and type limits.
- **Email notifications** — a Firebase Function emails the reporter when their
  item is claimed (email contacts only).

---

## 🧱 Tech stack

| Layer            | Technology                                                   |
| ---------------- | ------------------------------------------------------------ |
| Framework        | Next.js 16 (App Router) + React 19                          |
| Styling          | Tailwind CSS v4 + custom design tokens                       |
| BaaS             | Firebase (Auth, Firestore, Cloud Functions)                  |
| Image hosting    | Cloudinary                                                   |
| Messaging        | Twilio WhatsApp, Telegram Bot API, Signal via signal-cli-rest-api |
| Notifications    | Nodemailer over Gmail (Firebase Function)                    |
| Icons            | Lucide                                                       |
| Lint / Types     | ESLint (Next core-web-vitals + TS) and TypeScript            |

---

## 🚀 Getting started

### Prerequisites

- Node.js **20.9+** and npm
- A Firebase project (Auth + Firestore enabled)
- A Cloudinary account (optional for reports without images)
- A Telegram bot token from [@BotFather](https://t.me/BotFather) (optional)
- A Twilio account + WhatsApp sandbox (optional)

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your own values:

```bash
cp .env.example .env.local
```

Every value is documented in [`.env.example`](./.env.example).

> The original `findit` repository never committed its `.env*` files (they are
> gitignored), so a fresh clone cannot contain the real API keys / tokens.
> The recoverable, real public identifiers that ARE in the repository are:
>
> - Firebase project ID: `findit-dac3b` (in `.firebaserc`)
> - Public deploy origin: `https://findit-amber.vercel.app` (was hardcoded in
>   the original bot route)
> - Telegram bot username intent: `findit_bot`
>
> Wire the remaining secret values from your own Firebase / Cloudinary /
> Telegram / Twilio / Signal / email accounts into `.env.local`. Run
> `GET /api/health` after starting the server to see exactly which services are
> configured and which values are still missing (only public identifiers are
> shown; secrets are never returned).

> `lib/firebase.ts` fails fast with a clear message if the Firebase web
> configuration is missing or still placeholder-filled, so the app never runs
> silently against bad credentials.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Build & type-check

```bash
npm run lint
npm run typecheck
npm run build
```

---

## 📁 Project structure

```text
app/
  components/          App-level component (navbar, auth shell, UI kit)
    ui/                Design system primitives (Button, Card, Badge, ...)
  api/
    bots/telegram/     Telegram webhook
    bots/whatsapp/     Twilio WhatsApp webhook
    bots/signal/       Signal webhook (signal-cli-rest-api)
    upload/            Cloudinary upload endpoint
    health/            /api/health
  dashboard/           Authenticated dashboard
  profile/             User profile summary
  registry/            Public lost & found registry
  report/              Report a lost/found item
  support/             Support ticket form
lib/
  bot-service.ts       Shared bot conversation engine
  signal-client.ts     Signal (signal-cli-rest-api) webhook/outbound helpers
  firebase.ts          Firebase (web SDK) initialization + auth error map
  items.ts             Item type + date helpers
  notify.ts            Toast helpers
  utils.ts             Misc helpers
functions/
  src/index.ts         Firebase Function (claim email notification)
.firebaserc            Firebase project alias
firebase.json          Firebase deployment configuration
firestore.rules        Firestore security rules
firestore.indexes.json Composite indexes used by the app
```

---

## 🤖 Bot setup

See [BOT_SETUP.md](./BOT_SETUP.md) for detailed Twilio + Telegram
configuration, webhook URLs, and testing.

Quick links:

- Telegram webhook: `/api/bots/telegram`
- WhatsApp webhook: `/api/bots/whatsapp`
- Signal webhook: `/api/bots/signal`
- Health check: `/api/health`

---

## ☁️ Deployment

### Vercel

The Next.js app deploys to Vercel as-is. Set all `NEXT_PUBLIC_*` and server-side
environment variables in the Vercel project settings, then deploy.

### Firebase Functions

```bash
cd functions
npm install
npm run build
npm run deploy
```

Functions use `firebase-admin` and read `EMAIL_USER` / `EMAIL_PASS` from the
function environment. Deploy with environment variables configured in your
Firebase project (Functions → Runtime settings → Environment variables).

---

## 🔐 Security notes

- `firestore.rules` keeps registry reads public, requires authenticated users to
  write items under their own `uid`, and permits the current bot webhooks to
  write bot records.
- For production, we recommend migrating the bot webhooks to the **Firebase
  Admin SDK** and then tightening `firestore.rules` to remove the unauthenticated
  bot grant.
- Uploads are validated by MIME type, size (5 MB), and Cloudinary upload.

---

## 🛠 Available scripts

| Command              | Description                               |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Start the Next.js dev server              |
| `npm run build`      | Create a production build                 |
| `npm run start`      | Start the production server               |
| `npm run lint`       | Run ESLint                                |
| `npm run typecheck`  | Run the TypeScript type checker           |
| `npm run test`       | Run the unit/integration tests            |
| `npm run test:watch` | Run tests in watch mode                   |
| `npm run test:coverage` | Run tests with coverage report        |
| `npm run check`      | Run lint + typecheck                      |
| `npm run ci`         | Run lint + typecheck + tests              |

---

## 🤝 Contributing

1. Create a feature branch from `arena/01a03b83-findit`.
2. Make your change, keeping `npm run check` clean.
3. Open a pull request with a clear summary.

---

## License

Private project. All rights reserved.
