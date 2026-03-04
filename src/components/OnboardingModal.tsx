'use client'

import { useState, useEffect } from 'react'
import { X, Cloud, Pencil, Layout, CheckCircle, ArrowRight, BookOpen } from 'lucide-react'

export function OnboardingModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState(0)

    useEffect(() => {
        // 初回訪問かどうかをチェック
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding')
        if (!hasSeenOnboarding) {
            setIsOpen(true)
        }
    }, [])

    const handleClose = () => {
        setIsOpen(false)
        localStorage.setItem('hasSeenOnboarding', 'true')
    }

    const slides = [
        {
            icon: <BookOpen size={48} className="text-white" />,
            title: "Study Tracker へようこそ",
            description: "あなたの学習ログを美しく、スマートに管理するためのプラットフォームです。",
            color: "bg-white/10"
        },
        {
            icon: <Cloud size={48} className="text-white" />,
            title: "全デバイスで同期",
            description: "PDFを一度アップロードすれば、PC、タブレット、スマホのどこからでもアクセス可能です。",
            color: "bg-blue-500/20"
        },
        {
            icon: <Pencil size={48} className="text-white" />,
            title: "iPad での手書き対応",
            description: "iPad + Apple Pencil を使えば、教科書に直接書き込みが可能です。注釈もすべてクラウドに同期されます。",
            color: "bg-purple-500/20"
        },
        {
            icon: <Layout size={48} className="text-white" />,
            title: "学習進捗の可視化",
            description: "ページ数や講義の回数をもとに、あなたの努力をパーセントで表示します。次の学習が楽しみになります。",
            color: "bg-green-500/20"
        }
    ]

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

            <div className="relative bg-surface-1 border border-surface-3 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.1)] transition-all animate-in zoom-in-95 duration-500">
                <button onClick={handleClose} className="absolute top-6 right-6 text-gray-400 hover:text-white transition z-10">
                    <X size={24} />
                </button>

                <div className="p-10 text-center space-y-8">
                    {/* Icon with animated background */}
                    <div className="relative flex justify-center py-4">
                        <div className={`w-24 h-24 rounded-3xl ${slides[step].color} flex items-center justify-center transition-colors duration-500`}>
                            {slides[step].icon}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-3xl font-black tracking-tight">{slides[step].title}</h2>
                        <p className="text-gray-400 leading-relaxed font-medium">
                            {slides[step].description}
                        </p>
                    </div>

                    {/* Step Indicators */}
                    <div className="flex justify-center gap-2 pt-4">
                        {slides.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-white' : 'w-2 bg-surface-3'}`}
                            />
                        ))}
                    </div>

                    <div className="pt-6">
                        {step < slides.length - 1 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                className="w-full py-5 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all"
                            >
                                次へ <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={handleClose}
                                className="w-full py-5 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all"
                            >
                                さあ、始めましょう <CheckCircle size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
