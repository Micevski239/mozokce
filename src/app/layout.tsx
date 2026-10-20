import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Onest } from "next/font/google";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const onest = Onest({ variable: "--font-onest", subsets: ["latin", "cyrillic"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Мозокче",
  description: "Систем за учење: предмети, квизови и напредок на едно место.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9eef7" },
    { media: "(prefers-color-scheme: dark)", color: "#070d1a" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="mk"
      data-theme={theme === "system" ? undefined : theme}
      className={`${onest.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <div className="sky" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </div>
        {children}
      </body>
    </html>
  );
}
