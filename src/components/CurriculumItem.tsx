'use client'

import Link from 'next/link'
import { FileText, Video, Link2 as LinkIcon, LayoutGrid, ChevronRight, Clock } from 'lucide-react'
import { Material } from '@/types'

export function CurriculumItem({ material }: { material: Material }) {
    const isTextbook = material.type === 'TEXTBOOK'
    const isMovie = material.type === 'MOVIE'
    const isWebsite = material.type === 'WEBSITE'
    const isCourse = material.type === 'COURSE'

    return (
        <Link
            href={`/textbook/${material.id}`}
            className="group flex items-center gap-4 p-3 bg-surface-1/40 hover:bg-surface-2 border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-0.5"
        >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden flex-shrink-0 bg-surface-3 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={material.cover_url && material.cover_url.trim() !== ''
                        ? material.cover_url
                        : 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&q=80'}
                    alt=""
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isMovie ? <Video size={16} className="text-white" /> : isWebsite ? <LinkIcon size={16} className="text-white" /> : isTextbook ? <FileText size={16} className="text-white" /> : <LayoutGrid size={16} className="text-white" />}
                </div>
            </div>

            <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isCourse ? 'text-orange-400 bg-orange-400/10' :
                            isTextbook ? 'text-blue-400 bg-blue-400/10' :
                                isMovie ? 'text-purple-400 bg-purple-400/10' :
                                    'text-green-400 bg-green-400/10'
                        }`}>
                        {isCourse ? 'Course' : isTextbook ? 'Textbook' : isMovie ? 'Video' : 'Website'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                        <Clock size={10} />
                        {Math.round(material.progress || 0)}%
                    </span>
                </div>
                <h4 className="font-bold text-sm text-gray-200 truncate group-hover:text-white transition-colors">
                    {material.title}
                </h4>

                <div className="mt-2 h-1 w-full bg-surface-3 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-white transition-all duration-700"
                        style={{ width: `${material.progress || 0}%` }}
                    />
                </div>
            </div>

            <ChevronRight size={18} className="text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all mr-1" />
        </Link>
    )
}
