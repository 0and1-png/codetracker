import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '仙码录 - 少儿编程修炼追踪',
    template: '%s | 仙码录',
  },
  description: '少儿编程学习追踪系统，记录学习历程，生成月度报告',
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
