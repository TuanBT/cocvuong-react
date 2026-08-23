import React from 'react';

interface ScoreKeyProps {
  /** Gia tri gui len khi bam; thi quyen dung ca dau '.' */
  value: number | string;
  onPress: (value: any) => void;
  /** Lop mau nen; mac dinh la phim so mau trang */
  className?: string;
  /** Co chu theo vw de phim luon lap day o tren moi kich thuoc man hinh */
  labelClassName?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}

/**
 * Mot phim tren ban cham diem.
 *
 * Tach rieng va boc React.memo vi day la thu duoc bam lien tuc trong suot tran:
 * moi lan trang cha nhan du lieu moi tu Firebase, cac phim nay khong ve lai.
 * Handler nhan `value` nen trang cha truyen thang mot ham on dinh, khong tao
 * arrow function moi o moi lan render.
 */
const ScoreKey: React.FC<ScoreKeyProps> = ({
  value,
  onPress,
  className = 'bg-white active:bg-accent-100',
  labelClassName = '',
  ariaLabel,
  children,
}) => (
  <button
    type="button"
    aria-label={ariaLabel}
    onClick={() => onPress(value)}
    style={{ minHeight: 0 }}
    className={`rounded-card shadow-sm flex items-center justify-center tap-target
      transition-transform duration-100 active:scale-[0.96] ${className}`}
  >
    <span className={labelClassName}>{children}</span>
  </button>
);

export default React.memo(ScoreKey);
