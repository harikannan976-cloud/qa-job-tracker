import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'QA Job Tracker',
  description: 'AI-powered job search automation dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.className}`}>
      <body className="min-h-full bg-[#0a0a0f]">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#1c1c28',
              border: '1px solid #2a2a3a',
              color: '#e4e4e7',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}
