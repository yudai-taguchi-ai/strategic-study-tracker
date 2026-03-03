import { getMaterialById } from '@/app/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Clock, Play, FileText, Video } from 'lucide-react'
import { UploadPdfButton } from '@/components/UploadPdfButton'
import UploadVideoButton from '@/components/UploadVideoButton'
import DeleteMaterialButton from '@/components/DeleteMaterialButton'
import UploadCoverButton from '@/components/UploadCoverButton'

export const dynamic = 'force-dynamic'

interface Props {
    params: { id: string }
}

export default async function MaterialDetail({ params }: Props) {
    const { id } = params
    const material = await getMaterialById(id)

    if (!material) notFound()

    const progressPercent = material.progress || 0
    const hasPdf = !!material.pdf_path
    const hasVideo = !!material.video_path
    const isMovie = material.type === 'MOVIE'

    return (
        <div className="max-w-4xl mx-auto pb-20 px-4">
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

                    {/* カバー画像アップロードボタン */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <UploadCoverButton materialId={material.id} />
                    </div>
                </div>

                <div className="flex-1 space-y-6 w-full">
                    <div>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 block mb-2">
                            {material.fields?.name}
                        </span>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-none mb-6">
                            {material.title}
                        </h1>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm font-bold uppercase tracking-widest text-gray-400">
                        <span className="bg-surface-2 px-4 py-2 rounded-lg flex items-center gap-2">
                            {isMovie ? <Video size={16} strokeWidth={2.5} /> : <BookOpen size={16} strokeWidth={2.5} />}
                            {isMovie ? '動画教材' : '教科書'}
                        </span>
                        <span className="bg-surface-2 px-4 py-2 rounded-lg flex items-center gap-2 text-white">
                            <Clock size={16} strokeWidth={2.5} />
                            {Math.round(progressPercent)}% 完了
                        </span>
                    </div>

                    {/* 教科書の場合はページ進捗を表示 */}
                    {!isMovie && (
                        <div className="pt-6">
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-xs font-bold tracking-widest uppercase text-gray-500">
                                    ページ {material.current_page} / {material.total_pages}
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
                    )}

                    {/* アクションボタン */}
                    <div className="pt-8 border-t border-surface-3 space-y-6">
                        {isMovie ? (
                            <div className="bg-surface-2 p-6 rounded-2xl border border-surface-3">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Video size={14} /> 講義動画ソース
                                </p>
                                <div className="text-sm font-mono text-blue-400 truncate bg-black/30 p-3 rounded-lg border border-surface-3 mb-4">
                                    {material.video_path || 'URLが設定されていません'}
                                </div>

                                {material.video_path && (
                                    <a
                                        href={material.video_path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-white text-black font-black uppercase tracking-widest text-xs px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all w-full shadow-lg hover:-translate-y-0.5"
                                    >
                                        <Play size={16} strokeWidth={2.5} />
                                        外部プレイヤーで再生
                                    </a>
                                )}
                            </div>
                        ) : (
                            <>
                                <UploadPdfButton materialId={material.id} hasPdf={hasPdf} />
                                <Link
                                    href={hasPdf ? `/viewer/${material.id}` : '#'}
                                    className={`
                                        font-bold uppercase tracking-widest text-xs px-6 py-5 rounded-xl flex items-center justify-center gap-3 transition-all w-full shadow-lg hover:-translate-y-0.5
                                        ${hasPdf
                                            ? 'bg-white text-black hover:bg-gray-200'
                                            : 'bg-surface-2 text-gray-600 cursor-not-allowed opacity-50'}
                                    `}
                                >
                                    <FileText size={18} strokeWidth={2.5} />
                                    リーダーを開く
                                </Link>
                            </>
                        )}

                        <DeleteMaterialButton id={material.id} title={material.title} />
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="text-2xl font-black uppercase tracking-[0.2em] mb-8 border-b border-surface-3 pb-4">
                    情報
                </h2>
                <div className="bg-surface-1 border border-surface-2 p-8 rounded-3xl space-y-4">
                    <p className="text-gray-400 text-sm leading-relaxed">
                        {isMovie
                            ? '動画ファイルをアップロードして、どこからでもストリーミング再生できます。学習した時間は自動的に記録されます。'
                            : 'PDFをアップロードすると、Apple Pencilでの手書き注釈などがクラウドに保存され、iPad等の他デバイスと自動同期されるようになります。'}
                    </p>
                </div>
            </div>
        </div>
    )
}
