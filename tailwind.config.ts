import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F6F7F4",
        surface: "#FFFFFF",
        "surface-muted": "#EEF2EF",
        ink: "#17211E",
        muted: "#5D6A65",
        primary: "#0E6B5F",
        "primary-hover": "#0A574D",
        "primary-soft": "#DDEEEA",
        accent: "#B86B1E",
        "accent-soft": "#F4E4D1",
        danger: "#A83B32",
        "danger-soft": "#F6DEDB",
        line: "#D7DDD8",
        focus: "#1B8A7A"
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 8px 24px rgba(23, 33, 30, 0.08)"
      }
    }
  },
  plugins: [forms]
};

export default config;
