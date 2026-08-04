'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Global singleton state to survive component unmounts/page transitions
let uploadState = {
  uploading: false,
  uploadPhase: '', // 'reading' | 'parsing' | 'saving' | 'done' | 'error'
  uploadProgress: 0,
  uploadResult: null,
  abortController: null,
  intervalId: null,
};

const listeners = new Set();

function notify() {
  if (typeof window !== 'undefined') {
    window.__VAULT_UPLOADING_PDF__ = uploadState.uploading;
  }
  listeners.forEach((listener) => listener({ ...uploadState }));
}

function updateState(newPartialState) {
  uploadState = { ...uploadState, ...newPartialState };
  notify();
}

export function usePDFUpload() {
  const [state, setState] = useState({ ...uploadState });

  useEffect(() => {
    listeners.add(setState);
    // Ensure state sync on mount
    setState({ ...uploadState });
    return () => {
      listeners.delete(setState);
    };
  }, []);

  async function startUpload(file) {
    if (!file) return;

    if (uploadState.intervalId) {
      clearInterval(uploadState.intervalId);
    }
    if (uploadState.abortController) {
      uploadState.abortController.abort();
    }

    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();

    updateState({
      uploadResult: null,
      uploading: true,
      uploadPhase: 'reading',
      uploadProgress: 5,
      abortController: controller,
    });

    let currentProgress = 5;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 2.5 + 0.5;
      if (currentProgress >= 90) currentProgress = 90;
      updateState({ uploadProgress: currentProgress });
    }, 250);

    updateState({ intervalId: interval });

    setTimeout(() => {
      if (uploadState.uploading && !controller.signal.aborted) {
        updateState({ uploadPhase: 'parsing' });
      }
    }, 800);

    setTimeout(() => {
      if (uploadState.uploading && !controller.signal.aborted) {
        updateState({ uploadPhase: 'saving' });
      }
    }, 3000);

    try {
      const token = localStorage.getItem('vault_token');
      const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const res = await fetch(`${BASE}/api/pdf/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal,
      });

      clearInterval(interval);
      const data = await res.json();

      if (!res.ok) {
        updateState({
          uploading: false,
          uploadPhase: 'error',
          uploadProgress: 100,
          uploadResult: { error: data.error || 'Upload failed' },
          intervalId: null,
          abortController: null,
        });
        toast.error(data.error || 'PDF upload failed');
      } else {
        updateState({
          uploading: false,
          uploadPhase: 'done',
          uploadProgress: 100,
          uploadResult: data,
          intervalId: null,
          abortController: null,
        });
        toast.success(`Imported ${data.imported} transactions!`);
      }
    } catch (err) {
      clearInterval(interval);
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        updateState({
          uploading: false,
          uploadPhase: 'error',
          uploadProgress: 0,
          uploadResult: { error: 'Processing cancelled by user' },
          intervalId: null,
          abortController: null,
        });
      } else {
        updateState({
          uploading: false,
          uploadPhase: 'error',
          uploadProgress: 100,
          uploadResult: { error: err.message || 'PDF upload failed' },
          intervalId: null,
          abortController: null,
        });
        toast.error(err.message || 'PDF upload failed');
      }
    }
  }

  function cancelUpload() {
    if (uploadState.abortController) {
      uploadState.abortController.abort();
    }
    if (uploadState.intervalId) {
      clearInterval(uploadState.intervalId);
    }
    updateState({
      uploading: false,
      uploadPhase: 'error',
      uploadProgress: 0,
      uploadResult: { error: 'Processing cancelled by user' },
      intervalId: null,
      abortController: null,
    });
    toast('PDF processing cancelled', {
      icon: '🛑',
      style: { borderRadius: '10px', background: 'var(--bg-glass)', color: 'var(--text-primary)' },
    });
  }

  return {
    uploading: state.uploading,
    uploadPhase: state.uploadPhase,
    uploadProgress: state.uploadProgress,
    uploadResult: state.uploadResult,
    startUpload,
    cancelUpload,
  };
}
