import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeProvider";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import InstallPWMPopup from "@/components/InstallPWMPopup";
import NotificationPermissionPopup from "@/components/NotificationPermissionPopup";
import ServiceWorkerRegister from "@/modules/layout/ServiceWorkerRegister";
import { getUsuarioLogado } from "@/modules/usuarios/usuarios.actions";
import TermosChecker from "@/components/TermosChecker";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meu App",
  description: "Meu app Next.js com modo offline",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Meu App",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#09090b",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const usuario = await getUsuarioLogado()

  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var t = localStorage.getItem('theme');
                if (t === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ServiceWorkerRegister />
          <Navbar usuario={usuario ? { id: usuario.id, nome: usuario.nome } : null} />
          <MobileBottomNav usuario={usuario ? { id: usuario.id, nome: usuario.nome } : null} />
          <div className="h-[76px] hidden md:block" />
          <TermosChecker usuario={usuario}>
            <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-6 pb-24 md:py-10 md:pb-10">
              {children}
            </main>
          </TermosChecker>
        </ThemeProvider>
        <InstallPWMPopup />
        <NotificationPermissionPopup usuarioId={usuario?.id} />
      </body>
    </html>
  );
}
