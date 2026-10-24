import { build } from 'vite';
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'.cache/app-sync-build');
await build({root,configFile:false,define:{'import.meta.env.VITE_APP007_EMULATOR':JSON.stringify(process.env.VITE_APP007_EMULATOR||''),'import.meta.env.VITE_QR_SYNC_EMULATOR':JSON.stringify('')},build:{outDir:out,emptyOutDir:true,lib:{entry:path.join(root,'packages/shared/src/sync/static-sync.js'),name:'KotenSync',formats:['iife'],fileName:()=> 'sync.bundle.js'},rollupOptions:{output:{inlineDynamicImports:true}}}});
for(const app of ['conj','vintage-kana']){mkdirSync(path.join(root,app),{recursive:true});copyFileSync(path.join(out,'sync.bundle.js'),path.join(root,app,'sync.bundle.js'));}
