/**
 * Line icons drawn with react-native-svg, paths taken verbatim from Nidham.dc.html.
 * All accept size + color so they inherit palette tokens.
 */

import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { colors } from '../theme/tokens';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Today nav — sun. */
export const SunIcon = ({ size = 22, color = colors.muted2, strokeWidth = 1.7 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={11} cy={13} r={3.2} />
    <Line x1={11} y1={2.5} x2={11} y2={5} />
    <Line x1={4.2} y1={13} x2={5.7} y2={13} />
    <Line x1={16.3} y1={13} x2={17.8} y2={13} />
    <Line x1={6} y1={8} x2={7.1} y2={9.1} />
    <Line x1={16} y1={8} x2={14.9} y2={9.1} />
  </Svg>
);

/** Capture nav — mic (22 units). */
export const MicNavIcon = ({ size = 22, color = colors.muted2, strokeWidth = 1.7 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={8} y={3} width={5} height={11} rx={2.5} />
    <Path d="M4.5 10a6 6 0 0 0 12 0" />
    <Line x1={10.5} y1={16} x2={10.5} y2={19} />
  </Svg>
);

/** Dump-box mic (19 units). */
export const MicIcon = ({ size = 19, color = colors.green, strokeWidth = 1.7 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 19 19" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={7} y={2.5} width={5} height={10} rx={2.5} />
    <Path d="M3.8 9a5.5 5.5 0 0 0 11.4 0" />
    <Line x1={9.5} y1={14.5} x2={9.5} y2={17} />
  </Svg>
);

/** Send arrow (18 units). */
export const ArrowRightIcon = ({ size = 18, color = colors.white, strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Line x1={3.5} y1={9} x2={14.5} y2={9} />
    <Path d="M9.5 4 14.5 9 9.5 14" />
  </Svg>
);

/** Schedule-chip calendar (13 units). */
export const CalendarIcon = ({ size = 13, color = colors.green, strokeWidth = 1.8 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 13 13" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={2} y={3.2} width={9} height={7.8} rx={1.5} />
    <Line x1={2} y1={5.6} x2={11} y2={5.6} />
    <Line x1={4.5} y1={1.6} x2={4.5} y2={3.6} />
    <Line x1={8.5} y1={1.6} x2={8.5} y2={3.6} />
  </Svg>
);

/** Chevron down (dropdown). */
export const ChevronDownIcon = ({ size = 16, color = colors.muted, strokeWidth = 1.8 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 6l4 4 4-4" />
  </Svg>
);

/** Person (logged-out avatar). */
export const PersonIcon = ({ size = 20, color = colors.white, strokeWidth = 1.7 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={11} cy={8} r={3.4} />
    <Path d="M4.8 18a6.4 6.4 0 0 1 12.4 0" />
  </Svg>
);

/** Checkmark (12 units). */
export const CheckIcon = ({ size = 11, color = colors.white, strokeWidth = 2.3 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M2.5 6.2 5 8.6 9.5 3.8" />
  </Svg>
);
