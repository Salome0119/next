import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from '@/components/ui/Toast';
import { LanguageProvider } from '@/context/LanguageContext';
import { AvatarProvider } from '@/context/AvatarContext';
import { ThemeProvider } from '@/app/providers';
import Script from 'next/script';
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PlanAI - Gestión Inteligente de Tareas con IA",
    template: "%s | PlanAI",
  },
  description: "Plataforma de productividad con generador de tareas IA, planificación inteligente y colaboración en equipo",
  keywords: ["tareas", "productividad", "IA", "planificación", "equipo", "workspace", "colaboración"],
  authors: [{ name: "PlanAI" }],
  openGraph: {
    title: "PlanAI - Gestión Inteligente de Tareas con IA",
    description: "Organiza, planifica y ejecuta con inteligencia artificial",
    type: "website",
  },
  icons: {
    icon: "/file.svg",
    shortcut: "/file.svg",
    apple: "/file.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f19" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive" src="/theme-init.js" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <SessionProvider>
          <LanguageProvider>
            <ThemeProvider>
              <AvatarProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </AvatarProvider>
            </ThemeProvider>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}