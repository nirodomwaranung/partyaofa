import type { Config } from 'tailwindcss';

/**
 * Design system tokens (Spec §2). Hard sticker shadows, thick outlines.
 */
export default <Partial<Config>>{
  content: [
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        outline: '#2A1B4D',
        card: '#FFFFFF',
        accent: {
          yellow: '#FFD93D',
          pink: '#FF5C8A',
          green: '#34D399',
          blue: '#4D96FF',
          red: '#FF6B6B',
          purple: '#C780FA',
        },
      },
      fontFamily: {
        head: ['"Baloo Thai 2"', 'sans-serif'],
        body: ['Mali', 'sans-serif'],
      },
      boxShadow: {
        hard: '0 7px 0 #2A1B4D',
        'hard-sm': '0 4px 0 #2A1B4D',
        'hard-lg': '0 14px 0 rgba(0,0,0,.28)',
        'hard-btn': '0 5px 0 #2A1B4D',
      },
      borderRadius: {
        card: '24px',
      },
      backgroundImage: {
        'party-gradient':
          'radial-gradient(120% 90% at 80% -10%, #9333EA 0%, #7C3AED 38%, #5B21B6 72%, #4C1D95 100%)',
      },
      animation: {
        wob: 'wob 3s ease-in-out infinite',
        floaty: 'floaty 1.4s infinite',
        pop: 'pop .35s ease-out',
        boxbob: 'boxbob 2.4s ease-in-out infinite',
        blink: 'blink 4.5s infinite',
      },
      keyframes: {
        wob: { '0%,100%': { transform: 'rotate(-2.5deg)' }, '50%': { transform: 'rotate(2.5deg)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-9px)' } },
        pop: { '0%': { transform: 'scale(.55)', opacity: '0' }, '60%': { transform: 'scale(1.07)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        boxbob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-7px)' } },
        blink: { '0%,92%,100%': { transform: 'scaleY(1)' }, '96%': { transform: 'scaleY(.1)' } },
      },
    },
  },
};
