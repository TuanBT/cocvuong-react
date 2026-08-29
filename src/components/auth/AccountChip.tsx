import React, { useState } from 'react';
import { AppUser, signOut } from '../../services/authService';

/** Ten hien thi — phien an danh khong co ten that, dung goi ho la "Nguoi dung" */
function displayNameOf(user: AppUser): string {
  return user.isAnonymous ? 'Khách dùng thử' : user.name;
}

interface AvatarProps {
  user: AppUser;
  className?: string;
}

/** Anh dai dien, hoac chu cai dau khi tai khoan khong co anh */
export const AccountAvatar: React.FC<AvatarProps> = ({ user, className = 'w-7 h-7' }) => {
  const initial = (displayNameOf(user) || '?').trim().charAt(0).toUpperCase();
  return user.photo ? (
    <img src={user.photo} alt="" className={`${className} rounded-full object-cover`} />
  ) : (
    <span className={`${className} rounded-full bg-accent-600 text-white text-xs font-bold
      flex items-center justify-center`}>{initial}</span>
  );
};

interface IdentityRowProps {
  user: AppUser;
  /** Chu nho duoi ten, vi du "Sân A · Đối kháng" */
  subtitle?: string;
}

/**
 * Dong "ai dang truc" — dung o dau menu tai khoan lan trong cuc banh rang cua
 * man giam sat.
 *
 * May giam sat thuong la laptop dung chung. Khong hien ten ai dang dang nhap
 * thi nguoi ngoi sau se cham diem bang quyen cua nguoi ngoi truoc — va bang
 * "Dang truc" sau giai se ghi nham nguoi khi co khieu nai diem.
 */
export const AccountIdentityRow: React.FC<IdentityRowProps> = ({ user, subtitle }) => (
  <div className="flex items-center gap-2.5 p-3 border-b border-slate-100">
    <AccountAvatar user={user} className="w-8 h-8 flex-shrink-0" />
    <div className="min-w-0">
      <p className="m-0 text-sm font-semibold text-slate-800 truncate">{displayNameOf(user)}</p>
      {user.email && <p className="m-0 text-xs text-slate-500 truncate">{user.email}</p>}
      {subtitle && <p className="m-0 mt-1 text-xs text-accent-700 font-medium">{subtitle}</p>}
    </div>
  </div>
);

/** Muc "Dang xuat" (hoac loi moi dang nhap voi phien an danh) trong mot menu */
export const AccountSignOutItem: React.FC<{ user: AppUser }> = ({ user }) =>
  user.isAnonymous ? (
    <a
      href="/login"
      className="block px-4 py-2.5 text-sm font-medium text-accent-700
        hover:bg-accent-50 transition-colors"
    >
      <i className="fa-brands fa-google mr-2 w-4" aria-hidden="true" />
      Đăng nhập bằng Google
    </a>
  ) : (
    <button
      type="button"
      onClick={() => signOut().then(() => window.location.reload())}
      className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600
        hover:bg-red-50 transition-colors flex items-center gap-2"
    >
      <i className="fa-solid fa-right-from-bracket w-4" aria-hidden="true" />
      Đăng xuất
    </button>
  );

interface AccountChipProps {
  user: AppUser;
  /** Chu nho duoi ten, vi du "Sân A · Đối kháng" */
  subtitle?: string;
  /** Nen toi (man hinh trinh chieu) hay nen sang (trang co cuon) */
  tone?: 'light' | 'dark';
  className?: string;
}

/**
 * Anh tai khoan dang truc, bam vao ra ten + nut Dang xuat.
 *
 * Co y **chi la cai anh**: no dung tren dong tieu de von da chat cho, canh ten
 * giai — them ca ten nguoi vao day la day tieu de xuong mot dong rieng chi de
 * khoe ai dang dang nhap. Ten day du nam trong menu, cach mot cai bam.
 */
const AccountChip: React.FC<AccountChipProps> = ({
  user,
  subtitle,
  tone = 'light',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const dark = tone === 'dark';

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Tài khoản"
        title={user.email || displayNameOf(user)}
        className={`flex items-center rounded-full p-0.5 transition-colors
          ${dark
            ? 'bg-white/10 hover:bg-white/25'
            : 'bg-white border border-slate-200 hover:border-slate-400 shadow-sm'}`}
      >
        <AccountAvatar user={user} className="w-7 h-7" />
      </button>

      {open && (
        <>
          {/* Bam ra ngoai de dong — khong dung onBlur vi nut Dang xuat ben
              trong se mat su kien click truoc khi kip chay */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} role="presentation" />

          <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white rounded-card
            shadow-pop border border-slate-200 overflow-hidden">
            <AccountIdentityRow user={user} subtitle={subtitle} />
            <p className="m-0 px-4 py-2 text-[11px] text-slate-400 leading-snug">
              {user.isAnonymous
                ? 'Đang chấm ở chế độ khách. Muốn dùng cho giải thật thì đăng nhập bằng Google.'
                : 'Máy dùng chung? Đăng xuất khi rời bàn để người sau không chấm bằng quyền của bạn.'}
            </p>
            <div className="border-t border-slate-100">
              <AccountSignOutItem user={user} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AccountChip;
