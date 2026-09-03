import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { money } from './money';
import { daysTo } from './dates';
import { loanMath, paceNote } from './calc';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true,
    shouldPlaySound: false, shouldSetBadge: false,
  }),
});

export async function requestPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

// Fire at 9am local on the given date. Returns null if that moment has passed.
function at9am(dateStr, daysBefore = 0) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - daysBefore);
  d.setHours(9, 0, 0, 0);
  return d > new Date() ? d : null;
}

async function schedule(date, title, body) {
  if (!date) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

// Cancel everything and rebuild. Simple, idempotent, and impossible to leave
// stale reminders behind after an undo.
export async function rescheduleAll(S) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const s of S.subs) {
    await schedule(at9am(s.next, 1), 'Subscription due tomorrow',
      `${s.name} — ${money(s.amount)}`);
    await schedule(at9am(s.next, 0), 'Subscription due today',
      `${s.name} — ${money(s.amount)}. Tap to pay it from a pocket.`);
  }

  for (const d of S.debts) {
    if (!d.due) continue;
    await schedule(at9am(d.due, 0),
      d.dir === 'in' ? 'Money owed to you' : 'You owe money',
      `${d.party} — ${money(d.amount)} due today`);
  }

  for (const p of S.pockets) {
    if (!p.due || !p.target) continue;
    const note = paceNote(p);
    // Nudge a week out, while there is still time to act on it.
    if (daysTo(p.due) > 7) await schedule(at9am(p.due, 7), `${p.name} is due in a week`, note);
    await schedule(at9am(p.due, 0), `${p.name} — target date reached`,
      p.amount >= p.target ? 'You made it.' : `${money(p.target - p.amount)} short.`);
  }

  for (const l of S.loans) {
    if (l.type !== 'emi') continue;
    const m = loanMath(l);
    if (m.left <= 0) continue;
    // Next EMI falls on the same day-of-month as the start date.
    const start = new Date(l.start + 'T00:00:00');
    const next = new Date();
    next.setDate(Math.min(start.getDate(), 28));
    if (next <= new Date()) next.setMonth(next.getMonth() + 1);
    next.setHours(9, 0, 0, 0);
    await schedule(next, 'EMI due', `${l.party} — ${money(Math.round(m.emi))}`);
  }
}
