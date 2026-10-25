# Quick Correction

Board-pattern practice papers for tuition centres, home tutors and parents. A teacher makes a CBSE paper by chatting with the assistant and assigns it. The child writes it by hand, the parent uploads photos of the pages, AI marks every answer, and the teacher checks the marks. Progress is tracked chapter by chapter.

Built on the [Bloom](https://github.com/bloomneo/bloom) `adminapp` template (React + `@bloomneo/uikit` frontend, Express + `@bloomneo/appkit` backend).

## Setup

```bash
npm install
npx prisma db push        # SQLite dev database (prisma/dev.db)
npm run db:seed:qc        # demo teacher, parent, 6 students, 3 papers
npm run dev               # web on :5173, API on :3000
```

`.env` needs `DATABASE_URL`, `BLOOM_AUTH_SECRET` and `DEFAULT_USER_PASSWORD` (the seed's password for the demo accounts). `bloom create` generated these; `.env` is git-ignored.

Demo accounts: `teacher@quickcorrection.app` and `parent@quickcorrection.app`, password `DEFAULT_USER_PASSWORD`.

## What is real and what is not yet

| Part | State |
|---|---|
| Clickable prototype at `/demo` | Done. Sample data in the browser, scripted chat and voice, simulated marking. Not wired to the API yet. |
| API: teacher and parent | Done. `/api/tutor` and `/api/parent`, see [docs/quick-correction-api.md](docs/quick-correction-api.md). |
| Answer-page uploads | Done. Stored with appkit storage (local `./uploads` in dev, S3/R2 in prod), served only through owner-checked routes. |
| Marking queue | Done. appkit queue, database transport, so jobs survive a restart. |
| AI marking | **Placeholder.** `markAnswerPages()` in `src/api/lib/qc/marking.ts` returns plausible marks and says "Placeholder marking" in the summary. The vision model plugs in there. |
| Question bank | CBSE Class 10 Maths only, in code (`src/api/lib/qc/question-bank.ts`). To move into the database. |
| Payments, earnings | Not started (the Earnings tab is sample data). |

## Clickable prototype (`/demo`)

No sign-in. Pick a role on `/demo`, or switch with **Settings → View as**.

| Role | Tabs |
|---|---|
| Teacher | **Assistant** (make papers by chat or voice, "to review" and "not in yet" cards), **Papers**, **Students** (batch weak chapters), **Earnings** (sample) |
| Parent | **Assistant** (upload, latest result, how is my child doing, what to revise), **Papers**, **Corrections**, **Progress** |

Code: `src/web/features/demo/` and `src/web/shared/layout.demo.tsx`.

---

**A modern React FBCA Application built with @bloomneo/uikit**

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎨 UIKit FBCA Features

This Feature-Based Component Architecture application is built with [@bloomneo/uikit](https://github.com/bloomneo/uikit) featuring:

- **37 UI Components** - Forms, tables, navigation, overlays, and more
- **5 Professional Themes** - Base, Elegant, Metro, Studio, Vivid
- **5 Layout Systems** - Admin, Auth, Page, Popup, Blank layouts
- **FBCA Architecture** - Scalable feature-based organization
- **Theme System** - Light/dark mode with semantic OKLCH colors
- **TypeScript Support** - Full type safety out of the box
- **SEO Optimization** - Built-in SEO components and hooks

## 🏗️ Project Structure (FBCA)

```
medhamark/
├── src/web/
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Application entry point
│   ├── index.html          # HTML entry point
│   ├── styles/
│   │   └── index.css       # Tailwind CSS v4+ and UIKit styles
│   ├── lib/
│   │   └── page-router.tsx # Custom router implementation
│   ├── features/           # Feature-based organization
│   │   ├── main/           # Main feature
│   │   │   ├── pages/      # Feature pages
│   │   │   └── components/ # Feature components
│   │   ├── auth/           # Authentication feature
│   │   ├── gallery/        # Gallery feature
│   │   └── docs/           # Documentation feature
│   ├── shared/             # Shared components and utilities
│   │   ├── components/     # Shared components
│   │   │   ├── Header.tsx  # Navigation header
│   │   │   ├── Footer.tsx  # Footer component
│   │   │   ├── SEO.tsx     # SEO component
│   │   │   └── index.ts    # Component exports
│   │   └── hooks/          # Shared hooks
│   │       └── useSEO.ts   # SEO hook
│   └── utils/
│       └── asset.ts        # Asset utility for deployment paths
├── public/                 # Static assets
├── docs/                   # Documentation guides
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## 🎯 Development Commands

```bash
npm run dev         # Start development server (localhost:5173)
npm run build       # Build for production
npm run preview     # Preview production build
npm run deploy:gh   # Deploy to GitHub Pages
```

## 🎨 Theme Customization

Change your theme by updating the ThemeProvider in `src/web/main.tsx`:

```jsx
<ThemeProvider theme="elegant" mode="light">
  <App />
</ThemeProvider>
```

Available themes: `base` | `elegant` | `metro` | `studio` | `vivid`
Available modes: `light` | `dark`

## 📦 Built With

- **[React 19](https://react.dev)** - UI library
- **[TypeScript](https://typescriptlang.org)** - Type safety
- **[Vite](https://vitejs.dev)** - Build tool and dev server
- **[Tailwind CSS v4+](https://tailwindcss.com)** - Utility-first CSS framework
- **[@bloomneo/uikit](https://github.com/bloomneo/uikit)** - UI components and layouts
- **[Lucide React](https://lucide.dev)** - Icon library

## 🏗️ FBCA Architecture

The Feature-Based Component Architecture (FBCA) organizes code by features rather than technical layers:

- **Features** - Self-contained feature modules
- **Shared** - Reusable components and utilities
- **Lib** - Custom libraries and utilities
- **Scalable** - Easy to add new features and maintain

## 🌐 Asset Management

Use the included asset utility for deployment-friendly paths:

```jsx
import { asset } from '../utils/asset';

// Works in both development and production deployments
<img src={asset('/images/hero.jpg')} alt="Hero" />
<link rel="icon" href={asset('/favicon.ico')} />
```

## 📚 Resources

- **[UIKit Documentation](https://docs.anthropic.com/en/docs/claude-code/claude_code_docs_map.md)** - Complete component reference
- **[UIKit LLM Guide](./docs/uikit.md)** - Comprehensive usage guide
- **[React Documentation](https://react.dev)** - React framework guide
- **[Vite Documentation](https://vitejs.dev)** - Build tool documentation
- **[FBCA Guide](./docs/QUICKSTART_FBCA.md)** - Feature-based architecture guide

---

**Built with ❤️ using [@bloomneo/uikit](https://github.com/bloomneo/uikit)** ✨