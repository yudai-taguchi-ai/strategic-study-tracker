'use client'

import { useState, useEffect, useTransition } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, Edit3, Eraser, ArrowLeft, ZoomIn, ZoomOut, RefreshCw, X, Hand, Languages } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateProgress, getAnnotations, translateText } from '@/app/actions'
import { useRef, useMemo, useCallback } from 'react'
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
    const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | 'translate'>('pen')
    const [activeColor, setActiveColor] = useState('#FF3B30')
    const [lineWidth, setLineWidth] = useState(2)
    const [initialAnnotations, setInitialAnnotations] = useState<any[]>([])
    const router = useRouter()
    const [containerWidth, setContainerWidth] = useState<number>(1000)
    const [hasSyncedTotalPages, setHasSyncedTotalPages] = useState(false)

    // Translation State
    const [translationResult, setTranslationResult] = useState<{ original: string, translated: string } | null>(null)
    const [isTranslating, setIsTranslating] = useState(false)
    const pdfPageRef = useRef<any>(null)

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

            // ツールバー以外へのタッチはすべて最優先レイヤーで preventDefault する
            // これにより指1本であっても、iPadOSの「長押しメニュー」の起点を物理的に破壊する
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('input')) return;

            if (e.cancelable) {
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

    const goToPrevPage = () => setPageNumber(p => Math.max(1, p - 1))
    const goToNextPage = () => setPageNumber(p => Math.min(numPages, p + 1))
    const handleResetScale = () => setScale(1.0)

    const handleTranslate = async (boundingBox: { left: number, top: number, right: number, bottom: number }) => {
        if (!pdfPageRef.current) return

        setIsTranslating(true)
        setTranslationResult(null)

        try {
            const page = pdfPageRef.current
            const textContent = await page.getTextContent()
            const viewport = page.getViewport({ scale: 1.0 })

            const extractedText = textContent.items
                .map((item: any) => {
                    const tx = item.transform[4]
                    const ty = item.transform[5]

                    // PDF.js固有の変換ユーティリティを使用して正確な座標（Viewport空間）を取得
                    const [vx, vy] = viewport.convertToViewportPoint(tx, ty)

                    // 0-1の正規化座標に変換してBounding Boxと比較
                    const nx = vx / viewport.width
                    const ny = vy / viewport.height

                    if (nx >= boundingBox.left && nx <= boundingBox.right &&
                        ny >= boundingBox.top && ny <= boundingBox.bottom) {
                        return item.str
                    }
                    return null
                })
                .filter(Boolean)
                .join(' ')

            if (extractedText.trim()) {
                const translated = await translateText(extractedText)
                setTranslationResult({ original: extractedText, translated })
            } else {
                setTranslationResult({ original: "", translated: "テキストが見つかりませんでした。範囲を変えてお試しください。" })
            }
        } catch (error) {
            console.error("Extraction error:", error)
            setTranslationResult({ original: "", translated: "テキストの抽出に失敗しました。" })
        } finally {
            setIsTranslating(false)
        }
    }

    return (
        <div
            className={`flex flex-col h-screen bg-black overflow-hidden relative ${isPencilMode ? 'select-none touch-none cursor-crosshair' : ''}`}
            onDoubleClick={(e) => isPencilMode && e.preventDefault()}
            {...({ 'disable-live-text-selection': isPencilMode ? 'true' : 'false' } as any)}
        >
            {/* 1. Header - Always visible for context */}
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

                <div className="flex items-center gap-1">
                    {/* Header mode toggle removed (moved to bottom) */}
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

            {/* 2. Floating Pencil Toolbar - Only visible during pencil/eraser use */}
            {isPencilMode && activeTool !== 'translate' && (
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
                className={`flex-1 overflow-auto flex justify-center items-start scrollbar-hide relative bg-black ${isPencilMode ? 'touch-none select-none pt-0' : 'pt-0'} pb-40`}
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
                    <div style={isPencilMode ? { pointerEvents: 'none' } : {}}>
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
                                onLoadSuccess={(page) => { pdfPageRef.current = page }}
                            />
                        </Document>
                    </div>

                    <AnnotationCanvas
                        materialId={materialId}
                        pageNumber={pageNumber}
                        initialAnnotations={initialAnnotations}
                        isActive={isPencilMode}
                        mode={activeTool}
                        color={activeColor}
                        lineWidth={lineWidth}
                        onTranslate={handleTranslate}
                    />
                </div>
            </div>

            {/* Translation Result UI */}
            {(isTranslating || translationResult) && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-surface-2/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl z-[700] p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 text-white/40">
                            <Languages size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Translation Result</span>
                        </div>
                        <button onClick={() => setTranslationResult(null)} className="p-1 text-white/20 hover:text-white transition">
                            <X size={20} />
                        </button>
                    </div>

                    {isTranslating ? (
                        <div className="py-8 flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Translating...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-xs text-white/50 leading-relaxed italic">"{translationResult?.original}"</p>
                            </div>
                            <div className="p-5 bg-white text-black rounded-2xl shadow-xl">
                                <p className="text-sm font-bold leading-relaxed">{translationResult?.translated}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* iPad Nav Controls - Always visible */}
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-surface-2/90 backdrop-blur-2xl border border-white/10 px-6 py-3 rounded-[32px] shadow-2xl z-[600] min-w-[320px] md:min-w-[700px] transition-all duration-500`}>
                {/* 1. Mode Toggle (3-way) */}
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 mr-2">
                    <button
                        onClick={() => setIsPencilMode(false)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${!isPencilMode ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Hand size={16} strokeWidth={3} />
                        <span className="hidden sm:inline">Scroll</span>
                    </button>
                    <button
                        onClick={() => { setIsPencilMode(true); setActiveTool('pen') }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isPencilMode && activeTool !== 'translate' ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Edit3 size={16} strokeWidth={3} />
                        <span className="hidden sm:inline">Pencil</span>
                    </button>
                    <button
                        onClick={() => { setIsPencilMode(true); setActiveTool('translate') }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isPencilMode && activeTool === 'translate' ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Languages size={16} strokeWidth={3} />
                        <span className="hidden sm:inline">Translate</span>
                    </button>
                </div>

                <div className="h-4 w-[1px] bg-white/10 mx-1" />

                {/* 2. Navigation */}
                <div className="flex items-center gap-1">
                    <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="p-2 text-white hover:bg-white/10 rounded-xl disabled:opacity-20 transition-colors"><ChevronLeft size={24} /></button>
                </div>

                <div className="flex-1 flex flex-col gap-1.5 px-2">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-black font-mono text-white/30 uppercase tracking-tighter">Page {pageNumber}</span>
                        <span className="text-[9px] font-black font-mono text-white/30 uppercase tracking-tighter">{numPages}</span>
                    </div>
                    <div className="relative h-6 flex items-center group/slider">
                        <div className="absolute w-full h-1 bg-white/10 rounded-full" />
                        <div
                            className="absolute h-1 bg-white rounded-full transition-all duration-300"
                            style={{ width: `${(pageNumber / numPages) * 100}%` }}
                        />
                        <input
                            type="range"
                            min="1"
                            max={numPages}
                            value={pageNumber}
                            onChange={(e) => setPageNumber(parseInt(e.target.value))}
                            className="absolute w-full opacity-0 cursor-pointer z-10"
                        />
                        <div
                            className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-xl transition-all pointer-events-none group-hover/slider:scale-125"
                            style={{ left: `calc(${(pageNumber / numPages) * 100}% - 7px)` }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={goToNextPage} disabled={pageNumber >= numPages} className="p-2 text-white hover:bg-white/10 rounded-xl disabled:opacity-20 transition-colors"><ChevronRight size={24} /></button>
                </div>
            </div>
        </div>
    )
}
