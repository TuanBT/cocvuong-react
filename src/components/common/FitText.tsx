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

/**
 * FitText Component
 * Tự co chữ để vừa khung, kiểm soát cả chiều rộng lẫn chiều cao:
 * - Một dòng ngắn vừa khung → giữ nguyên maxVh (chữ to)
 * - Một dòng dài quá rộng  → thu nhỏ font theo chiều rộng
 * - Nhiều dòng (qua \n) quá cao → thu nhỏ font theo chiều cao
 * Không bao giờ nhỏ hơn minVh.
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

  const hasCustomWhitespace = innerClassName.includes('whitespace-');

  const fit = useCallback((): void => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const vh = window.innerHeight / 100;
    const maxPx = maxVh * vh;
    const minPx = minVh * vh;

    // Đo ở cỡ tối đa
    text.style.fontSize = `${maxPx}px`;

    let scale = 1;

    // Constraint chiều rộng: dòng dài nhất phải nằm gọn trong khung
    const availableW = container.clientWidth;
    const neededW = text.scrollWidth;
    if (neededW > availableW && neededW > 0 && availableW > 0) {
      scale = Math.min(scale, (availableW * 0.98) / neededW);
    }

    // Constraint chiều cao: tổng chiều cao không vượt maxHeightVh
    if (maxHeightVh) {
      const maxHPx = maxHeightVh * vh;
      const neededH = text.scrollHeight;
      if (neededH > maxHPx && neededH > 0) {
        scale = Math.min(scale, (maxHPx * 0.95) / neededH);
      }
    }

    const fontSize = Math.max(minPx, Math.floor(maxPx * scale));
    text.style.fontSize = `${fontSize}px`;
  }, [maxVh, minVh, maxHeightVh]);

  // Chạy sau mỗi lần render (nội dung đổi) và trước khi trình duyệt vẽ
  useLayoutEffect(fit);

  useEffect(() => {
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);

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
