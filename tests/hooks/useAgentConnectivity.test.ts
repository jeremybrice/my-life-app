import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgentConnectivity } from '../../src/hooks/useAgentConnectivity';

describe('useAgentConnectivity', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    // Default to online
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  it('should report online when navigator.onLine is true', () => {
    const { result } = renderHook(() => useAgentConnectivity());
    expect(result.current.isOnline).toBe(true);
  });

  it('should report offline when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useAgentConnectivity());
    expect(result.current.isOnline).toBe(false);
  });

  it('should update to offline when offline event fires', () => {
    const { result } = renderHook(() => useAgentConnectivity());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOfflineDuringSession).toBe(true);
  });

  it('should update to online when online event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useAgentConnectivity());
    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
  });

  it('should track wasOfflineDuringSession after going offline', () => {
    const { result } = renderHook(() => useAgentConnectivity());
    expect(result.current.wasOfflineDuringSession).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.wasOfflineDuringSession).toBe(true);

    // Reconnecting doesn't clear wasOfflineDuringSession
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.wasOfflineDuringSession).toBe(true);
  });

  it('should mark offline on API failure', () => {
    const { result } = renderHook(() => useAgentConnectivity());

    act(() => {
      result.current.markApiFailure();
    });
    expect(result.current.isOnline).toBe(false);
  });

  it('should mark online on API success', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useAgentConnectivity());

    act(() => {
      result.current.markApiSuccess();
    });
    expect(result.current.isOnline).toBe(true);
  });

  it('should clean up event listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useAgentConnectivity());
    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
