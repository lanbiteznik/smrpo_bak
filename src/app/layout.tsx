"use client";
import { usePathname } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./bootstrap";
import AppNavbar from "../components/AppNavbar";
import ClientProvider from "../components/login/ClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  const pathname = usePathname();
  
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>SMRPO SCRUM</title>
        <meta name="description" content="Project Management App" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientProvider>
          {pathname !== "/signin" && <AppNavbar />}
          {children}
        </ClientProvider>
      </body>
    </html>
  );
}
