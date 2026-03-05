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
    const isDrawingRef = useRef(false)
    const strokesRef = useRef<Stroke[]>([])
    const currentPointsRef = useRef<Point[]>([])

    const getPixelRatio = () => (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

    // 全再描画（ベジェ補完）
    const redrawEverything = useCallback(() => {
        const canvas = canvasRef.current
        const ctx = ctxRef.current
        if (!ctx || !canvas) return
        const ratio = getPixelRatio()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        strokesRef.current.forEach(stroke => {
            if (stroke.points.length < 2) return
            drawSmoothPath(ctx, stroke.points, stroke.color, stroke.width * ratio, canvas.width, canvas.height)
        })
    }, [])

    const drawSmoothPath = (ctx: CanvasRenderingContext2D, points: Point[], color: string, width: number, w: number, h: number) => {
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
        if (points.length > 2) {
            const n = points.length - 1
            ctx.quadraticCurveTo(points[n - 1].x * w, points[n - 1].y * h, points[n].x * w, points[n].y * h)
        } else if (points.length === 2) {
            ctx.lineTo(points[1].x * w, points[1].y * h)
        }
        ctx.stroke()
    }

    const eraseAt = (x: number, y: number) => {
        const threshold = 0.02
        const strokeToErase = strokesRef.current.find(stroke =>
            stroke.points.some(p => Math.abs(p.x - x) < threshold && Math.abs(p.y - y) < threshold)
        )
        if (strokeToErase?.id) {
            strokesRef.current = strokesRef.current.filter(s => s.id !== strokeToErase.id)
            redrawEverything()
            deleteAnnotation(strokeToErase.id).catch(() => { })
        }
    }

    // ネイティブレイヤーでの超高速処理
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d', { desynchronized: true, alpha: true })
        if (ctx) ctxRef.current = ctx as CanvasRenderingContext2D

        const handleDown = (e: PointerEvent) => {
            if (!isActive) return
            // ペン以外の不要な入力をフィルタリング（パームリジェクション）
            if (e.pointerType === 'touch' && e.pressure === 0) return

            e.preventDefault()
            e.stopImmediatePropagation()

            isDrawingRef.current = true
            const rect = canvas.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width
            const y = (e.clientY - rect.top) / rect.height
            currentPointsRef.current = [{ x, y }]

            if (mode === 'eraser') eraseAt(x, y)
            canvas.setPointerCapture(e.pointerId)
        }

        const handleMove = (e: PointerEvent) => {
            if (!isActive || !isDrawingRef.current) return
            e.preventDefault()
            e.stopImmediatePropagation()

            const canvas = canvasRef.current
            const ctx = ctxRef.current
            if (!canvas || !ctx) return
            const rect = canvas.getBoundingClientRect()
            const ratio = getPixelRatio()

            // 全サブドットと予測ドットを取得
            const coalesced = (e as any).getCoalescedEvents?.() || [e]
            const predicted = (e as any).getPredictedEvents?.() || []

            ctx.strokeStyle = color
            ctx.lineWidth = lineWidth * ratio
            ctx.lineJoin = 'round'
            ctx.lineCap = 'round'

            // 一括描画（効率化の要）
            ctx.beginPath()
            const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1]
            ctx.moveTo(lastPoint.x * canvas.width, lastPoint.y * canvas.height)

            coalesced.forEach((ev: PointerEvent) => {
                const x = (ev.clientX - rect.left) / rect.width
                const y = (ev.clientY - rect.top) / rect.height
                if (mode === 'eraser') {
                    eraseAt(x, y)
                } else {
                    ctx.lineTo(x * canvas.width, y * canvas.height)
                }
                currentPointsRef.current.push({ x, y })
            })

            // 予測点も薄く一括描画
            if (mode !== 'eraser' && predicted.length > 0) {
                ctx.stroke() // 本線を一度描画
                ctx.beginPath()
                ctx.globalAlpha = 0.4
                ctx.moveTo(currentPointsRef.current[currentPointsRef.current.length - 1].x * canvas.width, currentPointsRef.current[currentPointsRef.current.length - 1].y * canvas.height)
                predicted.forEach((ev: PointerEvent) => {
                    const x = (ev.clientX - rect.left) / rect.width
                    const y = (ev.clientY - rect.top) / rect.height
                    ctx.lineTo(x * canvas.width, y * canvas.height)
                })
                ctx.stroke()
                ctx.globalAlpha = 1.0
            } else {
                ctx.stroke()
            }
        }

        const handleUp = (e: PointerEvent) => {
            if (!isDrawingRef.current) return
            isDrawingRef.current = false
            canvas.releasePointerCapture(e.pointerId)

            if (currentPointsRef.current.length > 1 && mode !== 'eraser') {
                const newStroke = { points: [...currentPointsRef.current], color, width: lineWidth }
                const tempId = 'temp-' + Date.now()
                strokesRef.current.push({ ...newStroke, id: tempId })
                redrawEverything() // 最後に綺麗な曲線に差し替え

                saveAnnotation({ material_id: materialId, page_number: pageNumber, type: 'stroke', data: newStroke })
                    .then(saved => {
                        strokesRef.current = strokesRef.current.map(s => s.id === tempId ? { ...newStroke, id: saved.id } : s)
                    })
            }
            currentPointsRef.current = []
        }

        // Windowレベルでイベントを奪取し、OSの介入を阻止
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
    }, [isActive, mode, color, lineWidth, materialId, pageNumber, redrawEverything])

    // 初期化とリサイズ
    useEffect(() => {
        strokesRef.current = initialAnnotations.map(ann => ({ id: ann.id, ...ann.data }))
        redrawEverything()
    }, [initialAnnotations, redrawEverything])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const updateSize = () => {
            const parent = canvas.parentElement
            if (parent) {
                const ratio = getPixelRatio()
                canvas.width = parent.clientWidth * ratio
                canvas.height = parent.clientHeight * ratio
                canvas.style.width = parent.clientWidth + 'px'
                canvas.style.height = parent.clientHeight + 'px'
                redrawEverything()
            }
        }
        const obs = new ResizeObserver(updateSize)
        if (canvas.parentElement) obs.observe(canvas.parentElement)
        updateSize()
        return () => obs.disconnect()
    }, [redrawEverything])

    return (
        <canvas
            ref={canvasRef}
            style={{
                touchAction: 'none',
                position: 'absolute',
                top: 0, left: 0,
                display: 'block',
                willChange: 'transform, contents',
                cursor: 'crosshair',
                pointerEvents: 'auto'
            }}
            className="z-[200]"
        />
    )
}
