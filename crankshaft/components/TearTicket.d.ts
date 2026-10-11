import React from "react";

export interface TearTicketProps {
  children?: React.ReactNode;
  stub?: React.ReactNode;
  image?: string;
  imageAlt?: string;
  scrim?: boolean;
  imageRadius?: number;
  orientation?: "horizontal" | "vertical";
  torn?: boolean;
  defaultTorn?: boolean;
  onTear?: () => void;
  width?: number;
  height?: number;
  stubSize?: number;
  radius?: number;
  holes?: number;
  holeSize?: number;
  notch?: number;
  roughness?: number;
  tearAngle?: number;
  stretch?: number;
  resistance?: number;
  rotate?: number;
  tilt?: boolean;
  tiltMax?: number;
  tiltReach?: number;
  parallax?: number;
  perspective?: number;
  background?: string;
  color?: string;
  border?: boolean;
  borderColor?: string;
  borderWidth?: number;
  stubBackground?: string;
  recenter?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

declare const TearTicket: React.FC<TearTicketProps>;

export default TearTicket;
