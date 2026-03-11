'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Material } from '@/types'

// ----- Auth Actions -----

export async function login(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    console.log('--- Signup Attempt ---')
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        throw new Error("メールアドレスとパスワードを入力してください")
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        console.error('Supabase Signup Error:', error.message)
        throw new Error(error.message)
    }

    console.log('Signup success - Revalidating and redirecting')
    revalidatePath('/', 'layout')
    redirect('/')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

// ----- Data Fetching -----

export async function getFields() {
    const supabase = await createClient()
    const { data: fields, error } = await supabase
        .from('fields')
        .select('*')
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching fields:', error)
        return []
    }
    return fields || []
}

export async function getMaterials() {
    const supabase = await createClient()
    const { data: materials, error } = await supabase
        .from('materials')
        .select(`
      *,
      fields ( name )
    `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching materials:', error)
        return []
    }
    return materials || []
}

export async function getMaterialById(id: string) {
    const supabase = await createClient()
    const { data: material, error } = await supabase
        .from('materials')
        .select(`
      *,
      fields ( name )
    `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching material:', error)
        return null
    }
    return material
}

// ----- Mutations -----

export async function createField(name: string) {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) throw new Error("Unauthorized")

    const { data: field, error } = await supabase
        .from('fields')
        .insert({
            user_id: user.id,
            name: name.trim()
        })
        .select()
        .single()

    if (error) {
        throw new Error('Failed to create field')
    }

    revalidatePath('/')
    return field
}

export async function updateField(id: string, name: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('fields')
        .update({ name: name.trim() })
        .eq('id', id)

    if (error) throw new Error('Failed to update field')
    revalidatePath('/')
}

export async function deleteField(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('fields')
        .delete()
        .eq('id', id)

    if (error) throw new Error('Failed to delete field')
    revalidatePath('/')
}

export async function createMaterial(inputData: {
    title: string
    field_id: string
    type: 'TEXTBOOK' | 'MOVIE' | 'WEBSITE' | 'COURSE'
    cover_url?: string
    total_pages?: number
    pdf_path?: string
    video_path?: string
    parent_id?: string
}) {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) throw new Error("Unauthorized")

    const { data: record, error } = await supabase
        .from('materials')
        .insert({
            user_id: user.id,
            title: inputData.title,
            field_id: inputData.field_id,
            type: inputData.type,
            cover_url: inputData.cover_url || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&q=80',
            total_pages: inputData.total_pages || 0,
            pdf_path: inputData.pdf_path || null,
            video_path: inputData.video_path || null,
            parent_id: inputData.parent_id || null
        })
        .select()
        .single()

    if (error) {
        throw new Error('Failed to create material')
    }

    revalidatePath('/')
    return record
}

export async function updateMaterial(id: string, inputData: {
    title: string
    field_id: string
    total_pages?: number
    video_path?: string
}) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('materials')
        .update({
            title: inputData.title,
            field_id: inputData.field_id,
            total_pages: inputData.total_pages,
            video_path: inputData.video_path
        })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        throw new Error('Failed to update material')
    }

    revalidatePath(`/textbook/${id}`)
    revalidatePath('/')
    return data
}

export async function updateProgress(id: string, current_page: number, total_pages: number) {
    const supabase = await createClient()
    const progress = total_pages > 0 ? (current_page / total_pages) * 100 : 0

    const { error } = await supabase
        .from('materials')
        .update({
            current_page,
            total_pages,
            progress
        })
        .eq('id', id)

    if (error) {
        throw new Error('Failed to update progress')
    }
}

export async function uploadMaterialPdf(materialId: string, formData: FormData) {
    const supabase = await createClient()
    const file = formData.get('file') as File
    if (!file) throw new Error("No file provided")

    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) throw new Error("Unauthorized")

    const filePath = `${user.id}/${materialId}.pdf`

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, file, {
            upsert: true,
            contentType: 'application/pdf'
        })

    if (uploadError) {
        throw new Error(`Upload Failed: ${uploadError.message}`)
    }

    const { error: updateError } = await supabase
        .from('materials')
        .update({ pdf_path: uploadData.path })
        .eq('id', materialId)

    if (updateError) throw new Error('Failed to update material record')

    revalidatePath(`/textbook/${materialId}`)
}

export async function setMaterialPdfPath(materialId: string, pdfPath: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('materials')
        .update({ pdf_path: pdfPath })
        .eq('id', materialId)

    if (error) throw new Error('Failed to update material record')
    revalidatePath(`/textbook/${materialId}`)
}

export async function uploadMaterialVideo(materialId: string, formData: FormData) {
    const supabase = await createClient()
    const file = formData.get('file') as File
    if (!file) throw new Error("No file provided")

    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) throw new Error("Unauthorized")

    const filePath = `${user.id}/${materialId}_video.mp4`

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, file, {
            upsert: true,
            contentType: file.type
        })

    if (uploadError) {
        throw new Error(`Video Upload Failed: ${uploadError.message}`)
    }

    const { error: updateError } = await supabase
        .from('materials')
        .update({ video_path: uploadData.path })
        .eq('id', materialId)

    if (updateError) throw new Error('Failed to update material record')

    revalidatePath(`/textbook/${materialId}`)
}

