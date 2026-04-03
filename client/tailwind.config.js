/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        editor: {
          bg: '#0a0a0f',
          surface: '#13131a',
          panel: '#1a1a24',
          border: '#2a2a3a',
          accent: '#6366f1',
          'accent-hover': '#818cf8',
          text: '#e4e4e7',
          muted: '#71717a',
          video: '#7c3aed',
          audio: '#06b6d4',
          text_track: '#f59e0b',
          effect: '#ec4899',
          success: '#22c55e',
          danger: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
