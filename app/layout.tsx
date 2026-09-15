import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IP 灵感库 · 账号定位、选题与脚本助手",
  description: "记住影视 AIGC 与 AI＋IP 学习账号的定位，生成选题、推荐理由和完整短视频脚本，让每次真实实践都有内容可写。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
