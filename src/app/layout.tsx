import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Silkscreen } from "next/font/google";
import "./globals.css";

// Silkscreen: 8px bitmap em, used ONLY at multiples of 8 (design/direction.md §Typography).
const silkscreen = Silkscreen({ variable: "--font-silkscreen", subsets: ["latin"], weight: "400" });
// Atkinson Hyperlegible 700: every element symbol, formula and small digit (slashed 0, open C).
const atkinson = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Secret Catalyst",
  description: "Scan elements hidden around campus. Synthesize compounds. Find the catalyst you're missing.",
};

export const viewport: Viewport = {
  themeColor: "#12302c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Day Shift is a manual toggle (organizer decision), remembered per device. Applied before paint to avoid a flash.
const SHIFT_SCRIPT = `try{if(localStorage.getItem("sc-shift")==="day")document.documentElement.dataset.shift="day"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${silkscreen.variable} ${atkinson.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SHIFT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
