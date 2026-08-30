import React, { Component } from 'react';
import { database } from '../firebase';
import { ref, get, update, off, DatabaseReference, Database } from "firebase/database";
import { toast } from 'react-toastify';
import { NavLink } from "react-router-dom";

import {
  PageShell, PageHeader, SectionCard, Button, Toggle, NumberField,
  ConfirmModal, Toast, AppFooter,
} from '../components/ui';
import { AccountChip } from '../components/auth';
import CodeBoard from '../components/tournament/CodeBoard';
import StaffApprovalPanel from '../components/tournament/StaffApprovalPanel';

import { DEFAULT_SETTING } from '../constants/settings';
import { AppUser } from '../services/authService';
import {
  TournamentSummary, canPurge, closeTournament, demoFirst, isLegacy, listTournaments,
  openTournament, purgeTournament, reopenTournament, setOpenAccess, claimTournament,
  syncTournamentIndex,
} from '../services/tournamentService';
import type { TournamentId } from '../types';
import {
  CodeMeta, PREFIX_LENGTH, TournamentCodePlan,
  isPrefixFree, reissueTournamentCodes, resolveCodeMeta, spacedCode, syncTournamentCodes,
} from '../services/accessCodeService';
import { isAdmin } from '../services/adminService';

/**
 * `?giai=<khoa>` — duong tat tu trang quan tri: mo thang thiet dat cua giai do.
 *
 * Doc thang tu URL: trang nay duoc dung trong `render={() => ...}` cua router
 * nen khong co `location` truyen xuong.
 *
 * Khoa giai la CHUOI mo nen khong kiem duoc gi ngoai "co rong khong" — sai
 * khoa thi khong khop giai nao trong danh sach, va trang roi ve giai mac dinh.
 */
function requestedId(): TournamentId | null {
  return new URLSearchParams(window.location.search).get('giai') || null;
}

interface SettingContainerProps {
  user: AppUser;
}

interface SettingContainerState {
  tournaments: TournamentSummary[];
  selected: TournamentSummary | null;
  loading: boolean;
  tournamentName: string;
  timeRound: number;
  timeBreak: number;
  timeExtra: number;
  timeExtraBreak: number;
  /** Co quoc gia va so giam dinh la mot thiet dat chung cho ca hai noi dung */
  showCountryFlag: boolean;
  useFiveReferees: boolean;
  showCautionBoxCombat: boolean;
  prioritizeUnitNameCombat: boolean;
  /** Thiet dat tu luu, nen phai co cho bao cho chu giai biet da luu chua */
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  /** Hop thoai xac nhan cho cac hanh dong khong hoan tac duoc */
  confirm: { title: string; message: string; label?: string; action: () => void } | null;
  regenerating: boolean;
  /** 2 so cua giai dang chon (rong = giai cu, chua cap ma 4 so) */
  codeMeta: CodeMeta | null;
  /** O "Đổi số" dang mo hay khong, va 2 so dang go do */
  prefixOpen: boolean;
  prefixDraft: string;
  prefixState: 'idle' | 'checking' | 'free' | 'taken';
}

/**
 * Trang thiet dat — nay la ban dieu khien cua **chu giai**.
 *
 * Ba thay doi lon so voi ban cu:
 *  - Bo han modal mat khau. Mat khau chung nam cong khai o `commonSetting` nen
 *    ai mo DevTools cung lay duoc; dang nhap Google roi thi giu no lai chi de
 *    trang tri.
 *  - Chi thay **giai cua minh** (+ giai cu chua co chu, co nut nhan ve).
 *  - O "Mat khau" cu doi thanh **"Bang ma giam dinh"** — dung cho nguoi dung
 *    dang quen bam vao, khong phai hoc lai duong di moi.
 */
/**
 * Chi bao "da luu chua" — thay cho nut Luu cu. Khong co no thi thiet dat tu
 * luu thanh ra im lang, chu giai khong biet bam xong da an chua.
 */
