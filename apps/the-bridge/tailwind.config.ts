import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rainbow: {
          1: '#F59E0B',
          2: '#EC4899',
          3: '#A855F7',
          4: '#3B82F6',
        },
      },
      fontFamily: {
        display: ['Geist', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        sans: ['Geist', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xs: '6px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        pill: '999px',
      },
      backgroundImage: {
        'rainbow-bright':
          'linear-gradient(135deg, #F59E0B 0%, #EC4899 50%, #A855F7 100%)',
        'rainbow-full':
          'linear-gradient(135deg, #F59E0B 0%, #EC4899 33%, #A855F7 66%, #3B82F6 100%)',
        'rainbow-stroke':
          'linear-gradient(135deg, rgba(245,158,11,0.30) 0%, rgba(236,72,153,0.25) 33%, rgba(168,85,247,0.25) 66%, rgba(59,130,246,0.30) 100%)',
      },
    },
  },
  plugins: [],
}
export default config
