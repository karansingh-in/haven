// neet.js — NEET UG logic module

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// Constants
// ============================================

export const NEET_EXAM_DATE = '2027-05-04'; // NEET UG 2027 expected date

// Percentile table based on 2024-2026 NEET data
// Format: [score, percentile] - interpolated for scores between
export const PERCENTILE_TABLE = [
  [720, 100.0],
  [715, 99.99],
  [710, 99.95],
  [700, 99.8],
  [690, 99.5],
  [680, 99.0],
  [670, 98.5],
  [660, 97.8],
  [650, 97.0],
  [640, 96.0],
  [630, 94.5],
  [620, 93.0],
  [610, 91.0],
  [600, 89.0],
  [590, 86.5],
  [580, 84.0],
  [570, 81.0],
  [560, 77.5],
  [550, 74.0],
  [540, 70.0],
  [530, 66.0],
  [520, 62.0],
  [510, 57.5],
  [500, 53.5],
  [490, 49.5],
  [480, 45.5],
  [470, 41.5],
  [460, 37.5],
  [450, 34.0],
  [440, 30.5],
  [430, 27.0],
  [420, 24.0],
  [410, 21.0],
  [400, 18.5],
  [390, 16.0],
  [380, 13.5],
  [370, 11.5],
  [360, 9.5],
  [350, 8.0],
  [340, 6.5],
  [330, 5.2],
  [320, 4.1],
  [310, 3.2],
  [300, 2.5],
  [290, 1.9],
  [280, 1.4],
  [270, 1.0],
  [260, 0.7],
  [250, 0.5],
  [200, 0.1],
  [150, 0.01],
  [100, 0.001],
  [0, 0.0],
];

// Category cutoffs (approximate based on recent years)
export const CUTOFFS = {
  Gen: 715,
  EWS: 710,
  OBC: 705,
  SC: 650,
  ST: 600,
};

