/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-orange': {
          DEFAULT: '#FF6B35', 
          50: '#FFF5E6',
          100: '#FFE8D6',
          200: '#FFD7BA',
          300: '#FFC49D',
          400: '#FFB280',
          500: '#FF9D63',
          600: '#FF8647',
          700: '#FF6E2B',
          800: '#FF550F',
          900: '#FF3D00',
        },
        'brand-red': {
          DEFAULT: '#FF3D3D',
        }
      },
      animation: {
        'pop-in': 'pop-in 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'fadeInUp': 'fadeInUp 0.8s ease-out',
        'slideInLeft': 'slideInLeft 0.8s ease-out',
        'slideInRight': 'slideInRight 0.8s ease-out',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        fadeInUp: {
          'from': { opacity: '0', transform: 'translateY(30px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          'from': { opacity: '0', transform: 'translateX(-50px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          'from': { opacity: '0', transform: 'translateX(50px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        }
      }
    },
  },
  plugins: [],
}
