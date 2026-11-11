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
const surface = (process.env.APP_SURFACE ?? 'agent') as 'agent' | 'admin';

export default defineConfig({
  plugins: [react()],
  define: {
    // Exposée au client via import.meta.env : le client HTTP s'en sert pour
    // savoir vers quelle page de connexion ramener une session tombée.
    'import.meta.env.VITE_APP_SURFACE': JSON.stringify(surface),
  },
  build: {
    rollupOptions: {
      input:
        surface === 'admin'
          ? { admin: resolve(__dirname, 'admin.html') }
          : { index: resolve(__dirname, 'index.html') },
    },
    // Repère les bundles qui grossissent sans qu'on s'en aperçoive.
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: surface === 'admin' ? 5174 : 5173,
  },
});
