import Link from 'next/link'
import { FileCheck, FileWarning, AlertCircle } from 'lucide-react'
import { Material } from '@/types'

export function TextbookCard({ material }: { material: Material }) {
    const progressPercent = material.progress || 0

    // Sync Status Badge
    const hasPdf = !!material.pdf_path

    return (
        <Link
            href={`/textbook/${material.id}`}
            className="group flex flex-col bg-surface-1 hover:bg-surface-2 border border-surface-3 rounded-2xl overflow-hidden transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 block"
        >
            <div className="relative aspect-[3/4] overflow-hidden bg-surface-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={material.cover_url && material.cover_url.trim() !== ''
                        ? material.cover_url
                        : 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&q=80'}
                    alt={material.title}
                    className="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                />

                {/* Cloud PDF Status Badge */}
                <div className="absolute top-4 right-4 bg-surface-0/80 backdrop-blur px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/10 shadow-sm">
                    {hasPdf ? (
                        <><FileCheck size={14} className="text-green-500" /><span className="text-[10px] uppercase font-bold text-green-500 tracking-wider">Cloud</span></>
                    ) : (
                        <><FileWarning size={14} className="text-yellow-500" /><span className="text-[10px] uppercase font-bold text-yellow-500 tracking-wider">No PDF</span></>
                    )}
                </div>
            </div>

            <div className="p-6 flex flex-col gap-4">
                <h3 className="font-bold text-lg leading-tight line-clamp-2 text-white/90 group-hover:text-white">
                    {material.title}
                </h3>

                <div className="mt-auto flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-medium text-gray-400">進捗</span>
                        <span className="text-xs font-bold font-mono tracking-wider">{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>
        </Link>
    )
}
