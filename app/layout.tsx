import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "TaskFlow - Dashboard de Tareas con IA",
    template: "%s | TaskFlow",
  },
  description: "Aplicación de gestión de tareas con generador de texto IA integrado",
  keywords: ["tareas", "todo", "IA", "generador", "productividad"],
  authors: [{ name: "TaskFlow" }],
  openGraph: {
    title: "TaskFlow - Dashboard de Tareas con IA",
    description: "Gestiona tus tareas y genera contenido con IA",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-900 text-slate-100">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
