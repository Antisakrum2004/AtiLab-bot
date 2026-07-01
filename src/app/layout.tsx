import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Unbounded } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
});

const unbounded = Unbounded({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Айти Лаб Bot — Панель управления",
  description: "EOD Inspector для Bitrix24: сводка, напоминания, рейтинг продуктивности",
  keywords: ["EOD", "Bitrix24", "Inspector", "Айти Лаб Bot"],
  authors: [{ name: "AtiLab-bot" }],
  openGraph: {
    title: "Айти Лаб Bot — Панель управления",
    description: "EOD Inspector для Bitrix24: сводка, напоминания, рейтинг продуктивности",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Айти Лаб Bot",
    description: "EOD Inspector для Bitrix24",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${jetbrainsMono.variable} ${unbounded.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
