'use client'

import { useState } from 'react'
import { Plus, Check, Loader2 } from 'lucide-react'
import { updateProgress } from '@/app/actions'

interface Props {
    materialId: string
    currentPage: number
    totalPages: number
    type: 'MOVIE' | 'WEBSITE'
}

export function ManualProgressTracker({ materialId, currentPage, totalPages, type }: Props) {
    const [isLoading, setIsLoading] = useState(false)
    const [current, setCurrent] = useState(currentPage)

    const [jumpPage, setJumpPage] = useState(current.toString())

    const handleProgressUpdate = async (next: number) => {
        if (next < 1 || next > totalPages || isLoading) return
        setIsLoading(true)
        try {
            await updateProgress(materialId, next, totalPages)
            setCurrent(next)
            setJumpPage(next.toString())
        } catch (err) {
            alert('進捗の更新に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    const handleIncrement = () => handleProgressUpdate(current + 1)

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value)
        setJumpPage(val.toString())
        handleProgressUpdate(val)
    }

    const handleJumpSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const val = parseInt(jumpPage)
        if (!isNaN(val)) handleProgressUpdate(val)
    }

    const progressPercent = totalPages > 0 ? (current / totalPages) * 100 : 0

    const labelPrefix = type === 'MOVIE' ? '講義：第' : 'チャプター：第'
    const labelSuffix = type === 'MOVIE' ? '回 / 全' : '項目 / 全'
    const buttonLabel = type === 'MOVIE' ? '次の講義を完了にする' : '次の項目を完了にする'
    const completeLabel = type === 'MOVIE' ? '全講義完了' : '全チャプター完了'

    return (
        <div className="pt-6 space-y-8">
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black tracking-widest uppercase text-gray-500 block">
                            Quick Navigation
                        </span>
                        <span className="text-xs font-bold tracking-widest text-white/90">
                            {labelPrefix} {current} {labelSuffix} {totalPages} {type === 'MOVIE' ? '回' : '項目'}
                        </span>
                    </div>
                    <span className="text-xl font-black font-mono tracking-wider text-white">
                        {Math.round(progressPercent)}%
                    </span>
                </div>

                <div className="h-2 bg-surface-3 rounded-full overflow-hidden relative group">
                    <div
                        className="h-full bg-white transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                    <input
                        type="range"
                        min="1"
                        max={totalPages}
                        value={current}
                        onChange={handleSliderChange}
                        disabled={isLoading}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <form onSubmit={handleJumpSubmit} className="relative">
                        <input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={jumpPage}
                            onChange={(e) => setJumpPage(e.target.value)}
                            className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-sm text-white focus:border-white/50 outline-none transition-all pr-12"
                            placeholder="Jump..."
                        />
                        <button
                            type="submit"
                            title="移動"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-gray-500 hover:text-white"
                        >
                            Jump
                        </button>
                    </form>

                    <button
                        onClick={handleIncrement}
                        disabled={current >= totalPages || isLoading}
                        className="py-3 rounded-xl bg-white text-black hover:bg-gray-100 font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : current >= totalPages ? (
                            <Check size={14} />
                        ) : (
                            <Plus size={14} />
                        )}
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}
