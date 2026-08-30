import React, { Component } from 'react';

import EmptyState from '../ui/EmptyState';
import { RefereePresence, subscribeRefereePresence } from '../../services/adminService';
import { parseSlot, slotLabel } from '../../services/accessCodeService';
import { TournamentSummary } from '../../services/tournamentService';

interface OnlineBoardProps {
  /** De doi so giai ra ten giai — presence chi luu index */
  tournaments: TournamentSummary[];
}

interface OnlineBoardState {
  list: RefereePresence[];
}

interface Row {
  key: string;
  tournamentName: string;
  where: string;
  label: string;
  /** Ban ghi presence kieu cu: khong doc duoc slot nen khong biet mon */
  legacy: boolean;
}

/**
 * Nhung may giam dinh dang mo, gom theo giai.
 *
 * Day la thu duy nhat tra loi duoc cau "GD3 san B da vao chua" ma khong phai
 * chay xuong san hoi. Bang ma cua tung giai co den online roi, nhung no bat
 * mo tung giai mot — luc dang dieu hanh thi can mot cho nhin het.
 *
 * KHONG doc duoc `codeSession` cua nguoi khac (rules: `auth.uid === $uid`),
 * nen cot nay tra loi "o nao dang co nguoi", khong tra loi "nguoi do la ai".
 * Muon biet ai giu ma nao thi mo bang ma cua giai — o do co `claimedUid`.
 */
class OnlineBoard extends Component<OnlineBoardProps, OnlineBoardState> {
  unsub: (() => void) | null = null;
  state: OnlineBoardState = { list: [] };

  componentDidMount() {
    this.unsub = subscribeRefereePresence((list) => this.setState({ list }));
  }

  componentWillUnmount() {
    this.unsub?.();
  }

  rows(): Row[] {
    const nameOf = new Map(this.props.tournaments.map((t) => [t.id, t.name.replace(/\n/g, ' ')]));

    return this.state.list.map((p) => {
      const slot = parseSlot(p.slot);
      if (slot) {
        return {
          key: p.key,
          tournamentName: nameOf.get(slot.t) || 'Giải đã xoá',
          where: slotLabel(slot),
          label: p.label,
          legacy: false,
        };
      }
      // Ban ghi kieu cu `{arena}_{t}_{r}` — chi tach duoc khoa giai.
      // Chi con ban ghi TU TRUOC roi vao day (khong cho nao trong app ghi kieu
      // nay nua), ma hoi do khoa giai deu la so nen cat theo '_' van dung —
      // khoa `push` moi thi co chua '_' va se cat sai, nhung khong bao gio
      // xuat hien o nhanh nay.
      const parts = p.key.split('_');
      const t = parts[1] || '';
      return {
        key: p.key,
        tournamentName: nameOf.get(t) || 'Không rõ giải',
        where: p.label || p.key,
        label: p.label,
        legacy: true,
      };
    });
  }

  render() {
    const rows = this.rows();

    if (!rows.length) {
      return (
        <EmptyState
          icon="fa-solid fa-plug-circle-xmark"
          title="Chưa có máy giám định nào đang mở"
          hint="Bảng này cập nhật ngay khi có người vào — không phải tải lại trang."
          className="py-8"
        />
      );
    }

    const groups = new Map<string, Row[]>();
    for (const r of rows) groups.set(r.tournamentName, [...(groups.get(r.tournamentName) || []), r]);

    return (
      <div className="space-y-4">
        {[...groups.entries()].map(([name, list]) => (
          <div key={name}>
            <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {name} <span className="text-slate-400 normal-case">· {list.length} máy</span>
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {list.map((r) => (
                <div key={r.key} className="flex items-center gap-2.5 bg-white border border-slate-200
                  rounded-control px-3 py-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0
                    animate-pulse" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-slate-800 truncate">{r.where}</span>
                    {r.legacy && (
                      <span className="block text-[10px] text-slate-400">bản ghi kiểu cũ — không rõ môn</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
}

export default OnlineBoard;
