import { appConfig } from '@koten/shared/app-config';

export function Home() { return <main class="home"><h1>{appConfig.products.kanazukai.displayName}</h1><p>歴史的仮名遣いを確認するための準備中の画面です。</p><p>単語モードは横書きで提供します。</p></main>; }
