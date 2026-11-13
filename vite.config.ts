import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Deux interfaces, deux builds, à partir d'UNE seule base de code.
//
// `APP_SURFACE` (variable d'environnement de build) choisit le point d'entrée :
//   agent  -> index.html  + src/main.tsx        (interface du personnel, PWA)
//   admin  -> admin.html  + src/main-admin.tsx  (console d'administration)
//
// Deux conteneurs distincts sont produits et servis sur deux noms d'hôte, ce
// qui isole les cookies de session : du script hostile exécuté dans
// l'interface agent ne peut ni lire ni rejouer la session d'administration.
// Le code partagé (client HTTP, thème, types) reste partagé — une duplication
// du code aurait fait dériver les deux interfaces.
//
// `--mode admin` produit aussi le build admin : contrairement à une variable
// posée en ligne de commande, il marche à l'identique sous Windows et Linux,
// ce dont le script build:all a besoin.
export default defineConfig(({ mode }) => {
  // `--mode admin` l'emporte sur APP_SURFACE : le projet Vercel de l'interface
  // du personnel définit APP_SURFACE=agent, ce qui ne doit pas transformer le
  // second build de build:all en interface agent.
  const surface: 'agent' | 'admin' =
    mode === 'admin' ? 'admin' : process.env.APP_SURFACE === 'admin' ? 'admin' : 'agent';
  const input: Record<string, string> =
    surface === 'admin'
      ? { admin: resolve(__dirname, 'admin.html') }
      : { index: resolve(__dirname, 'index.html') };

  return {
  plugins: [react()],
  define: {
    // Exposée au client via import.meta.env : le client HTTP s'en sert pour
    // savoir vers quelle page de connexion ramener une session tombée.
    'import.meta.env.VITE_APP_SURFACE': JSON.stringify(surface),
  },
  build: {
    rollupOptions: {
      input,
    },
    // Repère les bundles qui grossissent sans qu'on s'en aperçoive.
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: surface === 'admin' ? 5174 : 5173,
  },
  };
});
