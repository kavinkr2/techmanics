module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light theme colors
        background: "oklch(0.98 0.002 260)",
        surface: "oklch(1 0 0)",
        "surface-hover": "oklch(0.99 0.001 260)",
        "surface-muted": "oklch(0.96 0.003 260)",
        glass: "oklch(1 0 0 / 0.7)",
        "text-primary": "oklch(0.15 0.01 260)",
        "text-secondary": "oklch(0.45 0.01 260)",
        "text-muted": "oklch(0.6 0.01 260)",
        border: "oklch(0.9 0.005 260)",
        "border-strong": "oklch(0.85 0.008 260)",
        accent: "oklch(0.55 0.18 250)",
        "accent-hover": "oklch(0.5 0.2 250)",
        "accent-light": "oklch(0.95 0.05 250)",
        success: "oklch(0.65 0.15 150)",
        warning: "oklch(0.75 0.15 80)",
        danger: "oklch(0.6 0.2 25)",
      },
      boxShadow: {
        card: "0 1px 3px oklch(0.15 0.01 260 / 0.06), 0 1px 2px oklch(0.15 0.01 260 / 0.04)",
        "card-hover": "0 4px 12px oklch(0.15 0.01 260 / 0.08), 0 2px 4px oklch(0.15 0.01 260 / 0.05)",
        "card-strong": "0 8px 24px oklch(0.15 0.01 260 / 0.1), 0 4px 8px oklch(0.15 0.01 260 / 0.06)",
        inner: "inset 0 1px 1px oklch(0.15 0.01 260 / 0.03)",
      },
      borderRadius: {
        card: "12px",
        "card-lg": "16px",
      },
      transitionDuration: {
        "200": "200ms",
        "300": "300ms",
      },
    },
  },
  plugins: [],
};