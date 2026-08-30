import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/img/logo.png';
import Button from '../ui/Button';
import { signInWithGoogle, describeAuthError, AppUser } from '../../services/authService';

interface GoogleSignInCardProps {
  /** Dong tieu de, vi du "Tao giai" */
  title?: string;
  /** Cau giai thich vi sao trang nay can dang nhap */
  reason?: string;
  onSignedIn?: (user: AppUser) => void;
}

/**
 * Man hinh "Dang nhap bang Google" — mot nut to, khong o nhap nao.
 *
 * Co tinh khong co form email/mat khau: bo ca duong mat khau di la bo luon
 * ca kho mat khau chung dang nam cong khai trong `commonSetting`.
 *
 * Duong dan cua giam dinh duoc chi ro ngay o day, vi nham trang la loi hay
 * gap nhat: giam dinh bam vao menu giam sat roi dung truoc man dang nhap.
 */
const GoogleSignInCard: React.FC<GoogleSignInCardProps> = ({
  title = 'Đăng nhập',
  reason = 'Trang này dành cho ban tổ chức và giám sát.',
  onSignedIn,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setBusy(true);
    setError('');
    try {
      const user = await signInWithGoogle();
      onSignedIn?.(user);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-accent="brand" className="min-h-screen flex items-center justify-center p-4 select-text
      bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link to="/" title="Về trang chủ"
            className="inline-flex bg-white p-3 rounded-card shadow-card mb-4
              hover:shadow-lg transition-shadow">
            <img src={logo} alt="Cóc Vương" className="h-12 w-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">{title}</h1>
          <p className="text-sm text-slate-500 m-0">{reason}</p>
        </div>

        <div className="bg-white rounded-card shadow-card border border-slate-100 p-5 space-y-4">
          <Button
            variant="primary"
            size="lg"
            block
            icon="fa-brands fa-google"
            onClick={handleSignIn}
            disabled={busy}
          >
            {busy ? 'Đang mở cửa sổ Google…' : 'Đăng nhập bằng Google'}
          </Button>

          {error && (
            <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200
              rounded-control px-3 py-2.5">
              <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
              {error}
            </div>
          )}

          <p className="text-xs text-slate-500 m-0 leading-relaxed">
            Không cần tạo tài khoản riêng — dùng luôn tài khoản Google sẵn có.
          </p>
        </div>

        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-card p-4">
          <p className="text-sm font-semibold text-amber-800 m-0 mb-1">
            <i className="fa-solid fa-user-check mr-1.5" aria-hidden="true" />
            Bạn là giám định?
          </p>
          <p className="text-xs text-amber-700 m-0 mb-3">
            Giám định không cần đăng nhập. Chỉ cần gõ 2 số của giải do giám sát đọc cho.
          </p>
          <Link
            to="/gd"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-control bg-amber-500
              text-white font-medium text-sm hover:bg-amber-600 transition-colors"
          >
            <i className="fa-solid fa-keyboard" aria-hidden="true" />
            Vào bằng số của giải
          </Link>
        </div>

        <p className="text-center mt-5 mb-0">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <i className="fa-solid fa-arrow-left mr-1.5" aria-hidden="true" />
            Về trang chủ
          </Link>
        </p>
      </div>
    </div>
  );
};

export default GoogleSignInCard;
