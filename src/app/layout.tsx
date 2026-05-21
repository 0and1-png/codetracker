import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '仙码录 - 少儿编程修炼追踪',
    template: '%s | 仙码录',
  },
  description: '记录弟子编程修炼历程，生成宗门月度飞剑传书',
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