const SaveState: React.FC<{ state: SettingContainerState['saveState'] }> = ({ state }) => {
  if (state === 'idle') return null;
  const look = {
    saving: { icon: 'fa-solid fa-arrows-rotate fa-spin', text: 'Đang lưu…', tone: 'text-white/70' },
    saved: { icon: 'fa-solid fa-check', text: 'Đã lưu', tone: 'text-white/80' },
    error: { icon: 'fa-solid fa-triangle-exclamation', text: 'Chưa lưu', tone: 'text-amber-200' },
  }[state];
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium flex-shrink-0 ${look.tone}`}>
      <i className={look.icon} aria-hidden="true" />
      {look.text}
    </span>
  );
};

/** Go chu thi doi go xong hang ghi, khong thi moi phim la mot luot ghi Firebase */
const SAVE_DEBOUNCE_MS = 700;

class SettingContainer extends Component<SettingContainerProps, SettingContainerState> {
  /**
   * Admin thay MOI giai chu khong chi giai cua minh.
   *
   * Rules da cho admin toan quyen tren `tournament/{t}` tu truoc; loc theo
   * `ownerUid` o day chi la loc hien thi, va no chan dung luc can nhat —
   * chu giai mat tai khoan giua giai thi khong ai vao sua thiet dat duoc.
   */
  isAdmin = false;
  firebaseListeners: DatabaseReference[] = [];
  db: Database;
  settingObj: any = null;
  settingConst: any;
  /** Hen gio cua luot ghi dang cho */
  saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Co thay doi chua ghi — o go so nam o day mai den luc roi o moi ghi */
  dirty = false;
  /** Giai ma luot ghi dang cho se ghi vao — doi giai giua chung phai ghi not truoc */
  pendingIndex: TournamentId = '';
  /** Doi ten giai thi chi muc cong khai phai chay theo */
  needIndexSync = false;
  /** Doi so giam dinh thi bo ma phai cap lai */
  needCodeSync = false;

  constructor(props: SettingContainerProps) {
    super(props);
    document.title = 'Thiết Đặt';

    this.state = {
      tournaments: [],
      selected: null,
      loading: true,
      tournamentName: '',
      timeRound: 120,
      timeBreak: 60,
      timeExtra: 60,
      timeExtraBreak: 30,
      showCountryFlag: false,
      useFiveReferees: false,
      showCautionBoxCombat: false,
      prioritizeUnitNameCombat: false,
      saveState: 'idle',
      confirm: null,
      regenerating: false,
      codeMeta: null,
      prefixOpen: false,
      prefixDraft: '',
      prefixState: 'idle',
    };

    this.db = database;
    this.settingConst = JSON.parse(JSON.stringify(DEFAULT_SETTING));
  }

  componentDidMount() {
    void this.loadTournaments();
  }

  componentWillUnmount() {
    if (this.dirty) void this.flushSave();
    this.firebaseListeners.forEach((listenerRef) => off(listenerRef));
    this.firebaseListeners = [];
  }

  get index(): TournamentId {
    return this.state.selected?.id ?? '';
  }

  /**
   * Chi hien giai cua minh va giai cu chua co chu.
   *
   * Giai da dong van hien o day (chu giai con phai tra cuu, mo lai) — chi bang
   * chon cua giam sat / giam dinh moi an giai da dong.
   */
  async loadTournaments() {
    const { user } = this.props;
    this.setState({ loading: true });
    try {
      this.isAdmin = await isAdmin(user.uid).catch(() => false);

      const all = await listTournaments();
      const mine = all.filter((t) => this.visible(t)).sort(demoFirst);
      this.setState({ tournaments: mine, loading: false });

      // `?giai=N` tu trang quan tri thang len truoc. Khong co thi: ban cham
      // nhanh dung dau bang, nhung con tro dat vao giai that cua minh — vao
      // trang nay phan lon la de chinh giai sap to chuc
      const wanted = requestedId();
      const first =
        (wanted === null ? undefined : mine.find((t) => t.id === wanted)) ||
        mine.find((t) => !t.demo) ||
        mine[0];
      if (first) this.selectTournament(first);
    } catch {
      this.setState({ loading: false });
      toast.error('Không đọc được danh sách giải.');
    }
  }

  /** Giai nay co hien trong bang chon khong */
  visible = (t: TournamentSummary): boolean =>
    this.isAdmin || t.ownerUid === this.props.user.uid || isLegacy(t);

  selectTournament = (t: TournamentSummary) => {
    // Ghi not thay doi cua giai cu TRUOC khi state doi sang giai moi, khong thi
    // thiet dat cua giai nay se de len giai kia
    if (this.dirty) void this.flushSave();
    this.setState({ selected: t, codeMeta: null, prefixOpen: false, prefixDraft: '', prefixState: 'idle' });
    this.loadSetting(t.id);
    void this.loadCodeMeta(t.id);
  };

  async loadCodeMeta(index: TournamentId) {
    try {
      const meta = await resolveCodeMeta(index);
      if (this.index === index) this.setState({ codeMeta: meta });
    } catch {
      /* doc khong duoc thi bang ma van hien, chi la khong doi kieu duoc */
    }
  }

  loadSetting(index: TournamentId) {
    get(ref(this.db, 'tournament/' + index + '/setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      if (!this.settingObj) return;
      // Cac o sap bi ghi de bang gia tri duoi DB, nen thay doi go dở (neu con)
      // khong con nghia gi de ghi len nua
      this.dirty = false;
      this.setState({
        timeRound: this.settingObj.combat.timeRound,
        timeBreak: this.settingObj.combat.timeBreak,
        timeExtra: this.settingObj.combat.timeExtra,
        timeExtraBreak: this.settingObj.combat.timeExtraBreak,
        tournamentName: this.settingObj.tournamentName,
        // Giai cu co the dang luu lech nhau giua combat/martial; gop lai thi
        // ben nao dang bat se thang, de khong tat mat thu chu giai da bat
        showCountryFlag: !!(this.settingObj.combat.isShowCountryFlag || this.settingObj.martial.isShowCountryFlag),
        useFiveReferees: !!(this.settingObj.combat.isShowFiveReferee || this.settingObj.martial.isShowFiveReferee),
        showCautionBoxCombat: this.settingObj.combat.isShowCautionBox,
        prioritizeUnitNameCombat: this.settingObj.combat.isPrioritizeUnitName || false,
        saveState: 'idle',
      });
    });
  }

  /** Doc lai dong tom tat sau khi doi trang thai / cong tac */
  async refreshSummary() {
    const all = await listTournaments();
    const mine = all.filter((t) => this.visible(t)).sort(demoFirst);
    const fresh = mine.find((t) => t.id === this.index) || null;
    this.setState({ tournaments: mine, selected: fresh });
  }

  // ==================== Trang thai giai ====================

  handleOpen = async () => {
    try {
      await openTournament(this.index);
      await this.refreshSummary();
      toast.success('Đã mở giải — từ giờ giải nhận được đơn xin quyền giám sát.');
    } catch {
      toast.error('Không mở được giải này.');
    }
  };

  confirmClose = () => this.askConfirm(
    'Đóng giải',
    'Giải sẽ biến mất khỏi bảng chọn của giám sát và giám định, và TOÀN BỘ mã giám định của giải bị thu hồi ngay lập tức. Thông tin giải vẫn tra cứu được ở trang công khai.',
    this.handleClose,
    'Đóng giải'
  );

  handleClose = async () => {
    try {
      const revoked = await closeTournament(this.index);
      await this.refreshSummary();
      toast.success(`Đã đóng giải và thu hồi ${revoked} mã giám định.`);
    } catch {
      toast.error('Không đóng được giải này.');
    }
  };

  handleReopen = async () => {
    try {
      await reopenTournament(this.index);
      await this.refreshSummary();
      toast.info('Đã mở lại giải. Mã giám định phải cấp lại — bấm “Cấp lại toàn bộ mã”.');
    } catch {
      toast.error('Không mở lại được giải này.');
    }
  };

  handleClaim = async () => {
    const { user } = this.props;
    try {
      await claimTournament(this.index, user);
      await this.refreshSummary();
      toast.success('Giải này giờ thuộc tài khoản của bạn.');
    } catch (err: any) {
      toast.error(err?.message || 'Không nhận được giải này.');
    }
  };

  /**
   * Giai nay xoa han duoc khong.
   *
   * Ban cham nhanh thi khong — no tu dung lai o lan vao sau nen mot nut xoa chi
   * la cai bay: bam nham la mat bo ma dang doc do cho giam dinh. Admin xoa duoc
   * moi giai (rules cho ghi), nguoi thuong chi giai cua minh va giai cu chua co
   * chu — dung dieu kien cua `canPurge`.
   */
  get canPurgeSelected(): boolean {
    const { selected } = this.state;
    if (!selected || selected.demo) return false;
    return this.isAdmin || canPurge(selected, this.props.user.uid);
  }

  confirmPurge = () => {
    const { selected } = this.state;
    if (!selected) return;
    this.askConfirm(
      'Xoá giải vĩnh viễn',
      `Giải "${selected.name.replace(/\n/g, ' ')}" cùng toàn bộ danh sách vận động viên, `
      + 'lịch thi đấu, điểm số, mã giám định và danh sách nhân sự sẽ bị xoá khỏi database. '
      + 'Không hoàn tác được — trong app không có bản sao lưu nào.',
      this.handlePurge,
      'Xoá vĩnh viễn'
    );
  };

  handlePurge = async () => {
    const { selected } = this.state;
    if (!selected) return;

    // Thay doi chua ghi thuoc ve giai sap bien mat — bo di, khong thi
    // `flushSave` sau do se dung lai mot manh `setting` cua giai da xoa
    this.dirty = false;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;

    try {
      await purgeTournament(selected.id);
      toast.success('Đã xoá giải vĩnh viễn.');
      this.setState({ selected: null, codeMeta: null });
      await this.loadTournaments();
    } catch {
      toast.error('Không xoá được giải này.');
    }
  };

  /**
   * Cong tac "Mo tu do". Mac dinh TAT cho moi giai — muon giam sat thi phai
   * xin duyet, khong co ngoai le mac dinh. Bat len la bo han buoc duyet nen
   * phai hoi lai mot lan.
   */
  handleToggleOpenAccess = () => {
    const { selected } = this.state;
    if (!selected) return;

    if (selected.openAccess) {
      void setOpenAccess(this.index, false).then(() => {
        this.refreshSummary();
        toast.success('Đã tắt — giám sát phải xin duyệt như bình thường.');
      });
      return;
    }

    this.askConfirm(
      'Bật “Mở tự do”?',
      'BẤT KỲ AI đăng nhập Google cũng chấm điểm được trên giải này, không cần bạn duyệt. Chỉ bật cho giải nội bộ hoặc buổi tập huấn.',
      async () => {
        await setOpenAccess(this.index, true);
        await this.refreshSummary();
        toast.warn('Giải đang MỞ TỰ DO — nhớ tắt lại sau buổi tập.');
      },
      'Tôi hiểu, vẫn bật'
    );
  };

  // ==================== Ma giam dinh ====================

  /** Bo ma cua giai nay gom nhung o nao — dung chung cho ca cap them lan cap lai */
  get codePlan(): TournamentCodePlan {
    return {
      combatReferees: this.state.useFiveReferees ? 5 : 3,
      martialReferees: this.state.useFiveReferees ? 5 : 3,
      useArenaB: this.settingObj?.combat?.isShowArenaB !== false,
      tournamentName: this.state.selected?.name || '',
    };
  }

  /**
   * Bo ma chay theo thiet dat vua luu — khong hoi, khong nut.
   *
   * Ma la `so cua giai + so san + so giam dinh`, nen bat 5 giam dinh la GD4 va
   * GD5 phai co ma ngay; ha ve 3 la hai ma do phai bien. Chu giai chi can nho
   * DUNG MOT so cua giai, khong phai nho them thao tac nao.
   *
   * Giai cu (chua co so cua giai) thi `syncTournamentCodes` bo qua — don sang
   * kieu moi la moi ma dang cam chet ngay, phai bam "Đặt số cho giải" moi lam.
   */
  syncCodes = async (plan: TournamentCodePlan = this.codePlan) => {
    const { selected } = this.state;
    const { user } = this.props;
    if (!selected) return;

    try {
      const result = await syncTournamentCodes(selected.id, plan, user.uid);
      if (result.skipped) return;

      this.setState({ codeMeta: { prefix: result.prefix } });

      // Chi len tieng khi bo ma that su doi — luu thiet dat khac thi im lang
      if (result.created || result.removed) {
        toast.info('Bảng mã đã chạy theo thiết đặt mới — số của giải giữ nguyên.');
      }

      // Khong doc nguoc duoc kho ma nen khong dem truc tiep duoc do day —
      // so lan phai random lai la thuoc do gian tiep duy nhat co
      if (result.poolPressure) {
        toast.warn('Kho mã sắp hết — kiểm tra xem còn giải cũ chưa đóng không.', { autoClose: 8000 });
      }
    } catch (err: any) {
      toast.error(
        err?.message || 'Chưa cập nhật được bảng mã theo thiết đặt mới. Mở lại trang này để thử lại.'
      );
    }
  };

  /**
   * Cap lai TOAN BO ma cua giai theo 2 so moi.
   *
   * Ma cu chet ngay lap tuc nen luon phai hoi truoc, ke ca khi bang ma trong:
   * bam nham o day giua giai la ca giai phai doc lai so.
   */
  reissue = async (prefix: string) => {
    const { selected } = this.state;
    const { user } = this.props;
    if (!selected) return;

    this.setState({ regenerating: true });
    try {
      const result = await reissueTournamentCodes(selected.id, this.codePlan, user.uid, prefix);
      this.setState({
        codeMeta: { prefix: result.prefix },
        prefixOpen: false,
        prefixDraft: '',
        prefixState: 'idle',
      });
      toast.success(
        `Xong — số của giải là ${spacedCode(result.prefix || '')}. Đọc lại mã mới cho giám định.`
      );
      if (result.poolPressure) {
        toast.warn('Kho mã sắp hết — kiểm tra xem còn giải cũ chưa đóng không.', { autoClose: 8000 });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không đổi được số của giải.');
    } finally {
      this.setState({ regenerating: false });
    }
  };

  /** Go tay 2 so cho de nho. Kiem ngay xem con trong khong, khong bat cho toi luc bam. */
  handlePrefixDraft = async (raw: string) => {
    const draft = raw.replace(/\D/g, '').slice(0, PREFIX_LENGTH);
    this.setState({ prefixDraft: draft, prefixState: 'idle' });
    if (draft.length < PREFIX_LENGTH) return;
    if (draft === this.state.codeMeta?.prefix) {
      this.setState({ prefixState: 'free' });
      return;
    }

    this.setState({ prefixState: 'checking' });
    try {
      const free = await isPrefixFree(draft);
      // Go tiep trong luc dang hoi thi bo qua ket qua cu
      if (this.state.prefixDraft === draft) {
        this.setState({ prefixState: free ? 'free' : 'taken' });
      }
    } catch {
      if (this.state.prefixDraft === draft) this.setState({ prefixState: 'idle' });
    }
  };

  confirmPrefix = () => {
    const { prefixDraft, prefixState } = this.state;
    if (prefixDraft.length < PREFIX_LENGTH || prefixState === 'taken') return;
    this.askConfirm(
      `Đổi số của giải thành ${spacedCode(prefixDraft)}`,
      'Giám định đang chấm sẽ bị đẩy ra hết và phải gõ lại số mới, chọn lại chỗ ' +
      'ngồi.\n\nChỉ nên làm trước giờ thi.',
      () => void this.reissue(prefixDraft),
      'Đổi số'
    );
  };

  // ==================== Thiet dat ====================

  resetTournament = () => {
    get(ref(this.db, 'tournament/' + this.index + '/')).then((snapshot) => {
      const tournamentData = snapshot.val();
      if (!tournamentData) return;

      for (let i = 0; i < tournamentData.combat.length; i++) {
        const red = tournamentData.combat[i].fighters.redFighter;
        const blue = tournamentData.combat[i].fighters.blueFighter;
        for (const f of [red, blue]) {
          f.caution.bound = 0;
          f.caution.fall = 0;
          f.caution.medical = 0;
          f.caution.remind = 0;
          f.caution.warning = 0;
          f.result = "";
          f.score = 0;
        }
        tournamentData.combat[i].match.win = "";
      }

      for (let i = 0; i < tournamentData.combatArena.length; i++) {
        tournamentData.combatArena[i].lastMatch.no = 1;
        for (let j = 0; j < tournamentData.combatArena[i].referee.length; j++) {
          tournamentData.combatArena[i].referee[j].redScore = 0;
          tournamentData.combatArena[i].referee[j].blueScore = 0;
        }
      }

      for (let i = 0; i < tournamentData.martial.length; i++) {
        for (let j = 0; j < tournamentData.martial[i].team.length; j++) {
          tournamentData.martial[i].team[j].finalScore = 0;
          for (let k = 0; k < tournamentData.martial[i].team[j].refereeMartial.length; k++) {
            tournamentData.martial[i].team[j].refereeMartial[k].score = 0;
          }
        }
      }

      for (let i = 0; i < tournamentData.martialArena.length; i++) {
        tournamentData.martialArena[i].lastMatchMartial.matchMartialNo = 1;
        tournamentData.martialArena[i].lastMatchMartial.teamMartialNo = 1;
      }

      update(ref(this.db, 'tournament/' + this.index + '/'), tournamentData).then(() => {
        toast.success("Cài đặt trận đấu thành công!");
      });
    });
  }

  resetSetting = () => {
    const fresh = JSON.parse(JSON.stringify(this.settingConst)).setting;
    update(ref(this.db, 'tournament/' + this.index + '/setting'), fresh).then(async () => {
      // Ten giai nam trong `fresh` nen chi muc phai chay theo, khong thi trang
      // cong khai con hien ten cu
      await syncTournamentIndex(this.index);
      this.loadSetting(this.index);
      void this.refreshSummary();
      // Doc plan tu chinh ban mac dinh vua ghi: `loadSetting` chay ngam nen
      // state luc nay con la so giam dinh cu
      await this.syncCodes({
        combatReferees: fresh.combat.isShowFiveReferee ? 5 : 3,
        martialReferees: fresh.martial.isShowFiveReferee ? 5 : 3,
        useArenaB: fresh.combat.isShowArenaB !== false,
        tournamentName: fresh.tournamentName,
      });
      toast.success("Cài lại thiết đặt thành công!");
    });
  }

  /** Toan bo o thiet dat, gom lai thanh mot luot ghi */
  get settingPayload() {
    const { timeRound, timeBreak, timeExtra, timeExtraBreak, tournamentName,
            showCountryFlag, useFiveReferees,
            showCautionBoxCombat, prioritizeUnitNameCombat } = this.state;

    return {
      "combat/timeRound": timeRound,
      "combat/timeBreak": timeBreak,
      "combat/timeExtra": timeExtra,
      "combat/timeExtraBreak": timeExtraBreak,
      "tournamentName": tournamentName,
      "combat/isShowCautionBox": showCautionBoxCombat,
      "combat/isPrioritizeUnitName": prioritizeUnitNameCombat,
      // Mot cong tac tren UI, nhung duoi DB van ghi ca hai nhanh de cac man
      // hinh doi khang / thi quyen khong phai doi cach doc
      "combat/isShowCountryFlag": showCountryFlag,
      "martial/isShowCountryFlag": showCountryFlag,
      "combat/isShowFiveReferee": useFiveReferees,
      "martial/isShowFiveReferee": useFiveReferees,
    };
  }

  /**
   * Hen mot luot ghi. Cong tac bam phat an ngay nen ghi luon; o go chu / go so
   * thi doi go xong hang, khong thi moi phim la mot luot ghi Firebase.
   */
  /** Danh dau co thay doi chua ghi, va nho no thuoc giai nao */
  markDirty() {
    this.dirty = true;
    this.pendingIndex = this.index;
  }

  queueSave(immediate: boolean) {
    this.markDirty();
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.setState({ saveState: 'saving' });
    if (immediate) {
      this.saveTimer = null;
      void this.flushSave();
      return;
    }
    this.saveTimer = setTimeout(() => void this.flushSave(), SAVE_DEBOUNCE_MS);
  }

  /** Ghi that. Goi truc tiep khi can ghi not truoc luc doi giai / roi trang. */
  flushSave = async () => {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    if (!this.dirty) return;
    this.dirty = false;

    const index = this.pendingIndex;
    const { needIndexSync, needCodeSync } = this;
    this.needIndexSync = false;
    this.needCodeSync = false;

    try {
      await update(ref(this.db, 'tournament/' + index + '/setting'), this.settingPayload);
      // Doi ten thi trang cong khai phai chay theo; doi so giam dinh thi bo ma
      // phai cap lai. Bam mot cong tac hien thi thi khong dinh gi den hai viec do.
      if (needIndexSync) {
        await syncTournamentIndex(index);
        void this.refreshSummary();
      }
      if (needCodeSync) await this.syncCodes();
      // Co luot go moi chen vao giua thi de no bao trang thai, dung de len
      if (!this.saveTimer) this.setState({ saveState: 'saved' });
    } catch {
      this.dirty = true;
      this.needIndexSync = needIndexSync;
      this.needCodeSync = needCodeSync;
      this.setState({ saveState: 'error' });
      toast.error('Chưa lưu được thiết đặt — kiểm tra mạng rồi thử lại.');
    }
  };

  handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const next = type === 'checkbox' ? target.checked
      : type === 'number' ? (parseInt(value) || 0)
      : value;

    if (name === 'tournamentName') this.needIndexSync = true;
    if (name === 'useFiveReferees') this.needCodeSync = true;

    this.setState({ [name]: next } as any, () => {
      // O go so (cac moc thoi gian): dang go dở thi con la so vo nghia — "12"
      // tren duong go "120" — nen doi roi o moi ghi, xem `saveOnBlur`
      if (type === 'number') {
        this.markDirty();
        this.setState({ saveState: 'idle' });
        return;
      }
      this.queueSave(type === 'checkbox');
    });
  }

  /** O go so ghi luc roi o. Khong co gi doi thi khong ghi. */
  saveOnBlur = () => {
    if (this.dirty && !this.saveTimer) this.queueSave(true);
  }

  askConfirm = (title: string, message: string, action: () => void, label?: string) => {
    this.setState({ confirm: { title, message, action, label } });
  }

  closeConfirm = () => this.setState({ confirm: null });

  runConfirm = () => {
    const { confirm } = this.state;
    this.setState({ confirm: null }, () => confirm?.action());
  }

  confirmResetTournament = () => this.askConfirm(
    'Cài lại trận đấu',
    'Toàn bộ điểm số và diễn biến của giải đang chọn sẽ bị xoá về mặc định. Không thể hoàn tác.',
    this.resetTournament
  );

  confirmResetSetting = () => this.askConfirm(
    'Cài lại thiết đặt',
    'Thời gian hiệp, số giám định và các tuỳ chọn hiển thị sẽ trở về mặc định.',
    this.resetSetting
  );

  copyUid = async () => {
    try {
      await navigator.clipboard.writeText(this.props.user.uid);
      toast.success('Đã chép mã tài khoản.');
    } catch {
      toast.info(this.props.user.uid);
    }
  };

  renderStatusBar() {
    const { selected } = this.state;
    if (!selected) return null;

    // Ban cham nhanh cung la giai chua co chu, nhung KHONG duoc nhan ve: nhan
    // ve la dat `ownerUid`, va tu luc do khong ai khac vao cham nhanh duoc nua
    const legacy = isLegacy(selected) && !selected.demo;
    const badge = {
      draft: { text: 'Chưa mở', className: 'bg-slate-100 text-slate-600 border-slate-200' },
      open: { text: 'Đang mở', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      closed: { text: 'Đã đóng', className: 'bg-red-50 text-red-700 border-red-200' },
    }[selected.status];

    return (
      <div className="flex flex-wrap items-center gap-2.5 pt-4 mt-4 border-t border-slate-100">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.className}`}>
          {badge.text}
        </span>

        {selected.demo && (
          <span className="text-xs text-slate-500">bàn riêng của bạn — không xoá được</span>
        )}

        {legacy && (
          <>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border
              bg-amber-50 text-amber-700 border-amber-200">Giải cũ — chưa có chủ</span>
            <Button size="sm" variant="primary" icon="fa-solid fa-hand-holding-heart"
              onClick={this.handleClaim}>
              Nhận giải này về tài khoản tôi
            </Button>
          </>
        )}

        {!legacy && selected.status !== 'open' && (
          <Button size="sm" variant="success" icon="fa-solid fa-door-open"
            onClick={selected.status === 'closed' ? this.handleReopen : this.handleOpen}>
            {selected.status === 'closed' ? 'Mở lại giải' : 'Mở giải'}
          </Button>
        )}

        {!legacy && selected.status === 'open' && (
          <Button size="sm" variant="danger" icon="fa-solid fa-flag-checkered"
            onClick={this.confirmClose}>
            Đóng giải
          </Button>
        )}

        {selected.openAccess && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border
            bg-red-50 text-red-700 border-red-200">
            <i className="fa-solid fa-lock-open mr-1" aria-hidden="true" />
            ĐANG MỞ TỰ DO
          </span>
        )}

        {/* Day cuoi hang va tach mau han: xoa giai la viec khong hoan tac duoc,
            khong duoc phep nam ngang hang voi "Mo giai" de bam nham */}
        {this.canPurgeSelected && (
          <Button size="sm" variant="ghost" className="ml-auto text-red-600 hover:bg-red-50"
            icon="fa-solid fa-trash-can" onClick={this.confirmPurge}>
            Xoá giải
          </Button>
        )}
      </div>
    );
  }

  /**
   * "So cua giai" — 2 so dau ma nao cua giai cung bat dau bang.
   *
   * Nam ngay tren bang ma chu khong giau trong mot trang khac: doi so la viec
   * lam mot lan truoc gio thi, ngay canh cho chu giai dang nhin so.
   */
  renderPrefix() {
    const { codeMeta, prefixOpen, prefixDraft, prefixState, regenerating } = this.state;
    if (!codeMeta) return null;

    return (
      <div className="mb-4 border border-slate-200 rounded-control p-3">
        {!prefixOpen ? (
          <div className="flex items-center gap-3 flex-wrap">
            {codeMeta.prefix ? (
              /* So cua giai da nam to giua bang ma ngay ben duoi — o day chi
                 con dung mot viec la doi no */
              <>
                <span className="text-xs text-slate-500 leading-snug">
                  Số của giải đang là <strong className="tabular-nums">{spacedCode(codeMeta.prefix)}</strong>.
                  Đổi số thì mọi máy đang chấm phải vào lại từ đầu.
                </span>
                <Button size="sm" variant="ghost" icon="fa-solid fa-pen"
                  disabled={regenerating}
                  onClick={() => this.setState({
                    prefixOpen: true, prefixDraft: codeMeta.prefix || '', prefixState: 'free',
                  })}>
                  Đổi số
                </Button>
              </>
            ) : (
              /* Giai cu: ma con la kieu "moi o mot so 2 chu so". Khong tu doi
                 giup — doi la moi ma dang cam chet ngay, phai chu giai bam. */
              <>
                <span className="text-sm text-slate-600 leading-snug">
                  Giải này còn dùng mã kiểu cũ, mỗi ô một số riêng. Đặt một số cho cả giải
                  để chỉ phải nhớ đúng một số.
                </span>
                <Button size="sm" variant="primary" icon="fa-solid fa-pen"
                  disabled={regenerating}
                  onClick={() => this.setState({
                    prefixOpen: true, prefixDraft: '', prefixState: 'idle',
                  })}>
                  Đặt số cho giải
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="m-0 mb-2 text-sm text-slate-600">
              Gõ 2 số bạn dễ nhớ cho giải này:
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={prefixDraft}
                disabled={regenerating}
                onChange={(e) => void this.handlePrefixDraft(e.target.value)}
                className="w-24 text-center text-2xl font-black tabular-nums tracking-[0.2em]
                  border-2 border-slate-300 rounded-control py-1.5 focus:border-accent-500
                  focus:outline-none"
              />
              <Button size="sm" variant="primary" icon="fa-solid fa-check"
                disabled={regenerating || prefixState !== 'free'}
                onClick={this.confirmPrefix}>
                Đổi
              </Button>
              <Button size="sm" variant="secondary"
                disabled={regenerating}
                onClick={() => this.setState({ prefixOpen: false, prefixState: 'idle' })}>
                Huỷ
              </Button>

              {prefixState === 'checking' && (
                <span className="text-xs text-slate-400">đang kiểm…</span>
              )}
              {prefixState === 'free' && prefixDraft.length === PREFIX_LENGTH && (
                <span className="text-xs text-emerald-700 font-medium">
                  <i className="fa-solid fa-check mr-1" aria-hidden="true" />
                  Số {prefixDraft} còn trống
                </span>
              )}
              {prefixState === 'taken' && (
                <span className="text-xs text-red-600 font-medium">
                  <i className="fa-solid fa-xmark mr-1" aria-hidden="true" />
                  Số {prefixDraft} đang có giải khác dùng
                </span>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  render() {
    const {
      tournaments, selected, loading, tournamentName,
      timeRound, timeBreak, timeExtra, timeExtraBreak,
      showCountryFlag, useFiveReferees, showCautionBoxCombat, prioritizeUnitNameCombat,
      saveState, confirm,
    } = this.state;
    const { user } = this.props;

    return (
      <PageShell accent="tool">
        <PageHeader title="Thiết đặt" icon="fa-solid fa-gear" badge={tournamentName} action={<AccountChip user={user} />} />

        <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 py-5 space-y-5">
          <SectionCard title="Giải đang cấu hình" icon="fa-solid fa-trophy">
            {loading ? (
              <p className="text-slate-400 italic m-0">Đang đọc danh sách giải…</p>
            ) : tournaments.length === 0 ? (
              <p className="text-slate-500 m-0">
                Bạn chưa tạo giải nào. Sang trang{' '}
                <NavLink to="/tao-giai" className="text-accent-700 font-medium underline">Tạo giải</NavLink>{' '}
                để bắt đầu.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {tournaments.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 p-3.5 border-2 rounded-control cursor-pointer transition-colors
                      ${t.demo ? 'md:col-span-2' : ''}
                      ${selected?.id === t.id
                        ? t.demo
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-accent-500 bg-accent-50'
                        : t.demo
                          ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400 hover:bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <input
                      type="radio"
                      name="tournamentRadio"
                      checked={selected?.id === t.id}
                      onChange={() => this.selectTournament(t)}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-700 whitespace-pre-line">{t.name}</span>
                      {t.status === 'closed' && (
                        <span className="block text-xs text-red-600 mt-0.5">đã đóng</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {this.renderStatusBar()}

            <p className="text-xs text-slate-500 m-0 mt-4 bg-slate-50 border border-slate-200
              rounded-control px-3 py-2.5">
              <i className="fa-solid fa-circle-info mr-1.5 text-slate-400" aria-hidden="true" />
              {this.isAdmin
                ? 'Bạn là quản trị viên nên bảng này hiện MỌI giải, kể cả giải của người khác. '
                : 'Chỉ hiện giải của bạn. '}
              Thêm giải mới hoặc nhập danh sách vận động viên ở trang{' '}
              <NavLink to="/tao-giai" className="text-accent-700 font-medium underline">Tạo giải</NavLink>.
            </p>
          </SectionCard>

          {selected && (
            <SectionCard title="Bảng mã giám định" icon="fa-solid fa-key" tone="neutral">
              <p className="text-sm text-slate-500 mt-0 mb-4">
                Chỉ cần đọc <strong>số của giải</strong> cho cả đoàn — giám định gõ 2 số đó rồi
                tự chọn sân và số của mình. In tờ số ra dán ở bàn là xong.
              </p>

              {this.renderPrefix()}

              <CodeBoard
                tournamentIndex={selected.id}
                tournamentName={selected.name}
                canManage
              />
            </SectionCard>
          )}

          {selected && !isLegacy(selected) && (
            <SectionCard title="Giám sát của giải" icon="fa-solid fa-user-shield">
              <StaffApprovalPanel
                tournamentIndex={selected.id}
                approvedBy={user.uid}
                tournamentStatus={selected.status}
              />

              <div className="pt-5 mt-5 border-t border-slate-100">
                <Toggle
                  name="openAccess"
                  checked={selected.openAccess}
                  onChange={this.handleToggleOpenAccess}
                  label="Mở tự do — bỏ hẳn bước duyệt"
                  hint="Chỉ dùng cho giải nội bộ hoặc buổi tập huấn"
                />
                {selected.openAccess && (
                  <p className="m-0 mt-2 text-xs text-red-700 bg-red-50 border border-red-200
                    rounded-control px-3 py-2.5">
                    <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
                    Ai đăng nhập cũng chấm điểm được trên giải này. Nhớ tắt lại khi xong.
                  </p>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Thông tin giải đấu" icon="fa-solid fa-sliders"
            action={<SaveState state={saveState} />}>
            <div className="space-y-6">
              <div>
                <label htmlFor="field-tournamentName" className="block text-sm font-semibold text-slate-600 mb-2">
                  Tên giải đấu
                </label>
                <textarea
                  id="field-tournamentName"
                  name="tournamentName"
                  value={tournamentName}
                  onChange={this.handleInputChange}
                  rows={2}
                  className="w-full px-4 py-3 border border-slate-200 rounded-control resize-none
                    text-slate-800 bg-white placeholder:text-slate-400
                    focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow"
                  placeholder="Nhập tên giải đấu... (Enter để xuống dòng)"
                />
                <p className="text-xs text-slate-400 mt-1.5 mb-0">
                  Tên này hiển thị trên màn hình trình chiếu, xuống dòng để tránh chữ quá nhỏ.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <Toggle name="showCountryFlag" checked={showCountryFlag}
                  onChange={this.handleInputChange} label="Hiển thị cờ quốc gia"
                  hint="Áp dụng cho cả đối kháng và thi quyền" />
                <Toggle name="useFiveReferees" checked={useFiveReferees}
                  onChange={this.handleInputChange} label="Dùng 5 giám định"
                  hint="Tắt để dùng 3 — áp dụng cho đối kháng và thi quyền" />
              </div>

              <fieldset className="border border-emerald-200 bg-emerald-50/50 rounded-card p-4 sm:p-5 m-0">
                <legend className="px-2 font-bold text-emerald-700 flex items-center gap-2 text-sm">
                  <i className="fa-solid fa-hand-back-fist" aria-hidden="true" />
                  Đối kháng
                </legend>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <Toggle name="showCautionBoxCombat" checked={showCautionBoxCombat}
                    onChange={this.handleInputChange} label="Hiển thị bảng nhắc nhở" />
                  <Toggle name="prioritizeUnitNameCombat" checked={prioritizeUnitNameCombat}
                    onChange={this.handleInputChange} label="Ưu tiên hiển thị đơn vị"
                    hint="Tên đơn vị to hơn tên vận động viên" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <NumberField name="timeRound" label="Thời gian hiệp" value={timeRound}
                    onChange={this.handleInputChange} onBlur={this.saveOnBlur} unit="giây" />
                  <NumberField name="timeBreak" label="Nghỉ giữa hiệp" value={timeBreak}
                    onChange={this.handleInputChange} onBlur={this.saveOnBlur} unit="giây" />
                  <NumberField name="timeExtra" label="Thời gian hiệp phụ" value={timeExtra}
                    onChange={this.handleInputChange} onBlur={this.saveOnBlur} unit="giây" />
                  <NumberField name="timeExtraBreak" label="Nghỉ hiệp phụ" value={timeExtraBreak}
                    onChange={this.handleInputChange} onBlur={this.saveOnBlur} unit="giây" />
                </div>
              </fieldset>

              <div className="flex flex-wrap gap-2.5 pt-4 border-t border-slate-100">
                <Button variant="secondary" icon="fa-solid fa-rotate-left" onClick={this.confirmResetSetting}>
                  Cài lại thiết đặt
                </Button>
                <Button variant="danger" icon="fa-solid fa-arrows-rotate" onClick={this.confirmResetTournament}>
                  Cài lại trận đấu
                </Button>
              </div>
            </div>
          </SectionCard>

          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm pt-2">
            {[
              { to: '/', label: 'Trang chủ' },
              { to: '/giam-sat-doi-khang', label: 'Giám sát đối kháng' },
              { to: '/giam-sat-thi-quyen', label: 'Giám sát thi quyền' },
              { to: '/gd', label: 'Vào chấm điểm (giám định)' },
              { to: '/tao-giai', label: 'Tạo giải' },
            ].map((link) => (
              <NavLink key={link.to} to={link.to}
                className="text-slate-500 hover:text-accent-700 transition-colors">
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Ma tai khoan de o day de lan sau cap quyen admin cho nguoi khac
              khoi phai mo Firebase Console di mo tung dong */}
          <p className="text-center text-[11px] text-slate-400 m-0 pt-2">
            Mã tài khoản của bạn:{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded">{user.uid}</code>{' '}
            <button type="button" onClick={this.copyUid}
              className="text-accent-600 hover:underline">chép</button>
          </p>
        </main>

        <AppFooter />

        <ConfirmModal
          isOpen={confirm !== null}
          title={confirm?.title || ''}
          message={confirm?.message || ''}
          confirmLabel={confirm?.label}
          onConfirm={this.runConfirm}
          onCancel={this.closeConfirm}
        />

        <Toast />
      </PageShell>
    );
  }
}

export default SettingContainer;
