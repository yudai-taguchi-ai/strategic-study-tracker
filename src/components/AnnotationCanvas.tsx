'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { saveAnnotation, deleteAnnotation } from '@/app/actions'

interface Point {
    x: number
    y: number
    p: number
}

interface Stroke {
    id?: string // Supabase row ID
    points: Point[]
    color: string
    width: number
}

interface Props {
    materialId: string
    pageNumber: number
    initialAnnotations?: any[] // Rows from DB
    isActive: boolean
    mode: 'pen' | 'eraser'
    color: string
    lineWidth: number
}

export function AnnotationCanvas({ materialId, pageNumber, initialAnnotations = [], isActive, mode, color, lineWidth }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawingRef = useRef(false)
    const lastPointRef = useRef<Point | null>(null)
    const currentPointsRef = useRef<Point[]>([])
    const [allStrokes, setAllStrokes] = useState<Stroke[]>([])

    // 高精細（Retina）ディスプレイ対応のためのスケール取得
    const getPixelRatio = () => (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

    // 全画の再描画（Reactの状態が変更された時やリサイズ時に呼び出し）
    const drawAll = useCallback((strokes: Stroke[]) => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx || !canvas) return

        const ratio = getPixelRatio()
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        strokes.forEach(stroke => {
            if (!stroke.points || stroke.points.length < 2) return
            ctx.beginPath()
            ctx.strokeStyle = stroke.color
            ctx.lineWidth = stroke.width * ratio // 倍率に合わせて太さを調整
            ctx.lineJoin = 'round'
            ctx.lineCap = 'round'

            stroke.points.forEach((p, i) => {
                const x = p.x * canvas.width
                const y = p.y * canvas.height
                if (i === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
            })
            ctx.stroke()
        })
    }, [])

    // 初回ロード
    useEffect(() => {
        const strokes = initialAnnotations.map(ann => ({
            id: ann.id,
            ...ann.data
        }))
        setAllStrokes(strokes)
    }, [initialAnnotations])

    // リサイズ対応（PDFのサイズに合わせる）
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const updateSize = () => {
            const parent = canvas.parentElement
            if (parent) {
                const ratio = getPixelRatio()
                const width = parent.clientWidth
                const height = parent.clientHeight

                // キャンバスの内部解像度を物理ピクセルに合わせる
                canvas.width = width * ratio
                canvas.height = height * ratio
                // 表示上のサイズ（CSS）は親に合わせる
                canvas.style.width = `${width}px`
                canvas.style.height = `${height}px`

                drawAll(allStrokes)
            }
        }

        const observer = new ResizeObserver(updateSize)
        if (canvas.parentElement) observer.observe(canvas.parentElement)
        updateSize()

        return () => observer.disconnect()
    }, [allStrokes, drawAll])

    const findAndEraseStroke = async (x: number, y: number) => {
        const threshold = 0.02
        const strokeToErase = allStrokes.find(stroke =>
            stroke.points.some(p => Math.abs(p.x - x) < threshold && Math.abs(p.y - y) < threshold)
        )

        if (strokeToErase?.id) {
            setAllStrokes(prev => prev.filter(s => s.id !== strokeToErase.id))
            try {
                await deleteAnnotation(strokeToErase.id)
            } catch (err) {
                console.error('Delete failed:', err)
            }
        }
    }

    const startAction = (e: React.PointerEvent) => {
        if (!isActive) return

        // イベントの伝播を完全に止める（背景のテキスト選択などを防ぐ）
        e.stopPropagation()
        if (e.cancelable) e.preventDefault()

        const canvas = canvasRef.current
        if (!canvas) return

        canvas.setPointerCapture(e.pointerId)

        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height

        if (mode === 'eraser') {
            findAndEraseStroke(x, y)
        } else {
            isDrawingRef.current = true
            const point = { x, y, p: e.pressure || 0.5 }
            lastPointRef.current = point
            currentPointsRef.current = [point]
        }
    }

    const doAction = (e: React.PointerEvent) => {
        if (!isActive) return
        e.stopPropagation()
        if (e.cancelable) e.preventDefault()

        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height

        if (mode === 'eraser') {
            findAndEraseStroke(x, y)
            return
        }

        if (!isDrawingRef.current) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const ratio = getPixelRatio()
        const newPoint = { x, y, p: e.pressure || 0.5 }

        // 即時描画（Reactの再レンダリングを介さないので爆速）
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth * ratio
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.beginPath()

        const lastPoint = lastPointRef.current
        if (lastPoint) {
            ctx.moveTo(lastPoint.x * canvas.width, lastPoint.y * canvas.height)
            ctx.lineTo(x * canvas.width, y * canvas.height)
            ctx.stroke()
        }

        lastPointRef.current = newPoint
        currentPointsRef.current.push(newPoint)
    }

    const stopAction = async (e: React.PointerEvent) => {
        if (!isActive) return

        const canvas = canvasRef.current
        if (canvas) canvas.releasePointerCapture(e.pointerId)

        if (!isDrawingRef.current) return
        isDrawingRef.current = false

        if (currentPointsRef.current.length > 1) {
            const newStrokeContent = {
                points: currentPointsRef.current,
                color: color,
                width: lineWidth
            }

            // UIを更新
            setAllStrokes(prev => [...prev, { ...newStrokeContent, id: 'temp-' + Date.now() }])

            try {
                const saved = await saveAnnotation({
                    material_id: materialId,
                    page_number: pageNumber,
                    type: 'stroke',
                    data: newStrokeContent
                })
                // 仮IDを本物へ
                setAllStrokes(prev => prev.map(s => s.id?.toString().startsWith('temp') ? { ...newStrokeContent, id: saved.id } : s))
            } catch (err) {
                console.error('Save failed:', err)
                setAllStrokes(prev => prev.filter(s => !s.id?.toString().startsWith('temp')))
            }
        }

        lastPointRef.current = null
        currentPointsRef.current = []
    }

    return (
        <canvas
            ref={canvasRef}
            onPointerDown={startAction}
            onPointerMove={doAction}
            onPointerUp={stopAction}
            onPointerOut={stopAction} // 枠外に出た時も終了
            style={{
                touchAction: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                position: 'absolute',
                top: 0,
                left: 0,
                display: 'block'
            }}
            className={`z-[100] ${isActive ? (mode === 'pen' ? 'cursor-crosshair' : 'cursor-cell') : 'pointer-events-none'}`}
        />
    )
}
