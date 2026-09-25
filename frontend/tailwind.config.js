/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MeetGuard AI Design System — Modern Attractive Light Theme
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        surface: {
          50:  '#020617', // Boldest titles
          100: '#0f172a', // Primary headings & text
          200: '#1e293b', // Subheadings & body text
          300: '#334155', // Secondary body text
          400: '#475569', // Muted labels
          500: '#64748b', // Captions & subtle text
          600: '#cbd5e1', // Input borders & active outlines
          700: '#e2e8f0', // Standard card & table borders
          800: '#ffffff', // Card & modal backgrounds
          900: '#ffffff', // Header & sidebar backgrounds
          950: '#f8fafc', // Main page background (airy, clean light)
        },
        status: {
          new:         '#2563eb',
          'in-progress': '#d97706',
          completed:   '#059669',
          overdue:     '#dc2626',
          unresolved:  '#ea580c',
          'carried-over': '#7c3aed',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        'elevated': '0 20px 35px -10px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
