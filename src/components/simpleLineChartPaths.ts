type ChartPaths = {
  pathData: string;
  areaData: string;
};

function isFinitePositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function formatCoordinate(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(3).replace(/\.?0+$/, '');
}

export function buildSimpleLineChartPaths(data: number[], width: number, height: number): ChartPaths | null {
  if (!isFinitePositive(width) || !isFinitePositive(height)) return null;

  const finiteData = data.filter((value) => Number.isFinite(value));
  if (finiteData.length < 2) return null;

  const max = Math.max(...finiteData);
  const min = Math.min(...finiteData);
  const range = max - min || 1;

  const points = finiteData.map((value, index) => {
    const x = (index / (finiteData.length - 1)) * width;
    const y = height - ((value - min) / range) * height;

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    return `${formatCoordinate(x)},${formatCoordinate(y)}`;
  });

  if (points.some((point) => point === null)) return null;

  const pathData = `M ${points.join(' L ')}`;
  const areaData = `${pathData} L ${formatCoordinate(width)},${formatCoordinate(height)} L 0,${formatCoordinate(height)} Z`;

  return { pathData, areaData };
}
