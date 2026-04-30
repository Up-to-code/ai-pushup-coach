import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';

interface SimpleLineChartProps {
  data: number[];
  height: number;
  width: number;
  color?: string;
  fillColor?: string;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  height,
  width,
  color = colors.accent,
  fillColor = 'rgba(218, 63, 69, 0.2)',
}) => {
  if (data.length < 2) return null;

  const max = Math.max(...data) || 1;
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;
  const areaData = `${pathData} L ${width},${height} L 0,${height} Z`;

  return (
    <View style={{ height, width }}>
      <Svg height={height} width={width}>
        <Defs>
          <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.4" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path
          d={areaData}
          fill="url(#gradient)"
        />
        <Path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({});
