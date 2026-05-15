import type { Metadata, Viewport } from 'next'
import ScrollProgress from '@/app/components/ScrollProgress'
import ShareFab from '@/app/components/ShareFab'
import Search from '@/app/components/Search'
import { siteConfig } from '@/site.config'
import './globals.css'

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
}

export const viewport: Viewport = {
  viewportFit: 'cover',
}

const largeTextScript = `
try {
  if (localStorage.getItem('blog-large-text') === 'true') {
    document.documentElement.dataset.largeText = 'true'
  } else {
    delete document.documentElement.dataset.largeText
  }
} catch {}
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: largeTextScript }} />
        <ScrollProgress />
        {children}
        <ShareFab />
        <Search />
      </body>
    </html>
  )
}
