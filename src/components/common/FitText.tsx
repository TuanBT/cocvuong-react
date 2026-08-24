import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

interface FitTextProps {
  children: React.ReactNode;
  /** Cỡ chữ tối đa, theo vh */
  maxVh: number;
  /** Cỡ chữ tối thiểu, theo vh */
  minVh?: number;
  /** Chiều cao tối đa cho phép (vh). Khi text nhiều dòng, font sẽ thu nhỏ để không vượt quá */
  maxHeightVh?: number;
  /** Class cho khung ngoài (căn lề, flex...) */
  className?: string;
  /** Class cho phần chữ (màu, độ đậm...) */
  innerClassName?: string;
  /** Style cho phần chữ, dùng khi cần font riêng */
  innerStyle?: React.CSSProperties;
}

/** Chừa mép để chữ không dính sát viền khung */
const WIDTH_SAFETY = 0.99;
const HEIGHT_SAFETY = 0.98;
/** Dừng tìm kiếm khi sai số dưới nửa pixel, rồi làm tròn về lưới 0.5px */
const SEARCH_EPSILON = 0.25;

/**
 * FitText Component
 * Tự co chữ để vừa khung, kiểm soát cả chiều rộng lẫn chiều cao:
 * - Một dòng ngắn vừa khung → giữ nguyên maxVh (chữ to)
 * - Một dòng dài quá rộng  → thu nhỏ font theo chiều rộng
 * - Nhiều dòng (qua \n) quá cao → thu nhỏ font theo chiều cao
 * Không bao giờ nhỏ hơn minVh.
 *
 * Cỡ chữ được tìm bằng nhị phân: thử một cỡ, đo xem có vừa không, rồi thu hẹp
 * khoảng tìm kiếm. Cách này cho kết quả biến thiên liên tục theo kích thước khung
 * nên khi kéo giãn hay phóng to cửa sổ chữ không nhảy giật.
 */
const FitText: React.FC<FitTextProps> = ({
  children,
  maxVh,
  minVh = 1.2,
  maxHeightVh,
  className = '',
  innerClassName = '',
  innerStyle
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  /** Điều kiện đo của lần fit gần nhất, để bỏ qua các lần gọi thừa */
  const lastFitRef = useRef<string>('');
  const rafRef = useRef<number | null>(null);

  const hasCustomWhitespace = innerClassName.includes('whitespace-');

  const fit = useCallback((): void => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const vh = window.innerHeight / 100;
    const maxPx = maxVh * vh;
    const minPx = minVh * vh;

    const availableW = container.clientWidth * WIDTH_SAFETY;
    const maxH = (maxHeightVh ? maxHeightVh * vh : Number.POSITIVE_INFINITY) * HEIGHT_SAFETY;
    if (availableW <= 0) return;

    // Không có gì đổi kể từ lần đo trước thì thôi, tránh reflow vô ích mỗi lần render
    const fitKey = `${availableW}|${maxH}|${maxPx}|${minPx}|${text.textContent ?? ''}`;
    if (fitKey === lastFitRef.current && text.style.fontSize) return;

    const fitsAt = (size: number): boolean => {
      text.style.fontSize = `${size}px`;
      // scrollWidth/scrollHeight là số nguyên đã làm tròn, nới 1px cho sai số
      return text.scrollWidth <= availableW + 1 && text.scrollHeight <= maxH + 1;
    };

    let best = minPx;
    if (fitsAt(maxPx)) {
      best = maxPx;
    } else {
      let lo = minPx;
      let hi = maxPx;
      while (hi - lo > SEARCH_EPSILON) {
        const mid = (lo + hi) / 2;
        if (fitsAt(mid)) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
    }

    const fontSize = Math.round(best * 2) / 2;
    text.style.fontSize = `${fontSize}px`;
    lastFitRef.current = fitKey;
  }, [maxVh, minVh, maxHeightVh]);

  /** Gom nhiều sự kiện resize trong cùng một khung hình thành một lần đo */
  const scheduleFit = useCallback((): void => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      fit();
    });
  }, [fit]);

  // Chạy sau mỗi lần render (nội dung đổi) và trước khi trình duyệt vẽ
  useLayoutEffect(fit);

  useEffect(() => {
    window.addEventListener('resize', scheduleFit);

    // Khung có thể đổi kích thước mà cửa sổ không đổi (đổi layout, ẩn/hiện panel)
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(scheduleFit);
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', scheduleFit);
      observer?.disconnect();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [scheduleFit]);

  return (
    <div ref={containerRef} className={`w-full min-w-0 overflow-hidden ${className}`}>
      <span
        ref={textRef}
        className={`inline-block py-[0.05em] ${hasCustomWhitespace ? '' : 'whitespace-nowrap'} ${innerClassName}`}
        style={innerStyle}
      >
        {children}
      </span>
    </div>
  );
};

export default FitText;
