import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Pixel Art to Assembly Code Converter | Image to x86 ASM Generator",
  description:
    "Convert pixel art images into x86 assembly code for DOSBox. Generate ASCII art, spreadsheet data, and executable assembly programs from your images. Free online tool for retro programming and pixel art conversion.",
  keywords: [
    "pixel art to assembly",
    "image to assembly code",
    "x86 assembly generator",
    "DOSBox assembly",
    "pixel art converter",
    "ASCII art generator",
    "retro programming",
    "assembly code from image",
    "DOS programming",
    "pixel art to executable",
    "image to ASM",
    "assembly art generator",
  ],
  authors: [{ name: "Pixel Art to Assembly Converter" }],
  creator: "Pixel Art to Assembly Converter",
  publisher: "Pixel Art to Assembly Converter",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://your-domain.com",
    title: "Pixel Art to Assembly Code Converter | Turn Images into x86 ASM",
    description:
      "Revolutionary tool that converts pixel art images into executable x86 assembly code for DOSBox. Create retro programs from your artwork with ASCII art and spreadsheet export options.",
    siteName: "Pixel Art to Assembly Converter",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pixel Art to Assembly Code Converter - Transform images into executable assembly programs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pixel Art to Assembly Code Converter | Image to x86 ASM",
    description:
      "Convert pixel art into executable x86 assembly code for DOSBox. Generate ASCII art and retro programs from your images.",
    images: ["/og-image.png"],
    creator: "@your-twitter-handle",
  },
  alternates: {
    canonical: "https://your-domain.com",
  },
  category: "Technology",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Pixel Art to Assembly Code Converter",
              description:
                "Convert pixel art images into executable x86 assembly code for DOSBox, ASCII art, and spreadsheet data",
              url: "https://your-domain.com",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web Browser",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "Convert images to x86 assembly code",
                "Generate ASCII art from pixel art",
                "Export to spreadsheet formats",
                "DOSBox compatible assembly output",
                "Multiple character sets and block styles",
                "Customizable shade mapping for DOS display",
              ],
              screenshot: "https://your-domain.com/screenshot.png",
              softwareVersion: "1.0",
              author: {
                "@type": "Organization",
                name: "Pixel Art to Assembly Converter",
              },
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
