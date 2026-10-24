# MedhaMark

Board-pattern test papers for schools, students and parents. A school generates a CBSE paper and assigns it. Students download it, write their answers by hand and upload photos. AI marks every answer, and progress is tracked chapter by chapter.

Built on the [Bloom](https://github.com/bloomneo/bloom) `adminapp` template (React + `@bloomneo/uikit` frontend, Express + `@bloomneo/appkit` backend).

## Clickable prototype (`/demo`)

```bash
npm install
npx prisma db push
npm run dev            # open http://localhost:5173/demo
```

No sign-in needed. Pick a role on `/demo`, or switch roles with **View as …** in the header.

| Role | What you can try |
|---|---|
| School / Teacher | Overview with class average, **Generate paper** (unit test or full board pattern, choose chapters), preview and **Download PDF**, **Assign** to students with a due date, see the student list and each student's progress report |
| Student | Assigned tests, download the paper, **upload photos** of answer sheets (camera on phones), submit, watch the AI correction run, see question-wise marks and feedback, open *My progress* |
| Parent | Child overview: latest result compared with the class, pending tests, score trend, chapter mastery, AI study suggestions |

Prototype scope, so nothing here is real yet:
- Data is sample data in the browser, saved in `localStorage`. Use **Reset demo data** in the sidebar to start over.
- Only **CBSE Class 10 Mathematics** has a question bank (`src/web/features/demo/data/questions.ts`). The other subjects are listed as "coming soon".
- AI correction is **simulated**: it takes about 4.5 s and returns made-up marks and feedback. "Download PDF" opens the browser's print dialog, which can save the paper as a PDF.

Code lives in `src/web/features/demo/` (pages, components, data) and `src/web/shared/layout.demo.tsx`. Screenshots are in `docs/screenshots/`.

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