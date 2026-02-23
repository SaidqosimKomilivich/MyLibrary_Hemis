import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react'
import type { Book } from '../services/api'

interface AudioState {
    book: Book | null
    isPlaying: boolean
    isOpen: boolean        // full modal open
    isMini: boolean        // minimized to header mini player
    currentTime: number
    duration: number
    volume: number
    playbackRate: number
}

interface AudioContextType extends AudioState {
    audioRef: React.RefObject<HTMLAudioElement | null>
    openPlayer: (book: Book) => void
    closePlayer: () => void
    minimizePlayer: () => void
    expandPlayer: () => void
    togglePlay: () => void
    seek: (time: number) => void
    setVolume: (vol: number) => void
    setPlaybackRate: (rate: number) => void
    skip: (seconds: number) => void
    setCurrentTime: (t: number) => void
    setDuration: (d: number) => void
    setIsPlaying: (v: boolean) => void
}

const AudioContext = createContext<AudioContextType | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [state, setState] = useState<AudioState>({
        book: null,
        isPlaying: false,
        isOpen: false,
        isMini: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        playbackRate: 1,
    })

    const openPlayer = useCallback((book: Book) => {
        setState(prev => ({
            ...prev,
            book,
            isOpen: true,
            isMini: false,
            currentTime: 0,
            duration: 0,
            isPlaying: true,
        }))
        setTimeout(() => {
            if (audioRef.current) {
                audioRef.current.play().catch(() => { })
            }
        }, 100)
    }, [])

    const closePlayer = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
        }
        setState(prev => ({ ...prev, book: null, isOpen: false, isMini: false, isPlaying: false, currentTime: 0 }))
    }, [])

    const minimizePlayer = useCallback(() => {
        setState(prev => ({ ...prev, isOpen: false, isMini: true }))
    }, [])

    const expandPlayer = useCallback(() => {
        setState(prev => ({ ...prev, isOpen: true, isMini: false }))
    }, [])

    const togglePlay = useCallback(() => {
        if (!audioRef.current) return
        if (state.isPlaying) {
            audioRef.current.pause()
        } else {
            audioRef.current.play().catch(() => { })
        }
        setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
    }, [state.isPlaying])

    const seek = useCallback((time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time
            setState(prev => ({ ...prev, currentTime: time }))
        }
    }, [])

    const skip = useCallback((seconds: number) => {
        if (audioRef.current) {
            const newTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, audioRef.current.duration || 0))
            audioRef.current.currentTime = newTime
            setState(prev => ({ ...prev, currentTime: newTime }))
        }
    }, [])

    const setVolume = useCallback((vol: number) => {
        if (audioRef.current) audioRef.current.volume = vol
        setState(prev => ({ ...prev, volume: vol }))
    }, [])

    const setPlaybackRate = useCallback((rate: number) => {
        if (audioRef.current) audioRef.current.playbackRate = rate
        setState(prev => ({ ...prev, playbackRate: rate }))
    }, [])

    const setCurrentTime = useCallback((t: number) => setState(prev => ({ ...prev, currentTime: t })), [])
    const setDuration = useCallback((d: number) => setState(prev => ({ ...prev, duration: d })), [])
    const setIsPlaying = useCallback((v: boolean) => setState(prev => ({ ...prev, isPlaying: v })), [])

    return (
        <AudioContext.Provider value={{
            ...state,
            audioRef,
            openPlayer, closePlayer, minimizePlayer, expandPlayer,
            togglePlay, seek, setVolume, setPlaybackRate, skip,
            setCurrentTime, setDuration, setIsPlaying,
        }}>
            {children}
        </AudioContext.Provider>
    )
}

export function useAudio() {
    const ctx = useContext(AudioContext)
    if (!ctx) throw new Error('useAudio must be used within AudioProvider')
    return ctx
}
