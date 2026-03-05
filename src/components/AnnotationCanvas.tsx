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

    // 全画データの記録用
    const strokesRef = useRef<Stroke[]>([])

    const getPixelRatio = () => (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

    // キャンバス全体をクリーンに再描画する関数（ページ移動やリサイズ時のみ使用）
    const redrawEverything = useCallback(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx || !canvas) return

        const ratio = getPixelRatio()
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        strokesRef.current.forEach(stroke => {
            if (!stroke.points || stroke.points.length < 2) return
            ctx.beginPath()
            ctx.strokeStyle = stroke.color
            ctx.lineWidth = stroke.width * ratio
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

    // DBからの初期データ読み込み
    useEffect(() => {
        strokesRef.current = initialAnnotations.map(ann => ({
            id: ann.id,
            ...ann.data
        }))
        redrawEverything()
    }, [initialAnnotations, redrawEverything])

    // リサイズ管理
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const updateSize = () => {
            const parent = canvas.parentElement
            if (parent) {
                const ratio = getPixelRatio()
                const width = parent.clientWidth
                const height = parent.clientHeight
                canvas.width = width * ratio
                canvas.height = height * ratio
                canvas.style.width = `${width}px`
                canvas.style.height = `${height}px`
                redrawEverything()
            }
        }

        const observer = new ResizeObserver(updateSize)
        if (canvas.parentElement) observer.observe(canvas.parentElement)
        updateSize()
        return () => observer.disconnect()
    }, [redrawEverything])

    const startAction = (e: React.PointerEvent) => {
        if (!isActive) return

        e.stopPropagation()
        e.nativeEvent.stopImmediatePropagation()
        if (e.cancelable) e.preventDefault()

        const canvas = canvasRef.current
        if (!canvas) return
        canvas.setPointerCapture(e.pointerId)

        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height

        if (mode === 'eraser') {
            // 消しゴム機能（判定にしきい値を使用）
            const threshold = 0.02
            const strokeToErase = strokesRef.current.find(stroke =>
                stroke.points.some(p => Math.abs(p.x - x) < threshold && Math.abs(p.y - y) < threshold)
            )
            if (strokeToErase?.id) {
                strokesRef.current = strokesRef.current.filter(s => s.id !== strokeToErase.id)
                redrawEverything()
                deleteAnnotation(strokeToErase.id).catch(err => console.error(err))
            }
        } else {
            isDrawingRef.current = true
            const point = { x, y, p: 0.5 }
            lastPointRef.current = point
            currentPointsRef.current = [point]
        }
    }

    const doAction = (e: React.PointerEvent) => {
        if (!isActive || !isDrawingRef.current) return
        e.stopPropagation()
        e.nativeEvent.stopImmediatePropagation()
        if (e.cancelable) e.preventDefault()

        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx || !canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height
        const ratio = getPixelRatio()

        // 【超高速描画】前回の点から今回の点までを「即座に」描画する
        const lastPoint = lastPointRef.current
        if (lastPoint) {
            ctx.beginPath()
            ctx.strokeStyle = color
            ctx.lineWidth = lineWidth * ratio
            ctx.lineJoin = 'round'
            ctx.lineCap = 'round'
            ctx.moveTo(lastPoint.x * canvas.width, lastPoint.y * canvas.height)
            ctx.lineTo(x * canvas.width, y * canvas.height)
            ctx.stroke()
        }

        const newPoint = { x, y, p: 0.5 }
        lastPointRef.current = newPoint
        currentPointsRef.current.push(newPoint)
    }

    const stopAction = async (e: React.PointerEvent) => {
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

            // 保存処理中も画面には描画済みなので、Refに追加するだけでOK（点滅しない）
            const tempId = 'temp-' + Date.now()
            strokesRef.current.push({ ...newStrokeContent, id: tempId })

            try {
                const saved = await saveAnnotation({
                    material_id: materialId,
                    page_number: pageNumber,
                    type: 'stroke',
                    data: newStrokeContent
                })
                strokesRef.current = strokesRef.current.map(s =>
                    s.id === tempId ? { ...newStrokeContent, id: saved.id } : s
                )
            } catch (err) {
                console.error('Save failed:', err)
                strokesRef.current = strokesRef.current.filter(s => s.id !== tempId)
                redrawEverything()
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
            onPointerOut={stopAction}
            style={{
                touchAction: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                position: 'absolute',
                top: 0,
                left: 0,
                display: 'block',
                outline: 'none'
            }}
            className={`z-[200] ${isActive ? (mode === 'pen' ? 'cursor-crosshair' : 'cursor-cell') : 'pointer-events-none'}`}
        />
    )
}
