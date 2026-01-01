/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '20': 'repeat(20, minmax(0, 1fr))',
      },
      colors: {
        'bg-base': 'var(--bg-base)',
        'bg-card': 'var(--bg-card)',
        'bg-card-secondary': 'var(--bg-card-secondary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'accent-red': 'var(--accent-red)',
        'accent-red-hover': 'var(--accent-red-hover)',
        'accent-green': 'var(--accent-green)',
        'accent-green-hover': 'var(--accent-green-hover)',
        'accent-amber': 'var(--accent-amber)',
        'border-subtle': 'var(--border-subtle)',
      },
      boxShadow: {
        'hard': 'var(--shadow-hard)',
        'card': 'var(--shadow-card)',
        'card-hover': '0 6px 0 rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
