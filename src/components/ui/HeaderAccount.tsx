import React from 'react';
import AccountChip from '../auth/AccountChip';
import NotificationBell from '../tournament/NotificationBell';
import { AppUser } from '../../services/authService';

interface HeaderAccountProps {
  user: AppUser;
  /** Chu nho duoi ten trong menu tai khoan, vi du "Sân A · Đối kháng" */
  subtitle?: string;
  /** Nen toi (man hinh trinh chieu) hay nen sang (trang co cuon) */
  tone?: 'light' | 'dark';
}

/**
 * Goc phai cua moi thanh tieu de: **chuong · anh tai khoan**.
 *
 * Mot component chu khong phai hai cai roi nhet canh nhau o tung trang: don
 * xin quyen la thu khong duoc phep co trang nao "quen" hien. Chuong tu an khi
 * khong co don nao cho, nen o day khong ton cho gi khi rong.
 *
 * Dung chung cho ca `PageHeader` (qua prop `action`) lan `AppTopBar`.
 */
const HeaderAccount: React.FC<HeaderAccountProps> = ({ user, subtitle, tone = 'light' }) => (
  <div className="flex items-center gap-2">
    <NotificationBell user={user} tone={tone} />
    <AccountChip user={user} subtitle={subtitle} tone={tone} />
  </div>
);

export default HeaderAccount;
