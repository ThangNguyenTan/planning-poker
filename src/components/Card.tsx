import React from "react";
import type { VoteValue } from "../types";

interface CardProps {
  value: VoteValue;
  isSelected?: boolean;
  onClick?: (value: VoteValue) => void;
  disabled?: boolean;
}

/**
 * Performance: React.memo prevents re-renders if props haven't changed.
 * This is crucial for the card grid where many cards exist.
 */
export const Card = React.memo(
  ({ value, isSelected, onClick, disabled }: CardProps) => {
    const handleClick = () => {
      if (!disabled && onClick) {
        onClick(value);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`card ${!disabled ? "selectable" : ""} ${
          isSelected ? "selected" : ""
        }`}
        aria-pressed={isSelected}
        aria-label={`Vote ${value}`}
      >
        {value}
      </div>
    );
  }
);

Card.displayName = "Card";
