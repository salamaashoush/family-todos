import { useRef, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

interface FloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerGradient?: string;
  headerIcon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  position?: "bottom-right" | "bottom-left";
  /** Width in pixels for desktop view (mobile is always full-screen). Default 320 */
  width?: number;
  className?: string;
}

// Check if device is in landscape with limited height
function useIsLandscapeConstrained() {
  const [isConstrained, setIsConstrained] = useState(false);

  useEffect(() => {
    const check = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isShortHeight = window.innerHeight < 500;
      setIsConstrained(isLandscape && isShortHeight);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  return isConstrained;
}

export function FloatingPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  headerGradient = "from-theme-primary to-theme-secondary",
  headerIcon,
  children,
  footer,
  position = "bottom-right",
  width = 320,
  className = "",
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const isLandscapeConstrained = useIsLandscapeConstrained();

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Prevent body scroll when panel is open on mobile or landscape constrained
  useEffect(() => {
    if (!isOpen) return;

    if (isMobile || isLandscapeConstrained) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen, isMobile, isLandscapeConstrained]);

  // Close panel on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionStyles = {
    "bottom-right": { right: 24, bottom: 96 },
    "bottom-left": { left: 24, bottom: 96 },
  };

  // Use full screen mode on mobile OR when in landscape with constrained height
  const useFullScreen = isMobile || isLandscapeConstrained;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          fixed z-50
          bg-white
          overflow-hidden
          flex flex-col
          ${useFullScreen ? "inset-0" : "rounded-2xl shadow-2xl bg-white/95 backdrop-blur-md animate-slide-up"}
          ${className}
        `}
        style={useFullScreen ? undefined : {
          ...positionStyles[position],
          width: width,
          maxWidth: "calc(100vw - 2rem)",
          maxHeight: "calc(100vh - 8rem)",
        }}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${headerGradient} p-4 text-white flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {headerIcon && (
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  {headerIcon}
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg">{title}</h3>
                {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Close panel"
            >
              <X className={useFullScreen ? "w-6 h-6" : "w-5 h-5"} />
            </button>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-3 bg-gray-50 border-t flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

// Info bar component for displaying quick info below header
interface InfoBarProps {
  children: ReactNode;
  gradient?: string;
  className?: string;
}

export function PanelInfoBar({
  children,
  gradient = "from-emerald-50 to-teal-50",
  className = "",
}: InfoBarProps) {
  return (
    <div
      className={`
        px-4 py-2 bg-gradient-to-r ${gradient}
        border-b flex items-center justify-between text-sm
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Date display for panels
interface PanelDateDisplayProps {
  gregorianDate: string;
  hijriDate?: string;
  event?: string | null;
  className?: string;
}

export function PanelDateDisplay({
  gregorianDate,
  hijriDate,
  event,
  className = "",
}: PanelDateDisplayProps) {
  return (
    <div className={`px-4 py-2 bg-gray-50 border-b ${className}`}>
      <div className="text-sm text-gray-600">{gregorianDate}</div>
      {hijriDate && (
        <div className="text-sm text-theme-primary font-medium">{hijriDate}</div>
      )}
      {event && (
        <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {event}
        </div>
      )}
    </div>
  );
}

// Panel section with optional title
interface PanelSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function PanelSection({ title, children, className = "" }: PanelSectionProps) {
  return (
    <div className={className}>
      {title && (
        <div className="px-4 py-2 bg-gray-50 border-b">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {title}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
