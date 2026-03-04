'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import AddTextbookModal from './AddTextbookModal'

interface SimpleField { id: string; name: string }

export function AddTextbookButton({ fields, parentId, defaultFieldId }: { fields: SimpleField[], parentId?: string, defaultFieldId?: string }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`flex items-center gap-2 font-black uppercase tracking-widest text-xs transition-all active:scale-95 ${parentId ? 'bg-white text-black px-6 py-3 rounded-xl shadow-lg hover:shadow-xl' : 'text-gray-400 hover:text-white'}`}
            >
                <Plus size={parentId ? 16 : 14} strokeWidth={3} />
                {parentId ? 'この講座に教材を追加' : '教材を追加'}
            </button>

            <AddTextbookModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                fields={fields}
                parentId={parentId}
                defaultFieldId={defaultFieldId}
            />
        </>
    )
}
