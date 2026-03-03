import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // 環境変数が欠落している場合にクラッシュさせず、エラーをコンソールに出す
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('CRITICAL: Supabase environment variables are missing or incorrect!')
        // ダミーのクライアントを返すか、エラーを投げる
    }

    return createServerClient(
        supabaseUrl || '',
        supabaseAnonKey || '',
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: any) {
                    try {
                        cookieStore.set(name, value, options)
                    } catch (error) {
                        // Server Component
                    }
                },
                remove(name: string, options: any) {
                    try {
                        cookieStore.set(name, '', { ...options, maxAge: 0 })
                    } catch (error) {
                        // Server Component
                    }
                },
            },
        }
    )
}
