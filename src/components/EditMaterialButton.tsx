'use client'

import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import EditMaterialModal from './EditMaterialModal'
import { Material } from '@/types'

interface SimpleField { id: string; name: string }

export default function EditMaterialButton({ material, fields }: { material: Material, fields: SimpleField[] }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
                <Settings2 size={16} />
                編集する
            </button>

            <EditMaterialModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                material={material}
                fields={fields}
            />
        </>
    )
}
