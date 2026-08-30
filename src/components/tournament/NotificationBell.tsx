import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { AppUser } from '../../services/authService';
import { arenaKeyLabel, assignedKeys } from '../../services/staffService';
import { PendingRequest, subscribePendingRequests } from '../../services/notifyService';

interface NotificationBellProps {
  user: AppUser;
  /** Nen toi (man hinh trinh chieu) hay nen sang (trang co cuon) */
  tone?: 'light' | 'dark';
  className?: string;
}

interface NotificationBellState {
  pending: PendingRequest[];
  open: boolean;
}

/** "3 phút trước" — chu giai can biet don cho lau chua, khong can biet may gio */
function ago(ts: number): string {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'vừa xong';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.round(h / 24)} ngày trước`;
}

/**
 * Chuong bao don xin quyen, dat canh anh tai khoan tren thanh tieu de.
 *
 * **Van de no giai.** Bang duyet don nam trong trang Thiet dat, ma chu giai
 * gan nhu khong bao gio ngoi o do: ho o man giam sat, hoac trang chu. Nguoi
 * xin quyen thi bam xong roi ngoi cho, thuong la ngay truoc gio thi dau. Cai
 * chuong nay mang don den dung cho nguoi duyet dang nhin, tren MOI trang co
 * thanh tieu de — va no gom don cua tat ca giai minh lam chu, khong phai chi
 * giai dang mo.
 *
 * **Chi hien khi co viec.** Khong lam chu giai nao, hoac khong don nao dang
 * cho, thi khong ve gi ca — mot cai chuong luon xam la mot cho trong tren
 * thanh tieu de von da chat.
 *
 * Bam vao mot don la sang thang trang Thiet dat cua dung giai do; viec duyet
 * (tick san, canh bao hai nguoi mot san) van chi lam o mot cho — xem
 * `StaffApprovalPanel`.
 */
class NotificationBell extends Component<NotificationBellProps, NotificationBellState> {
  unsub: (() => void) | null = null;

  state: NotificationBellState = { pending: [], open: false };

  componentDidMount() {
    this.subscribe();
  }

  componentDidUpdate(prev: NotificationBellProps) {
    if (prev.user.uid !== this.props.user.uid) this.subscribe();
  }

  componentWillUnmount() {
    this.unsub?.();
    this.unsub = null;
  }

  subscribe() {
    this.unsub?.();
    this.unsub = subscribePendingRequests(this.props.user.uid, (pending) => {
      // Don cuoi cung duoc duyet xong thi dong hop luon, dung de mot cai hop
      // rong mo tren man hinh
      this.setState((prev) => ({ pending, open: prev.open && pending.length > 0 }));
    });
  }

  render() {
    const { tone = 'light', className = '' } = this.props;
    const { pending, open } = this.state;

    if (!pending.length) return null;

    const dark = tone === 'dark';

    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => this.setState((p) => ({ open: !p.open }))}
          aria-expanded={open}
          aria-label={`${pending.length} đơn xin quyền đang chờ duyệt`}
          title={`${pending.length} đơn đang chờ bạn duyệt`}
          className={`relative flex items-center justify-center w-9 h-9 rounded-full
            transition-colors
            ${dark
              ? 'bg-white/10 hover:bg-white/25 text-white'
              : 'bg-white border border-slate-200 hover:border-slate-400 shadow-sm text-slate-600'}`}
        >
          {/* motion-safe: may nao dat "giam chuyen dong" thi chuong dung yen,
              cham do va con so van bao du */}
          <i className="fa-solid fa-bell text-base motion-safe:animate-bell" aria-hidden="true" />
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full
            bg-red-600 text-white text-[11px] font-bold leading-[18px] text-center
            ring-2 ring-white">
            {pending.length > 9 ? '9+' : pending.length}
          </span>
        </button>

        {open && (
          <>
            {/* Bam ra ngoai de dong — khong dung onBlur vi cac link ben trong
                se mat su kien click truoc khi kip chay */}
            <div className="fixed inset-0 z-40" onClick={() => this.setState({ open: false })}
              role="presentation" />

            <div className="absolute right-0 top-full mt-2 z-50 w-[22rem] max-w-[calc(100vw-1.5rem)]
              bg-white rounded-card shadow-pop border border-slate-200 overflow-hidden">
              <p className="m-0 px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase
                tracking-wide border-b border-slate-100">
                {pending.length} đơn đang chờ duyệt
              </p>

              <div className="max-h-80 overflow-y-auto">
                {pending.map(({ tournamentId, tournamentName, request }) => {
                  const wants = assignedKeys(request.want);
                  return (
                    <Link
                      key={`${tournamentId}/${request.uid}`}
                      to={`/thiet-dat?giai=${encodeURIComponent(tournamentId)}`}
                      onClick={() => this.setState({ open: false })}
                      className="flex gap-2.5 px-4 py-3 border-b border-slate-100 last:border-b-0
                        hover:bg-slate-50 transition-colors no-underline"
                    >
                      {request.photo ? (
                        <img src={request.photo} alt="" className="w-8 h-8 rounded-full
                          object-cover flex-shrink-0 mt-0.5" />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-accent-600 text-white text-xs
                          font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {(request.name || '?').trim().charAt(0).toUpperCase()}
                        </span>
                      )}

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800 truncate">
                          {request.name || request.email}
                        </span>
                        <span className="block text-xs text-slate-500 truncate">
                          xin trực {wants.length ? wants.map(arenaKeyLabel).join(' · ') : 'chưa chọn sân'}
                        </span>
                        <span className="block text-xs text-accent-700 font-medium truncate mt-0.5
                          whitespace-pre-line">
                          {tournamentName.replace(/\n/g, ' ')}
                        </span>
                        {request.note && (
                          <span className="block text-xs text-slate-400 italic truncate mt-0.5">
                            “{request.note}”
                          </span>
                        )}
                      </span>

                      <span className="text-[11px] text-slate-400 flex-shrink-0 mt-0.5">
                        {ago(request.createdAt)}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <p className="m-0 px-4 py-2 text-[11px] text-slate-400 leading-snug border-t
                border-slate-100">
                Bấm một đơn để mở Thiết đặt của giải đó rồi duyệt.
                App không gửi được thông báo đẩy — đóng app là không thấy đơn mới nữa.
              </p>
            </div>
          </>
        )}
      </div>
    );
  }
}

export default NotificationBell;