export async function uploadMaterialCover(materialId: string, formData: FormData) {
    const supabase = await createClient()
    const file = formData.get('file') as File
    if (!file) throw new Error("No file provided")
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) throw new Error("Unauthorized")
    const filePath = `${user.id}/${materialId}_cover.jpg`
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, file, { upsert: true, contentType: file.type })
    if (uploadError) throw new Error(`Cover Upload Failed: ${uploadError.message}`)
    const { data: { publicUrl } } = supabase.storage.from('materials').getPublicUrl(uploadData.path)
    const { error: updateError } = await supabase
        .from('materials')
        .update({ cover_url: publicUrl })
        .eq('id', materialId)
    if (updateError) throw new Error('Failed to update material cover')
    revalidatePath(`/textbook/${materialId}`)
    revalidatePath('/')
}

export async function setMaterialCoverUrl(materialId: string, coverUrl: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('materials')
        .update({ cover_url: coverUrl })
        .eq('id', materialId)

    if (error) throw new Error('Failed to update material cover')
    revalidatePath(`/textbook/${materialId}`)
    revalidatePath('/')
}

export async function getAnnotations(materialId: string, pageNumber: number) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('material_id', materialId)
        .eq('page_number', pageNumber)

    if (error) {
        return []
    }
    return data || []
}

export async function saveAnnotation(annotationInput: {
    material_id: string
    page_number: number
    type: 'stroke'
    data: any
}) {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) throw new Error("Unauthorized")

    const { data: result, error } = await supabase
        .from('annotations')
        .insert({
            user_id: user.id,
            material_id: annotationInput.material_id,
            page_number: annotationInput.page_number,
            type: annotationInput.type,
            data: annotationInput.data
        })
        .select()
        .single()

    if (error) {
        throw new Error('Failed to save annotation')
    }
    return result
}

export async function deleteAnnotation(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('annotations')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error('Failed to delete annotation')
    }
}

export async function deleteMaterial(id: string) {
    const supabase = await createClient()

    const { data: material } = await supabase
        .from('materials')
        .select('pdf_path, video_path')
        .eq('id', id)
        .single()

    const pathsToDelete = []
    if (material?.pdf_path) pathsToDelete.push(material.pdf_path)
    if (material?.video_path) pathsToDelete.push(material.video_path)

    if (pathsToDelete.length > 0) {
        await supabase.storage
            .from('materials')
            .remove(pathsToDelete)
    }

    const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error('Failed to delete material')
    }

    revalidatePath('/')
    redirect('/')
}

export async function detachMaterialFromCourse(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('materials')
        .update({ parent_id: null })
        .eq('id', id)

    if (error) throw new Error('Failed to detach material')

    revalidatePath('/')
    revalidatePath(`/textbook/${id}`)
}

export async function getCourseMaterials(courseId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('materials')
        .select('*, fields(name)')
        .eq('parent_id', courseId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Fetch course materials error:', error)
        return []
    }
    return data as Material[]
}

/**
 * PDFから抽出されたテキストをクリーンアップする
 */
function cleanPdfText(text: string): string {
    return text
        .replace(/([a-z])-\s*\n\s*([a-z])/gi, '$1$2') // ハイフンによる単語の分断を結合 (例: "hyphen-\nated" -> "hyphenated")
        .replace(/\s*\n\s*/g, ' ')                  // 改行をスペースに置換
        .replace(/\s+/g, ' ')                       // 連続するスペースを統合
        .trim()
}

export async function translateText(text: string) {
    const cleanedText = cleanPdfText(text)
    if (!cleanedText || cleanedText.length === 0) return ""

    const deeplKey = process.env.DEEPL_API_KEY

    // DeepL APIが設定されている場合はDeepLを使用 (高精度)
    if (deeplKey) {
        try {
            const isFree = deeplKey.endsWith(':fx')
            const host = isFree ? 'api-free.deepl.com' : 'api.deepl.com'
            const response = await fetch(`https://${host}/v2/translate`, {
                method: 'POST',
                headers: {
                    'Authorization': `DeepL-Auth-Key ${deeplKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    text: cleanedText,
                    target_lang: 'JA',
                }),
            })

            if (response.ok) {
                const data = await response.json()
                return data.translations[0].text
            }
            console.error("DeepL API error:", response.status, await response.text())
            // 失敗した場合は下のGoogle翻訳へフォールバック
        } catch (error) {
            console.error("DeepL connection error:", error)
        }
    }

    // Google Translate Web API (フォールバック)
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(cleanedText)}`

        const response = await fetch(url)
        const data = await response.json()

        if (data && data[0]) {
            return data[0].map((s: any) => s[0]).join('')
        }

        return "翻訳に失敗しました"
    } catch (error) {
        console.error("Translation error:", error)
        return "翻訳エラーが発生しました"
    }
}

export async function askAi(text: string) {
    const cleanedText = cleanPdfText(text)
    if (!cleanedText || cleanedText.length === 0) return ""

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        return "AI API Keyが設定されていません。.envファイルにGoogle Gemini API Keyを設定してください。"
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `あなたは非常に優秀な学習支援AIアシスタントです。
提供されたテキストを単に翻訳するだけでなく、以下の内容を含めて日本語で詳しく解説してください：

1. 要約・翻訳（自然な日本語で）
2. 重要な用語や概念の解説
3. 文脈に基づいた補足情報や重要ポイント

回答は読みやすく、学習の助けになるように構成してください。

抽出テキスト:
"${cleanedText}"`
                    }]
                }]
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error("Gemini API error:", errorData)
            return "AIとの通信中にエラーが発生しました。"
        }

        const data = await response.json()
        if (data && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            return data.candidates[0].content.parts[0].text
        }

        return "AIから有効な回答が得られませんでした。"
    } catch (error) {
        console.error("AI connection error:", error)
        return "AIサービスに接続できませんでした。"
    }
}
