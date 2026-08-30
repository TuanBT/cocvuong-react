import React, { Component } from 'react';
import { toast } from 'react-toastify';

import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { AdminOverview, AuditFinding, AuditLevel, auditTournaments } from '../../services/adminService';
import { rebuildTournamentIndex } from '../../services/tournamentService';
import type { TournamentId } from '../../types';

interface AuditPanelProps {
  overview: AdminOverview | null;
  /** Bam vao mot dong canh bao thi nhay thang sang giai do o tab Giai dau */
  onOpenTournament: (id: TournamentId) => void;
  /** Dung lai chi muc xong thi doc lai ca trang — so lieu deu doc tu chi muc */
  onReloaded: () => void;
}

/**
 * Gom theo cai gi.
 *
 * Danh sach phang doc duoc khi co ba bon dong. Sang muoi giai thi mot nguoi
 * truc bon giai rai ra bon cho khac nhau, va mot giai hong ba thu cung nam
 * xen ke giai khac — khong soat noi. Hai cach gom nay tra loi dung hai cau
 * admin thuc su hoi: "giai nay con vuong gi" va "nguoi nay dang vuong gi".
 */
type GroupBy = 'tournament' | 'person';

interface AuditPanelState {
  findings: AuditFinding[];
  running: boolean;
  ranAt: number | null;
  error: string;
  /** Dang dung lai `tournamentIndex` */
  rebuilding: boolean;
  groupBy: GroupBy;
}

/** Dong khong nhac ten ai — van phai hien o cach gom theo nguoi, khong duoc nuot */
const NO_ONE = '\u0000khong-ai';

const LOOK: Record<AuditLevel, { icon: string; label: string; box: string; chip: string }> = {
  error: {
    icon: 'fa-solid fa-circle-exclamation',
    label: 'Hỏng',
    box: 'border-red-200 bg-red-50',
    chip: 'bg-red-600 text-white',
  },
  warn: {
    icon: 'fa-solid fa-triangle-exclamation',
    label: 'Cần xem',
    box: 'border-amber-200 bg-amber-50',
    chip: 'bg-amber-500 text-white',
  },
  info: {
    icon: 'fa-solid fa-circle-info',
    label: 'Ghi chú',
    box: 'border-slate-200 bg-slate-50',
    chip: 'bg-slate-500 text-white',
  },
};

/**
 * Ra soat toan he thong — cai thay cho viec mo Firebase Console ra doi chieu tay.
 *
 * Chi liet ke **thu se lam hong mot viec cu the giua giai**, va moi dong deu
 * kem viec can lam. Bang thong ke thi da nam o tab Giai dau roi; nhet them so
 * lieu vao day chi lam nguoi ta ngung doc.
 *
 * Khong tu chay khi mo tab: ham nay doc them vai luot moi giai, ma phan lon
 * lan vao trang quan tri la de lam mot viec khac.
 */
class AuditPanel extends Component<AuditPanelProps, AuditPanelState> {
  state: AuditPanelState = {
    findings: [], running: false, ranAt: null, error: '', rebuilding: false,
    groupBy: 'tournament',
  };

  /** Muc nang nhat trong mot nhom — quyet dinh mau va thu tu cua ca nhom */
  static worst(list: AuditFinding[]): AuditLevel {
    if (list.some((f) => f.level === 'error')) return 'error';
    if (list.some((f) => f.level === 'warn')) return 'warn';
    return 'info';
  }

  run = async () => {
    const { overview } = this.props;
    if (!overview) return;

    this.setState({ running: true, error: '' });
    try {
      const findings = await auditTournaments(overview);
      this.setState({ findings, ranAt: Date.now(), running: false });
    } catch {
      this.setState({ running: false, error: 'Rà soát không xong — thử lại giúp.' });
    }
  };

