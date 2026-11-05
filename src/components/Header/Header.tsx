import { Moon, Sun } from "lucide-react";
import type { Segment } from "../../api/types";
import "./Header.css";

interface HeaderProps {
  theme: 'light' | 'dark';
  segment: Segment;
  onToggleTheme: () => void;
  onSelectSegment: (segment: Segment) => void;
}

export default function Header({ theme, segment, onToggleTheme, onSelectSegment }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-container header-layout">
        <a className="brand" href="#overview" aria-label="Meridian overview">
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          Meridian
        </a>

        <nav className="header-nav" aria-label="Main navigation">
          <a href="#overview" aria-current="page">
            Overview
          </a>
          <button type="button" disabled>
            Cards
          </button>
          <button type="button" disabled>
            Payments
          </button>
          <button type="button" disabled>
            Insights
          </button>
        </nav>

        <div
          className="segment-control"
          role="group"
          aria-label="Customer segment"
        >
          <button
            type="button"
            aria-pressed={segment === "retail"}
            onClick={() => onSelectSegment("retail")}
          >
            Retail
          </button>
          <button
            type="button"
            aria-pressed={segment === "premium"}
            onClick={() => onSelectSegment("premium")}
          >
            Premium
          </button>
        </div>

        <div className="header-actions">
          <button
            className="theme-control"
            type="button"
            aria-label="Dark mode"
            aria-pressed={theme === "dark"}
            onClick={onToggleTheme}
          >
            {theme === "dark" ? (
              <Sun size={20} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Moon size={20} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
          <span className="avatar" aria-label="Ava Chen">
            AC
          </span>
        </div>

        <h1 className="header-greeting">Good evening, Ava</h1>
      </div>
    </header>
  );
}
