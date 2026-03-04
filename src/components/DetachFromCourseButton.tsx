'use client'

import { useState } from 'react'
import { ExternalLink, Loader2, ArrowUpRight } from 'lucide-react'
import { detachMaterialFromCourse } from '@/app/actions'
import { useRouter } from 'next/navigation'

export default function DetachFromCourseButton({ id, variant = 'default' }: { id: string, variant?: 'default' | 'icon' }) {
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    async function handleDetach() {
        if (!confirm('この教材を講座の外（メイン画面）に移動しますか？')) return

        setIsPending(true)
        try {
            await detachMaterialFromCourse(id)
            router.refresh()
        } catch (err) {
            console.error('Failed to detach:', err)
            alert('エラーが発生しました')
        } finally {
            setIsPending(false)
        }
    }

    if (variant === 'icon') {
        return (
            <button
                onClick={handleDetach}
                disabled={isPending}
                className="p-2 bg-black/60 hover:bg-orange-500 text-white rounded-xl backdrop-blur-md border border-white/10 transition-all shadow-xl group/detach"
                title="講座から出してメイン画面に移動"
            >
                {isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <ArrowUpRight size={16} className="group-hover/detach:translate-x-0.5 group-hover/detach:-translate-y-0.5 transition-transform" />
                )}
            </button>
        )
    }

    return (
        <button
            onClick={handleDetach}
            disabled={isPending}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-orange-400 transition-colors py-2 px-3 bg-surface-2/50 hover:bg-orange-400/10 rounded-lg border border-white/5"
            title="講座から外してメイン画面に表示します"
        >
            {isPending ? (
                <Loader2 size={12} className="animate-spin" />
            ) : (
                <ArrowUpRight size={12} />
            )}
            講座から出す
        </button>
    )
}
