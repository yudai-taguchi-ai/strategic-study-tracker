// Supabase Schema Types

export interface Field {
    id: string
    user_id: string
    name: string
    created_at: string
}

export interface Material {
    id: string
    user_id: string
    field_id: string
    title: string
    type: 'TEXTBOOK' | 'MOVIE' | 'WEBSITE'
    cover_url: string | null
    pdf_path: string | null
    video_path: string | null
    total_pages: number
    current_page: number
    scroll_ratio: number
    progress: number
    created_at: string

    // joined relation
    fields?: { name: string }
}

export interface Annotation {
    id: string
    user_id: string
    material_id: string
    page_number: number
    type: 'highlight' | 'note' | 'stroke'
    data: Record<string, any>
    created_at: string
    updated_at: string
}
