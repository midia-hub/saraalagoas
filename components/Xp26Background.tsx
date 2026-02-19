
'use client'

import React from 'react'

const NEON = '#B6FF3B'
const BG_GRADIENT = 'linear-gradient(180deg, #0B0F2A 0%, #1A1F4D 50%, #0f1435 100%)'

export function Xp26Background() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
            {/* Base */}
            <div className="absolute inset-0" style={{ background: BG_GRADIENT }} />

            {/* Blobs / formas fluidas — verde neon e azul */}
            <div
                className="absolute rounded-full opacity-30"
                style={{
                    width: 'min(90vw, 600px)',
                    height: 'min(90vw, 600px)',
                    top: '-20%',
                    left: '-15%',
                    background: `radial-gradient(circle, ${NEON}25 0%, transparent 70%)`,
                    filter: 'blur(60px)',
                }}
            />
            <div
                className="absolute rounded-full opacity-25"
                style={{
                    width: 'min(80vw, 500px)',
                    height: 'min(80vw, 500px)',
                    bottom: '-15%',
                    right: '-10%',
                    background: 'radial-gradient(circle, rgba(163,232,232,0.4) 0%, transparent 65%)',
                    filter: 'blur(50px)',
                }}
            />
            <div
                className="absolute rounded-full opacity-20"
                style={{
                    width: 'min(70vw, 400px)',
                    height: 'min(70vw, 400px)',
                    top: '40%',
                    right: '5%',
                    background: 'radial-gradient(circle, rgba(180,221,118,0.35) 0%, transparent 60%)',
                    filter: 'blur(45px)',
                }}
            />

            {/* Formas em rosa/roxo (fluid ribbons) */}
            <div
                className="absolute opacity-[0.12]"
                style={{
                    width: '120%',
                    height: '40%',
                    top: '10%',
                    left: '-10%',
                    background: 'linear-gradient(135deg, transparent 20%, rgba(255,100,180,0.3) 50%, rgba(150,80,255,0.2) 80%)',
                    filter: 'blur(40px)',
                    borderRadius: '50% 50% 40% 60% / 60% 40% 50% 50%',
                }}
            />
            <div
                className="absolute opacity-[0.1]"
                style={{
                    width: '80%',
                    height: '35%',
                    bottom: '15%',
                    left: '-20%',
                    background: 'linear-gradient(45deg, rgba(200,120,255,0.25) 0%, transparent 50%)',
                    filter: 'blur(50px)',
                    borderRadius: '60% 40% 50% 50% / 50% 60% 40% 50%',
                }}
            />

            {/* Padrão geométrico — triângulos e linhas sutis */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="xp26-grid" width="80" height="80" patternUnits="userSpaceOnUse">
                        <path d="M0 40 L40 0 L80 40 L40 80 Z" fill="none" stroke={NEON} strokeWidth="0.5" />
                    </pattern>
                    <pattern id="xp26-diamonds" width="60" height="60" patternUnits="userSpaceOnUse">
                        <polygon points="30,0 60,30 30,60 0,30" fill="none" stroke="rgba(163,232,232,0.4)" strokeWidth="0.4" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#xp26-grid)" />
                <rect width="100%" height="100%" fill="url(#xp26-diamonds)" />
            </svg>

            {/* Linhas diagonais / zigue-zague */}
            <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage: `
            linear-gradient(105deg, transparent 48%, ${NEON} 50%, transparent 52%),
            linear-gradient(75deg, transparent 48%, rgba(163,232,232,0.6) 50%, transparent 52%)
          `,
                    backgroundSize: '120px 80px',
                }}
            />

            {/* Scanline */}
            <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)',
                }}
            />

            {/* Glitch sutil — faixas horizontais */}
            <div
                className="absolute inset-0 xp26-glitch-bg"
                style={{
                    background: `
            linear-gradient(90deg, transparent 0%, ${NEON}40 20%, transparent 40%),
            linear-gradient(90deg, transparent 60%, rgba(255,100,180,0.3) 80%, transparent 100%)
          `,
                    backgroundSize: '100% 8px',
                }}
            />
        </div>
    )
}
