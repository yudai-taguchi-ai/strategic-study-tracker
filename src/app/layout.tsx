import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/LogoutButton'
import Link from 'next/link'

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'Study Tracker',
    description: 'Cloud-synced smart learning platform',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Study Tracker',
    },
}

export const viewport = {
    themeColor: '#000000',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    const user = data?.user

    return (
        <html lang="ja" className={`dark ${inter.className}`}>
            <body className="bg-surface-0 min-h-screen">
                <nav className="max-w-7xl mx-auto px-6 py-6 md:px-12 flex justify-between items-center border-b border-surface-3 mb-4">
                    <Link href="/" className="text-2xl font-black tracking-tighter hover:opacity-80 transition-opacity">
                        Study Tracker
                    </Link>
                    {user && <LogoutButton />}
                </nav>
                <main className="max-w-7xl mx-auto px-6 py-4 md:px-12">
                    {children}
                </main>
            </body>
        </html>
    )
}
