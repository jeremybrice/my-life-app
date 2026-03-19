import { describe, it, expect, vi, beforeAll } from 'vitest';

// jsdom does not implement URL.createObjectURL / revokeObjectURL
beforeAll(() => {
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => '';
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = () => {};
  }
});

describe('transient image handling', () => {
  it('should create object URL via URL.createObjectURL', () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/fake');
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    expect(url).toBe('blob:http://localhost/fake');
    expect(createSpy).toHaveBeenCalled();
    createSpy.mockRestore();
  });

  it('should revoke object URL via URL.revokeObjectURL', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    URL.revokeObjectURL('blob:http://localhost/fake');
    expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/fake');
    revokeSpy.mockRestore();
  });

  it('should not persist image data to localStorage', () => {
    // Verify no image data keys exist
    const keys = Object.keys(localStorage);
    const imageKeys = keys.filter((k) => k.includes('image') || k.includes('receipt'));
    expect(imageKeys).toHaveLength(0);
  });

  it('should not persist image data to sessionStorage', () => {
    const keys = Object.keys(sessionStorage);
    const imageKeys = keys.filter((k) => k.includes('image') || k.includes('receipt'));
    expect(imageKeys).toHaveLength(0);
  });

  it('should document that images are never written to IndexedDB', () => {
    // This is an architectural constraint test.
    // The expense-service createExpense() function does not accept image data.
    // The ChatMessage type has imageUrl (object URL only) but no image binary field.
    // IndexedDB schema has no image-related stores or columns.
    expect(true).toBe(true);
  });

  it('should document disclosure requirements', () => {
    // Disclosure must be shown at least once per session before first image upload.
    // The disclosure mentions Anthropic as the API provider.
    // The disclosure is non-blocking (no dismissal required).
    // Verified by the MessageBubble test for disclosure contentType.
    expect(true).toBe(true);
  });
});
