'use client';
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePDFUpload } from '@/hooks/usePDFUpload';

const ROUTES = ['/', '/transactions', '/analytics', '/budgets', '/settings'];

export function SwipeNavigator() {
  const pathname = usePathname();
  const router = useRouter();
  const { uploading } = usePDFUpload();
  const uploadingRef = useRef(uploading);
  const touchStateRef = useRef({ x: 0, y: 0, tracking: false, isSwiping: false, pageEl: null });
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);

  useEffect(() => {
    pathnameRef.current = pathname;
    const timer = setTimeout(() => {
      document.body.removeAttribute('data-swipe-dir');
    }, 450);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    function handleTouchStart(e) {
      if (uploadingRef.current || (typeof window !== 'undefined' && window.__VAULT_UPLOADING_PDF__)) return;
      if (e.touches.length > 1) return; // ignore multi-touch
      const touch = e.touches[0];

      // Allow Apple's native edge swipe back only on the absolute bezel (<15px)
      if (touch.clientX <= 15) return;

      const target = e.target;
      // Only avoid active text input fields and modal dialogs so natural swipes anywhere on dashboards/cards work effortlessly
      if (target && target.closest('input, textarea, select, [role="dialog"], .modal-overlay, [data-no-swipe]')) {
        return;
      }

      const pageEl = document.querySelector('.mobile-page');
      touchStateRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        tracking: true,
        isSwiping: false,
        pageEl,
      };

      if (pageEl) {
        pageEl.style.transition = 'none';
      }
    }

    function handleTouchMove(e) {
      if (!touchStateRef.current.tracking) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStateRef.current.x;
      const deltaY = touch.clientY - touchStateRef.current.y;

      // If user is clearly scrolling vertically up/down through lists, cancel horizontal swipe interception
      if (!touchStateRef.current.isSwiping && Math.abs(deltaY) > Math.abs(deltaX) + 12) {
        touchStateRef.current.tracking = false;
        if (touchStateRef.current.pageEl) {
          touchStateRef.current.pageEl.style.transform = '';
          touchStateRef.current.pageEl.style.transition = '';
        }
        return;
      }

      // Detect deliberate horizontal movement (>10px) to start live finger tracking
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY) * 0.7) {
        touchStateRef.current.isSwiping = true;
      }

      // Provide responsive tactile visual feedback under the thumb in real time
      if (touchStateRef.current.isSwiping && touchStateRef.current.pageEl) {
        // Dampen the translation slightly for a smooth, high-end studio feel
        const translate = deltaX * 0.35;
        touchStateRef.current.pageEl.style.transform = `translate3d(${translate}px, 0, 0)`;
      }
    }

    function handleTouchEnd(e) {
      if (!touchStateRef.current.tracking) return;
      touchStateRef.current.tracking = false;
      const { x, y, isSwiping, pageEl } = touchStateRef.current;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - x;
      const deltaY = touch.clientY - y;

      // Reset DOM inline transforms so CSS keyframe classes and bounce-backs take over gracefully
      if (pageEl) {
        pageEl.style.transition = 'transform 0.28s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.28s ease';
        pageEl.style.transform = '';
      }

      // Require just an effortless 35px threshold and relaxed diagonal tolerance for natural thumb swiping
      if (!isSwiping || Math.abs(deltaX) < 35 || Math.abs(deltaX) < Math.abs(deltaY) * 0.6) {
        return;
      }

      const currentRoute = pathnameRef.current;
      const currentIndex = ROUTES.indexOf(currentRoute);
      if (currentIndex === -1) return;

      // Swipe Left -> Move forward to next tab on right
      if (deltaX < -35 && currentIndex < ROUTES.length - 1) {
        document.body.setAttribute('data-swipe-dir', 'left');
        if (window.navigator?.vibrate) window.navigator.vibrate(10);
        router.push(ROUTES[currentIndex + 1]);
      }
      // Swipe Right -> Move backward to previous tab on left
      else if (deltaX > 35 && currentIndex > 0) {
        document.body.setAttribute('data-swipe-dir', 'right');
        if (window.navigator?.vibrate) window.navigator.vibrate(10);
        router.push(ROUTES[currentIndex - 1]);
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [router]);

  return null;
}
