import type { Metadata } from 'next';
import './globals.css';

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
        {children}
      </body>
    </html>
  );
}
