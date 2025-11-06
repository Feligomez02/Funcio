import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { SupabaseAuthListener } from "@/components/auth/supabase-auth-listener";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Functional Analyst Portal",
  description:
    "Secure workspace for capturing, improving, and auditing functional requirements with open-source AI.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale} className="bg-slate-50">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider locale={locale} dictionary={dictionary}>
          <SupabaseAuthListener />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
