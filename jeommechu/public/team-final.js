import { TeamController as FixedTeamController } from './team-fixed.js?v=3';

export class TeamController extends FixedTeamController {
  resetExpiredRoom(message = '마감된 방을 정리했습니다. 새 팀 방을 만들 수 있습니다.') {
    this.stopPolling();
    if (this.code) this.clearSession(this.code);
    this.code = '';
    this.token = '';
    this.room = null;
    this.error = '';
    this.mode = 'landing';
    this.setUrl('');
    this.showToast(message);
    this.onChange();
  }

  isUnrecoverableRoomError() {
    return /존재하지 않는 방|참여 마감 시간이 지났|이미 조건 취합이 끝난 방/.test(this.error || '');
  }

  async loadState(silent = false) {
    await super.loadState(silent);

    if (this.room?.status === 'expired') {
      this.resetExpiredRoom();
      return;
    }

    const deadlineFailed = this.room?.status === 'collecting'
      && Date.now() >= Number(this.room.deadline || 0)
      && Boolean(this.room.lastError);

    if (deadlineFailed) {
      this.resetExpiredRoom(`마감 후 후보 생성에 실패해 기존 방을 정리했습니다: ${this.room.lastError}`);
      return;
    }

    if (!this.room && this.isUnrecoverableRoomError()) {
      this.resetExpiredRoom('사용할 수 없는 팀 방을 정리했습니다.');
    }
  }
}