// Syllabus chapters with weightage
export const SYLLABUS = [
  // Physics
  { id: 'phy1', subject: 'Physics', chapter: 'Physical World & Measurement', weightage: 'Low' },
  { id: 'phy2', subject: 'Physics', chapter: 'Kinematics', weightage: 'High' },
  { id: 'phy3', subject: 'Physics', chapter: 'Laws of Motion', weightage: 'High' },
  { id: 'phy4', subject: 'Physics', chapter: 'Work, Energy & Power', weightage: 'Medium' },
  { id: 'phy5', subject: 'Physics', chapter: 'System of Particles & Rotational Motion', weightage: 'High' },
  { id: 'phy6', subject: 'Physics', chapter: 'Gravitation', weightage: 'Medium' },
  { id: 'phy7', subject: 'Physics', chapter: 'Properties of Bulk Matter', weightage: 'Medium' },
  { id: 'phy8', subject: 'Physics', chapter: 'Thermodynamics', weightage: 'High' },
  { id: 'phy9', subject: 'Physics', chapter: 'Kinetic Theory of Gases', weightage: 'Low' },
  { id: 'phy10', subject: 'Physics', chapter: 'Oscillations & Waves', weightage: 'Medium' },
  { id: 'phy11', subject: 'Physics', chapter: 'Electrostatics', weightage: 'High' },
  { id: 'phy12', subject: 'Physics', chapter: 'Current Electricity', weightage: 'High' },
  { id: 'phy13', subject: 'Physics', chapter: 'Magnetic Effects of Current', weightage: 'High' },
  { id: 'phy14', subject: 'Physics', chapter: 'Electromagnetic Induction & AC', weightage: 'High' },
  { id: 'phy15', subject: 'Physics', chapter: 'Electromagnetic Waves', weightage: 'Low' },
  { id: 'phy16', subject: 'Physics', chapter: 'Ray Optics', weightage: 'High' },
  { id: 'phy17', subject: 'Physics', chapter: 'Wave Optics', weightage: 'Medium' },
  { id: 'phy18', subject: 'Physics', chapter: 'Dual Nature of Matter', weightage: 'Medium' },
  { id: 'phy19', subject: 'Physics', chapter: 'Atoms & Nuclei', weightage: 'Medium' },
  { id: 'phy20', subject: 'Physics', chapter: 'Semiconductor Electronics', weightage: 'High' },
  { id: 'phy21', subject: 'Physics', chapter: 'Communication Systems', weightage: 'Low' },

  // Chemistry
  { id: 'chem1', subject: 'Chemistry', chapter: 'Some Basic Concepts', weightage: 'Medium' },
  { id: 'chem2', subject: 'Chemistry', chapter: 'Structure of Atom', weightage: 'High' },
  { id: 'chem3', subject: 'Chemistry', chapter: 'Classification of Elements', weightage: 'Low' },
  { id: 'chem4', subject: 'Chemistry', chapter: 'Chemical Bonding', weightage: 'High' },
  { id: 'chem5', subject: 'Chemistry', chapter: 'States of Matter', weightage: 'Medium' },
  { id: 'chem6', subject: 'Chemistry', chapter: 'Thermodynamics', weightage: 'High' },
  { id: 'chem7', subject: 'Chemistry', chapter: 'Equilibrium', weightage: 'High' },
  { id: 'chem8', subject: 'Chemistry', chapter: 'Redox Reactions', weightage: 'Medium' },
  { id: 'chem9', subject: 'Chemistry', chapter: 'Hydrogen', weightage: 'Low' },
  { id: 'chem10', subject: 'Chemistry', chapter: 's-Block Elements', weightage: 'Medium' },
  { id: 'chem11', subject: 'Chemistry', chapter: 'p-Block Elements', weightage: 'High' },
  { id: 'chem12', subject: 'Chemistry', chapter: 'd & f Block Elements', weightage: 'Medium' },
  { id: 'chem13', subject: 'Chemistry', chapter: 'Coordination Compounds', weightage: 'High' },
  { id: 'chem14', subject: 'Chemistry', chapter: 'Haloalkanes & Haloarenes', weightage: 'Medium' },
  { id: 'chem15', subject: 'Chemistry', chapter: 'Alcohols, Phenols & Ethers', weightage: 'High' },
  { id: 'chem16', subject: 'Chemistry', chapter: 'Aldehydes, Ketones & Carboxylic Acids', weightage: 'High' },
  { id: 'chem17', subject: 'Chemistry', chapter: 'Amines', weightage: 'Medium' },
  { id: 'chem18', subject: 'Chemistry', chapter: 'Biomolecules', weightage: 'Medium' },
  { id: 'chem19', subject: 'Chemistry', chapter: 'Polymers', weightage: 'Low' },
  { id: 'chem20', subject: 'Chemistry', chapter: 'Chemistry in Everyday Life', weightage: 'Low' },

  // Botany
  { id: 'bot1', subject: 'Botany', chapter: 'Diversity in Living World', weightage: 'Medium' },
  { id: 'bot2', subject: 'Botany', chapter: 'Structural Organization in Plants', weightage: 'Medium' },
  { id: 'bot3', subject: 'Botany', chapter: 'Cell Structure & Function', weightage: 'High' },
  { id: 'bot4', subject: 'Botany', chapter: 'Plant Physiology', weightage: 'High' },
  { id: 'bot5', subject: 'Botany', chapter: 'Reproduction in Plants', weightage: 'High' },
  { id: 'bot6', subject: 'Botany', chapter: 'Genetics & Evolution', weightage: 'High' },
  { id: 'bot7', subject: 'Botany', chapter: 'Biology & Human Welfare', weightage: 'Medium' },
  { id: 'bot8', subject: 'Botany', chapter: 'Biotechnology', weightage: 'Medium' },
  { id: 'bot9', subject: 'Botany', chapter: 'Ecology & Environment', weightage: 'High' },

  // Zoology
  { id: 'zoo1', subject: 'Zoology', chapter: 'Diversity in Living World', weightage: 'Medium' },
  { id: 'zoo2', subject: 'Zoology', chapter: 'Structural Organization in Animals', weightage: 'Medium' },
  { id: 'zoo3', subject: 'Zoology', chapter: 'Cell Structure & Function', weightage: 'High' },
  { id: 'zoo4', subject: 'Zoology', chapter: 'Human Physiology', weightage: 'High' },
  { id: 'zoo5', subject: 'Zoology', chapter: 'Reproduction', weightage: 'High' },
  { id: 'zoo6', subject: 'Zoology', chapter: 'Genetics & Evolution', weightage: 'High' },
  { id: 'zoo7', subject: 'Zoology', chapter: 'Biology & Human Welfare', weightage: 'Medium' },
  { id: 'zoo8', subject: 'Zoology', chapter: 'Biotechnology', weightage: 'Medium' },
  { id: 'zoo9', subject: 'Zoology', chapter: 'Ecology & Environment', weightage: 'High' },
];

// ============================================
// Mock Predictor
// ============================================

function interpolatePercentile(score) {
  // Find the two closest scores in the table
  for (let i = 0; i < PERCENTILE_TABLE.length - 1; i++) {
    const [scoreHigh, percHigh] = PERCENTILE_TABLE[i];
    const [scoreLow, percLow] = PERCENTILE_TABLE[i + 1];
    
    if (score <= scoreHigh && score >= scoreLow) {
      // Linear interpolation
      const ratio = (score - scoreLow) / (scoreHigh - scoreLow);
      return percLow + ratio * (percHigh - percLow);
    }
  }
  // Score higher than max
  if (score >= PERCENTILE_TABLE[0][0]) return 100.0;
  // Score lower than min
  return 0.0;
}

