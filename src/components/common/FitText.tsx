import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

interface FitTextProps {
  children: React.ReactNode;
  /** Cỡ chữ tối đa, theo vh */
  maxVh: number;
  /** Cỡ chữ tối thiểu, theo vh */
  minVh?: number;
  /** Class cho khung ngoài (căn lề, flex...) */
  className?: string;
  /** Class cho phần chữ (màu, độ đậm...) */
  innerClassName?: string;
  /** Style cho phần chữ, dùng khi cần font riêng */
  innerStyle?: React.CSSProperties;
}

/**
 * FitText Component
 * Giữ nội dung luôn nằm gọn trên MỘT dòng: bắt đầu ở maxVh rồi tự thu nhỏ
 * theo tỉ lệ bề rộng còn thiếu, không bao giờ nhỏ hơn minVh.
 */
const FitText: React.FC<FitTextProps> = ({
  children,
  maxVh,
  minVh = 1.2,
  className = '',
  innerClassName = '',
  innerStyle
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const fit = useCallback((): void => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const maxPx = (maxVh * window.innerHeight) / 100;
    const minPx = (minVh * window.innerHeight) / 100;

    // Đo ở cỡ tối đa rồi suy ra cỡ vừa khung: bề rộng chữ tỉ lệ thuận với cỡ chữ
    text.style.fontSize = `${maxPx}px`;
    const available = container.clientWidth;
    const needed = text.scrollWidth;

    let fontSize = maxPx;
    if (needed > available && needed > 0 && available > 0) {
      fontSize = Math.max(minPx, Math.floor((maxPx * available * 0.98) / needed));
    }
    text.style.fontSize = `${fontSize}px`;
  }, [maxVh, minVh]);

  // Chạy sau mỗi lần render (nội dung đổi) và trước khi trình duyệt vẽ
  useLayoutEffect(fit);

  useEffect(() => {
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);

  return (
    <div ref={containerRef} className={`w-full min-w-0 overflow-visible ${className}`}>
      <span
        ref={textRef}
        className={`inline-block whitespace-nowrap ${innerClassName}`}
        style={innerStyle}
      >
        {children}
      </span>
    </div>
  );
};

export default FitText;
