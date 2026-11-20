import type { NightId } from '../../core/types';

/** A short line from Ông Đăng, the lantern keeper, per night. Goal: keep >= 60% of lanterns lit until dawn. */
export const OLD_MAN_LINES: Record<NightId, string> = {
  1: 'Con à, đèn nào cũng ngốn dầu. Nhặt đom đóm, thắp đèn và châm dầu để ít nhất 60% đèn còn sáng tới bình minh. Đèn tắt thì thắp lại chỉ tốn 5.',
  2: 'Đảo Cau có cầu tre và bục nhảy. Bóng Mực ở đây biết hút dầu từ đèn, hãy xua chúng đi và giữ đủ 60% đèn sáng tới sáng.',
  3: 'Đảo Chuông là đêm dài nhất. Gió sẽ nổi, dầu cứ cạn dần. Châm dầu cho đèn yếu, sống tới bình minh với ít nhất 60% đèn sáng.',
};

/** Result-screen copy per game_over reason (won = dawn_survived). */
export const GAME_OVER_COPY: Record<string, { title: string; note: string }> = {
  dawn_survived: { title: 'Thắng - sống sót tới bình minh!', note: 'Ít nhất 60% đèn còn sáng khi trời hửng.' },
  dawn: { title: 'Thua - thiếu đèn sáng', note: 'Trời sáng nhưng chưa đủ 60% đèn còn sáng.' },
  no_flames: { title: 'Thua - hết Ngọn Lửa', note: 'Mây đã mất cả Ngọn Lửa trước bình minh.' },
};
