import { getFields, getMaterials } from './actions'
import { FilterBar, SimpleField } from '@/components/FilterBar'
import { TextbookCard } from '@/components/TextbookGrid'
import { AddTextbookButton } from '@/components/AddTextbookButton'
import { BookOpen, Video } from 'lucide-react'

interface PageProps {
    searchParams: { field?: string }
}

export const dynamic = 'force-dynamic'

export default async function Home({ searchParams }: PageProps) {
    const activeFieldId = searchParams && typeof searchParams === 'object' ? searchParams.field : undefined

    const fields = await getFields()
    const simpleFields: SimpleField[] = fields.map(f => ({ id: f.id, name: f.name }))

    const allMaterials = await getMaterials()
    const displayFields = activeFieldId ? fields.filter(f => f.id === activeFieldId) : fields

    return (
        <>
            <header className="mb-12 pb-2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-gray-400 font-medium tracking-wide">クラウド同期対応・スマート学習プラットフォーム</p>
                    </div>
                    <AddTextbookButton fields={simpleFields} />
                </div>
            </header>

            <section className="mb-10">
                <FilterBar fields={simpleFields} activeFieldId={activeFieldId} />
            </section>

            <section className="space-y-24">
                {displayFields.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-surface-3 rounded-3xl">
                        <h2 className="text-2xl font-bold uppercase tracking-widest text-gray-500">分野が見つかりません</h2>
                        <p className="text-gray-600 mt-3 text-sm">「教材を追加」ボタンから最初の教材を登録してください</p>
                    </div>
                ) : (
                    displayFields.map(field => {
                        const fieldMaterials = allMaterials.filter(t => t.field_id === field.id)
                        const textbooks = fieldMaterials.filter(t => t.type === 'TEXTBOOK')
                        const movies = fieldMaterials.filter(t => t.type === 'MOVIE')

                        if (fieldMaterials.length === 0) return null

                        return (
                            <div key={field.id} className="space-y-12">
                                <div className="flex items-center gap-4">
                                    <div className="h-[2px] flex-1 bg-surface-3" />
                                    <h2 className="text-2xl font-black uppercase tracking-[0.2em]">{field.name}</h2>
                                    <div className="h-[2px] flex-1 bg-surface-3" />
                                </div>

                                {textbooks.length > 0 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-center gap-3 text-gray-400">
                                            <BookOpen size={20} />
                                            <span className="text-sm font-bold uppercase tracking-widest">教科書 / PDF</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {textbooks.map(tb => <TextbookCard key={tb.id} material={tb} />)}
                                        </div>
                                    </div>
                                )}

                                {movies.length > 0 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-center gap-3 text-gray-400 mt-12">
                                            <Video size={20} />
                                            <span className="text-sm font-bold uppercase tracking-widest">動画教材</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {movies.map(tb => <TextbookCard key={tb.id} material={tb} />)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </section>
        </>
    )
}