  /**
   * @param showTournament Hien nut nhay sang giai. Tat khi dang gom theo giai —
   *   ten giai da nam o tieu de nhom, lap lai o tung dong chi lam nhieu mat.
   */
  renderFinding(f: AuditFinding, i: number, showTournament: boolean) {
    const look = LOOK[f.level];
    return (
      <div key={`${f.id}-${i}`} className={`border rounded-card p-3.5 ${look.box}`}>
        <div className="flex items-start gap-2.5">
          <i className={`${look.icon} mt-0.5 flex-shrink-0 ${
            f.level === 'error' ? 'text-red-600' : f.level === 'warn' ? 'text-amber-600' : 'text-slate-400'
          }`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="m-0 font-semibold text-slate-800 text-sm">{f.title}</p>
            <p className="m-0 mt-1 text-sm text-slate-600 leading-relaxed">{f.detail}</p>
            {f.fix && (
              <p className="m-0 mt-1.5 text-xs text-slate-500">
                <i className="fa-solid fa-wrench mr-1.5" aria-hidden="true" />
                {f.fix}
              </p>
            )}
            {showTournament && (
              <button
                type="button"
                onClick={() => this.props.onOpenTournament(f.id)}
                className="mt-2 text-xs font-medium text-accent-700 hover:underline"
              >
                {f.name.replace(/\n/g, ' ')}
                <i className="fa-solid fa-arrow-right ml-1.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /**
   * Dung lai `tournamentIndex` tu nguon su that.
   *
   * Danh sach giai o khap noi trong app doc tu chi muc — mot ban sao nhe cua
   * `tournament/{t}/setting`, vi doc ca cay that la vai MB moi lan. Chi muc
   * duoc va o duong GHI (moi cho doi `setting` deu goi `syncTournamentIndex`),
   * nhung mot luot ghi hong giua chung, hay mot giai tao boi ban app cu, van
   * lam thieu mot dong — va giai do bien mat khoi moi danh sach.
   *
   * Hoi `tournament` con la mang so lien mach thi app tu bat duoc chuyen do
   * (chi muc co lo la biet ngay). Doi sang khoa mo thi mot lo hong la chuyen
   * BINH THUONG — chinh la de xoa duoc giai o giua — nen khong con phep kiem
   * nao ca. Nut nay la thu thay cho no.
   */
  rebuild = async () => {
    this.setState({ rebuilding: true, error: '' });
    try {
      const n = await rebuildTournamentIndex();
      this.setState({ rebuilding: false });
      toast.success(`Đã dựng lại chỉ mục — ${n} giải.`);
      this.props.onReloaded();
    } catch {
      this.setState({ rebuilding: false, error: 'Không dựng lại được chỉ mục.' });
    }
  };

  /**
   * Khung mot nhom: vien mau theo muc nang nhat, tieu de, va cac dong ben trong.
   */
  renderGroup(
    key: string,
    heading: React.ReactNode,
    list: AuditFinding[],
    showTournament: boolean
  ) {
    const worst = AuditPanel.worst(list);
    const counts = (['error', 'warn', 'info'] as AuditLevel[])
      .map((lv) => [lv, list.filter((f) => f.level === lv).length] as const)
      .filter(([, n]) => n > 0);

    return (
      <section key={key} className={`border rounded-card overflow-hidden ${LOOK[worst].box}`}>
        <header className="px-3.5 py-2.5 bg-white/70 border-b border-slate-200/70
          flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-800 text-sm min-w-0 flex-1">{heading}</span>
          {counts.map(([lv, n]) => (
            <span key={lv}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${LOOK[lv].chip}`}>
              {n} {LOOK[lv].label.toLowerCase()}
            </span>
          ))}
        </header>
        <div className="p-2.5 space-y-2.5">
          {list.map((f, i) => this.renderFinding(f, i, showTournament))}
        </div>
      </section>
    );
  }

  /** Gom theo giai — tra loi "giai nay con vuong gi truoc gio thi" */
  renderByTournament(findings: AuditFinding[]) {
    const groups = new Map<string, AuditFinding[]>();
    for (const f of findings) groups.set(f.id, [...(groups.get(f.id) || []), f]);

    const rank: Record<AuditLevel, number> = { error: 0, warn: 1, info: 2 };
    const ordered = [...groups.entries()].sort(([, a], [, b]) =>
      rank[AuditPanel.worst(a)] - rank[AuditPanel.worst(b)]
      || a[0].name.localeCompare(b[0].name, 'vi'));

    return ordered.map(([id, list]) =>
      this.renderGroup(
        id,
        <button type="button" onClick={() => this.props.onOpenTournament(id)}
          className="text-left hover:underline whitespace-pre-line">
          {list[0].name.replace(/\n/g, ' ')}
          <i className="fa-solid fa-arrow-right ml-1.5 text-accent-700" aria-hidden="true" />
        </button>,
        list,
        false
      )
    );
  }

  /**
   * Gom theo nguoi — tra loi "nguoi nay dang vuong gi", ke ca khi ho vuong o
   * bon giai khac nhau.
   *
   * Mot dong nhac hai nguoi thi hien o CA HAI — day la bang de soat, khong
   * phai bang de dem, nen tha lap con hon de mot nguoi bi bo sot.
   */
  renderByPerson(findings: AuditFinding[]) {
    const groups = new Map<string, { name: string; list: AuditFinding[] }>();
    const push = (uid: string, name: string, f: AuditFinding) => {
      const g = groups.get(uid) || { name, list: [] };
      g.list.push(f);
      groups.set(uid, g);
    };

    for (const f of findings) {
      if (f.people?.length) for (const p of f.people) push(p.uid, p.name, f);
      else push(NO_ONE, '', f);
    }

    const rank: Record<AuditLevel, number> = { error: 0, warn: 1, info: 2 };
    const ordered = [...groups.entries()].sort(([ka, a], [kb, b]) =>
      // Khoi "khong quy vao ai" luon xuong cuoi: no la viec cua giai, khong
      // phai viec cua nguoi, ma tab nay dang hoi ve nguoi
      (ka === NO_ONE ? 1 : 0) - (kb === NO_ONE ? 1 : 0)
      || rank[AuditPanel.worst(a.list)] - rank[AuditPanel.worst(b.list)]
      || a.name.localeCompare(b.name, 'vi'));

    return ordered.map(([uid, g]) =>
      this.renderGroup(
        uid,
        uid === NO_ONE ? (
          <span className="text-slate-500">
            <i className="fa-solid fa-trophy mr-1.5 text-slate-400" aria-hidden="true" />
            Không quy vào ai — việc của giải
          </span>
        ) : (
          <>
            <i className="fa-solid fa-user mr-1.5 text-slate-400" aria-hidden="true" />
            {g.name}
          </>
        ),
        g.list,
        true
      )
    );
  }

  render() {
    const { overview } = this.props;
    const { findings, running, ranAt, error, rebuilding, groupBy } = this.state;

    const counts = {
      error: findings.filter((f) => f.level === 'error').length,
      warn: findings.filter((f) => f.level === 'warn').length,
      info: findings.filter((f) => f.level === 'info').length,
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            icon={running ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-stethoscope'}
            disabled={running || !overview}
            onClick={this.run}
          >
            {running ? 'Đang rà soát…' : ranAt ? 'Rà soát lại' : 'Rà soát toàn hệ thống'}
          </Button>

          <Button
            variant="secondary"
            icon={rebuilding ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-list-check'}
            disabled={rebuilding}
            onClick={this.rebuild}
            title="Đọc lại cả cây giải và ghi lại danh sách. Dùng khi có giải không hiện ra."
          >
            {rebuilding ? 'Đang dựng…' : 'Dựng lại chỉ mục'}
          </Button>

          {ranAt && !running && (
            <>
              {(['error', 'warn', 'info'] as AuditLevel[]).map((lv) =>
                counts[lv] > 0 ? (
                  <span key={lv}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${LOOK[lv].chip}`}>
                    {counts[lv]} {LOOK[lv].label.toLowerCase()}
                  </span>
                ) : null
              )}
              <span className="text-xs text-slate-400">
                lúc {new Date(ranAt).toLocaleTimeString('vi-VN')}
              </span>
            </>
          )}
        </div>

        {ranAt && !running && findings.length > 0 && (
          <div className="flex items-center gap-1 bg-slate-100 rounded-control p-1 w-fit">
            {([
              ['tournament', 'Theo giải', 'fa-solid fa-trophy'],
              ['person', 'Theo người', 'fa-solid fa-user-group'],
            ] as [GroupBy, string, string][]).map(([g, label, icon]) => (
              <button
                key={g}
                type="button"
                onClick={() => this.setState({ groupBy: g })}
                className={`text-xs font-semibold px-3 py-1.5 rounded-control transition-colors
                  ${groupBy === g
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'}`}
              >
                <i className={`${icon} mr-1.5`} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="m-0 text-sm text-red-700 bg-red-50 border border-red-200
            rounded-control px-3 py-2.5">
            {error}
          </p>
        )}

        {!ranAt && !running && (
          <p className="m-0 text-sm text-slate-500 bg-slate-50 border border-slate-200
            rounded-control px-3 py-2.5 leading-relaxed">
            Rà soát đọc thêm bảng mã và trận đầu tiên của từng giải, nên phải bấm mới chạy.
            Nó tìm những thứ sẽ làm hỏng một việc cụ thể giữa giải: giải đang mở mà chưa cấp mã,
            giải đã đóng mà mã vẫn sống, hai giám sát cùng một sân, giải chưa có chủ…
          </p>
        )}

        {ranAt && !running && findings.length === 0 && (
          <EmptyState
            icon="fa-solid fa-circle-check"
            title="Không tìm thấy gì bất thường"
            hint="Mọi giải đều có chủ, mã khớp trạng thái, và không sân nào có hai giám sát."
          />
        )}

        {findings.length > 0 && (
          <div className="space-y-3">
            {groupBy === 'tournament'
              ? this.renderByTournament(findings)
              : this.renderByPerson(findings)}
          </div>
        )}
      </div>
    );
  }
}

export default AuditPanel;
