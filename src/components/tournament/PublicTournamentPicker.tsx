import React, { useMemo, useState } from 'react';
import EmptyState from '../ui/EmptyState';
import Pagination from '../ui/Pagination';
import { paginate } from '../../utils/pagination';
import { TournamentSummary } from '../../services/tournamentService';
import type { TournamentId } from '../../types';

interface PublicTournamentPickerProps {
  tournaments: TournamentSummary[];
  loading: boolean;
  onSelect: (id: TournamentId) => void;
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
 * Danh sach di theo trang chu khong do het ra: giai moi nhat dung dau nen thu
 * nguoi ta tim gan nhu luon o trang dau, con muon giai cu thi go vao o tim.
 * Bay giai thi khong thay thanh trang nao ca — no chi hien khi that su dai.
 */
const PAGE_SIZE = 12;

const PublicTournamentPicker: React.FC<PublicTournamentPickerProps> = ({
  tournaments, loading, onSelect, what,
}) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tournaments;
    return tournaments.filter((t) => t.name.toLowerCase().includes(q));
  }, [tournaments, query]);

  const paged = paginate(matched, page, PAGE_SIZE);

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

        {tournaments.length > PAGE_SIZE && (
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2
              text-slate-400 text-sm" aria-hidden="true" />
            <input
              type="search"
              value={query}
              // Go them chu ma van dung o trang 5 thi ket qua dau tien bi giau
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
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
          {paged.items.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
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

      <Pagination
        page={paged.page}
        pageCount={paged.pageCount}
        from={paged.from}
        to={paged.to}
        total={paged.total}
        onPage={setPage}
        unit="giải"
      />
    </section>
  );
};

export default React.memo(PublicTournamentPicker);
