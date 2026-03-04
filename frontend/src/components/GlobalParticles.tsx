import { useState, useEffect, useMemo } from 'react'
import Particles, { initParticlesEngine } from "@tsparticles/react"
import { loadSlim } from "@tsparticles/slim"

export default function GlobalParticles() {
    const [init, setInit] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initParticlesEngine(async (engine: any) => {
            await loadSlim(engine)
        }).then(() => {
            setInit(true)
        })
    }, [])

    const particlesOptions = useMemo(() => ({
        // Disable fullScreen mode to use our own fixed wrapper,
        // this prevents the canvas from bypassing React stacking contexts
        fullScreen: { enable: false },
        fpsLimit: 60,
        interactivity: {
            events: {
                onHover: {
                    enable: true,
                    mode: "grab",
                },
            },
            modes: {
                grab: {
                    distance: 140,
                    links: { opacity: 0.5 },
                },
            },
        },
        particles: {
            color: { value: "#10b981" }, // emerald-500
            links: {
                color: "#10b981",
                distance: 150,
                enable: true,
                opacity: 0.2,
                width: 1,
            },
            move: {
                direction: "none" as const,
                enable: true,
                outModes: { default: "bounce" as const },
                random: false,
                speed: 0.8,
                straight: false,
            },
            number: {
                density: { enable: true, area: 800 },
                value: 70,
            },
            opacity: { value: 0.4 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 3 } },
        },
        detectRetina: true,
    }), [])

    if (!init) return null

    return (
        // z-0 ensures particles sit behind all modals (z-50, z-100, z-300 etc.)
        // pointer-events-none on wrapper so clicks pass through to page content,
        // but tsParticles canvas itself still captures hover events for grab mode
        <div
            className="fixed inset-0 z-0 pointer-events-none"
            aria-hidden="true"
        >
            <Particles
                id="tsparticles-global"
                options={particlesOptions}
                style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
            />
        </div>
    )
}
