import { createClient } from '@/lib/supabase/server'
import { getMaterialById } from '@/app/actions'
import { notFound, redirect } from 'next/navigation'
import { PdfViewer } from '@/components/PdfViewer'

interface Props {
    params: Promise<{ id: string }>
}

export default async function ViewerPage({ params: paramsPromise }: Props) {
    const { id } = await paramsPromise
    const supabase = await createClient()

    // 1. 教材情報を取得
    const material = await getMaterialById(id)
    if (!material) notFound()

    // 2. PDF が設定されていない場合は詳細ページへ戻す
    if (!material.pdf_path) {
        redirect(`/textbook/${id}`)
    }

    // 3. Supabase Storage から 60 分間有効な署名付き URL を取得
    const { data, error } = await supabase.storage
        .from('materials')
        .createSignedUrl(material.pdf_path, 3600)

    if (error || !data?.signedUrl) {
        console.error('Signed URL Error:', error)
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <p className="font-bold">PDFの読み込みに失敗しました。再ログインをお試しください。</p>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black">
            <PdfViewer
                materialId={material.id}
                pdfUrl={data.signedUrl}
                initialPage={material.current_page}
                totalPageCount={material.total_pages}
            />
        </div>
    )
}
