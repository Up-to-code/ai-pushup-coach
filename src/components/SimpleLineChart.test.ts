import { describe, expect, it } from 'vitest';
import { buildSimpleLineChartPaths } from './simpleLineChartPaths';

describe('buildSimpleLineChartPaths', () => {
  it('builds finite SVG paths for valid chart data', () => {
    expect(buildSimpleLineChartPaths([0, 10, 5], 100, 40)).toEqual({
      pathData: 'M 0,40 L 50,0 L 100,20',
      areaData: 'M 0,40 L 50,0 L 100,20 L 100,40 L 0,40 Z',
    });
  });

  it('rejects invalid dimensions and insufficient data', () => {
    expect(buildSimpleLineChartPaths([1, 2], 0, 40)).toBeNull();
    expect(buildSimpleLineChartPaths([1, 2], 100, 0)).toBeNull();
    expect(buildSimpleLineChartPaths([1], 100, 40)).toBeNull();
    expect(buildSimpleLineChartPaths([], 100, 40)).toBeNull();
  });

  it('filters invalid values and rejects data without two finite points', () => {
    expect(buildSimpleLineChartPaths([Number.NaN, 4, Infinity, 8], 100, 40)?.pathData).toBe('M 0,40 L 100,0');
    expect(buildSimpleLineChartPaths([Number.NaN, Infinity], 100, 40)).toBeNull();
  });
});
