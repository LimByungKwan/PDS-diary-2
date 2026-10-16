import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'플랜두씨 2 · 나만의 다이어리',description:'계획을 적고, 실제를 남기고, 다음 계획을 더 나답게.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
