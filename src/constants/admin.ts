/**
 * Tai khoan admin duoc ghi CUNG trong code.
 *
 * Chuoi nay phai khop TUNG KY TU voi mệnh đề `auth.token.email` trong
 * `database.rules.json` (nhanh `appAdmin`). Doi o day ma quen doi ben kia thi
 * app cu ghi con rules cu tu choi — va loi hien ra la "khong doc duoc du lieu
 * quan tri", khong phai mot loi noi ro nguyen nhan.
 *
 * Vi sao mot chuoi chu khong phai mot mang: rules cua Realtime Database khong
 * co bien, moi email them vao la mot ve `||` phai chep tay sang ben kia. Mot
 * nguoi thi con doi chieu duoc bang mat; nhieu nguoi thi cap qua `appAdmin`
 * trong Firebase Console — duong do van con nguyen.
 */
export const BOOTSTRAP_ADMIN_EMAIL = 'bttvn.4t@gmail.com';
