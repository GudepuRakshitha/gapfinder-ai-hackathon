import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/providers/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GapFinder AI — Find What You Don't Know",
    template: "%s · GapFinder AI",
  },
  description:
    "GapFinder AI diagnoses knowledge gaps from your own syllabus, notes and past papers, then builds a revision plan that targets them.",
  applicationName: "GapFinder AI",
  keywords: [
    "learning gaps",
    "revision plan",
    "RAG",
    "AI tutor",
    "diagnostic quiz",
  ],
};

export const viewport: Viewport = {
  themeColor: "#6d4aff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f7f7fb] text-slate-900">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
