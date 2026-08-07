import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    default: '少儿编程成长馆 - 记录每一步成长',
    template: '%s | 少儿编程成长馆',
  },
  description: '少儿编程学习追踪系统，记录成长历程，生成月度报告',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <nav className="sticky top-0 z-50 bg-[#1e293b] text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm">
                仙
              </div>
              <span className="text-lg font-semibold tracking-wide">仙码录</span>
              <span className="text-xs text-blue-300/80 ml-2 hidden sm:inline">CodeTracker</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-blue-200">
              <Link href="/" className="hover:text-white transition-colors">工作台</Link>
              <Link href="/courses" className="hover:text-white transition-colors">课程管理</Link>
            </div>
          </div>
        </nav>
        <main className="min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </body>
    </html>
  );
}
