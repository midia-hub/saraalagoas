import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['var(--font-outfit)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        'sara-gray-light': '#B6B8BA',
        'sara-gray-dark': '#252525',
        'sara-white': '#FFFFFF',
        'sara-red': '#c62737',
        'sara-red-dark': '#9e1f2e',
      },
      backgroundImage: {
        'sara-page': 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%)',
        'sara-header': 'linear-gradient(90deg, #c62737 0%, #9e1f2e 100%)',
        'sara-cta': 'linear-gradient(135deg, #c62737 0%, #fa1f32 100%)',
        'sara-cta-dark': 'linear-gradient(135deg, #252525 0%, #1a1a1a 100%)',
        'sara-success': 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
      },
      boxShadow: {
        'sara-card': '0 20px 60px rgba(0, 0, 0, 0.1)',
        'sara-focus': '0 0 0 3px rgba(198, 39, 55, 0.1)',
        'sara-cta-hover': '0 10px 25px rgba(198, 39, 55, 0.3)',
      },
      transitionDuration: {
        '300': '300ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'bounce-slow': 'bounce 2s infinite',
        'toast-in': 'toastIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        toastIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
