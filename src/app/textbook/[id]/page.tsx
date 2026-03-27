import { getMaterialById, getFields, getCourseMaterials } from '@/app/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Clock, Play, FileText, Video, Link2 as LinkIcon, LayoutGrid } from 'lucide-react'
import { UploadPdfButton } from '@/components/UploadPdfButton'
import UploadVideoButton from '@/components/UploadVideoButton'
import DeleteMaterialButton from '@/components/DeleteMaterialButton'
import UploadCoverButton from '@/components/UploadCoverButton'
import { ManualProgressTracker } from '@/components/ManualProgressTracker'
import { TextbookCard } from '@/components/TextbookGrid'
import { AddTextbookButton } from '@/components/AddTextbookButton'
import EditMaterialButton from '@/components/EditMaterialButton'
import { CurriculumItem } from '@/components/CurriculumItem'
import DetachFromCourseButton from '@/components/DetachFromCourseButton'

export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ id: string }>
}

export default async function MaterialDetail({ params: paramsPromise }: Props) {
    const { id } = await paramsPromise
    const material = await getMaterialById(id)
    const fields = await getFields()

    if (!material) notFound()

    const progressPercent = material.progress || 0
    const hasPdf = !!material.pdf_path
    const hasVideo = !!material.video_path
    const isMovie = material.type === 'MOVIE'
    const isWebsite = material.type === 'WEBSITE'
    const isCourse = material.type === 'COURSE'

    // Fetch child materials for any type (not just course)
    const childMaterials = await getCourseMaterials(id)

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4 md:px-8">
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white mb-10 transition group"
            >
                <ArrowLeft size={16} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
                ダッシュボードに戻る
            </Link>

            <div className="flex flex-col md:flex-row gap-12 items-start mb-16">
                <div className="w-full md:w-1/3 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl relative bg-surface-3 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={material.cover_url && material.cover_url.trim() !== ''
                            ? material.cover_url
                            : 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&q=80'}
                        alt={material.title}
                        className="object-cover w-full h-full"
                    />
                    {isMovie && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                            <Video className="text-white opacity-50" size={48} />
                        </div>
                    )}
                    {isWebsite && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                            <LinkIcon className="text-white opacity-50" size={48} />
                        </div>
                    )}

                    {/* カバー画像アップロードボタン */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <UploadCoverButton materialId={material.id} />
                    </div>
                </div>

                <div className="flex-1 space-y-6 w-full">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 block mb-2">
                                {material.fields?.name || '未分類'}
                            </span>
                            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-none mb-6">
                                {material.title || 'Untitled'}
                            </h1>
                            {material.parent_id && (
                                <div className="mt-2">
                                    <DetachFromCourseButton id={material.id} />
                                </div>
                            )}
                        </div>
                        <EditMaterialButton material={material} fields={fields} />
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm font-bold uppercase tracking-widest text-gray-400">
                        <span className="bg-surface-2 px-4 py-2 rounded-lg flex items-center gap-2">
                            {isMovie ? <Video size={16} strokeWidth={2.5} /> : (isWebsite ? <LinkIcon size={16} strokeWidth={2.5} /> : (isCourse ? <LayoutGrid size={16} strokeWidth={2.5} /> : <BookOpen size={16} strokeWidth={2.5} />))}
                            {isMovie ? '動画教材' : (isWebsite ? '参考サイト' : (isCourse ? '講座・コース' : '教科書'))}
                        </span>
                        <span className="bg-surface-2 px-4 py-2 rounded-lg flex items-center gap-2 text-white">
                            <Clock size={16} strokeWidth={2.5} />
                            {Math.round(progressPercent)}% 完了
                        </span>
                    </div>

                    {/* 教科書の場合はページ進捗を表示、講座の場合は何もしない（後で進捗集計しても良い） */}
                    {material.type === 'TEXTBOOK' ? (
                        <div className="pt-6">
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-xs font-bold tracking-widest uppercase text-gray-400">
                                    Progress: {material.current_page} / {material.total_pages} pages
                                </span>
                                <span className="text-xl font-black font-mono tracking-wider">{Math.round(progressPercent)}%</span>
                            </div>
                            <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-1000 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        !isCourse && (
                            <ManualProgressTracker
                                materialId={material.id}
                                currentPage={material.current_page || 0}
                                totalPages={material.total_pages || 1}
                                type={material.type as 'MOVIE' | 'WEBSITE'}
                            />
                        )
                    )}

                    {/* Action Buttons - Moved Up for priority */}
                    {!isCourse && (
                        <div className="pt-8 border-t border-surface-3 space-y-6">
                            {material.type !== 'TEXTBOOK' ? (
                                <div className="bg-surface-2 p-6 rounded-3xl border border-surface-3 relative overflow-hidden group/link">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/link:opacity-30 group-hover/link:rotate-12 transition-all">
                                        {isMovie ? <Video size={100} /> : <LinkIcon size={100} />}
                                    </div>
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        {isMovie ? <Video size={14} /> : (isCourse ? <LayoutGrid size={14} /> : <LinkIcon size={14} />)}
                                        {isMovie ? '動画教材ソース' : (isCourse ? '講座ポータル / 参考URL' : 'サイトのURL')}
                                    </p>
                                    <div className="text-sm font-mono text-blue-400 truncate bg-black/30 p-4 rounded-xl border border-surface-3 mb-6">
                                        {material.video_path || 'URLが設定されていません'}
                                    </div>

                                    {material.video_path && (
                                        <a
                                            href={material.video_path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-white text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all w-full shadow-2xl hover:-translate-y-1 hover:bg-gray-100"
                                        >
                                            {isMovie ? <Play size={16} strokeWidth={3} /> : <LinkIcon size={16} strokeWidth={3} />}
                                            {isMovie ? '外部プレイヤーで再生' : (isCourse ? '講座用リンクを開く' : 'サイトを開く')}
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <UploadPdfButton materialId={material.id} hasPdf={hasPdf} />
                                    <Link
                                        href={hasPdf ? `/viewer/${material.id}` : '#'}
                                        className={`
                                            font-black uppercase tracking-widest text-[10px] px-8 py-5 rounded-2xl flex items-center justify-center gap-3 transition-all w-full shadow-2xl hover:-translate-y-1
                                            ${hasPdf
                                                ? 'bg-white text-black hover:bg-gray-100'
                                                : 'bg-surface-2 text-gray-600 cursor-not-allowed opacity-50'}
                                        `}
                                    >
                                        <FileText size={18} strokeWidth={3} />
                                        リーダーを開く
                                    </Link>
                                </>
                            )}
                            <DeleteMaterialButton id={material.id} title={material.title} />
                        </div>
                    )}
                </div>
            </div>

            {/* Full-width Curriculum Section - Shown for all types to allow nesting */}
            <div className="space-y-10 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="flex items-center justify-between border-b border-surface-3 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-400/10 rounded-2xl">
                                <LayoutGrid size={32} className="text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-widest leading-none mb-1">
                                    構成教材・子要素
                                </h3>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Selected Components</p>
                            </div>
                        </div>
                        <AddTextbookButton fields={fields} parentId={id} defaultFieldId={material.field_id} />
                    </div>

                    {childMaterials.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {childMaterials.map(tb => (
                                <div key={tb.id} className="relative group/material">
                                    <TextbookCard material={tb} />
                                    <div className="absolute top-3 right-3 z-20 opacity-0 group-hover/material:opacity-100 transition-all translate-y-2 group-hover/material:translate-y-0">
                                        <DetachFromCourseButton id={tb.id} variant="icon" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-surface-2/40 border-2 border-dashed border-surface-3 p-20 rounded-[3rem] text-center">
                            <h4 className="text-lg font-black uppercase tracking-widest text-gray-600 mb-2">No Contents Yet</h4>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">
                                まだ子教材が追加されていません
                            </p>
                        </div>
                    )}

                    {/* Action buttons specifically for curriculum/container portal */}
                    <div className="pt-10 mt-20 border-t border-surface-3 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {(material.video_path || isCourse) && (
                            <div className="bg-surface-2 p-8 rounded-[2rem] border border-surface-3 relative overflow-hidden transition-all hover:bg-surface-2/60">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <LinkIcon size={14} />
                                    {isCourse ? '講座ポータル / 参考URL' : '関連リンク / URL'}
                                </p>
                                <div className="text-sm font-mono text-blue-400 truncate bg-black/40 p-4 rounded-xl border border-surface-3 mb-8">
                                    {material.video_path || 'URLが設定されていません'}
                                </div>

                                {material.video_path && (
                                    <a
                                        href={material.video_path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-white text-black font-black uppercase tracking-widest text-[10px] px-8 py-5 rounded-2xl flex items-center justify-center gap-3 transition-all w-full shadow-2xl hover:-translate-y-1 hover:bg-gray-50"
                                    >
                                        <LinkIcon size={18} strokeWidth={3} />
                                        リンクを開く
                                    </a>
                                )}
                            </div>
                        )}
                        <div className="space-y-6">
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-4">システム設定</p>
                            <DeleteMaterialButton id={material.id} title={material.title} />
                        </div>
                    </div>
                </div>

            <div className="mt-20 border-t border-surface-3 pt-10 grid grid-cols-1 md:grid-cols-2 gap-8 pb-32">
                <div className="space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-widest border-b border-white/5 pb-4">
                        教材の概要
                    </h2>
                    <div className="bg-surface-2/30 p-8 rounded-[2rem] border border-surface-3">
                        <p className="text-gray-400 text-sm leading-loose">
                            {isMovie
                                ? '動画ファイルをアップロードして、どこからでもストリーミング再生できます。学習した時間は自動的に記録されます。'
                                : (isWebsite ? '参考サイトや公式ドキュメントへのリンクを管理できます。学習した項目（チャプター）ごとに進捗を記録できます。' : 'PDFをアップロードすると、Apple Pencilでの手書き注釈などがクラウドに保存され、iPad等の他デバイスと自動同期されるようになります。')}
                        </p>
                    </div>
                </div>
                <div className="space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-widest border-b border-white/5 pb-4">
                        学習ステータス
                    </h2>
                    <div className="bg-surface-2/30 p-8 rounded-[2rem] border border-surface-3 space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-500">
                            <span>Final Progress</span>
                            <span className="text-white">{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
