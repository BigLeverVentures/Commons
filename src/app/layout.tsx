import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import './globals.css'
import { APPEARANCE_SCRIPT } from '@/lib/appearance'
import { AppearanceControl } from '@/components/AppearanceControl'

const shareDescription = 'Where community members share ideas, offer help, and build things together.'
const shareImage = { url: 'https://commons.example.org/images/commons-share.png', width: 1200, height: 630, alt: 'Commons. The fellowship continues, here. A question, an offer, an idea — that’s where things start. A crowd of raised hands in many skin tones.' }

export const metadata: Metadata = {
  metadataBase: new URL('https://commons.example.org'),
  openGraph: { title: 'Commons — The fellowship continues, here.', description: shareDescription, url: 'https://commons.example.org/', siteName: 'Commons', type: 'website', images: [shareImage] },
  twitter: { card: 'summary_large_image', title: 'Commons — The fellowship continues, here.', description: shareDescription, images: [{ url: shareImage.url, alt: shareImage.alt }] },
  title: 'Commons community board',
  description: shareDescription,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} /></head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <div className="flex-1">{children}</div>
        <footer className="commons-footer mx-auto w-full max-w-6xl">
          <div className="commons-footer-art" aria-hidden="true">
            <Image src="/images/fellowship-footer.webp" alt="" width={2172} height={724} unoptimized loading="lazy" />
          </div>
          <div className="commons-footer-content page-inset">
            <div className="commons-footer-grid">
              <div>
                <p>
                  Support or login issues?{' '}
                  <a className="inline-block underline underline-offset-4" href="mailto:support@commons.example.org">
                    support@commons.example.org
                  </a>
                </p>
                <p className="commons-footer-note"><em>Please note that this is a volunteer effort; support and corrections are handled as capacity allows.</em></p>
              </div>
              <nav className="commons-footer-policies" aria-label="Policies">
                <Link href="/privacy">Privacy policy</Link>
                <Link href="/terms">Terms of service</Link>
              </nav>
            </div>
            <hr className="commons-footer-rule" />
            <p>
              Built and administered by{' '}
              <a className="underline underline-offset-4" href="https://bigleverventures.com/">
                Big Lever Ventures
              </a>{' '}
              as a volunteer contribution to the fellowship. Free to use.
            </p>
            <div className="footer-appearance"><AppearanceControl /></div>
          </div>
        </footer>
      </body>
    </html>
  )
}
