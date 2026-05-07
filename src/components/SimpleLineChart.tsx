import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';
import { buildSimpleLineChartPaths } from './simpleLineChartPaths';

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
  fillColor = 'rgba(225, 29, 72, 0.2)',
}) => {
  const paths = buildSimpleLineChartPaths(data, width, height);
  if (!paths) return null;

  return (
    <View style={{ height, width }}>
      <Svg height={height} width={width}>
        <Defs>
          <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fillColor} stopOpacity="0.4" />
            <Stop offset="1" stopColor={fillColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path
          d={paths.areaData}
          fill="url(#gradient)"
        />
        <Path
          d={paths.pathData}
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
