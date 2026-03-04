'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, Loader2 } from 'lucide-react'
import { updateMaterial, createField } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Material } from '@/types'

interface SimpleField { id: string; name: string }

interface EditMaterialModalProps {
    isOpen: boolean
    onClose: () => void
    material: Material
    fields: SimpleField[]
}

export default function EditMaterialModal({ isOpen, onClose, material, fields: initialFields }: EditMaterialModalProps) {
    const router = useRouter()
    const [title, setTitle] = useState(material.title)
    const [fields, setFields] = useState<SimpleField[]>(initialFields)
    const [fieldId, setFieldId] = useState(material.field_id)
    const [newFieldName, setNewFieldName] = useState('')
    const [isCreatingField, setIsCreatingField] = useState(false)
    const [totalPages, setTotalPages] = useState<number>(material.total_pages)
    const [url, setUrl] = useState(material.video_path || '')

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCreateField = async () => {
        if (!newFieldName.trim()) return
        try {
            const newField = await createField(newFieldName.trim())
            setFields(prev => [...prev, newField])
            setFieldId(newField.id)
            setNewFieldName('')
            setIsCreatingField(false)
        } catch {
            setError('分野の作成に失敗しました')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) { setError('タイトルを入力してください'); return }
        if (!fieldId) { setError('分野を選択してください'); return }

        setIsSubmitting(true)
        setError(null)
        try {
            await updateMaterial(material.id, {
                title: title.trim(),
                field_id: fieldId,
                total_pages: totalPages,
                video_path: url,
            })

            router.refresh()
            onClose()
        } catch (err: any) {
            console.error('Update error:', err)
            setError(err.message || '更新に失敗しました。')
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-surface-1 border border-surface-3 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 bg-surface-1 border-b border-surface-3 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-black uppercase tracking-widest">教材を編集</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-3 bg-red-950/50 border border-red-800 text-red-300 px-4 py-3 rounded-xl text-sm">
                            <AlertCircle size={16} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">タイトル</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-white outline-none focus:border-white/50 transition"
                                placeholder="教材名を入力"
                            />
                        </div>

                        {/* Field / Category */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">分野</label>
                            {!isCreatingField ? (
                                <div className="flex gap-2">
                                    <select
                                        value={fieldId}
                                        onChange={e => setFieldId(e.target.value)}
                                        className="flex-1 bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-white outline-none focus:border-white/50 transition"
                                    >
                                        {fields.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingField(true)}
                                        className="px-4 py-3 bg-surface-2 border border-surface-3 rounded-xl text-gray-400 hover:text-white hover:border-white/30 transition text-sm font-bold whitespace-nowrap"
                                    >
                                        + 新規
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newFieldName}
                                        onChange={e => setNewFieldName(e.target.value)}
                                        className="flex-1 bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-white outline-none focus:border-white/50 transition"
                                        placeholder="新しい分野名"
                                        autoFocus
                                    />
                                    <button type="button" onClick={handleCreateField}
                                        className="px-4 py-3 bg-white text-black rounded-xl text-sm font-bold hover:bg-gray-200 transition">
                                        作成
                                    </button>
                                    <button type="button" onClick={() => setIsCreatingField(false)}
                                        className="px-4 py-3 bg-surface-2 border border-surface-3 rounded-xl text-gray-400 hover:text-white transition">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Total Pages / Lectures */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                {material.type === 'TEXTBOOK' ? '総ページ数' : (material.type === 'MOVIE' ? '全講義数' : '全チャプター/項目数')}
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={totalPages}
                                onChange={e => setTotalPages(parseInt(e.target.value) || 1)}
                                className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-white outline-none focus:border-white/50 transition"
                            />
                        </div>

                        {/* URL (except TEXTBOOK) */}
                        {material.type !== 'TEXTBOOK' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                    {material.type === 'MOVIE' ? '動画のURL' : (material.type === 'COURSE' ? '講座のURL' : 'サイトのURL')}
                                </label>
                                <input
                                    type="text"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-white outline-none focus:border-white/50 transition"
                                    placeholder="https://..."
                                />
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-surface-3">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-4 rounded-xl border border-surface-3 text-gray-400 hover:text-white hover:border-white/30 font-bold text-sm uppercase tracking-widest transition">
                            キャンセル
                        </button>
                        <button type="submit" disabled={isSubmitting}
                            className="flex-1 py-4 rounded-xl bg-white text-black font-bold text-sm uppercase tracking-widest hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : '更新する'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
