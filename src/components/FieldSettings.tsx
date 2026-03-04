'use client'

import { useState } from 'react'
import { Settings2, X, Trash2, Check, Loader2 } from 'lucide-react'
import { updateField, deleteField } from '@/app/actions'

interface Field {
    id: string
    name: string
}

export function FieldSettings({ field }: { field: Field }) {
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(field.name)
    const [isLoading, setIsLoading] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const handleUpdate = async () => {
        if (!name.trim() || name === field.name) {
            setIsEditing(false)
            return
        }
        setIsLoading(true)
        try {
            await updateField(field.id, name)
            setIsEditing(false)
        } catch (err) {
            alert('更新に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        setIsLoading(true)
        try {
            await deleteField(field.id)
            setIsEditing(false)
        } catch (err) {
            alert('削除に失敗しました（教材が残っている可能性があります）')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isEditing) {
        return (
            <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-surface-3"
                title="分野を編集"
            >
                <Settings2 size={16} />
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface-1 border border-surface-3 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest">分野設定</h3>
                    <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">分野名</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="flex-1 bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-white outline-none focus:border-white/50 transition"
                                autoFocus
                            />
                            <button
                                onClick={handleUpdate}
                                disabled={isLoading}
                                className="bg-white text-black p-3 rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-surface-3">
                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition"
                            >
                                <Trash2 size={14} /> 分野を削除
                            </button>
                        ) : (
                            <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl space-y-4">
                                <p className="text-xs text-red-200 font-medium">本当に削除しますか？ 教材が含まれている場合は削除できません。</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleDelete}
                                        disabled={isLoading}
                                        className="flex-1 bg-red-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition"
                                    >
                                        はい、削除します
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 bg-surface-3 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-surface-4 transition"
                                    >
                                        キャンセル
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
