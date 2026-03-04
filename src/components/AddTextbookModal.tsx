'use client'

import { useState } from 'react'
import { X, Plus, BookOpen, Video, AlertCircle, Camera, Image as ImageIcon, Loader2 } from 'lucide-react'
import { createMaterial, createField, uploadMaterialCover, uploadMaterialPdf } from '@/app/actions'
import { useRouter } from 'next/navigation'

interface SimpleField { id: string; name: string }

interface Props {
    initialFields: SimpleField[]
    onClose: () => void
}

export function AddTextbookModal({ initialFields, onClose }: Props) {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [fields, setFields] = useState<SimpleField[]>(initialFields)
    const [fieldId, setFieldId] = useState(initialFields[0]?.id ?? '')
    const [newFieldName, setNewFieldName] = useState('')
    const [isCreatingField, setIsCreatingField] = useState(false)
    const [type, setType] = useState<'TEXTBOOK' | 'MOVIE'>('TEXTBOOK')
    const [coverImageUrl, setCoverImageUrl] = useState('')
    const [videoUrl, setVideoUrl] = useState('')
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [coverPreview, setCoverPreview] = useState<string | null>(null)
    const [pdfFile, setPdfFile] = useState<File | null>(null)

    // Default to a 100-page book or 10-lecture course
    const [totalPages, setTotalPages] = useState<number>(type === 'TEXTBOOK' ? 100 : 10)

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

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setCoverFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setCoverPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) { setError('タイトルを入力してください'); return }
        if (!fieldId) { setError('分野を選択してください'); return }

        setIsSubmitting(true)
        setError(null)
        try {
            // 1. 教材を作成
            const newMaterial = await createMaterial({
                title: title.trim(),
                field_id: fieldId,
                type,
                cover_url: coverImageUrl,
                total_pages: totalPages,
                video_path: type === 'MOVIE' ? videoUrl : undefined
            })

            // 2. カバー画像が選択されていればアップロード
            if (coverFile && newMaterial?.id) {
                const formData = new FormData()
                formData.append('file', coverFile)
                await uploadMaterialCover(newMaterial.id, formData)
            }

            // 3. PDFファイルが選択されていればアップロード (教科書のみ)
            if (type === 'TEXTBOOK' && pdfFile && newMaterial?.id) {
                const formData = new FormData()
                formData.append('file', pdfFile)
                await uploadMaterialPdf(newMaterial.id, formData)
            }

            router.refresh()
            onClose()
        } catch (err: any) {
            console.error('Submit error:', err)
            setError(err.message || '教材の追加に失敗しました。認証されているか確認してください。')
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-surface-1 border border-surface-3 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 bg-surface-1 border-b border-surface-3 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-black uppercase tracking-widest">教材を追加</h2>
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

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Cover Image Upload Area */}
                        <div className="w-full md:w-40 space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block">カバー画像</label>
                            <label className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-surface-2 border border-surface-3 hover:border-white/30 transition cursor-pointer flex flex-col items-center justify-center group">
                                {coverPreview ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                            <Camera className="text-white" size={24} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-gray-300">
                                        <ImageIcon size={32} strokeWidth={1.5} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">アップロード</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                            </label>
                        </div>

                        <div className="flex-1 space-y-6">
                            {/* Title */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">タイトル</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-white outline-none focus:border-white/50 transition"
                                    placeholder="例: 線形代数入門"
                                    autoFocus
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
                                            {fields.length === 0 && <option value="">— 分野がありません —</option>}
                                            {fields.map(f => (
                                                <option key={f.id} value={f.id}>{f.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingField(true)}
                                            className="px-4 py-3 bg-surface-2 border border-surface-3 rounded-xl text-gray-400 hover:text-white hover:border-white/30 transition text-sm font-bold whitespace-nowrap"
                                        >
                                            + 新規作成
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newFieldName}
                                            onChange={e => setNewFieldName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateField())}
                                            className="flex-1 bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-white outline-none focus:border-white/50 transition"
                                            placeholder="新しい分野名"
                                            autoFocus
                                        />
                                        <button type="button" onClick={handleCreateField}
                                            className="px-4 py-3 bg-white text-black rounded-xl text-sm font-bold hover:bg-gray-200 transition whitespace-nowrap">
                                            作成
                                        </button>
                                        <button type="button" onClick={() => setIsCreatingField(false)}
                                            className="px-4 py-3 bg-surface-2 border border-surface-3 rounded-xl text-gray-400 hover:text-white transition">
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">種別</label>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setType('TEXTBOOK')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-sm transition ${type === 'TEXTBOOK' ? 'bg-white text-black border-white' : 'bg-surface-2 text-gray-400 border-surface-3 hover:border-white/30'}`}>
                                <BookOpen size={16} />教科書
                            </button>
                            <button type="button" onClick={() => setType('MOVIE')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-sm transition ${type === 'MOVIE' ? 'bg-white text-black border-white' : 'bg-surface-2 text-gray-400 border-surface-3 hover:border-white/30'}`}>
                                <Video size={16} />動画教材
                            </button>
                        </div>
                    </div>

                    {/* Total Pages */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            {type === 'TEXTBOOK' ? '総ページ数' : '全講義数'}
                        </label>
                        <input
                            type="number"
                            min={1}
                            value={totalPages}
                            onChange={e => setTotalPages(parseInt(e.target.value) || 1)}
                            className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-white outline-none focus:border-white/50 transition"
                            placeholder="100"
                        />
                    </div>

                    {/* PDF Upload for TEXTBOOK */}
                    {type === 'TEXTBOOK' && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                同期するPDFファイル
                            </label>
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={e => setPdfFile(e.target.files?.[0] || null)}
                                className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-sm text-gray-400 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white file:text-black hover:file:bg-gray-200 cursor-pointer"
                            />
                        </div>
                    )}

                    {/* video_path for MOVIE */}
                    {type === 'MOVIE' && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                動画の外部URL <span className="text-white normal-case font-bold">(YouTubeやVimeoなど)</span>
                            </label>
                            <input
                                type="url"
                                value={videoUrl}
                                onChange={e => setVideoUrl(e.target.value)}
                                className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-white outline-none focus:border-white/50 transition"
                                placeholder="https://www.youtube.com/watch?v=..."
                                required
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-4 rounded-xl border border-surface-3 text-gray-400 hover:text-white hover:border-white/30 font-bold text-sm uppercase tracking-widest transition">
                            キャンセル
                        </button>
                        <button type="submit" disabled={isSubmitting}
                            className="flex-1 py-4 rounded-xl bg-white text-black font-bold text-sm uppercase tracking-widest hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    処理中...
                                </>
                            ) : '教材を追加する'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
