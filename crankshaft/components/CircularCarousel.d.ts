import React from "react";

export interface CarouselItem {
  src: string;
  alt?: string;
  title?: string;
  subtitle?: string;
}

export interface CircularCarouselProps {
  items?: CarouselItem[];
  preset?: "cylinder" | "orbit" | "wheel" | "panorama";
  intro?: "assemble" | "rise" | "spin" | "none";
  cardWidth?: number;
  aspectRatio?: number;
  gap?: number;
  curve?: number;
  tilt?: number;
  perspective?: number;
  autoplay?: "drift" | "step" | "off";
  speed?: number;
  interval?: number;
  direction?: "left" | "right";
  draggable?: boolean;
  momentum?: number;
  snap?: boolean;
  pauseOnHover?: boolean;
  focusOnClick?: boolean;
  parallax?: number;
  stretch?: number;
  depthFade?: number;
  fadeColor?: string;
  innerShade?: number;
  cornerRadius?: number;
  captions?: boolean;
  onChange?: (index: number) => void;
  onItemClick?: (item: CarouselItem, index: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

declare const CircularCarousel: React.FC<CircularCarouselProps>;

export default CircularCarousel;
