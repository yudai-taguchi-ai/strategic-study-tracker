'use client'

import { useState, useEffect, useTransition } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, Edit3, Eraser, ArrowLeft, ZoomIn, ZoomOut, RefreshCw, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateProgress, getAnnotations } from '@/app/actions'
import { AnnotationCanvas } from './AnnotationCanvas'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Web Workerの設定
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface Props {
    materialId: string
    pdfUrl: string
    initialPage: number
    totalPageCount: number
}

export function PdfViewer({ materialId, pdfUrl, initialPage, totalPageCount }: Props) {
    const [numPages, setNumPages] = useState<number>(totalPageCount)
    const [pageNumber, setPageNumber] = useState(initialPage || 1)
    const [isPending, startTransition] = useTransition()
    const [scale, setScale] = useState(1.0)

    // Handwriting tools state
    const [isPencilMode, setIsPencilMode] = useState(false)
    const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen')
    const [activeColor, setActiveColor] = useState('#FF3B30')
    const [lineWidth, setLineWidth] = useState(2)
    const [initialAnnotations, setInitialAnnotations] = useState<any[]>([])
    const router = useRouter()
    const [containerWidth, setContainerWidth] = useState<number>(1000)
    const [hasSyncedTotalPages, setHasSyncedTotalPages] = useState(false)

    // Window Resize Handler - Maximize for iPad
    useEffect(() => {
        function handleResize() {
            setContainerWidth(window.innerWidth)
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Load annotations
    useEffect(() => {
        async function loadAnnotations() {
            const data = await getAnnotations(materialId, pageNumber)
            setInitialAnnotations(data)
        }
        loadAnnotations()
    }, [pageNumber, materialId])

    // Sync progress
    useEffect(() => {
        if (pageNumber !== initialPage && numPages > 1) {
            const timer = setTimeout(() => {
                startTransition(async () => {
                    await updateProgress(materialId, pageNumber, numPages)
                })
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [pageNumber, materialId, numPages, initialPage])

    const onDocumentLoadSuccess = ({ numPages: loadedNumPages }: { numPages: number }) => {
        setNumPages(loadedNumPages)
        // ページ数がDB（初期値1など）とズレている場合は自動更新（一度だけ実行）
        if (!hasSyncedTotalPages && loadedNumPages > 0 && (totalPageCount <= 1 || loadedNumPages !== totalPageCount)) {
            setHasSyncedTotalPages(true)
            startTransition(async () => {
                await updateProgress(materialId, pageNumber, loadedNumPages)
            })
        }
    }

    // 1. Global Lockdown Effect for Pencil Mode
    useEffect(() => {
        if (!isPencilMode) return

        // Create a style element to lock the entire document
        const style = document.createElement('style')
        style.id = 'pencil-lock-style'
        style.innerHTML = `
            html, body {
                -webkit-user-select: none !important;
                -webkit-touch-callout: none !important;
                -webkit-tap-highlight-color: transparent !important;
                user-select: none !important;
                touch-action: none !important;
                overscroll-behavior: none !important;
                overflow: hidden !important;
            }
            * {
                -webkit-user-select: none !important;
                -webkit-touch-callout: none !important;
                -webkit-tap-highlight-color: transparent !important;
                user-select: none !important;
            }
            input, button, a, div[role="button"] {
                -webkit-user-select: auto !important;
                user-select: auto !important;
                touch-action: auto !important;
            }
        `
        document.head.appendChild(style)

        // Aggressively capture and kill all zoom/system gestures
        const killEvent = (e: Event) => {
            if (isPencilMode) {
                if (e.cancelable) e.preventDefault()
                e.stopPropagation()
                e.stopImmediatePropagation()
                window.getSelection()?.removeAllRanges()
            }
        }

        const killSelection = () => {
            if (isPencilMode) {
                window.getSelection()?.removeAllRanges()
            }
        }

        // Double-tap zoom killing (Capturing phase)
        window.addEventListener('dblclick', killEvent, { capture: true })

        // Multi-touch zoom & Selection prevention
        const handleTouchStart = (e: TouchEvent) => {
            if (!isPencilMode) return
            if (e.touches.length > 1 && e.cancelable) {
                e.preventDefault()
            }
            window.getSelection()?.removeAllRanges()
        }

        window.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false })

        // OS Level events suppression
        window.addEventListener('contextmenu', killEvent, { capture: true })
        window.addEventListener('selectstart', killEvent, { capture: true })
        window.addEventListener('selectionchange', killSelection, { capture: true })
        window.addEventListener('gesturestart', killEvent, { capture: true })
        window.addEventListener('dragstart', killEvent, { capture: true })

        return () => {
            document.getElementById('pencil-lock-style')?.remove()
            window.removeEventListener('dblclick', killEvent, { capture: true })
            window.removeEventListener('touchstart', handleTouchStart, { capture: true })
            window.removeEventListener('contextmenu', killEvent, { capture: true })
            window.removeEventListener('selectstart', killEvent, { capture: true })
            window.removeEventListener('selectionchange', killSelection, { capture: true })
            window.removeEventListener('gesturestart', killEvent, { capture: true })
            window.removeEventListener('dragstart', killEvent, { capture: true })
        }
    }, [isPencilMode])

    const goToPrevPage = () => !isPencilMode && setPageNumber(p => Math.max(1, p - 1))
    const goToNextPage = () => !isPencilMode && setPageNumber(p => Math.min(numPages, p + 1))
    const handleResetScale = () => !isPencilMode && setScale(1.0)

    return (
        <div
            className={`flex flex-col h-screen bg-black overflow-hidden relative ${isPencilMode ? 'select-none touch-none cursor-crosshair' : ''}`}
            onDoubleClick={(e) => isPencilMode && e.preventDefault()}
        >
            {/* 1. Header - Physically REMOVED in Pencil Mode */}
            {!isPencilMode && (
                <div className="flex items-center justify-between px-6 py-4 bg-surface-1/50 backdrop-blur-md border-b border-white/5 z-50">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 -ml-2 text-gray-400 hover:text-white transition group"
                        >
                            <ArrowLeft size={24} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="h-4 w-[1px] bg-white/10 mx-1" />
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                max={numPages}
                                value={pageNumber}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value)
                                    if (!isNaN(val) && val >= 1 && val <= numPages) {
                                        setPageNumber(val)
                                    }
                                }}
                                className="w-12 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-black font-mono text-center focus:border-white/30 outline-none transition-all"
                            />
                            <span className="text-[10px] font-black tracking-widest text-white/20 uppercase">of</span>
                            <span className="text-[10px] font-black tracking-widest text-white/40 tabular-nums">
                                {numPages}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-surface-2 p-1 rounded-2xl border border-white/5 z-[250] relative">
                        <button
                            onClick={() => { setIsPencilMode(true); setActiveTool('pen') }}
                            className="p-2.5 rounded-xl transition-all bg-transparent text-gray-500 hover:text-white"
                        >
                            <Edit3 size={18} strokeWidth={2.5} />
                        </button>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => {
                                setHasSyncedTotalPages(false)
                                router.refresh()
                            }}
                            className="text-gray-400 hover:text-white transition p-3 hover:bg-white/5 rounded-xl flex items-center gap-2"
                            title="ページ数を再確認"
                        >
                            <RefreshCw size={18} className={isPending ? "animate-spin" : ""} />
                        </button>
                        <div className="h-4 w-[1px] bg-white/10 mx-1" />
                        <button onClick={() => setScale(s => Math.max(0.3, s - 0.2))} className="text-gray-400 hover:text-white transition p-3 hover:bg-white/5 rounded-xl"><ZoomOut size={20} /></button>
                        <button onClick={handleResetScale} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition px-2">Reset</button>
                        <button onClick={() => setScale(s => Math.min(4, s + 0.2))} className="text-gray-400 hover:text-white transition p-3 hover:bg-white/5 rounded-xl"><ZoomIn size={20} /></button>
                    </div>
                </div>
            )}

            {/* 2. Floating Pencil Toolbar - Centered at top, truly isolated from the layout */}
            {isPencilMode && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-2/90 backdrop-blur-xl p-1.5 rounded-3xl border border-white/10 z-[500] shadow-2xl scale-110">
                    <button
                        onClick={() => setIsPencilMode(false)}
                        className="p-2.5 rounded-2xl transition-all bg-white text-black shadow-lg"
                    >
                        <X size={20} strokeWidth={3} />
                    </button>

                    <div className="h-4 w-[1px] bg-white/10 mx-1" />

                    <button
                        onClick={() => setActiveTool('pen')}
                        className={`p-2.5 rounded-2xl transition-all ${activeTool === 'pen' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Edit3 size={18} strokeWidth={2.5} />
                    </button>

                    <button
                        onClick={() => setActiveTool('eraser')}
                        className={`p-2.5 rounded-2xl transition-all ${activeTool === 'eraser' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Eraser size={18} strokeWidth={2.5} />
                    </button>

                    <div className="h-4 w-[1px] bg-white/10 mx-1" />

                    <div className="flex gap-1.5 px-2">
                        {['#FF3B30', '#007AFF', '#000000', '#FFFFFF'].map(c => (
                            <button
                                key={c}
                                onClick={() => { setActiveColor(c); setActiveTool('pen') }}
                                className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-125 ${activeColor === c ? 'border-white scale-110 shadow-lg' : 'border-white/10'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Main Content - Takes 100% space in Pencil Mode */}
            <div
                className={`flex-1 overflow-auto flex justify-center items-start scrollbar-hide relative bg-black ${isPencilMode ? 'touch-none select-none pt-0' : 'pt-0'}`}
                style={isPencilMode ? {
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'none'
                } : {}}
                onContextMenu={(e) => isPencilMode && e.preventDefault()}
            >
                <div className="relative shadow-2xl bg-white origin-top">
                    <Document
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={<div className="p-20 text-white font-bold opacity-30 text-xs uppercase tracking-widest animate-pulse">Loading PDF...</div>}
                    >
                        <Page
                            pageNumber={Math.min(pageNumber, numPages)}
                            scale={scale}
                            width={containerWidth}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                        />
                    </Document>

                    <AnnotationCanvas
                        materialId={materialId}
                        pageNumber={pageNumber}
                        initialAnnotations={initialAnnotations}
                        isActive={isPencilMode}
                        mode={activeTool}
                        color={activeColor}
                        lineWidth={lineWidth}
                    />
                </div>
            </div>

            {/* iPad Nav Controls */}
            {!isPencilMode && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-surface-2/80 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-3xl shadow-2xl z-50 min-w-[320px] md:min-w-[540px]">
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPageNumber(1)} disabled={pageNumber <= 1} className="p-2 text-white/40 hover:text-white transition-colors disabled:opacity-0" title="最初に戻る"><ChevronLeft size={20} strokeWidth={3} /><ChevronLeft size={20} strokeWidth={3} className="-ml-3" /></button>
                        <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="p-3 text-white hover:bg-white/10 rounded-2xl disabled:opacity-20 transition-colors"><ChevronLeft size={28} /></button>
                    </div>

                    <div className="flex-1 flex flex-col gap-2">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black font-mono text-white/40">{pageNumber}</span>
                            <span className="text-[10px] font-black font-mono text-white/40">{numPages}</span>
                        </div>
                        <div className="relative h-6 flex items-center group/slider">
                            {/* Visual Track */}
                            <div className="absolute w-full h-1 bg-white/10 rounded-full" />
                            <div
                                className="absolute h-1 bg-white rounded-full transition-all duration-300"
                                style={{ width: `${(pageNumber / numPages) * 100}%` }}
                            />
                            {/* Actual Input */}
                            <input
                                type="range"
                                min="1"
                                max={numPages}
                                value={pageNumber}
                                onChange={(e) => setPageNumber(parseInt(e.target.value))}
                                className="absolute w-full opacity-0 cursor-pointer z-10"
                            />
                            {/* Thumb Visual */}
                            <div
                                className="absolute w-4 h-4 bg-white rounded-full shadow-xl transition-all pointer-events-none group-hover/slider:scale-125"
                                style={{ left: `calc(${(pageNumber / numPages) * 100}% - 8px)` }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={goToNextPage} disabled={pageNumber >= numPages} className="p-3 text-white hover:bg-white/10 rounded-2xl disabled:opacity-20 transition-colors"><ChevronRight size={28} /></button>
                        <button onClick={() => setPageNumber(numPages)} disabled={pageNumber >= numPages} className="p-2 text-white/40 hover:text-white transition-colors disabled:opacity-0" title="最後へ"><ChevronRight size={20} strokeWidth={3} /><ChevronRight size={20} strokeWidth={3} className="-ml-3" /></button>
                    </div>
                </div>
            )}
        </div>
    )
}
