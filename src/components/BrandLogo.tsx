import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { colors } from '../theme';

interface BrandLogoProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function BrandLogo({ 
  size = 48, 
  color = colors.accent,
  strokeWidth = 3.5
}: BrandLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Outer rounded canvas - represents the 'Pure Canvas' aesthetic */}
      <Rect 
        x="6" 
        y="6" 
        width="52" 
        height="52" 
        rx="14" 
        stroke={color} 
        strokeWidth={strokeWidth} 
      />
      
      {/* Abstract person in a pushup position or an upward trajectory */}
      <Path 
        d="M20 42 L32 24 L44 42" 
        stroke={color} 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Abstract arm / support line */}
      <Path 
        d="M32 24 V42" 
        stroke={color} 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeOpacity={0.4}
      />

      <Circle 
        cx="32" 
        cy="16" 
        r="3" 
        fill={color} 
      />
    </Svg>
  );
}
