import { getFields, getMaterials } from './actions'
import { FilterBar, SimpleField } from '@/components/FilterBar'
import { TextbookCard } from '@/components/TextbookGrid'
import { AddTextbookButton } from '@/components/AddTextbookButton'
import { FieldSettings } from '@/components/FieldSettings'
import { OnboardingModal } from '@/components/OnboardingModal'
import { BookOpen, Video, Image as ImageIcon, LayoutGrid } from 'lucide-react'

interface PageProps {
    params: Promise<any>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const dynamic = 'force-dynamic'

export default async function Home({ searchParams }: PageProps) {
    const s = await searchParams
    const activeFieldId = s && typeof s === 'object' ? (s.field as string) : undefined

    // 強力なフォールバック
    let fields: any[] = []
    let allMaterials: any[] = []

    try {
        fields = (await getFields()) || []
    } catch (e) {
        console.error('Failed to fetch fields:', e)
        fields = []
    }

    try {
        allMaterials = (await getMaterials()) || []
    } catch (e) {
        console.error('Failed to fetch materials:', e)
        allMaterials = []
    }

    const simpleFields: SimpleField[] = fields
        .filter(f => f && f.id && f.name) // 不正なデータを排除
        .map(f => ({ id: f.id, name: f.name }))

    const displayFields = activeFieldId
        ? fields.filter(f => f && f.id === activeFieldId)
        : fields.filter(f => f && f.id && f.name)

    return (
        <>
            <OnboardingModal />
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
                        <p className="text-gray-600 mt-3 text-sm">「教材を追加」ボタンから最初の教材を記録してください</p>
                    </div>
                ) : (
                    displayFields.map(field => {
                        if (!field || !field.id) return null

                        // Filter materials that belong to this field AND are top-level items (no parent_id)
                        const fieldMaterials = allMaterials.filter(t => t && t.field_id === field.id && !t.parent_id)
                        const courses = fieldMaterials.filter(t => t.type === 'COURSE')
                        const textbooks = fieldMaterials.filter(t => t.type === 'TEXTBOOK')
                        const movies = fieldMaterials.filter(t => t.type === 'MOVIE')
                        const websites = fieldMaterials.filter(t => t.type === 'WEBSITE')

                        if (fieldMaterials.length === 0) return null

                        return (
                            <div key={field.id} className="space-y-12">
                                <div className="flex items-center gap-6">
                                    <div className="h-[2px] flex-1 bg-surface-3" />
                                    <h2 className="text-2xl font-black uppercase tracking-[0.2em]">{field.name}</h2>
                                    <FieldSettings field={field} />
                                    <div className="h-[2px] flex-1 bg-surface-3" />
                                </div>

                                {courses.length > 0 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-center gap-3 text-orange-400">
                                            <LayoutGrid size={20} />
                                            <span className="text-sm font-bold uppercase tracking-widest">講座</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {courses.map(tb => <TextbookCard key={tb.id} material={tb} />)}
                                        </div>
                                    </div>
                                )}

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

                                {websites.length > 0 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-center gap-3 text-gray-400 mt-12">
                                            <ImageIcon size={20} />
                                            <span className="text-sm font-bold uppercase tracking-widest">参考サイト / ドキュメント</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {websites.map(tb => <TextbookCard key={tb.id} material={tb} />)}
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
