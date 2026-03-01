import { useEffect, useRef } from 'react'
import {
    X, Minus, Play, Pause, SkipBack, SkipForward,
    Volume2, VolumeX, BookOpen, Music2,
} from 'lucide-react'
import { useAudio } from '../context/AudioContext'

function formatTime(s: number): string {
    if (!isFinite(s) || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
}

const RATES = [0.75, 1, 1.25, 1.5, 2]

export default function AudioPlayerModal() {
    const {
        book, isOpen, isPlaying,
        currentTime, duration, volume, playbackRate,
        audioRef,
        minimizePlayer, closePlayer,
        togglePlay, seek, setVolume, setPlaybackRate, skip,
        setCurrentTime, setDuration, setIsPlaying,
    } = useAudio()

    const progressRef = useRef<HTMLDivElement>(null)

    // ── Audio event bindings — ref callback yordamida ishonchli ishlaydi ──
    const bindAudioEvents = (audio: HTMLAudioElement) => {
        const onTime = () => setCurrentTime(audio.currentTime)
        const onDur = () => setDuration(audio.duration)
        const onPlay = () => setIsPlaying(true)
        const onPause = () => setIsPlaying(false)
        const onEnd = () => setIsPlaying(false)

        audio.addEventListener('timeupdate', onTime)
        audio.addEventListener('durationchange', onDur)
        audio.addEventListener('loadedmetadata', onDur)
        audio.addEventListener('play', onPlay)
        audio.addEventListener('pause', onPause)
        audio.addEventListener('ended', onEnd)

        return () => {
            audio.removeEventListener('timeupdate', onTime)
            audio.removeEventListener('durationchange', onDur)
            audio.removeEventListener('loadedmetadata', onDur)
            audio.removeEventListener('play', onPlay)
            audio.removeEventListener('pause', onPause)
            audio.removeEventListener('ended', onEnd)
        }
    }

    // Ref callback: audio element DOM ga kirganda ishga tushadi
    const audioCallbackRef = (el: HTMLAudioElement | null) => {
        if (!el) return
        // @ts-ignore — mutable ref
        audioRef.current = el
    }

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return
        return bindAudioEvents(audio)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // src o'zgarganda (yangi kitob) — load va play
    useEffect(() => {
        const audio = audioRef.current
        if (!audio || !book?.digital_file_url) return
        audio.src = book.digital_file_url
        audio.load()
        audio.play().catch(() => { })
        // listener'larni qayta bog'lash
        return bindAudioEvents(audio)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [book?.id])

    const progress = duration > 0 ? currentTime / duration : 0

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !duration) return
        const rect = progressRef.current.getBoundingClientRect()
        const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1))
        seek(ratio * duration)
    }

    // Audio element har doim DOM da — event listener'lar doim ishlashi uchun
    const audioEl = (
        <audio
            ref={audioCallbackRef}
            style={{ display: 'none' }}
        />
    )

    // Kitob yo'q → faqat hidden audio element
    if (!book) return audioEl

    // Fon rejimi → faqat hidden audio element (mini player header da)
    if (!isOpen) return audioEl

    return (
        <>
            {audioEl}
            {/* Backdrop — bosish fon rejimiga o'tadi */}
            <div
                className="fixed inset-0 z-200 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                onClick={minimizePlayer}
            >
                {/* Modal */}
                <div
                    className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
                    style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Top controls */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-2">
                        <button
                            onClick={minimizePlayer}
                            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                            title="Fon rejimiga o'tish"
                        >
                            <Minus size={18} className="text-text-muted" />
                        </button>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-widest">
                            <Music2 size={13} />
                            Audio kitob
                        </div>
                        <button
                            onClick={closePlayer}
                            className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                            title="To'xtatish"
                        >
                            <X size={18} className="text-text-muted" />
                        </button>
                    </div>

                    {/* Cover art */}
                    <div className="flex justify-center py-6 px-8">
                        <div className={`relative w-52 h-52 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition-transform duration-500 ${isPlaying ? 'scale-100' : 'scale-95'}`}>
                            {book.cover_image_url ? (
                                <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-linear-to-br from-violet-600 to-indigo-800 flex items-center justify-center">
                                    <BookOpen size={64} className="text-white/40" />
                                </div>
                            )}
                            {!isPlaying && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                                        <Pause size={28} className="text-white" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Track info */}
                    <div className="px-7 pb-4 text-center">
                        <h2 className="text-text font-bold text-xl leading-tight line-clamp-2">{book.title}</h2>
                        <p className="text-text-muted text-sm mt-1">{book.author}</p>
                    </div>

                    {/* ── Progress bar ── */}
                    <div className="px-7 pb-3">
                        <div
                            ref={progressRef}
                            className="relative h-2 w-full rounded-full bg-border cursor-pointer group"
                            onClick={handleProgressClick}
                        >
                            {/* Track fill */}
                            <div
                                className="absolute left-0 top-0 h-full rounded-full bg-linear-to-r from-violet-400 to-indigo-400 transition-none"
                                style={{ width: `${progress * 100}%` }}
                            />
                            {/* Thumb */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-md scale-0 group-hover:scale-100 transition-transform"
                                style={{ left: `calc(${progress * 100}% - 8px)` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-text-muted mt-1.5 font-mono tabular-nums">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Playback controls */}
                    <div className="flex items-center justify-center gap-6 px-7 pb-6">
                        <button
                            onClick={() => skip(-15)}
                            className="flex flex-col items-center gap-0.5 text-white/60 hover:text-white transition-colors"
                        >
                            <SkipBack size={26} />
                            <span className="text-[9px] font-bold">15s</span>
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-[0_8px_30px_rgba(139,92,246,0.5)] hover:scale-105 active:scale-95 transition-transform"
                        >
                            {isPlaying
                                ? <Pause size={28} className="text-indigo-900" />
                                : <Play size={28} className="text-indigo-900 translate-x-0.5" />
                            }
                        </button>

                        <button
                            onClick={() => skip(15)}
                            className="flex flex-col items-center gap-0.5 text-white/60 hover:text-white transition-colors"
                        >
                            <SkipForward size={26} />
                            <span className="text-[9px] font-bold">15s</span>
                        </button>
                    </div>

                    {/* Volume + Speed */}
                    <div className="flex items-center gap-4 px-7 pb-6">
                        <button
                            onClick={() => setVolume(volume > 0 ? 0 : 1)}
                            className="text-text-muted hover:text-text transition-colors shrink-0"
                        >
                            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <input
                            type="range" min={0} max={1} step={0.02}
                            value={volume}
                            onChange={e => setVolume(Number(e.target.value))}
                            className="flex-1 h-1.5 accent-violet-400"
                        />

                        <div className="flex items-center gap-1 shrink-0">
                            {RATES.map(r => (
                                <button
                                    key={r}
                                    onClick={() => setPlaybackRate(r)}
                                    className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded transition-all ${playbackRate === r
                                        ? 'bg-primary text-white'
                                        : 'text-text-muted hover:text-text'
                                        }`}
                                >
                                    {r}x
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
