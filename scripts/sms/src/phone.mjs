// Sri Lanka mobile numbers → E.164 (+947XXXXXXXX). Returns null for anything that isn't a Sri Lankan mobile:
// landlines, foreign numbers and junk are never sent an SMS.
export function normalizeLK(raw) {
  if (raw == null) return null;
  let d = String(raw).replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('0094')) d = d.slice(4);
  else if (d.startsWith('94') && d.length === 11) d = d.slice(2);
  else if (d.startsWith('0') && d.length === 10) d = d.slice(1);
  if (!/^7[0-8]\d{7}$/.test(d)) return null;         // mobile prefixes 70–78, 9 digits
  return '+94' + d;
}
// the forms gateways ask for
export const as94 = (e164) => e164.replace('+', '');            // 947XXXXXXXX
export const asLocal9 = (e164) => e164.replace('+94', '');      // 7XXXXXXXX
