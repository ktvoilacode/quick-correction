import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
/**
 * Page discovery is `import.meta.glob`, which Vite resolves when it transforms
 * page-router.tsx — ONCE. Create a new page while the dev server is running and
 * the glob is never re-evaluated, so the route simply does not exist.
 *
 * The symptom is the worst kind: a silent 404. Or, if a sibling dynamic route
 * exists, something more confusing still — a new `pages/new.tsx` gets swallowed
 * by `pages/[id].tsx` and the page reports "invalid id" for a file that is
 * sitting right there on disk, correctly written.
 *
 * Nothing about that points at the dev server. So watch the page directories
 * and invalidate the router whenever the set of page files changes.
 */
function bloomPageRouterHmr(): Plugin {
  const isPage = (file: string) => /[\\/]features[\\/][^\\/]+[\\/]pages[\\/].*\.(tsx|jsx)$/.test(file);

  return {
    name: 'bloom:page-router-hmr',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      const refresh = (file: string) => {
        if (!isPage(file)) return;

        // Invalidate every module that ran the glob, then reload: the glob is
        // baked into the transformed source, so re-running it means re-transforming.
        let invalidated = 0;
        for (const [id, mod] of server.moduleGraph.idToModuleMap) {
          if (/page-router\.(tsx|jsx|ts|js)$/.test(id)) {
            server.moduleGraph.invalidateModule(mod);
            invalidated++;
          }
        }
        if (!invalidated) return;

        server.config.logger.info(
          `  \x1b[32m[bloom]\x1b[0m page routes changed — reloading (${path.basename(file)})`,
        );
        server.ws.send({ type: 'full-reload', path: '*' });
      };

      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}

export default defineConfig({
  // base: '/', // Uncomment this line to make the default asset loading to '/' rather than relative paths
  plugins: [react(), tailwindcss(), bloomPageRouterHmr()],
  root: 'src/web',

  /*
   * Vite's `envDir` defaults to `root`. With root at src/web, Vite looks for
   * src/web/.env and never reads the project's own .env — so every VITE_*
   * variable silently falls back to whatever default the code supplies.
   *
   * That is exactly the failure this template ships VITE_API_URL to prevent,
   * and it hid for two releases because the fallback (localhost:3000) happened
   * to match where the API runs by default. It only surfaced on a real project
   * whose API was on another port.
   */
  envDir: __dirname,
  // `root` is src/web, so a relative publicDir would resolve to src/web/public.
  // The template keeps static assets at the project root, so point at it
  // explicitly. This was `false`, which meant /public was never served at all —
  // the self-hosted fonts 404'd and every page silently fell back to the system
  // stack, with only an "OTS parsing error" in the console to show for it.
  publicDir: path.resolve(__dirname, 'public'),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/web"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: '../../dist',
    sourcemap: true,
    emptyOutDir: false, // Don't clear dist since API files are also there
    assetsDir: 'assets', // Put all assets in assets/ subdirectory
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          uikit: ['@bloomneo/uikit']
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Put public assets (favicon, images) in public/ subdirectory
          const nameParts = assetInfo.name?.split('.');
          const extType = nameParts ? nameParts[nameParts.length - 1] : '';
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return 'public/[name]-[hash].[ext]';
          }
          // Put CSS and other assets in assets/
          return 'assets/[name]-[hash].[ext]';
        }
      }
    }
  }
})