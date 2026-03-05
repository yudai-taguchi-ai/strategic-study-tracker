'use client'

import { useRef, useEffect, useCallback } from 'react'
import { saveAnnotation, deleteAnnotation } from '@/app/actions'

interface Point {
    x: number
    y: number
}

interface Stroke {
    id?: string
    points: Point[]
    color: string
    width: number
}

interface Props {
    materialId: string
    pageNumber: number
    initialAnnotations?: any[]
    isActive: boolean
    mode: 'pen' | 'eraser'
    color: string
    lineWidth: number
}

export function AnnotationCanvas({ materialId, pageNumber, initialAnnotations = [], isActive, mode, color, lineWidth }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

    // 背景固定用の裏キャンバス
    const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const bufferCtxRef = useRef<CanvasRenderingContext2D | null>(null)

    const isDrawingRef = useRef(false)
    const strokesRef = useRef<Stroke[]>([])
    const currentPointsRef = useRef<Point[]>([])

    const getPixelRatio = () => (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

    // ベジェ描画エンジン
    const drawBezier = (ctx: CanvasRenderingContext2D, points: Point[], color: string, width: number, w: number, h: number) => {
        if (points.length < 2) return
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.moveTo(points[0].x * w, points[0].y * h)
        for (let i = 1; i < points.length - 2; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2 * w
            const yc = (points[i].y + points[i + 1].y) / 2 * h
            ctx.quadraticCurveTo(points[i].x * w, points[i].y * h, xc, yc)
        }
        if (points.length >= 2) {
            const last = points[points.length - 1]
            ctx.lineTo(last.x * w, last.y * h)
        }
        ctx.stroke()
    }

    // 裏側に描画内容を固定する（高速化の肝）
    const updateBuffer = useCallback(() => {
        const bg = bufferCanvasRef.current
        const bctx = bufferCtxRef.current
        if (!bg || !bctx) return
        const ratio = getPixelRatio()

        bctx.clearRect(0, 0, bg.width, bg.height)
        strokesRef.current.forEach(s => {
            drawBezier(bctx, s.points, s.color, s.width * ratio, bg.width, bg.height)
        })

        // メイン画面へ即座に反映
        const canvas = canvasRef.current
        const ctx = ctxRef.current
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(bg, 0, 0)
        }
    }, [])

    // コンテキスト初期化
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        // 低遅延モードの有効化
        const ctx = canvas.getContext('2d', { desynchronized: true, alpha: true })
        if (ctx) ctxRef.current = ctx as CanvasRenderingContext2D

        // 裏キャンバスの作成
        const bg = document.createElement('canvas')
        bufferCanvasRef.current = bg
        bufferCtxRef.current = bg.getContext('2d', { alpha: true })

        const handleDown = (e: PointerEvent) => {
            if (!isActive) return
            // ペン以外の不要な圧力をフィルタリング（パームリジェクション）
            if (e.pointerType === 'touch' && e.pressure === 0) return

            e.preventDefault()
            e.stopImmediatePropagation()

            isDrawingRef.current = true
            const rect = canvas.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width
            const y = (e.clientY - rect.top) / rect.height
            currentPointsRef.current = [{ x, y }]

            if (mode === 'eraser') {
                const threshold = 0.02
                const target = strokesRef.current.find(s =>
                    s.points.some(p => Math.abs(p.x - x) < threshold && Math.abs(p.y - y) < threshold)
                )
                if (target?.id) {
                    strokesRef.current = strokesRef.current.filter(s => s.id !== target.id)
                    updateBuffer()
                    deleteAnnotation(target.id)
                }
            }
            canvas.setPointerCapture(e.pointerId)
        }

        const handleMove = (e: PointerEvent) => {
            if (!isActive || !isDrawingRef.current || mode === 'eraser') return
            e.preventDefault()
            e.stopImmediatePropagation()

            const canvas = canvasRef.current
            const ctx = ctxRef.current
            if (!canvas || !ctx) return
            const rect = canvas.getBoundingClientRect()
            const ratio = getPixelRatio()

            // 全サブドットと予測ドットを使用
            const coalesced = (e as any).getCoalescedEvents?.() || [e]

            ctx.strokeStyle = color
            ctx.lineWidth = lineWidth * ratio
            ctx.lineJoin = 'round'
            ctx.lineCap = 'round'

            coalesced.forEach((ev: PointerEvent) => {
                const x = (ev.clientX - rect.left) / rect.width
                const y = (ev.clientY - rect.top) / rect.height
                const last = currentPointsRef.current[currentPointsRef.current.length - 1]

                // 1点1点描画し、一切の「隙」をなくす
                ctx.beginPath()
                ctx.moveTo(last.x * canvas.width, last.y * canvas.height)
                ctx.lineTo(x * canvas.width, y * canvas.height)
                ctx.stroke()

                currentPointsRef.current.push({ x, y })
            })
        }

        const handleUp = (e: PointerEvent) => {
            if (!isDrawingRef.current) return
            isDrawingRef.current = false
            canvas.releasePointerCapture(e.pointerId)

            if (currentPointsRef.current.length > 1 && mode !== 'eraser') {
                const newStroke = { points: [...currentPointsRef.current], color, width: lineWidth }
                strokesRef.current.push(newStroke)
                updateBuffer() // 裏側に書き込んで固定

                saveAnnotation({ material_id: materialId, page_number: pageNumber, type: 'stroke', data: newStroke })
                    .then(saved => {
                        strokesRef.current[strokesRef.current.length - 1].id = saved.id
                    })
            }
            currentPointsRef.current = []
        }

        canvas.addEventListener('pointerdown', handleDown, { capture: true, passive: false })
        canvas.addEventListener('pointermove', handleMove, { capture: true, passive: false })
        canvas.addEventListener('pointerup', handleUp, { capture: true, passive: false })
        canvas.addEventListener('pointercancel', handleUp, { capture: true, passive: false })

        return () => {
            canvas.removeEventListener('pointerdown', handleDown, { capture: true })
            canvas.removeEventListener('pointermove', handleMove, { capture: true })
            canvas.removeEventListener('pointerup', handleUp, { capture: true })
            canvas.removeEventListener('pointercancel', handleUp, { capture: true })
        }
    }, [isActive, mode, color, lineWidth, materialId, pageNumber, updateBuffer])

    // 初期化とリサイズ
    useEffect(() => {
        strokesRef.current = initialAnnotations.map(ann => ({ id: ann.id, ...ann.data }))
        updateBuffer()
    }, [initialAnnotations, updateBuffer])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const updateSize = () => {
            const parent = canvas.parentElement
            const bg = bufferCanvasRef.current
            if (parent && bg) {
                const ratio = getPixelRatio()
                const w = parent.clientWidth * ratio
                const h = parent.clientHeight * ratio

                canvas.width = w
                canvas.height = h
                canvas.style.width = parent.clientWidth + 'px'
                canvas.style.height = parent.clientHeight + 'px'

                bg.width = w
                bg.height = h
                updateBuffer()
            }
        }
        const obs = new ResizeObserver(updateSize)
        if (canvas.parentElement) obs.observe(canvas.parentElement)
        updateSize()
        return () => obs.disconnect()
    }, [updateBuffer])

    return (
        <canvas
            ref={canvasRef}
            style={{
                touchAction: 'none',
                position: 'absolute',
                top: 0, left: 0,
                display: 'block',
                willChange: 'transform, contents',
                cursor: 'crosshair'
            }}
            className="z-[200] select-none"
        />
    )
}
