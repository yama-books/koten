import type { ComponentChildren } from 'preact';
export function ErrorScreen({ children }: { children?: ComponentChildren }) { return <main role="alert" class="error-screen"><h1>表示できませんでした</h1><p>{children ?? 'ページを読み込めませんでした。'}</p></main>; }