function estimateAIR(percentile) {
  // Rough AIR estimation based on 24 lakh aspirants
  const totalAspirants = 2400000;
  const rank = Math.round(totalAspirants * (100 - percentile) / 100);
  return Math.max(1, rank);
}

export function computeMockResult(score, category) {
  const percentile = interpolatePercentile(score);
  const air = estimateAIR(percentile);
  const cutoff = CUTOFFS[category] || CUTOFFS.Gen;
  const cutoffGap = score - cutoff;
  
  let percentileLabel;
  if (percentile >= 99.9) percentileLabel = '>99.9';
  else if (percentile >= 99) percentileLabel = percentile.toFixed(1);
  else percentileLabel = percentile.toFixed(1);

  return {
    score,
    category,
    percentile,
    percentileLabel,
    air,
    cutoff,
    cutoffGap,
    isAboveCutoff: cutoffGap >= 0,
  };
}

// ============================================
// Reddit Feed
// ============================================

const REDDIT_SUBS = ['Neet_india', 'JEENEETards', 'NEETard'];
let redditCache = { data: null, timestamp: 0 };

export async function fetchRedditFeed() {
  const now = Date.now();
  if (redditCache.data && now - redditCache.timestamp < 5 * 60 * 1000) {
    return redditCache.data;
  }

  try {
    const promises = REDDIT_SUBS.map(sub => 
      fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=10&t=day`)
        .then(res => res.json())
        .then(data => data.data.children.map(child => ({
          id: child.data.id,
          title: child.data.title,
          subreddit: sub,
          score: child.data.score,
          numComments: child.data.num_comments,
          createdUtc: child.data.created_utc,
          url: `https://reddit.com${child.data.permalink}`,
          author: child.data.author,
        })))
        .catch(() => [])
    );

    const results = await Promise.all(promises);
    const merged = results.flat()
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map(post => ({
        ...post,
        timeAgo: formatTimeAgo(post.createdUtc),
      }));

    redditCache = { data: merged, timestamp: now };
    return merged;
  } catch {
    return redditCache.data || [];
  }
}

function formatTimeAgo(createdUtc) {
  const diff = Math.floor(Date.now() / 1000 - createdUtc);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ============================================
// Syllabus Progress (AsyncStorage)
// ============================================

const SYLLABUS_KEY_PREFIX = 'haven-syllabus-';

export async function getSyllabusProgress(coupleId) {
  try {
    const key = SYLLABUS_KEY_PREFIX + coupleId;
    const stored = await AsyncStorage.getItem(key);
    const checks = stored ? JSON.parse(stored) : {};
    const total = SYLLABUS.length;
    const checked = Object.values(checks).filter(Boolean).length;
    return { total, checked, percent: total > 0 ? Math.round((checked / total) * 100) : 0, checks };
  } catch {
    return { total: SYLLABUS.length, checked: 0, percent: 0, checks: {} };
  }
}

export async function toggleSyllabusChapter(coupleId, chapterId) {
  try {
    const key = SYLLABUS_KEY_PREFIX + coupleId;
    const stored = await AsyncStorage.getItem(key);
    const checks = stored ? JSON.parse(stored) : {};
    checks[chapterId] = !checks[chapterId];
    await AsyncStorage.setItem(key, JSON.stringify(checks));
    return checks[chapterId];
  } catch {
    return false;
  }
}

// ============================================
// Mock Storage (AsyncStorage)
// ============================================

const MOCKS_KEY_PREFIX = 'haven-mocks-';

export async function getMocks(coupleId) {
  try {
    const key = MOCKS_KEY_PREFIX + coupleId;
    const stored = await AsyncStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function saveMock(coupleId, mock) {
  try {
    const mocks = await getMocks(coupleId);
    const newMock = { ...mock, id: mock.id || `${Date.now()}`, timestamp: Date.now() };
    mocks.unshift(newMock);
    await AsyncStorage.setItem(MOCKS_KEY_PREFIX + coupleId, JSON.stringify(mocks));
    return newMock;
  } catch {
    return null;
  }
}

export async function deleteMock(coupleId, mockId) {
  try {
    const mocks = await getMocks(coupleId);
    const filtered = mocks.filter(m => m.id !== mockId);
    await AsyncStorage.setItem(MOCKS_KEY_PREFIX + coupleId, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}