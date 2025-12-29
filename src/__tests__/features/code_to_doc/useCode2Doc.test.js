/**
 * Tests for useCode2Doc hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import useCode2Doc from '../../../features/code_to_doc/hooks/useCode2Doc';
import useGenerationStatus from '../../../features/code_to_doc/hooks/useGenerationStatus';

// Mock dependencies
jest.mock('../../../features/code_to_doc/hooks/useGenerationStatus');
jest.mock('../../../core/utils/nodeApi', () => ({
  getNodeApiBase: () => 'http://localhost:5002',
  getAuthToken: () => 'test-token',
  nodeApiRequest: jest.fn(),
}));

describe('useCode2Doc', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    useGenerationStatus.mockReturnValue({
      status: null,
      updateStatus: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('initializes with default state', () => {
    const { result } = renderHook(() => useCode2Doc());

    expect(result.current.state.output).toBe('Generated documentation will appear here.');
    expect(result.current.state.isUploading).toBe(false);
    expect(result.current.state.isGenerating).toBe(false);
  });

  test('handles file upload', async () => {
    // Mock the upload endpoint
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/upload')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            filename: 'test.py',
            file_count: 1,
            content_type: 'code',
          }),
        });
      }
      // Mock health check
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'ok' }),
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const { result } = renderHook(() => useCode2Doc());

    const file = new File(['test content'], 'test.py', { type: 'text/plain' });
    const fileList = [file];

    await act(async () => {
      await result.current.actions.handleUpload(fileList);
    });

    await waitFor(() => {
      expect(result.current.state.uploads.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
    
    expect(result.current.state.uploads[0].name).toBe('test.py');
  });

  test('handles generation error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Generation failed'));

    const { result } = renderHook(() => useCode2Doc());

    await act(async () => {
      await result.current.actions.handleGenerate();
    });

    await waitFor(() => {
      expect(result.current.state.toast.type).toBe('error');
    });
  });
});

