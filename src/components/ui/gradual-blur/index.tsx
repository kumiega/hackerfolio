import React, { useEffect, useRef, useState, useMemo } from "react";
import * as math from "mathjs";

import "./index.css";

type Position = "top" | "bottom" | "left" | "right";
type CurveType = "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";
type AnimationType = false | true | "scroll";
type TargetType = "parent" | "page";

interface GradualBlurConfig {
  position: Position;
  strength: number;
  height: string;
  width?: string;
  divCount: number;
  exponential: boolean;
  zIndex: number;
  animated: AnimationType;
  duration: string;
  easing: string;
  opacity: number;
  curve: CurveType;
  responsive: boolean;
  target: TargetType;
  className: string;
  style: React.CSSProperties;
  hoverIntensity?: number;
  mobileHeight?: string;
  tabletHeight?: string;
  desktopHeight?: string;
  mobileWidth?: string;
  tabletWidth?: string;
  desktopWidth?: string;
  onAnimationComplete?: () => void;
}

type PresetName = keyof typeof PRESETS;

interface GradualBlurProps extends Partial<GradualBlurConfig> {
  preset?: PresetName;
}

const DEFAULT_CONFIG: GradualBlurConfig = {
  position: "bottom",
  strength: 2,
  height: "6rem",
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: "0.3s",
  easing: "ease-out",
  opacity: 1,
  curve: "linear",
  responsive: false,
  target: "parent",
  className: "",
  style: {},
};

const PRESETS = {
  top: { position: "top" as Position, height: "6rem" },
  bottom: { position: "bottom" as Position, height: "6rem" },
  left: { position: "left" as Position, height: "6rem" },
  right: { position: "right" as Position, height: "6rem" },
  subtle: { height: "4rem", strength: 1, opacity: 0.8, divCount: 3 },
  intense: { height: "10rem", strength: 4, divCount: 8, exponential: true },
  smooth: { height: "8rem", curve: "bezier" as CurveType, divCount: 10 },
  sharp: { height: "5rem", curve: "linear" as CurveType, divCount: 4 },
  header: { position: "top" as Position, height: "8rem", curve: "ease-out" as CurveType },
  footer: { position: "bottom" as Position, height: "8rem", curve: "ease-out" as CurveType },
  sidebar: { position: "left" as Position, height: "6rem", strength: 2.5 },
  "page-header": { position: "top" as Position, height: "10rem", target: "page" as TargetType, strength: 3 },
  "page-footer": { position: "bottom" as Position, height: "10rem", target: "page" as TargetType, strength: 3 },
} as const;

const CURVE_FUNCTIONS: Record<CurveType, (p: number) => number> = {
  linear: (p: number) => p,
  bezier: (p: number) => p * p * (3 - 2 * p),
  "ease-in": (p: number) => p * p,
  "ease-out": (p: number) => 1 - Math.pow(1 - p, 2),
  "ease-in-out": (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
};

const mergeConfigs = (...configs: Partial<GradualBlurConfig>[]): GradualBlurConfig =>
  configs.reduce<GradualBlurConfig>((acc, c) => ({ ...acc, ...c }), DEFAULT_CONFIG);

const getGradientDirection = (position: Position): string =>
  ({
    top: "to top",
    bottom: "to bottom",
    left: "to left",
    right: "to right",
  })[position] || "to bottom";

const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let t: NodeJS.Timeout;
  return (...a: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), wait);
  };
};

const useResponsiveDimension = (responsive: boolean, config: GradualBlurConfig, key: "height" | "width"): string => {
  const [value, setValue] = useState<string>(config[key] || (key === "width" ? "100%" : "6rem"));
  useEffect(() => {
    if (!responsive) return;
    const calc = (): void => {
      const w = window.innerWidth;
      let v = config[key] || (key === "width" ? "100%" : "6rem");
      const capitalizedKey = key[0].toUpperCase() + key.slice(1);
      if (w <= 480 && config[`mobile${capitalizedKey}` as keyof GradualBlurConfig])
        v = config[`mobile${capitalizedKey}` as keyof GradualBlurConfig] as string;
      else if (w <= 768 && config[`tablet${capitalizedKey}` as keyof GradualBlurConfig])
        v = config[`tablet${capitalizedKey}` as keyof GradualBlurConfig] as string;
      else if (w <= 1024 && config[`desktop${capitalizedKey}` as keyof GradualBlurConfig])
        v = config[`desktop${capitalizedKey}` as keyof GradualBlurConfig] as string;
      setValue(v);
    };
    const debounced = debounce(calc, 100);
    calc();
    window.addEventListener("resize", debounced);
    return () => window.removeEventListener("resize", debounced);
  }, [responsive, config, key]);
  return responsive ? value : config[key] || (key === "width" ? "100%" : "6rem");
};

