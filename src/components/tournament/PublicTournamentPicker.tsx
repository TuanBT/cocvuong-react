import React, { useMemo, useState } from 'react';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';
import { TournamentSummary } from '../../services/tournamentService';

interface PublicTournamentPickerProps {
  tournaments: TournamentSummary[];
  loading: boolean;
  onSelect: (index: number) => void;
  /** "trận đấu" / "bảng điểm" — chỉ để viết câu hướng dẫn cho đúng trang */
  what: string;
}

/**
 * Man chon giai cua hai trang thong tin cong khai.
 *
 * Bay gio moi la cho **vao trang la thay ngay**: truoc day trang tu mo giai o
 * o so 0 va tai san du lieu cua no, ai vao cung phai cho mot giai minh khong
 * xem. Danh sach nay chi la ten giai — do lieu that chi tai khi bam vao mot
 * cai cu the.
 *
 * Chi hien vai giai gan nhat: mua giai nao cung chi co mot hai giai dang chay,
 * con lai la tra cuu — de tra cuu thi co o tim.
 */
const INITIAL_COUNT = 8;

const PublicTournamentPicker: React.FC<PublicTournamentPickerProps> = ({
  tournaments, loading, onSelect, what,
}) => {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tournaments;
    return tournaments.filter((t) => t.name.toLowerCase().includes(q));
  }, [tournaments, query]);

  // Tim thi hien het ket qua — go xong ma van phai bam "Xem them" la vo ly
  const shown = expanded || query.trim() ? matched : matched.slice(0, INITIAL_COUNT);
  const hidden = matched.length - shown.length;

  if (loading) {
    return (
      <p className="text-center text-slate-400 italic py-12 m-0">Đang đọc danh sách giải…</p>
    );
  }

  if (!tournaments.length) {
    return (
      <EmptyState
        icon="fa-solid fa-trophy"
        title="Chưa có giải nào"
        hint="Giải sẽ hiện ở đây ngay khi ban tổ chức tạo xong."
      />
    );
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
        <div>
          <h2 className="text-base font-bold text-slate-700 m-0">Chọn giải</h2>
          <p className="m-0 mt-0.5 text-sm text-slate-500">
            Bấm vào tên giải để xem {what}.
          </p>
        </div>

        {tournaments.length > INITIAL_COUNT && (
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2
              text-slate-400 text-sm" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên giải…"
              aria-label="Tìm theo tên giải"
              className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm border-2 border-slate-200
                rounded-control focus:border-accent-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {!matched.length ? (
        <EmptyState
          icon="fa-solid fa-magnifying-glass"
          title="Không có giải nào khớp"
          hint="Thử bớt chữ trong ô tìm."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {shown.map((t) => (
            <button
              key={t.index}
              type="button"
              onClick={() => onSelect(t.index)}
              className="text-left bg-white border-2 border-slate-200 rounded-card p-3.5
                hover:border-accent-400 hover:shadow-card transition-all"
            >
              <span className="flex items-start gap-2.5">
                <span className="w-9 h-9 bg-accent-50 border border-accent-200 rounded-control
                  flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-trophy text-accent-600 text-sm" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-800 whitespace-pre-line leading-snug">
                    {t.name}
                  </span>
                  <span className="block mt-1 text-xs text-slate-400">
                    {t.status === 'closed' ? 'Đã kết thúc' : 'Đang diễn ra'}
                    {t.createdAt ? ` · ${new Date(t.createdAt).toLocaleDateString('vi-VN')}` : ''}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {hidden > 0 && (
        <div className="mt-3 text-center">
          <Button variant="secondary" icon="fa-solid fa-chevron-down"
            onClick={() => setExpanded(true)}>
            Xem thêm {hidden} giải cũ
          </Button>
        </div>
      )}
    </section>
  );
};

export default React.memo(PublicTournamentPicker);
