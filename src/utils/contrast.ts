/**
 * Contrast utilities
 *
 * Man hinh giam sat chieu qua may chieu: cac dai sang bi ep lai nen chu trang
 * tren nen vang/bac/cam gan nhu bien mat. Cac ham duoi tinh do sang thuc te cua
 * nen roi chon mau chu tuong ung, thay vi hardcode text-white.
 */

// Chuyen mot kenh mau sRGB (0-255) sang gia tri tuyen tinh
function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Do sang tuong doi (WCAG relative luminance) cua mot mau hex, tra ve 0..1.
 * Tra ve 0 neu chuoi khong phai hex 6 ky tu.
 */
export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return 0;
  return 0.2126 * linearize(parseInt(h.slice(0, 2), 16))
    + 0.7152 * linearize(parseInt(h.slice(2, 4), 16))
    + 0.0722 * linearize(parseInt(h.slice(4, 6), 16));
}

// Nguong chon chu den/trang. 0.28 la diem cat de mau cam (#e67e22) va
// xanh la sang (#2ecc71) roi ve phia chu den - noi chung chu trang khong dat.
const DARK_TEXT_THRESHOLD = 0.28;

/** Chu den (slate-900) hay chu trang doc ro hon tren nen `bg` */
export function getReadableTextColor(bg: string, dark = '#0f172a', light = '#ffffff'): string {
  return relativeLuminance(bg) > DARK_TEXT_THRESHOLD ? dark : light;
}