const useIntersectionObserver = (ref: React.RefObject<Element | null>, shouldObserve = false): boolean => {
  const [isVisible, setIsVisible] = useState<boolean>(!shouldObserve);

  useEffect(() => {
    if (!shouldObserve || !ref.current) return;

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.1 });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, shouldObserve]);

  return isVisible;
};

const useScrollToBottom = (hideThresholdPercent = 8, showThresholdPercent = 25): boolean => {
  const [isAtBottom, setIsAtBottom] = useState<boolean>(false);
  const lastScrollY = useRef<number>(0);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = (): void => {
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Determine scroll direction
      const direction = currentScrollY > lastScrollY.current ? "down" : "up";
      lastScrollY.current = currentScrollY;

      // Calculate thresholds based on viewport height percentage
      const hideThresholdPixels = (hideThresholdPercent / 100) * windowHeight;
      const showThresholdPixels = (showThresholdPercent / 100) * windowHeight;

      // Distance from bottom of page
      const distanceFromBottom = documentHeight - (currentScrollY + windowHeight);

      // Clear any pending state change
      clearTimeout(scrollTimeout);

      // Only change state when scrolling in the appropriate direction
      if (direction === "down" && !isAtBottom) {
        // Scrolling down - hide if close to bottom
        if (distanceFromBottom <= hideThresholdPixels) {
          scrollTimeout = setTimeout(() => setIsAtBottom(true), 100); // Small delay to prevent flickering
        }
      } else if (direction === "up" && isAtBottom) {
        // Scrolling up - show if far enough from bottom
        if (distanceFromBottom > showThresholdPixels) {
          scrollTimeout = setTimeout(() => setIsAtBottom(false), 100); // Small delay to prevent flickering
        }
      }
    };

    const debouncedScroll = debounce(handleScroll, 8); // Faster response

    handleScroll(); // Check initial state
    window.addEventListener("scroll", debouncedScroll);
    window.addEventListener("resize", debouncedScroll);

    return () => {
      window.removeEventListener("scroll", debouncedScroll);
      window.removeEventListener("resize", debouncedScroll);
      clearTimeout(scrollTimeout);
    };
  }, [hideThresholdPercent, showThresholdPercent, isAtBottom]);

  return isAtBottom;
};

