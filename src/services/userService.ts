/**
 * User Service — ho so nguoi dung tai `users/{uid}`.
 *
 * Vi sao can: `appAdmin` khoa theo uid, ma uid la chuoi vo nghia. Khong co
 * bang nay thi trang quan tri khong biet uid nao ung voi ai, va nguoi cap
 * quyen phai mo Firebase Console mo tung dong.
 *
 * Chinh nguoi dung ghi dong cua ho luc dang nhap (rules: `auth.uid === $uid`),
 * admin doc ca nhanh. Khong co duong nao ghi ho so nguoi khac.
 */
import { ref, update, get, child } from 'firebase/database';
import { database } from '../firebase';

export interface UserProfile {
  email: string;
  name: string;
  photo: string;
  lastLoginAt: number;
}

/** Ghi/lam moi ho so. Loi o day khong duoc chan duong dang nhap. */
export async function saveUserProfile(user: {
  uid: string;
  email: string;
  name: string;
  photo: string;
}): Promise<void> {
  await update(ref(database, `users/${user.uid}`), {
    email: user.email,
    name: user.name,
    photo: user.photo,
    lastLoginAt: Date.now(),
  });
}

/** Doc mot ho so (admin, hoac chinh minh). */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await get(child(ref(database), `users/${uid}`));
  return snap.val();
}

/** Toan bo danh sach nguoi da tung dang nhap — chi admin doc duoc. */
export async function getAllUsers(): Promise<Record<string, UserProfile>> {
  const snap = await get(child(ref(database), 'users'));
  return snap.val() || {};
}
