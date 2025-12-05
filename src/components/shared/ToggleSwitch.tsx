interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

const sizeClasses = {
  sm: {
    track: "w-10 h-5",
    thumb: "w-4 h-4 top-0.5 left-0.5",
    translate: "translate-x-5",
  },
  md: {
    track: "w-12 h-6",
    thumb: "w-5 h-5 top-0.5 left-0.5",
    translate: "translate-x-6",
  },
  lg: {
    track: "w-14 h-8",
    thumb: "w-6 h-6 top-1 left-1",
    translate: "translate-x-6",
  },
};

export function ToggleSwitch({
  enabled,
  onChange,
  size = "md",
  disabled = false,
}: ToggleSwitchProps) {
  const classes = sizeClasses[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`
        relative rounded-full transition-colors
        ${classes.track}
        ${enabled ? "bg-theme-primary" : "bg-gray-300"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          absolute bg-white rounded-full shadow transition-transform
          ${classes.thumb}
          ${enabled ? classes.translate : "translate-x-0"}
        `}
      />
    </button>
  );
}
