// The four paper subjects, and every rule for turning what she typed into
// them. Her logs are free text - "Physics, Chemistry", "organic chemistry",
// "Bio" - and the balance card needs canonical names, so this is the one
// place that decides what a string means. Pure: no React, no storage.

export const PAPER_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology'];

// Lower-case spellings that name a subject. "Bio" and "Biology" are the two
// biology papers, so they expand to both.
export const SUBJECT_ALIASES = {
  physics: ['Physics'],
  phy: ['Physics'],
  chemistry: ['Chemistry'],
  chem: ['Chemistry'],
  botany: ['Botany'],
  zoology: ['Zoology'],
  biology: ['Botany', 'Zoology'],
  bio: ['Botany', 'Zoology'],
};

// Letters only, so "Chem." and "chem" are the same token.
const lettersOnly = (value) => String(value ?? '').toLowerCase().replace(/[^a-z]/g, '');

// Split the field on commas. Everything else stays inside one token.
export function splitTokens(value) {
  return String(value ?? '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
}

// Which paper subjects a token names. An exact alias wins ("chem." is
// Chemistry). Otherwise the subject's name has to appear as a whole word, so
// "organic chemistry" is Chemistry but "physicswallah" is nothing.
function tokenTargets(token) {
  const text = String(token ?? '').toLowerCase();
  if (!text.trim()) return [];
  const alias = SUBJECT_ALIASES[lettersOnly(token)];
  if (alias) return alias;
  const found = [];
  for (const subject of PAPER_SUBJECTS) {
    if (new RegExp(`\\b${subject.toLowerCase()}\\b`).test(text)) found.push(subject);
  }
  return found;
}

// The canonical subjects a subject string names, in order, without repeats.
export function parseSubjects(value) {
  const out = [];
  for (const token of splitTokens(value)) {
    for (const subject of tokenTargets(token)) {
      if (!out.includes(subject)) out.push(subject);
    }
  }
  return out;
}

export function formatSubjects(list) {
  return (Array.isArray(list) ? list : []).filter(Boolean).join(', ');
}

// A token that is nothing but a subject or an alias can be rewritten when one
// of its subjects is taken away; a longer phrase can only be dropped.
function isPlainToken(token) {
  const letters = lettersOnly(token);
  if (SUBJECT_ALIASES[letters]) return true;
  return PAPER_SUBJECTS.some((subject) => subject.toLowerCase() === letters);
}

// The chip behaviour: tapping adds the subject to the text, tapping it again
// takes it out. The text stays the single source of truth.
export function toggleSubject(value, subject) {
  const name = String(subject ?? '').trim();
  const current = String(value ?? '');
  if (!name || !PAPER_SUBJECTS.includes(name)) return current;
  const tokens = splitTokens(current);
  const alreadyNamed = tokens.some((token) => tokenTargets(token).includes(name));
  if (!alreadyNamed) {
    tokens.push(name);
    return tokens.join(', ');
  }
  const next = [];
  for (const token of tokens) {
    const targets = tokenTargets(token);
    if (!targets.includes(name)) {
      next.push(token);
      continue;
    }
    const remaining = targets.filter((target) => target !== name);
    if (remaining.length && isPlainToken(token)) next.push(remaining.join(', '));
  }
  return next.join(', ');
}

// Where a session's minutes land. The string is split on commas, each part
// takes an equal share of the time, and a part naming two subjects splits its
// share again. A part naming nothing counts as unmatched. The shares always
// add up to the duration.
export function attributeMinutes(value, duration) {
  const total = Number(duration);
  const minutes = Number.isFinite(total) && total > 0 ? total : 0;
  const tokens = splitTokens(value);
  const bySubject = {};
  if (!tokens.length) return { bySubject, unmatched: minutes };
  if (!minutes) return { bySubject, unmatched: 0 };
  const share = minutes / tokens.length;
  let unmatched = 0;
  for (const token of tokens) {
    const targets = tokenTargets(token);
    if (!targets.length) {
      unmatched += share;
      continue;
    }
    const each = share / targets.length;
    for (const subject of targets) bySubject[subject] = (bySubject[subject] ?? 0) + each;
  }
  return { bySubject, unmatched };
}
