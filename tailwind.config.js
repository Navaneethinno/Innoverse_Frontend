export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        "primary-light": "var(--primary-light)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        success: "var(--success)",
        warning: "var(--warning)",
        pending: "var(--pending)",
        "card-hover": "var(--card-hover)",
        header: "var(--header)",
        border: "var(--border)",
        input: "var(--input)",
        "input-background": "var(--input-background)",
        "switch-background": "var(--switch-background)",
        ring: "var(--ring)",
        "chart-1": "var(--chart-1)",
        "chart-2": "var(--chart-2)",
        "chart-3": "var(--chart-3)",
        "chart-4": "var(--chart-4)",
        "chart-5": "var(--chart-5)",
        sidebar: "var(--sidebar)",
        "sidebar-foreground": "var(--sidebar-foreground)",
        "sidebar-primary": "var(--sidebar-primary)",
        "sidebar-primary-foreground": "var(--sidebar-primary-foreground)",
        "sidebar-accent": "var(--sidebar-accent)",
        "sidebar-accent-foreground": "var(--sidebar-accent-foreground)",
        "sidebar-border": "var(--sidebar-border)",
        "sidebar-ring": "var(--sidebar-ring)",
      },
      borderRadius: {
        sm: "calc(var(--radius) - 6px)",
        md: "calc(var(--radius) - 4px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
      },
      // Ties Tailwind's font-sans/font-mono utilities to the same CSS
      // variables fonts.css sets on <body> — without this, those utility
      // classes would silently fall back to Tailwind's own built-in font
      // stack instead of the app's actual typeface if anyone ever used
      // them, since Tailwind doesn't know about var(--font-sans) otherwise.
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "Menlo", "monospace"],
      },
      // Ties text-xs..text-2xl (the sizes actually used throughout this
      // app's className strings, not the rarely-used raw h1-h4 tags) to the
      // SAME --text-* variables defined in theme.css, so changing a value
      // there is the one real place that changes font size everywhere —
      // previously these Tailwind utilities used Tailwind's own hardcoded
      // default scale, completely disconnected from theme.css's tokens.
      // Line-heights are kept at Tailwind's own sensible defaults for each
      // step; only the size itself is now variable-driven.
      fontSize: {
        xs: ["var(--text-xs)", { lineHeight: "1rem" }],
        sm: ["var(--text-sm)", { lineHeight: "1.25rem" }],
        base: ["var(--text-base)", { lineHeight: "1.5rem" }],
        lg: ["var(--text-lg)", { lineHeight: "1.75rem" }],
        xl: ["var(--text-xl)", { lineHeight: "1.75rem" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "2rem" }],
      },
    },
  },
  plugins: [],
};
