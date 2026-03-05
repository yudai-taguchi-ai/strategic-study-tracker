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

    // 背景固定用のキャッシュ
    const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const bufferCtxRef = useRef<CanvasRenderingContext2D | null>(null)

    const isDrawingRef = useRef(false)
    const strokesRef = useRef<Stroke[]>([])
    const currentPointsRef = useRef<Point[]>([])

    // 高速化：座標変換のキャッシュ
    const rectRef = useRef<{ width: number; height: number; left: number; top: number } | null>(null)

    const getPixelRatio = () => (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

    // 滑らかな曲線描画（高速版）
    const drawSmoothPath = (ctx: CanvasRenderingContext2D, points: Point[], w: number, h: number) => {
        if (points.length < 2) return
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
    }

    // 全再描画（背景キャッシュの更新）
    const updateBuffer = useCallback(() => {
        const bg = bufferCanvasRef.current
        const bctx = bufferCtxRef.current
        const canvas = canvasRef.current
        const ctx = ctxRef.current
        if (!bg || !bctx || !canvas || !ctx) return

        const ratio = getPixelRatio()
        bctx.clearRect(0, 0, bg.width, bg.height)

        strokesRef.current.forEach(s => {
            bctx.beginPath()
            bctx.strokeStyle = s.color
            bctx.lineWidth = s.width * ratio
            bctx.lineJoin = 'round'
            bctx.lineCap = 'round'
            drawSmoothPath(bctx, s.points, bg.width, bg.height)
            bctx.stroke()
        })

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(bg, 0, 0)
    }, [])

    // 初期化
    useEffect(() => {
        if (typeof document === 'undefined') return
        if (!bufferCanvasRef.current) {
            bufferCanvasRef.current = document.createElement('canvas')
            bufferCtxRef.current = bufferCanvasRef.current.getContext('2d', { alpha: true })
        }
    }, [])

    // リサイズとデータの反映
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const updateSize = () => {
            const parent = canvas.parentElement
            const bg = bufferCanvasRef.current
            if (parent && bg) {
                const ratio = getPixelRatio()
                const w = parent.clientWidth
                const h = parent.clientHeight

                canvas.width = w * ratio
                canvas.height = h * ratio
                canvas.style.width = w + 'px'
                canvas.style.height = h + 'px'

                bg.width = w * ratio
                bg.height = h * ratio

                rectRef.current = { width: w, height: h, left: canvas.getBoundingClientRect().left, top: canvas.getBoundingClientRect().top }
                updateBuffer()
            }
        }

        const obs = new ResizeObserver(updateSize)
        if (canvas.parentElement) obs.observe(canvas.parentElement)

        strokesRef.current = initialAnnotations.map(ann => ({ id: ann.id, ...ann.data }))
        updateSize()

        return () => obs.disconnect()
    }, [initialAnnotations, updateBuffer])

    // ネイティブイベントによる超高速処理
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        ctxRef.current = canvas.getContext('2d', { desynchronized: true, alpha: true })

        // 消去判定の共通ロジック
        const eraseAt = (x: number, y: number) => {
            const threshold = 0.02
            const found = strokesRef.current.find(s => s.points.some(p => Math.abs(p.x - x) < threshold && Math.abs(p.y - y) < threshold))
            if (found?.id) {
                strokesRef.current = strokesRef.current.filter(s => s.id !== found.id)
                updateBuffer()
                deleteAnnotation(found.id)
                return true
            }
            return false
        }

        const handleDown = (e: PointerEvent) => {
            if (!isActive) return

            // どんな入力（指・ペン）であっても、背景のPDFにイベントを届かせないために
            // 判定（Pencilかどうか）の前に preventDefault を行う。これが「青膜」と「メニュー」を防ぐ最重要の盾。
            e.preventDefault()
            e.stopImmediatePropagation()
            window.getSelection()?.removeAllRanges()

            if (e.pointerType === 'touch' && e.pressure === 0) return

            isDrawingRef.current = true
            const rect = canvas.getBoundingClientRect()
            rectRef.current = { width: rect.width, height: rect.height, left: rect.left, top: rect.top }

            const x = (e.clientX - rect.left) / rect.width
            const y = (e.clientY - rect.top) / rect.height
            currentPointsRef.current = [{ x, y }]

            if (mode === 'eraser') {
                eraseAt(x, y)
            }
            canvas.setPointerCapture(e.pointerId)
        }

        const handleMove = (e: PointerEvent) => {
            if (!isActive || !isDrawingRef.current) return
            e.preventDefault()
            e.stopImmediatePropagation()
            window.getSelection()?.removeAllRanges()

            const ctx = ctxRef.current
            const rect = rectRef.current
            if (!ctx || !rect) return
            const ratio = getPixelRatio()

            const coalesced = (e as any).getCoalescedEvents?.() || [e]

            coalesced.forEach((ev: PointerEvent) => {
                const x = (ev.clientX - rect.left) / rect.width
                const y = (ev.clientY - rect.top) / rect.height

                if (mode === 'eraser') {
                    // 移動中も連続して消去判定を行う（ブラシ消しゴム）
                    eraseAt(x, y)
                } else {
                    const last = currentPointsRef.current[currentPointsRef.current.length - 1]

                    // 動的な間引き：距離があまりに近すぎる点は無視（計算コスト削減）
                    const dist = Math.sqrt(Math.pow(x - last.x, 2) + Math.pow(y - last.y, 2))
                    if (dist < 0.001) return

                    ctx.strokeStyle = color
                    ctx.lineWidth = lineWidth * ratio
                    ctx.lineJoin = 'round'
                    ctx.lineCap = 'round'
                    ctx.beginPath()
                    ctx.moveTo(last.x * rect.width * ratio, last.y * rect.height * ratio)
                    ctx.lineTo(x * rect.width * ratio, y * rect.height * ratio)
                    ctx.stroke()

                    currentPointsRef.current.push({ x, y })
                }
            })
        }

        const handleUp = (e: PointerEvent) => {
            if (!isDrawingRef.current) return
            isDrawingRef.current = false
            canvas.releasePointerCapture(e.pointerId)

            if (currentPointsRef.current.length > 1 && mode !== 'eraser') {
                const tempId = 'temp-' + Date.now()
                const newStroke = { id: tempId, points: [...currentPointsRef.current], color, width: lineWidth }
                strokesRef.current.push(newStroke)
                updateBuffer()

                saveAnnotation({ material_id: materialId, page_number: pageNumber, type: 'stroke', data: newStroke })
                    .then(saved => {
                        const idx = strokesRef.current.findIndex(s => s.id === tempId)
                        if (idx !== -1) strokesRef.current[idx].id = saved.id
                    })
            }
            currentPointsRef.current = []
        }

        canvas.addEventListener('pointerdown', handleDown, { capture: true, passive: false })
        canvas.addEventListener('pointermove', handleMove, { capture: true, passive: false })
        canvas.addEventListener('pointerup', handleUp, { capture: true, passive: false })
        canvas.addEventListener('pointercancel', handleUp, { capture: true, passive: false })

        // 究極の「長押しメニュー」殺し
        // PointerEvent だけでなく、生（Native）の TouchEvent を直接封殺する
        const killTouch = (e: TouchEvent) => {
            if (isActive) {
                if (e.cancelable) e.preventDefault()
                e.stopImmediatePropagation()
            }
        }
        canvas.addEventListener('touchstart', killTouch, { capture: true, passive: false })
        canvas.addEventListener('touchend', killTouch, { capture: true, passive: false })
        canvas.addEventListener('contextmenu', (e) => e.preventDefault(), { capture: true })

        return () => {
            canvas.removeEventListener('pointerdown', handleDown, { capture: true })
            canvas.removeEventListener('pointermove', handleMove, { capture: true })
            canvas.removeEventListener('pointerup', handleUp, { capture: true })
            canvas.removeEventListener('pointercancel', handleUp, { capture: true })
            canvas.removeEventListener('touchstart', killTouch, { capture: true })
            canvas.removeEventListener('touchend', killTouch, { capture: true })
        }
    }, [isActive, mode, color, lineWidth, materialId, pageNumber, updateBuffer])

    return (
        <canvas
            ref={canvasRef}
            style={{
                touchAction: isActive ? 'none' : 'auto',
                position: 'absolute',
                top: 0, left: 0,
                display: 'block',
                willChange: 'transform, contents',
                transform: 'translateZ(0)', // GPUレイヤーを強制
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                WebkitTapHighlightColor: 'transparent',
                cursor: isActive ? (mode === 'pen' ? 'crosshair' : 'cell') : 'default',
                pointerEvents: isActive ? 'auto' : 'none'
            }}
            className="z-[200] select-none"
        />
    )
}
