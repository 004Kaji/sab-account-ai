import type { Config } from 'tailwindcss'

// Tailwind config for SAB Account AI
// Custom colours mirror the CSS variables in globals.css so both
// Tailwind utility classes (bg-ember) and CSS vars (var(--ember)) work.
const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream:     '#F5F0E8',
        cream2:    '#EDE8DF',
        cream3:    '#E0D9CE',
        char:      '#1C1917',
        char2:     '#292524',
        ember:     '#C84B2F',
        'ember-l': '#E05A3A',
        gold:      '#C9933A',
        sage:      '#4A7055',
        'sage-l':  '#5D8A69',
        text1:     '#1C1917',
        text2:     '#6B6560',
        text3:     '#9B948E',
        border:    '#D5CFC6',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Fraunces', 'Georgia', 'serif'],
        sans:    ['var(--font-sans)',    'DM Sans',  'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)',    'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '10px',
        sm:  '10px',
        md:  '16px',
        lg:  '22px',
        xl:  '28px',
      },
    },
  },
  plugins: [],
}

export default config
