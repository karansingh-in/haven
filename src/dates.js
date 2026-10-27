// Local-time date keys ("YYYY-MM-DD") shared by the screens and the cycle
// maths. Kept out of App.js so the pure modules can be tested without React.

export const pad = (value) => String(value).padStart(2, "0");

export const formatDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseDateKey = (value) => {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

export const getDaysBetween = (start, end) => {
  const a = new Date(start);
  const b = new Date(end);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

export const isValidDateKey = (value) => parseDateKey(value) !== null;

export const addDaysToKey = (key, amount) => {
  const date = parseDateKey(key);
  if (!date) return key;
  date.setDate(date.getDate() + Number(amount || 0));
  return formatDateKey(date);
};
