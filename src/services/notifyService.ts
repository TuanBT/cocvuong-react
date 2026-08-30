/**
 * Notify Service — don xin quyen dang cho, gop tu MOI giai minh lam chu.
 *
 * Vi sao phai co: bang duyet don nam trong trang Thiet dat, ma chu giai thi
 * hau het thoi gian dang o man giam sat hoac trang chu. Don ve luc do khong ai
 * thay, va nguoi xin quyen thi ngoi cho — dung luc sap vao tran. Cai chuong o
 * thanh tieu de la de don den DUNG cho nguoi duyet no dang nhin.
 *
 * Bao bang HINH, khong co tieng. Man giam sat da co tieng rieng cho luot thi
 * va cho hiep dau — them mot tieng nua thi giua giai khong ai biet tieng vua
 * roi nghia la gi. Cham do va con so tren chuong la du.
 *
 * Khong co server nen khong co push notification: khong mo app thi khong thay
 * don. Do la gioi han that, khong code vong qua duoc.
 */
import { AccessRequest, subscribeRequests } from './staffService';
import {
  TournamentId, TournamentSummary, subscribeOwnedTournaments,
} from './tournamentService';

export interface PendingRequest {
  tournamentId: TournamentId;
  tournamentName: string;
  request: AccessRequest;
}

/** Moi nhat len truoc — don vua ve la thu chu giai can nhin ngay */
function newestFirst(a: PendingRequest, b: PendingRequest): number {
  return (b.request.createdAt || 0) - (a.request.createdAt || 0);
}

/**
 * Moi don dang cho tren MOI giai cua `uid`, gom lam mot danh sach.
 *
 * Danh sach giai duoc nghe song (`subscribeOwnedTournaments`) chu khong doc
 * mot lan: tao giai moi giua phien la don cua no phai vao chuong ngay, khong
 * bat chu giai tai lai trang.
 *
 * Don da bi tu choi khong tinh — no nam lai trong DB chi de rules chan nguoi
 * kia nop lai, chu khong con viec gi cho chu giai lam.
 */
export function subscribePendingRequests(
  uid: string,
  cb: (list: PendingRequest[]) => void
): () => void {
  /** Don cua tung giai, giu rieng de mot giai doi thi khong phai dung lai ca lu */
  const byTournament = new Map<TournamentId, PendingRequest[]>();
  /** Huy dang ky theo tung giai — giai bi dong / doi chu thi go dung cai do */
  const perTournament = new Map<TournamentId, () => void>();
  let stopped = false;

  const emit = () => {
    if (stopped) return;
    const all: PendingRequest[] = [];
    for (const list of byTournament.values()) all.push(...list);
    cb(all.sort(newestFirst));
  };

  const watch = (t: TournamentSummary) => {
    if (perTournament.has(t.id)) return;
    perTournament.set(
      t.id,
      subscribeRequests(
        t.id,
        (requests) => {
          byTournament.set(
            t.id,
            requests
              .filter((r) => !r.rejectedAt)
              .map((request) => ({
                tournamentId: t.id,
                tournamentName: t.name,
                request,
              }))
          );
          emit();
        },
        () => {
          // Doc khong duoc (vua mat quyen chu giai) thi coi nhu khong co don —
          // im lang con hon mot cham do bao vi loi
          byTournament.set(t.id, []);
          emit();
        }
      )
    );
  };

  const unwatch = (id: TournamentId) => {
    perTournament.get(id)?.();
    perTournament.delete(id);
    byTournament.delete(id);
  };

  const stopIndex = subscribeOwnedTournaments(uid, (owned) => {
    if (stopped) return;
    const live = new Set(owned.map((t) => t.id));
    for (const id of [...perTournament.keys()]) {
      if (!live.has(id)) unwatch(id);
    }
    for (const t of owned) watch(t);
    emit();
  });

  return () => {
    stopped = true;
    stopIndex();
    for (const id of [...perTournament.keys()]) unwatch(id);
  };
}
