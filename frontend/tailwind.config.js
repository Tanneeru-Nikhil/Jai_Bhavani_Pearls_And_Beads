/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        'midnight-navy': '#071A35',
        'royal-navy': '#102C52',
        'champagne-gold': '#D7B15D',
        'pearl-ivory': '#FFF9EE',
        'charcoal': '#24262B',
        // Extended palette
        navy: {
          50: '#E8EEF7',
          100: '#C5D3E8',
          200: '#9EB4D6',
          300: '#7795C4',
          400: '#5A7EB6',
          500: '#3E68A8',
          600: '#2F5190',
          700: '#1E3A70',
          800: '#102C52',
          900: '#071A35',
        },
        gold: {
          50: '#FDF8EC',
          100: '#F8ECC6',
          200: '#F3DF9E',
          300: '#EDD176',
          400: '#E8C557',
          500: '#D7B15D',
          600: '#C49A3A',
          700: '#A07C2A',
          800: '#7D5F1D',
          900: '#5A4213',
        },
        ivory: {
          50: '#FFFDF8',
          100: '#FFF9EE',
          200: '#FFF0D1',
          300: '#FFE6B4',
          400: '#FFD98A',
          500: '#FFCC60',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'gradient-navy': 'linear-gradient(135deg, #071A35 0%, #102C52 100%)',
        'gradient-gold': 'linear-gradient(135deg, #D7B15D 0%, #C49A3A 100%)',
        'gradient-pearl': 'linear-gradient(135deg, #FFF9EE 0%, #FFF0D1 100%)',
        'hero-pattern': "url('/brand/hero-bg.jpg')",
      },
      boxShadow: {
        'gold': '0 4px 24px rgba(215, 177, 93, 0.25)',
        'gold-lg': '0 8px 40px rgba(215, 177, 93, 0.35)',
        'navy': '0 4px 24px rgba(7, 26, 53, 0.25)',
        'card': '0 2px 16px rgba(7, 26, 53, 0.08)',
        'card-hover': '0 8px 32px rgba(7, 26, 53, 0.14)',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(215, 177, 93, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(215, 177, 93, 0.6)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      screens: {
        'xs': '480px',
      },
    },
  },
  plugins: [],
}
