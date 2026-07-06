/**
 * Emojis via escape Unicode — evita corrupção (�) em build Windows / link wa.me.
 * Evitar emojis compostos (#️⃣, ➡️) que quebram com frequência no WhatsApp Desktop.
 */
export const E = {
  smile: '\u{1F603}',
  cool: '\u{1F60E}',
  blush: '\u{1F60A}',
  love: '\u{1F970}',
  heart: '\u{2764}',
  check: '\u{2705}',
  calendar: '\u{1F4C5}',
  user: '\u{1F464}',
  phone: '\u{1F4DE}',
  pin: '\u{1F4CD}',
  hourglass: '\u{23F3}',
  cart: '\u{1F6D2}',
  bullet: '\u{2022}',
  money: '\u{1F4B5}',
  truck: '\u{1F69A}',
  dollar: '\u{1F4B2}',
  card: '\u{1F4B3}',
  package: '\u{1F4E6}',
  store: '\u{1F3EA}',
  numbers: '\u{1F522}',
  moneyBag: '\u{1F4B0}',
  mobile: '\u{1F4F1}',
  page: '\u{1F4C4}',
  clock: '\u{23F0}',
  recycle: '\u{1F504}',
  rocket: '\u{1F680}',
  scooter: '\u{1F6F5}',
  dash: '\u{1F4A8}',
} as const
