import type { Metadata } from "next";
import { JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"], 
  variable: "--font-jetbrains",
});

const fraunces = Fraunces({ 
  subsets: ["latin"], 
  variable: "--font-fraunces",
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: "DASH FINANCE — MARIANNE Éducation",
  description: "Dashboard de pilotage poste client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn(jetbrainsMono.variable, fraunces.variable)}>
      <body className="antialiased bg-bg-0 text-text-0 font-mono">
        {children}
      </body>
    </html>
  );
}