function GradualBlur(props: GradualBlurProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const config = useMemo((): GradualBlurConfig => {
    const presetConfig = props.preset && PRESETS[props.preset] ? PRESETS[props.preset] : {};
    return mergeConfigs(DEFAULT_CONFIG, presetConfig, props);
  }, [props]);

  const responsiveHeight = useResponsiveDimension(config.responsive, config, "height");
  const responsiveWidth = useResponsiveDimension(config.responsive, config, "width");

  const isVisible = useIntersectionObserver(containerRef, config.animated === "scroll");
  const isAtBottom = useScrollToBottom(8, 25); // Hide at 8%, show at 25% of viewport height

  // Hide when target is "page" and page is scrolled to bottom
  const shouldShow = config.target === "page" && isAtBottom ? false : isVisible;

  const blurDivs = useMemo((): React.ReactElement[] => {
    const divs: React.ReactElement[] = [];
    const increment = 100 / config.divCount;
    const currentStrength: number =
      isHovered && config.hoverIntensity ? config.strength * config.hoverIntensity : config.strength;

    const curveFunc = CURVE_FUNCTIONS[config.curve] || CURVE_FUNCTIONS.linear;

    for (let i = 1; i <= config.divCount; i++) {
      let progress = i / config.divCount;
      progress = curveFunc(progress);

      let blurValue: number;
      if (config.exponential) {
        blurValue = Number(math.pow(2, progress * 4)) * 0.0625 * currentStrength;
      } else {
        blurValue = 0.0625 * (progress * config.divCount + 1) * currentStrength;
      }

      const p1 = math.round((increment * i - increment) * 10) / 10;
      const p2 = math.round(increment * i * 10) / 10;
      const p3 = math.round((increment * i + increment) * 10) / 10;
      const p4 = math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      const direction = getGradientDirection(config.position);

      const divStyle: React.CSSProperties = {
        position: "absolute",
        inset: "0",
        maskImage: `linear-gradient(${direction}, ${gradient})`,
        WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
        backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        opacity: config.opacity,
        transition:
          config.animated && config.animated !== "scroll"
            ? `backdrop-filter ${config.duration} ${config.easing}`
            : undefined,
      };

      divs.push(<div key={i} style={divStyle} />);
    }

    return divs;
  }, [config, isHovered]);

  const containerStyle = useMemo((): React.CSSProperties => {
    const isVertical = ["top", "bottom"].includes(config.position);
    const isHorizontal = ["left", "right"].includes(config.position);
    const isPageTarget = config.target === "page";

    const baseStyle: React.CSSProperties = {
      position: isPageTarget ? "fixed" : "absolute",
      pointerEvents: config.hoverIntensity ? "auto" : "none",
      opacity: shouldShow ? 1 : 0,
      transition: config.animated ? `opacity ${config.duration} ${config.easing}` : undefined,
      zIndex: isPageTarget ? config.zIndex + 100 : config.zIndex,
      ...config.style,
    };

    if (isVertical) {
      baseStyle.height = responsiveHeight;
      baseStyle.width = responsiveWidth || "100%";
      baseStyle[config.position] = 0;
      baseStyle.left = 0;
      baseStyle.right = 0;
    } else if (isHorizontal) {
      baseStyle.width = responsiveWidth || responsiveHeight;
      baseStyle.height = "100%";
      baseStyle[config.position] = 0;
      baseStyle.top = 0;
      baseStyle.bottom = 0;
    }

    return baseStyle;
  }, [config, responsiveHeight, responsiveWidth, shouldShow]);

  const { hoverIntensity, animated, onAnimationComplete, duration } = config;

  useEffect(() => {
    if (shouldShow && animated === "scroll" && onAnimationComplete) {
      const ms = parseFloat(duration) * 1000;
      const t = setTimeout(() => onAnimationComplete(), ms);
      return () => clearTimeout(t);
    }
  }, [shouldShow, animated, onAnimationComplete, duration]);

  return (
    <div
      ref={containerRef}
      className={`gradual-blur ${config.target === "page" ? "gradual-blur-page" : "gradual-blur-parent"} ${config.className}`}
      style={containerStyle}
      onMouseEnter={hoverIntensity ? () => setIsHovered(true) : undefined}
      onMouseLeave={hoverIntensity ? () => setIsHovered(false) : undefined}
    >
      <div
        className="gradual-blur-inner"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        {blurDivs}
      </div>
    </div>
  );
}

interface GradualBlurComponent extends React.MemoExoticComponent<typeof GradualBlur> {
  PRESETS: typeof PRESETS;
  CURVE_FUNCTIONS: typeof CURVE_FUNCTIONS;
}

const GradualBlurMemo = React.memo(GradualBlur) as GradualBlurComponent;

GradualBlurMemo.displayName = "GradualBlur";
GradualBlurMemo.PRESETS = PRESETS;
GradualBlurMemo.CURVE_FUNCTIONS = CURVE_FUNCTIONS;

export default GradualBlurMemo;

const injectStyles = (): void => {
  if (typeof document === "undefined") return;

  const styleId = "gradual-blur-styles";
  if (document.getElementById(styleId)) return;

  const styleElement = document.createElement("style");
  styleElement.id = styleId;
  styleElement.textContent = `
  .gradual-blur { pointer-events: none; transition: opacity 0.3s ease-out; }
  .gradual-blur-parent { overflow: hidden; }
  .gradual-blur-inner { pointer-events: none; }`;

  document.head.appendChild(styleElement);
};

if (typeof document !== "undefined") {
  injectStyles();
}
