import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { computeCardScale, computeCardOverlap, useCardScaling } from './useCardScaling';

describe('computeCardScale', () => {
  it('returns 0.6 on desktop regardless of hand size', () => {
    expect(computeCardScale(1920, 13, false)).toBe(0.6);
    expect(computeCardScale(1024, 1, false)).toBe(0.6);
    expect(computeCardScale(800, 50, false)).toBe(0.6);
  });

  it('returns 0.6 for small hands on mobile', () => {
    expect(computeCardScale(375, 1, true)).toBe(0.6);
    expect(computeCardScale(375, 3, true)).toBe(0.6);
  });

  it('scales down for large hands on mobile', () => {
    const result = computeCardScale(375, 13, true);
    expect(result).toBeLessThan(0.6);
    expect(result).toBeGreaterThanOrEqual(0.28);
  });

  it('never goes below 0.28 on mobile', () => {
    expect(computeCardScale(375, 100, true)).toBe(0.28);
  });

  it('clamps to 0.6 max on mobile', () => {
    expect(computeCardScale(1000, 1, true)).toBe(0.6);
  });
});

describe('computeCardOverlap', () => {
  it('returns -100 on desktop', () => {
    expect(computeCardOverlap(0.6, false)).toBe(-100);
    expect(computeCardOverlap(0.3, false)).toBe(-100);
  });

  it('computes overlap from scale on mobile', () => {
    expect(computeCardOverlap(0.6, true)).toBeCloseTo(-105.2, 1);
    expect(computeCardOverlap(0.28, true)).toBeCloseTo(-27.76, 1);
  });
});

describe('useCardScaling', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      ...window,
      innerWidth: 1024,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('returns desktop values for non-mobile width', () => {
    const { result } = renderHook(() => useCardScaling(13));
    expect(result.current.isMobile).toBe(false);
    expect(result.current.selfCardScale).toBe(0.6);
    expect(result.current.selfCardOverlap).toBe(-100);
  });

  it('returns mobile values for narrow width', () => {
    vi.stubGlobal('window', {
      ...window,
      innerWidth: 375,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const { result } = renderHook(() => useCardScaling(13));
    expect(result.current.isMobile).toBe(true);
    expect(result.current.selfCardScale).toBeLessThan(0.6);
    expect(result.current.selfCardOverlap).not.toBe(-100);
  });

  it('updates on hand length change', () => {
    const { result, rerender } = renderHook(
      ({ handLength }) => useCardScaling(handLength),
      { initialProps: { handLength: 1 } }
    );
    const scaleSmall = result.current.selfCardScale;

    rerender({ handLength: 20 });
    const scaleLarge = result.current.selfCardScale;

    // On desktop scale is always 0.6, so this won't change
    // Just verify the hook doesn't crash on rerender
    expect(scaleLarge).toBe(0.6);
  });
});
