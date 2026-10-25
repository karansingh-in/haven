import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    AccessibilityInfo,
    ActivityIndicator,
    Alert,
    Animated,
    AppState,
    Easing,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    useWindowDimensions,
    View,
} from "react-native";
import {
    SafeAreaProvider,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
    Award,
    BarChart3,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    Eye,
    EyeOff,
    Fingerprint,
    Flame,
    GraduationCap,
    Heart,
    Hourglass,
    LogOut,
    Moon,
    Pause,
    Play,
    Plus,
    RotateCcw,
    Settings2,
    ShieldCheck,
    Sparkles,
    Square,
    Sun,
    Target,
    Timer,
    Trash2,
    TrendingUp,
    ExternalLink,
    X,
} from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import {
    useFonts as useInter,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
} from "@expo-google-fonts/inter";
import { onAuthStateChanged } from "firebase/auth";
import {
    auth,
    deleteStudySession,
    deleteTestScore,
    getUserProfile,
    loginUser,
    logoutUser,
    logStudySession,
    logTestScore,
    publishWidgetSummary,
    subscribeToCoupleData,
    updateCouplePeriods,
} from "./firebase";
import {
    achievedKeyFor,
    addGoldDay,
    backlogKeyFor,
    computeBacklog,
    computeStreak,
    DAILY_GOAL_MINUTES,
    dayKeyFor,
    DEFAULT_PREFS,
    formatBacklog,
    formatDuration,
    formatHoursShort,
    formatSignedDelta,
    formatThousands,
    goalReached,
    goldDaysKeyFor,
    gradeFor,
    loadPrefs,
    paceStatus,
    remainingCapacity,
    savePrefs,
    weekOverWeek,
} from "./backlog";
import {
    ensureNotificationSetup,
    refreshNotificationBodies,
    requestNotificationPermission,
    scheduleWeeklyReport,
    scheduleWindDown,
} from "./notifications";
import {
    NEET_EXAM_DATE,
    SUBREDDITS,
    SYLLABUS,
    computeMockResult,
    deleteMock,
    dueChapters,
    getSyllabusProgress,
    getMocks,
    saveMock,
    toggleSyllabusChapter,
} from "./src/neet";
import {
    MISTAKE_REASONS,
    addMistake,
    deleteMistake,
    dueMistakes,
    getMistakes,
    reviewMistake,
} from "./src/mistakes";
import { ACCENTS, ACCENT_OPTIONS, applyAccent, DARK, LIGHT } from "./src/palette";
import { buildWidgetPayload } from "./src/widget";

// ============================================================
// TYPE — Inter (tabular nums for figures)
// ============================================================

const DISPLAY = "Inter_700Bold";
const DISPLAY_ITALIC = "Inter_700Bold";
const BODY = "Inter_400Regular";
const BODY_MED = "Inter_500Medium";
const BODY_SEMI = "Inter_600SemiBold";
const BODY_BOLD = "Inter_700Bold";

// ============================================================
// THEMES + SHELL
// ============================================================

const THEME_KEY = "haven-appearance";
const TAB_BAR_HEIGHT = 76;

// Responsive shell. 1024pt iPad portrait is exactly the breakpoint, so the
// comparison is inclusive: the rail must appear in portrait, not only landscape.
const WIDE_BREAKPOINT = 1000;
const RAIL_WIDTH = 92;
// Reading width: a phone-width column on small screens, wider on iPad so
// Task 9's two-column content still has room to breathe.
const READING_WIDTH = { narrow: 820, wide: 1100 };

// One source of truth for the five destinations. The bottom pill and the iPad
// rail both render from this array; only their button components differ.
// `dot` is injected per render (see MainAppLayout) because it tracks the timer.
const TABS = [
  { key: "home", label: "Today", icon: Heart },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "study", label: "Study", icon: Timer },
  { key: "insights", label: "Insights", icon: TrendingUp },
  { key: "neet", label: "NEET", icon: Target },
];

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const TEXT_FIX =
  Platform.OS === "android" ? { includeFontPadding: false } : null;

// ============================================================
// THEME + PREFS
// ============================================================

const ThemeContext = createContext(null);
const PrefsContext = createContext(null);

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside ThemeProvider");
  return ctx;
}

function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState("system");
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS });

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(THEME_KEY)
      .then((stored) => {
        if (!alive) return;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreference(stored);
        }
      })
      .catch(() => {});
    loadPrefs().then((p) => {
      if (alive) setPrefs(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  const choose = useCallback((next) => {
    setPreference(next);
    AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const updatePrefs = useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const value = useMemo(() => {
    const resolved =
      preference === "system" ? systemScheme || "light" : preference;
    const base = resolved === "dark" ? DARK : LIGHT;
    return {
      c: applyAccent(base, prefs.accent),
      scheme: resolved,
      preference,
      setPreference: choose,
    };
  }, [preference, systemScheme, choose, prefs.accent]);

  const prefsValue = useMemo(
    () => ({
      prefs,
      updatePrefs,
      setPrefs: (n) => {
        setPrefs(n);
        savePrefs(n);
      },
    }),
    [prefs, updatePrefs],
  );

  return (
    <ThemeContext.Provider value={value}>
      <PrefsContext.Provider value={prefsValue}>
        {children}
      </PrefsContext.Provider>
    </ThemeContext.Provider>
  );
}

function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

function useStyles() {
  const { c } = useTheme();
  return useMemo(() => makeStyles(c), [c]);
}

// ============================================================
// DATE + DURATION HELPERS
// ============================================================

const pad = (value) => String(value).padStart(2, "0");

const formatDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateKey = (value) => {
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

const getDaysBetween = (start, end) => {
  const a = new Date(start);
  const b = new Date(end);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

const getTodayKey = () => dayKeyFor(new Date());

const formatReadableDate = (dateKey) => {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatShortDate = (dateKey) => {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const formatRelativeDate = (dateKey) => {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  const diff = getDaysBetween(date, parseDateKey(dayKeyFor()));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return formatShortDate(dateKey);
};

const formatMonthYear = (date) =>
  `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

const isValidDateKey = (value) => parseDateKey(value) !== null;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};

const HOUR_PRESETS = [0.5, 1, 2, 4, 6];
const hoursToMinutes = (hours) => Math.round(Number(hours) * 60);

// react-native-web has no Alert implementation — Alert.alert is a silent no-op
// there, which turns every destructive confirmation into a dead button. Use the
// browser's own confirm on web and the native alert everywhere else.
const confirmDestructive = ({ title, message, confirmLabel = "Delete", onConfirm }) => {
  if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.confirm === "function") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
};

const formatClock = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
};

// ============================================================
// CYCLE
// ============================================================

const normalizePeriods = (periods) => {
  if (!Array.isArray(periods)) return [];
  return periods
    .filter(
      (period) =>
        period &&
        typeof period === "object" &&
        typeof period.startDate === "string" &&
        isValidDateKey(period.startDate),
    )
    .map((period, index) => ({
      id: period.id || `${period.startDate}-${index}`,
      startDate: period.startDate,
      endDate:
        typeof period.endDate === "string" && isValidDateKey(period.endDate)
          ? period.endDate
          : null,
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
};

const getPeriodDates = (period) => {
  if (!period?.startDate) return [];
  const start = parseDateKey(period.startDate);
  if (!start) return [];
  const end = period.endDate ? parseDateKey(period.endDate) : start;
  if (!end) return [period.startDate];
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const calculateCycleStats = (periods) => {
  const validStarts = normalizePeriods(periods)
    .map((period) => period.startDate)
    .filter(Boolean)
    .sort();
  const empty = { average: null, shortest: null, longest: null, count: validStarts.length };
  if (validStarts.length < 2) return empty;
  const lengths = [];
  for (let i = 1; i < validStarts.length; i++) {
    const previous = parseDateKey(validStarts[i - 1]);
    const current = parseDateKey(validStarts[i]);
    if (!previous || !current) continue;
    const difference = getDaysBetween(previous, current);
    if (difference > 0 && difference < 100) lengths.push(difference);
  }
  if (!lengths.length) return empty;
  const average = lengths.reduce((sum, v) => sum + v, 0) / lengths.length;
  return {
    average: Math.round(average),
    shortest: Math.min(...lengths),
    longest: Math.max(...lengths),
    count: validStarts.length,
  };
};

// ============================================================
// TIMER — wall-clock based, survives backgrounding and app kill
// ============================================================

const emptyTimer = { startedAt: null, accumulatedMs: 0, running: false };

function useStudyTimer(coupleId) {
  const storageKey = coupleId ? `haven-timer-${coupleId}` : null;
  const [state, setState] = useState(emptyTimer);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!storageKey) return;
    let alive = true;
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!alive || !raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setState({
            startedAt:
              typeof parsed.startedAt === "number" ? parsed.startedAt : null,
            accumulatedMs: Number(parsed.accumulatedMs) || 0,
            running: Boolean(parsed.running) && Boolean(parsed.startedAt),
          });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [storageKey]);

  const persist = useCallback(
    (next) => {
      setState(next);
      if (!storageKey) return;
      AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
    },
    [storageKey],
  );

  useEffect(() => {
    if (!state.running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.running]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (status) => {
      if (status === "active") setNow(Date.now());
    });
    return () => sub.remove();
  }, []);

  const elapsedMs =
    state.accumulatedMs +
    (state.running && state.startedAt ? Math.max(0, now - state.startedAt) : 0);

  const start = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    persist({ startedAt: Date.now(), accumulatedMs: 0, running: true });
  }, [persist]);

  const pause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    persist({
      startedAt: null,
      accumulatedMs:
        state.accumulatedMs +
        (state.startedAt ? Math.max(0, Date.now() - state.startedAt) : 0),
      running: false,
    });
  }, [persist, state]);

  const resume = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    persist({
      startedAt: Date.now(),
      accumulatedMs: state.accumulatedMs,
      running: true,
    });
  }, [persist, state.accumulatedMs]);

  const reset = useCallback(() => persist(emptyTimer), [persist]);

  return {
    running: state.running,
    active: state.running || state.accumulatedMs > 0,
    elapsedMs,
    elapsedMinutes: Math.round(elapsedMs / 60000),
    start,
    pause,
    resume,
    reset,
  };
}

// ============================================================
// ROOT
// ============================================================

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <FontGate>
          <AppShell />
        </FontGate>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function FontGate({ children }) {
  const { c } = useTheme();
  const [fontsLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={c.tint} />
      </View>
    );
  }
  return children;
}

function AppShell() {
  const { scheme } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [coupleData, setCoupleData] = useState({
    periods: [],
    studyLogs: [],
    recentSubjects: [],
    testScores: [],
  });
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const cacheKey = `haven-profile-${currentUser.uid}`;
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          setProfile(JSON.parse(cached));
          setLoading(false);
        }
      } catch {}
      try {
        setProfileLoading(true);
        const userProfile = await getUserProfile(currentUser.uid);
        if (userProfile) {
          setProfile(userProfile);
          AsyncStorage.setItem(cacheKey, JSON.stringify(userProfile)).catch(() => {});
        }
      } catch (error) {
        console.error("Profile loading error:", error);
        setProfile((prev) => {
          if (!prev) {
            Alert.alert(
              "Profile didn't load",
              "You're signed in, but Haven couldn't read your profile. Check your connection and try again.",
            );
          }
          return prev;
        });
      } finally {
        setProfileLoading(false);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!profile?.coupleId) return;
    const unsubscribe = subscribeToCoupleData(profile.coupleId, (data) => {
      setCoupleData({
        periods: Array.isArray(data.periods) ? data.periods : [],
        studyLogs: Array.isArray(data.studyLogs) ? data.studyLogs : [],
        recentSubjects: Array.isArray(data.recentSubjects) ? data.recentSubjects : [],
        testScores: Array.isArray(data.testScores) ? data.testScores : [],
      });
    });
    return unsubscribe;
  }, [profile?.coupleId]);

  const bar = (
    <StatusBar
      translucent
      backgroundColor="transparent"
      barStyle={scheme === "dark" ? "light-content" : "dark-content"}
    />
  );

  if (loading || profileLoading) {
    return (
      <View style={styles.root}>
        {bar}
        <LoadingScreen />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.root}>
        {bar}
        <AuthScreen />
      </View>
    );
  }

  if (!profile?.coupleId) {
    return (
      <View style={styles.root}>
        {bar}
        <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Text style={styles.emptyTitle}>Not paired yet</Text>
          <Text style={styles.emptyBody}>
            Haven syncs between two people. Pair this account to begin.
          </Text>
          <Pressable style={styles.filledButton} onPress={logoutUser} accessibilityRole="button">
            <Text style={styles.filledButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {bar}
      <MainAppLayout profile={profile} coupleData={coupleData} coupleId={profile.coupleId} />
    </View>
  );
}

// ============================================================
// LOADING + AUTH
// ============================================================

function LoadingScreen() {
  const { c } = useTheme();
  const styles = useStyles();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  return (
    <View style={styles.center}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Image source={require("./assets/images/icon.png")} style={styles.splashIcon} />
      </Animated.View>
      <Text style={styles.loadingTitle}>Haven</Text>
      <ActivityIndicator color={c.tint} style={{ marginTop: 14 }} />
    </View>
  );
}

function AuthScreen() {
  const { c } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Enter both your email and password.");
      return;
    }
    try {
      setSigningIn(true);
      await loginUser(email.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Login error:", error);
      let message = "Something went wrong. Try again in a moment.";
      if (error?.code === "auth/invalid-credential") {
        message = "That email and password don't match an account.";
      } else if (error?.code === "auth/invalid-email") {
        message = "That email address isn't valid.";
      } else if (error?.code === "auth/too-many-requests") {
        message = "Too many attempts. Wait a minute before trying again.";
      } else if (error?.code === "auth/network-request-failed") {
        message = "No connection. Check your network and try again.";
      }
      Alert.alert("Sign in failed", message);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.authScroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <View style={styles.authHead}>
            <View style={styles.authIconWrap}>
              <Image source={require("./assets/images/icon.png")} style={styles.authIcon} resizeMode="contain" />
            </View>
            <Text style={styles.authTitle}>Haven</Text>
            <Text style={styles.authSubtitle}>Your quiet corner for focus days.</Text>
          </View>
        </Rise>

        <Rise delay={90}>
          <View style={styles.fieldCard}>
            <Text style={styles.fieldEyebrow}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              accessibilityLabel="Email"
              placeholder="you@example.com"
              placeholderTextColor={c.label3}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              style={styles.fieldBig}
            />
            <View style={styles.fieldDivider} />
            <View style={styles.passwordRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldEyebrow}>PASSWORD</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  accessibilityLabel="Password"
                  placeholder="Required"
                  placeholderTextColor={c.label3}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  style={styles.fieldBig}
                  onSubmitEditing={handleLogin}
                  returnKeyType="go"
                />
              </View>
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={12}
                style={styles.eyeButton}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={19} color={c.label3} /> : <Eye size={19} color={c.label3} />}
              </Pressable>
            </View>
          </View>
        </Rise>

        <Rise delay={170}>
          <Pressable
            onPress={handleLogin}
            disabled={signingIn}
            accessibilityRole="button"
            aria-busy={signingIn}
            style={({ pressed }) => [styles.ctaWrap, pressed && { transform: [{ scale: 0.98 }], opacity: 0.94 }, signingIn && { opacity: 0.6 }]}
          >
            <LinearGradient colors={c.tintGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              {signingIn ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Enter Haven</Text>}
            </LinearGradient>
          </Pressable>
          <Text style={styles.authFootnote}>You'll stay signed in on this phone.</Text>
        </Rise>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// LAYOUT — floating pill tab bar
// ============================================================

// Re-renders once a minute so day-dependent memos recompute when the 3am
// logical day rolls over, without waiting for user interaction.
function useMinuteTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

// Honours the OS "Reduce Motion" setting. Defined here because the 8-hour
// celebration is the first animation that must respect it (Task 19 reuses this).
function useReducedMotion() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setOn(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

// ============================================================
// RESPONSIVE SHELL
// ============================================================

// Width comes from useWindowDimensions on every render, so rotation, Split
// View and Stage Manager resizes re-lay-out live. Never Dimensions.get.
function useLayout() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isWide: width >= WIDE_BREAKPOINT,
    isTablet: width >= 744,
  };
}

// Two columns on wide screens, stacked below the breakpoint. Task 9 consumes
// this; the shell only provides it.
function Split({ left, right, gap = 20 }) {
  const { isWide } = useLayout();
  const column = isWide ? { flex: 1, minWidth: 0 } : null;
  return (
    // No gap when stacked: the cards' own margins already set phone spacing,
    // and an inserted gap would shift the phone layout by that amount.
    <View style={{ flexDirection: isWide ? "row" : "column", gap: isWide ? gap : 0 }}>
      <View style={column}>{left}</View>
      <View style={column}>{right}</View>
    </View>
  );
}

function MainAppLayout({ profile, coupleData, coupleId }) {
  const { scheme } = useTheme();
  const { prefs } = usePrefs();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();
  // The browser build has no scheduled notifications, no widget and no
  // biometric API; every native-only effect below is skipped there.
  const isWeb = Platform.OS === "web";

  const [tab, setTab] = useState("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [celebration, setCelebration] = useState(null);
  // Goal-met days, persisted per couple. Loaded and written here; the overlay
  // shows the running count and Calendar/Insights read the same list.
  const [goldDays, setGoldDays] = useState([]);
  // Previous day total, so the goal celebration fires only on the crossing.
  const prevTodayRef = useRef(0);

  const timer = useStudyTimer(coupleId);
  const tick = useMinuteTick();
  // `tick` is not read inside the memos: it only schedules a recompute so the
  // 3am rollover lands without waiting for the next user interaction.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const backlog = useMemo(() => computeBacklog(coupleData.studyLogs), [coupleData.studyLogs, tick]);
  const daysLeft = Math.max(0, Math.floor((new Date(`${NEET_EXAM_DATE}T00:00:00`).getTime() - Date.now()) / 86400000));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const streak = useMemo(() => computeStreak(coupleData.studyLogs), [coupleData.studyLogs, tick]);

  useEffect(() => {
    if (isWeb) return;
    ensureNotificationSetup();
    requestNotificationPermission().then((granted) => {
      if (!granted) return;
      scheduleWindDown({ hour: prefs.windDownHour, minute: prefs.windDownMinute, enabled: prefs.windDownEnabled });
      scheduleWeeklyReport({ weekday: prefs.weeklyWeekday, hour: prefs.weeklyHour, minute: prefs.weeklyMinute, enabled: prefs.weeklyReportEnabled });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scheduleWindDown({ hour: prefs.windDownHour, minute: prefs.windDownMinute, enabled: prefs.windDownEnabled });
    scheduleWeeklyReport({ weekday: prefs.weeklyWeekday, hour: prefs.weeklyHour, minute: prefs.weeklyMinute, enabled: prefs.weeklyReportEnabled });
  }, [prefs.windDownEnabled, prefs.windDownHour, prefs.windDownMinute, prefs.weeklyReportEnabled, prefs.weeklyWeekday, prefs.weeklyHour, prefs.weeklyMinute]);

  useEffect(() => {
    const id = setTimeout(() => {
      refreshNotificationBodies({
        todayText: `${formatDuration(backlog.todayMinutes)} studied`,
        backlogText: backlog.balanceMinutes === 0 ? "backlog clear" : formatBacklog(backlog.balanceMinutes),
        streak,
        daysLeft,
      });
    }, 1500);
    return () => clearTimeout(id);
  }, [backlog.todayMinutes, backlog.balanceMinutes, streak, daysLeft]);

  // Publish the home-screen summary. Runs on web too — the PWA is the primary
  // writer. Debounced 2s because `backlog` recomputes on every tick and each
  // write is a network round trip. A failed write stays silent: a widget that
  // is a few minutes stale is not worth interrupting a session.
  useEffect(() => {
    if (!coupleId) return undefined;
    const id = setTimeout(() => {
      publishWidgetSummary(
        coupleId,
        buildWidgetPayload({
          todayMinutes: backlog.todayMinutes,
          streak,
          balanceMinutes: backlog.balanceMinutes,
          daysLeft,
          goldDays,
        }),
      ).catch(() => {});
    }, 2000);
    return () => clearTimeout(id);
  }, [coupleId, backlog.todayMinutes, backlog.balanceMinutes, streak, daysLeft, goldDays]);

  const lastActive = useRef(Date.now());
  useEffect(() => {
    if (isWeb) return;
    const sub = AppState.addEventListener("change", (status) => {
      if (status === "background" || status === "inactive") {
        lastActive.current = Date.now();
      }
      if (status === "active") {
        if (!prefs.lockEnabled) return;
        if (timer.running) return; // never interrupt a running focus timer
        const awaySec = (Date.now() - lastActive.current) / 1000;
        if (awaySec >= (prefs.lockDelaySec || 0)) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [prefs.lockEnabled, prefs.lockDelaySec, timer.running]);

  useEffect(() => {
    if (isWeb) return;
    if (prefs.lockEnabled && !timer.running) {
      const id = setTimeout(() => setLocked(true), 600);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!coupleId) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(goldDaysKeyFor(coupleId));
        // addGoldDay normalises: corrupt or non-array JSON loads as [].
        const days = raw ? addGoldDay(JSON.parse(raw)) : [];
        if (cancelled) return;
        // Merge into whatever is already in state instead of replacing it: a
        // celebration write can land while this read is in flight, and
        // replacing would drop the gold day it just recorded.
        setGoldDays((current) => days.reduce((acc, key) => addGoldDay(acc, key), current));
      } catch {
        // Keep the in-memory list rather than wiping a newer write.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coupleId]);

  useEffect(() => {
    if (!coupleId) return;
    const check = async () => {
      // Read then write inside the debounced callback, never at effect start:
      // a rapid 470 -> 480 sequence must still judge 470 as the previous total.
      const prevToday = prevTodayRef.current;
      try {
        const achievedRaw = await AsyncStorage.getItem(achievedKeyFor(coupleId));
        const achievedDate = achievedRaw || "";
        // Only consume the previous total once the read succeeded: a transient
        // AsyncStorage throw must not permanently skip that day's celebration.
        prevTodayRef.current = backlog.todayMinutes;
        if (goalReached(prevToday, backlog.todayMinutes) && achievedDate !== backlog.todayKey) {
          await AsyncStorage.setItem(achievedKeyFor(coupleId), backlog.todayKey);
          setCelebration({ kind: "goal", detail: `${formatDuration(backlog.todayMinutes)} logged today.` });
          // Gold-day bookkeeping never blocks the overlay above.
          try {
            const goldRaw = await AsyncStorage.getItem(goldDaysKeyFor(coupleId));
            let stored = [];
            try {
              stored = goldRaw ? JSON.parse(goldRaw) : [];
            } catch {
              stored = []; // corrupt JSON must not lose the day
            }
            const next = addGoldDay(stored, backlog.todayKey);
            await AsyncStorage.setItem(goldDaysKeyFor(coupleId), JSON.stringify(next));
            setGoldDays(next);
          } catch {}
          return;
        }
        const prevRaw = await AsyncStorage.getItem(backlogKeyFor(coupleId));
        const prev = Number(prevRaw);
        if (Number.isFinite(prev) && prev > 0 && backlog.balanceMinutes < prev) {
          setCelebration({ kind: "backlog", detail: `Backlog cut to ${formatDuration(backlog.balanceMinutes)}.` });
        }
        await AsyncStorage.setItem(backlogKeyFor(coupleId), String(backlog.balanceMinutes));
      } catch {}
    };
    const id = setTimeout(check, 800);
    return () => clearTimeout(id);
  }, [backlog.todayMinutes, backlog.balanceMinutes, backlog.todayKey, coupleId]);

  const go = (next) => {
    if (next !== tab) Haptics.selectionAsync().catch(() => {});
    setTab(next);
  };

  // Same TABS array as the rail, with the running-timer dot resolved here so
  // both bars stay in sync off one definition.
  const tabs = useMemo(
    () => TABS.map((t) => ({ ...t, dot: t.key === "study" && timer.running })),
    [timer.running],
  );

  const screen = () => {
    if (tab === "calendar") return <CalendarScreen coupleData={coupleData} coupleId={coupleId} goldDays={goldDays} />;
    if (tab === "study") {
      return (
        <StudyScreen
          coupleData={coupleData}
          coupleId={coupleId}
          timer={timer}
          backlog={backlog}
          streak={streak}
        />
      );
    }
    if (tab === "insights") {
      return <InsightsScreen coupleData={coupleData} coupleId={coupleId} backlog={backlog} streak={streak} goldDays={goldDays} />;
    }
    if (tab === "neet") {
      return <NeetScreen coupleId={coupleId} />;
    }
    return (
      <HomeScreen
        coupleData={coupleData}
        timer={timer}
        backlog={backlog}
        streak={streak}
        onNavigate={go}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, flexDirection: isWide ? "row" : "column" }}>
        {isWide ? <Rail tabs={tabs} active={tab} onPress={go} /> : null}
        <View style={{ flex: 1 }}>{screen()}</View>
      </View>

      {isWide ? null : (
        <View style={[styles.pillBar, { bottom: insets.bottom + 14 }]}>
          <BlurView intensity={scheme === "dark" ? 50 : 80} tint={scheme} style={StyleSheet.absoluteFill} />
          <View style={styles.pillRow}>
            {tabs.map((t) => (
              <TabButton
                key={t.key}
                icon={t.icon}
                label={t.label}
                active={tab === t.key}
                dot={t.dot}
                onPress={() => go(t.key)}
              />
            ))}
          </View>
        </View>
      )}

      <SettingsSheet visible={settingsOpen} profile={profile} onClose={() => setSettingsOpen(false)} onLockNow={() => setLocked(true)} />
      <CelebrationOverlay
        visible={Boolean(celebration)}
        kind={celebration?.kind}
        detail={celebration?.detail}
        goldDayCount={goldDays.length}
        onDismiss={() => setCelebration(null)}
      />
      {isWeb ? null : <LockScreen visible={locked} timerRunning={timer.running} onUnlock={() => setLocked(false)} />}
    </View>
  );
}

function TabButton({ icon: Icon, label, active, dot, onPress }) {
  const { c } = useTheme();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const pop = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      pop.setValue(active ? 1 : 0);
      return;
    }
    Animated.spring(pop, { toValue: active ? 1 : 0, useNativeDriver: true, damping: 12, stiffness: 220 }).start();
  }, [active, pop, reduceMotion]);

  return (
    <Pressable
      onPress={onPress}
      style={styles.pillTab}
      hitSlop={6}
      accessibilityRole="tab"
      aria-selected={active}
      accessibilityLabel={label}
    >
      {active ? (
        <Animated.View
          style={[
            styles.pillActive,
            {
              backgroundColor: c.tint,
              transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
            },
          ]}
        />
      ) : null}
      <View>
        <Icon size={21} color={active ? "#FFFFFF" : c.label3} strokeWidth={active ? 2.4 : 1.9} />
        {dot ? <View style={styles.pillDot} /> : null}
      </View>
      <Text style={[styles.pillLabel, active ? { color: "#FFFFFF", fontFamily: BODY_SEMI } : { color: c.label3 }]}>{label}</Text>
    </Pressable>
  );
}

function Rail({ tabs, active, onPress }) {
  const { c } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.rail,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: c.bg,
          borderRightColor: c.separator,
        },
      ]}
    >
      {tabs.map((t) => (
        <RailButton
          key={t.key}
          icon={t.icon}
          label={t.label}
          active={active === t.key}
          dot={t.dot}
          onPress={() => onPress(t.key)}
        />
      ))}
    </View>
  );
}

// Vertical sibling of TabButton. The pill's capsule background is shaped for a
// horizontal bar, so the rail gets its own tintSoft rounded rect instead.
function RailButton({ icon: Icon, label, active, dot, onPress }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      aria-selected={active}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.railTab,
        active && { backgroundColor: c.tintSoft },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View>
        <Icon size={22} color={active ? c.tint : c.label3} strokeWidth={active ? 2.4 : 1.9} />
        {dot ? <View style={[styles.railDot, { backgroundColor: c.tint }]} /> : null}
      </View>
      <Text style={[styles.railLabel, { color: active ? c.label : c.label3 }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// ============================================================
// PRIMITIVES
// ============================================================

function Rise({ children, delay = 0, style }) {
  // Honour Reduce Motion: no entrance animation at all, content simply present.
  const reduceMotion = useReducedMotion();
  const a = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) {
      a.setValue(1);
      return undefined;
    }
    const t = Animated.timing(a, {
      toValue: 1,
      duration: 480,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    t.start();
    return () => t.stop();
  }, [a, delay, reduceMotion]);
  if (reduceMotion) return <View style={style}>{children}</View>;
  return (
    <Animated.View
      style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

function ScreenScroll({ children, extraBottom = 0, refreshControl }) {
  const { c } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={refreshControl}
        contentContainerStyle={[
          styles.screenContent,
          {
            // Cap the reading measure and centre it. The width has to stay
            // fluid (maxWidth, not a fixed width) so Task 9's columns fit.
            width: "100%",
            maxWidth: isWide ? READING_WIDTH.wide : READING_WIDTH.narrow,
            alignSelf: "center",
            paddingTop: insets.top + 12,
            // The pill bar is gone on wide screens, so its clearance is too.
            paddingBottom: (isWide ? 0 : TAB_BAR_HEIGHT) + insets.bottom + 30 + extraBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function Card({ children, style, onPress }) {
  const styles = useStyles();
  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, style, pressed && { transform: [{ scale: 0.98 }], opacity: 0.94 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// `flush` drops the 24pt top margin for a header that opens a wide column,
// so both columns start on the same line.
function SectionHeader({ title, trailing, flush }) {
  const styles = useStyles();
  return (
    <View style={[styles.sectionHeader, flush && { marginTop: 0 }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {trailing}
    </View>
  );
}

function Progress({ value, color }) {
  const { c } = useTheme();
  const styles = useStyles();
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.max(0, Math.min(1, value || 0)),
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, width]);
  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: color || c.tint,
            width: width.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
          },
        ]}
      />
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function Ring({ size = 120, stroke = 12, progress = 0, trackColor, fillColor, children }) {
  const v = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();
  const target = Math.max(0, Math.min(1, progress || 0));
  useEffect(() => {
    if (reduceMotion) {
      v.setValue(target);
      return undefined;
    }
    const animation = Animated.timing(v, {
      toValue: target,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [target, v, reduceMotion]);
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const C = 2 * Math.PI * r;
  const offset = v.interpolate({ inputRange: [0, 1], outputRange: [C, 0] });
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }} accessible={false}>
        <Circle cx={cx} cy={cx} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" opacity={0.3} />
        <AnimatedCircle
          cx={cx}
          cy={cx}
          r={r}
          stroke={fillColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cx}`}
        />
      </Svg>
      {children}
    </View>
  );
}

function Segmented({ options, value, onChange }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(option.value);
            }}
            style={[styles.segment, active && { backgroundColor: c.tint }]}
            accessibilityRole="radio"
            aria-checked={active}
            accessibilityLabel={option.label}
          >
            {option.icon ? (
              <option.icon size={14} color={active ? "#FFFFFF" : c.label2} strokeWidth={2.2} />
            ) : null}
            <Text style={[styles.segmentText, active && { color: "#FFFFFF", fontFamily: BODY_SEMI }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Sheet({ visible, title, subtitle, onClose, children }) {
  const { c } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  // A percentage maxHeight resolves against an auto-height wrapper on web, so
  // tall sheets used to grow past the top of the screen with no way to scroll
  // to the header. A numeric cap works on both platforms.
  const { height: windowHeight } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss sheet" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12, maxHeight: windowHeight * 0.9 }]}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{title}</Text>
                {subtitle ? <Text style={styles.sheetSubtitle}>{subtitle}</Text> : null}
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={styles.sheetClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={18} color={c.label2} strokeWidth={2.2} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Fab({ label, icon: Icon = Plus, onPress }) {
  const { c } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.fabWrap,
        // The pill bar is absent on wide screens, so its clearance is too —
        // matching ScreenScroll's bottom padding.
        { bottom: (isWide ? 0 : TAB_BAR_HEIGHT) + insets.bottom + 16 },
        pressed && { transform: [{ scale: 0.95 }], opacity: 0.92 },
      ]}
    >
      <LinearGradient colors={c.tintGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
        <Icon size={22} color="#FFFFFF" strokeWidth={2.6} />
        <Text style={styles.fabText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

// ============================================================
// CELEBRATION + LOCK + TEST SHEET
// ============================================================

function ConfettiField({ colors }) {
  const pieces = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 40; i++) {
      arr.push({
        x: (i * 97) % 360,
        y: ((i * 53) % 280) + 10,
        color: colors[i % colors.length],
      });
    }
    return arr;
  }, [colors]);
  return (
    <Svg width="100%" height={300} viewBox="0 0 360 300" style={{ width: "100%" }} accessible={false}>
      {pieces.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={4} fill={p.color} opacity={0.9} />
      ))}
    </Svg>
  );
}

function CelebrationOverlay({ visible, kind, detail, onDismiss, goldDayCount = 0 }) {
  const { c } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  // Keeps the entrance from replaying every parent render (the minute tick)
  // without re-running the 3s backlog timer either.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
    } else {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }),
        Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // The 8-hour moment waits for the user; only the backlog card auto-dismisses.
    if (kind === "goal") return undefined;
    const id = setTimeout(() => dismissRef.current?.(), 3000);
    return () => clearTimeout(id);
  }, [visible, kind, reduceMotion, scale, opacity]);
  if (!visible) return null;

  if (kind === "goal") {
    return (
      <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
        <Pressable
          style={[styles.goalStage, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
          onPress={onDismiss}
        >
          <LinearGradient
            colors={["rgba(10,132,255,0.22)", "transparent", "rgba(90,200,168,0.16)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {reduceMotion ? null : (
            <View pointerEvents="none" style={styles.goalConfetti}>
              <ConfettiField colors={[c.tint, "#FFFFFF", c.gold, c.mint, c.rose]} />
            </View>
          )}
          <Animated.View style={[styles.goalContent, { opacity, transform: [{ scale }] }]}>
            <View style={styles.goalCentre}>
              <Ring
                size={280}
                stroke={20}
                progress={1}
                trackColor="rgba(255,255,255,0.10)"
                fillColor={c.tint}
              >
                <Text style={styles.goalRingFigure}>8h</Text>
                <Text style={styles.goalRingLabel}>of 8h</Text>
              </Ring>
              <Text style={styles.goalTitle}>Eight hours.</Text>
              <Text style={styles.goalSub}>{detail || "The whole day, kept."}</Text>
              {goldDayCount > 0 ? (
                <View style={styles.goalGoldPill}>
                  <Sparkles size={12} color={c.gold} />
                  <Text style={styles.goalGoldPillText}>Gold day #{goldDayCount}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.goalFooter}>
              <Pressable
                onPress={onDismiss}
                accessibilityRole="button"
                style={({ pressed }) => [styles.goalButton, pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] }]}
              >
                <Text style={styles.goalButtonText}>Keep going</Text>
              </Pressable>
              <Text style={styles.goalHint}>Tap anywhere to continue</Text>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  }

  const sub = detail || "Extra hours burned it down.";
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <Pressable style={styles.celebrateBackdrop} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss celebration">
        <Animated.View style={[styles.celebrateCard, { opacity, transform: [{ scale }] }]}>
          <LinearGradient colors={c.tintGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.celebrateTop} />
          {reduceMotion ? null : <ConfettiField colors={[c.tint, "#FFFFFF", c.gold, c.mint, c.rose]} />}
          <View style={styles.celebrateBadge}>
            <Award size={26} color="#FFFFFF" accessible={false} />
          </View>
          <Text style={styles.celebrateTitle}>Backlog melting.</Text>
          <Text style={styles.celebrateSub}>{sub}</Text>
          <View style={styles.celebratePill}>
            <Sparkles size={13} color={c.tint} />
            <Text style={styles.celebratePillText}>Tap anywhere to continue</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function LockScreen({ visible, onUnlock, timerRunning }) {
  const { c } = useTheme();
  const { prefs } = usePrefs();
  const styles = useStyles();
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const name = prefs.displayName?.trim() || "Chaaru";
  if (!visible) return null;
  const attempt = async () => {
    // Biometrics do not exist in the browser build; never import the native
    // module there.
    if (Platform.OS === "web") {
      setError("Fingerprint unlock isn't available in the browser.");
      return;
    }
    let LocalAuth = null;
    try {
      LocalAuth = await import("expo-local-authentication");
    } catch {
      setError("Fingerprint isn't available in this build yet.");
      return;
    }
    try {
      setChecking(true);
      setError("");
      const has = await LocalAuth.hasHardwareAsync().catch(() => false);
      if (!has) {
        setError("This device has no biometric hardware.");
        return;
      }
      const enrolled = await LocalAuth.isEnrolledAsync().catch(() => false);
      if (!enrolled) {
        setError("No fingerprint enrolled. Add one in phone Settings.");
        return;
      }
      const res = await LocalAuth.authenticateAsync({
        promptMessage: "Unlock Haven",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });
      if (res?.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onUnlock();
      } else {
        setError("Couldn't verify. Tap to try again.");
      }
    } finally {
      setChecking(false);
    }
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
      <BlurView intensity={70} tint="dark" style={styles.lockBackdrop}>
        <View style={styles.lockCard}>
          <View style={[styles.lockGlyph, { backgroundColor: c.tintSoft }]}>
            <Fingerprint size={34} color={c.tint} accessible={false} />
          </View>
          <Text style={styles.lockTitle}>Haven is locked</Text>
          <Text style={styles.lockSub}>
            {timerRunning ? "A focus timer is running — hop straight back in." : `${name}, prove it's you.`}
          </Text>
          {error ? <Text style={styles.lockError}>{error}</Text> : null}
          <Pressable
            onPress={timerRunning ? onUnlock : attempt}
            style={({ pressed }) => [styles.lockButton, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel={timerRunning ? "Continue, timer running" : "Unlock with fingerprint"}
          >
            <LinearGradient colors={c.tintGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.lockButtonInner}>
              {checking ? <ActivityIndicator color="#fff" /> : <ShieldCheck size={18} color="#fff" />}
              <Text style={styles.lockButtonText}>{timerRunning ? "Continue (timer running)" : "Unlock with fingerprint"}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </BlurView>
    </Modal>
  );
}

function TestSheet({ visible, onClose, onSave }) {
  const { c } = useTheme();
  const styles = useStyles();
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [total, setTotal] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setName("");
    setScore("");
    setTotal("");
    setSaving(false);
  }, [visible]);
  const submit = async () => {
    const s = Number(score);
    const t = Number(total);
    if (!name.trim()) {
      Alert.alert("Missing name", "Give the test a name, e.g. Physics Ch. 4.");
      return;
    }
    if (!Number.isFinite(s) || !Number.isFinite(t) || t <= 0 || s < 0) {
      Alert.alert("Check scores", "Enter score and out-of total as numbers.");
      return;
    }
    if (s > t) {
      Alert.alert("Check scores", "Score can't be more than the total.");
      return;
    }
    try {
      setSaving(true);
      await onSave({ name: name.trim(), score: s, total: t, date: getTodayKey(), timestamp: Date.now() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      Alert.alert("Not saved", "Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };
  const pct = Number(total) > 0 ? (Number(score) / Number(total)) * 100 : 0;
  return (
    <Sheet
      visible={visible}
      title="Log test score"
      subtitle={Number(total) > 0 ? `${Math.round(pct)}% · ${pct >= 85 ? "Excellent" : pct >= 70 ? "Good" : "Needs work"}` : "Score and out-of total."}
      onClose={onClose}
    >
      <View style={styles.group}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Test</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Physics Ch. 4" placeholderTextColor={c.label3} accessibilityLabel="Test name" style={styles.fieldInput} />
        </View>
        <View style={styles.separatorInset} />
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Score</Text>
          <TextInput value={score} onChangeText={(t) => setScore(t.replace(/[^0-9.]/g, ""))} placeholder="42" placeholderTextColor={c.label3} keyboardType="decimal-pad" accessibilityLabel="Score" style={[styles.fieldInput, { textAlign: "right" }]} />
          <Text style={styles.fieldSuffix}>/</Text>
          <TextInput value={total} onChangeText={(t) => setTotal(t.replace(/[^0-9.]/g, ""))} placeholder="50" placeholderTextColor={c.label3} keyboardType="decimal-pad" accessibilityLabel="Total marks" style={[styles.fieldInput, { textAlign: "right", flex: 0.5 }]} />
        </View>
      </View>
      <Pressable
        onPress={submit}
        disabled={saving}
        accessibilityRole="button"
        aria-busy={saving}
        style={({ pressed }) => [styles.ctaWrap, pressed && { transform: [{ scale: 0.98 }] }]}
      >
        <LinearGradient colors={c.tintGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Save score</Text>}
        </LinearGradient>
      </Pressable>
    </Sheet>
  );
}

// ============================================================
// TODAY
// ============================================================

function HomeScreen({ coupleData, timer, backlog, streak, onNavigate, onOpenSettings }) {
  const { c } = useTheme();
  const { prefs } = usePrefs();
  const styles = useStyles();
  const { isWide } = useLayout();
  const name = prefs.displayName?.trim() || "Chaaru";
  const affirmation = prefs.affirmation?.trim() || DEFAULT_PREFS.affirmation;
  const today = getTodayKey();

  const periods = normalizePeriods(coupleData.periods);
  const latestPeriod = periods.length ? periods[periods.length - 1] : null;
  const cycleStats = calculateCycleStats(periods);
  const cycleDay = latestPeriod
    ? Math.max(1, getDaysBetween(parseDateKey(latestPeriod.startDate), new Date()) + 1)
    : null;

  const todayLogs = coupleData.studyLogs?.filter((log) => log?.date === today) || [];
  const todayMinutes = todayLogs.reduce((sum, log) => sum + (Number(log.duration) || 0), 0);
  const backlogMinutes = backlog?.balanceMinutes ?? 0;
  const pct = Math.round((todayMinutes / DAILY_GOAL_MINUTES) * 100);
  const goalDone = todayMinutes >= DAILY_GOAL_MINUTES;

  // Pace is judged against the 03:00-anchored day, so it is only meaningful once
  // something is logged or the morning has started. At 04:00 with nothing done
  // there is no story to tell.
  const pace = paceStatus(todayMinutes);
  const showPace = todayMinutes > 0 || new Date().getHours() >= 6;

  return (
    <ScreenScroll>
      <Split
        gap={24}
        left={
          <>
            <Rise>
              <View style={styles.homeHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eyebrow}>{formatReadableDate(today).toUpperCase()}</Text>
                  <Text style={styles.heroGreeting} numberOfLines={2}>
                    Good {getGreeting()},{"\n"}
                    <Text style={styles.heroGreetingItalic}>{name}.</Text>
                  </Text>
                  <Text style={styles.affirmation}>{affirmation}</Text>
                </View>
                <Pressable
                  onPress={onOpenSettings}
                  hitSlop={8}
                  style={({ pressed }) => pressed && { opacity: 0.6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                >
                  <LinearGradient colors={c.tintGradient} style={styles.avatar}>
                    <Settings2 size={19} color="#FFFFFF" strokeWidth={2.2} />
                  </LinearGradient>
                </Pressable>
              </View>
            </Rise>

            <Rise delay={80}>
              <Pressable
                onPress={() => onNavigate("study")}
                accessibilityRole="button"
                accessibilityLabel={`Today's focus, ${formatHoursShort(todayMinutes)} hours studied, open the timer`}
                style={({ pressed }) => [styles.heroCard, pressed && { transform: [{ scale: 0.99 }], opacity: 0.96 }]}
              >
                <LinearGradient colors={c.tintGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCardInner}>
                  <View style={styles.heroGlow} />
                  <View style={styles.heroRow}>
                    <View style={{ alignItems: "center", gap: 8 }}>
                      <Ring size={128} stroke={13} progress={todayMinutes / DAILY_GOAL_MINUTES} trackColor="rgba(255,255,255,0.35)" fillColor="#FFFFFF">
                        <View style={{ alignItems: "center" }}>
                          <Text style={styles.heroRingValue}>{formatHoursShort(todayMinutes)}h</Text>
                          <Text style={styles.heroRingCaption}>{goalDone ? "complete" : `${pct}% of 8h`}</Text>
                        </View>
                      </Ring>
                      {showPace ? (
                        <View style={styles.heroPace}>
                          <View style={[styles.heroPaceDot, { backgroundColor: pace.tone === "ahead" ? "#8FE3C8" : pace.tone === "behind" ? "#FFD98A" : "rgba(255,255,255,0.7)" }]} />
                          <Text style={styles.heroPaceText}>{pace.text}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.heroKicker}>{goalDone ? "GOLD DAY" : "TODAY'S FOCUS"}</Text>
                      <Text style={styles.heroLine}>
                        {goalDone ? "Eight hours, protected." : `${formatDuration(Math.max(0, DAILY_GOAL_MINUTES - todayMinutes))} to 8 hours.`}
                      </Text>
                      <View style={styles.heroMetaRow}>
                        <View style={styles.heroPill}>
                          <Flame size={12} color="#FFFFFF" />
                          <Text style={styles.heroPillText}>{streak ?? 0} day streak</Text>
                        </View>
                        <View style={styles.heroPill}>
                          <Hourglass size={12} color="#FFFFFF" />
                          <Text style={styles.heroPillText}>{backlogMinutes === 0 ? "Backlog clear" : formatBacklog(backlogMinutes)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            </Rise>
          </>
        }
        right={
          <>
            <Rise delay={140}>
              <SectionHeader flush={isWide} title="At a glance" trailing={<Text style={styles.sectionDate}>{todayLogs.length} session{todayLogs.length === 1 ? "" : "s"}</Text>} />
              <View style={styles.trioRow}>
                <Card style={styles.trioMain} onPress={() => onNavigate("study")}>
                  <View style={[styles.glyph, { backgroundColor: c.tintSoft }]}>
                    <Timer size={18} color={c.tint} />
                  </View>
                  <Text style={styles.trioValue}>{formatDuration(todayMinutes)}</Text>
                  <Text style={styles.trioLabel}>Studied today</Text>
                  <Text style={styles.trioLink}>{timer.running ? "Timer running — open" : "Open timer"}</Text>
                </Card>
                <View style={styles.trioCol}>
                  <Card style={styles.trioSmall}>
                    <Flame size={18} color={c.gold} />
                    <Text style={styles.trioValueSmall}>{streak ?? 0}<Text style={styles.trioUnit}> days</Text></Text>
                    <Text style={styles.trioLabel}>Streak</Text>
                  </Card>
                  <Card style={styles.trioSmall}>
                    <Hourglass size={18} color={backlogMinutes === 0 ? c.mint : c.gold} />
                    <Text style={styles.trioValueSmall}>{backlogMinutes === 0 ? "Clear" : `${formatHoursShort(backlogMinutes)}h`}</Text>
                    <Text style={styles.trioLabel}>Backlog</Text>
                  </Card>
                </View>
              </View>
            </Rise>

            {timer.active ? (
              <Rise delay={190}>
                <Card style={styles.liveTimer} onPress={() => onNavigate("study")}>
                  <View style={[styles.liveDot, { backgroundColor: timer.running ? c.mint : c.gold }]} />
                  <Text style={styles.liveTimerText}>{timer.running ? "Timer running" : "Timer paused"}</Text>
                  <Text style={styles.liveTimerClock}>{formatClock(timer.elapsedMs)}</Text>
                </Card>
              </Rise>
            ) : null}

            <Rise delay={220}>
              <SectionHeader title="Cycle" trailing={<Pressable onPress={() => onNavigate("calendar")} hitSlop={8} accessibilityRole="button"><Text style={styles.link}>Open calendar</Text></Pressable>} />
              <Card style={styles.cycleCard} onPress={() => onNavigate("calendar")}>
                <View style={styles.cycleMain}>
                  <View style={[styles.cycleCircle, { backgroundColor: c.roseSoft }]}>
                    <Heart size={23} color={c.rose} fill={c.rose} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cycleLabel}>{cycleDay ? `Cycle day ${cycleDay}` : "Cycle not started"}</Text>
                    <Text style={styles.cycleSubtext}>
                      {latestPeriod ? `Started ${formatReadableDate(latestPeriod.startDate)}` : "Log your first period to begin."}
                    </Text>
                  </View>
                  <View style={styles.cycleAvg}>
                    <Text style={styles.cycleAvgValue}>{cycleStats.average ? `${cycleStats.average}d` : "—"}</Text>
                    <Text style={styles.cycleAvgLabel}>AVG</Text>
                  </View>
                </View>
              </Card>
            </Rise>
          </>
        }
      />
    </ScreenScroll>
  );
}

// ============================================================
// CALENDAR
// ============================================================

function CalendarScreen({ coupleData, coupleId, goldDays = [] }) {
  const { c } = useTheme();
  const styles = useStyles();
  const { isWide } = useLayout();
  // Seven columns across an iPad card would be ~145pt each, so the grid caps
  // at 720pt and stays centred; the day cells grow to suit the larger measure.
  const gridWidth = isWide ? { width: "100%", maxWidth: 720, alignSelf: "center" } : null;
  const daySize = isWide ? { height: 56 } : null;
  const dayInnerSize = isWide ? { width: 42, height: 42, borderRadius: 21 } : null;
  const periods = normalizePeriods(coupleData.periods);
  const [displayDate, setDisplayDate] = useState(() => parseDateKey(dayKeyFor()));
  const [selectedDate, setSelectedDate] = useState(getTodayKey());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);

  const goldSet = useMemo(() => new Set(goldDays.filter(Boolean)), [goldDays]);

  const calendarDays = useMemo(() => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(formatDateKey(new Date(year, month, day)));
    }
    return days;
  }, [displayDate]);

  const periodDays = useMemo(() => {
    const set = new Set();
    periods.forEach((period) => getPeriodDates(period).forEach((key) => set.add(key)));
    return set;
  }, [periods]);

  const selectedPeriods = periods.filter((period) => getPeriodDates(period).includes(selectedDate));

  const moveMonth = (amount) => {
    Haptics.selectionAsync().catch(() => {});
    setDisplayDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const openSheet = (period = null) => {
    setEditingPeriod(period);
    setSheetOpen(true);
  };

  const savePeriod = async ({ startDate, endDate }) => {
    if (!isValidDateKey(startDate)) throw new Error("Pick a valid start date.");
    if (endDate && !isValidDateKey(endDate)) throw new Error("Pick a valid end date.");
    if (endDate && endDate < startDate) throw new Error("The end date comes before the start date.");
    const nextPeriod = { id: editingPeriod?.id || `${Date.now()}`, startDate, endDate: endDate || null };
    const updated = editingPeriod ? periods.map((p) => (p.id === editingPeriod.id ? nextPeriod : p)) : [...periods, nextPeriod];
    await updateCouplePeriods(coupleId, updated);
    setSelectedDate(startDate);
    setDisplayDate(new Date(parseDateKey(startDate)));
  };

  const removePeriod = (period) => {
    confirmDestructive({
      title: "Delete this period?",
      message: "It'll be removed from your history.",
      onConfirm: async () => {
        try {
          await updateCouplePeriods(coupleId, periods.filter((p) => p.id !== period.id));
        } catch {
          Alert.alert("Not deleted", "Check your connection and try again.");
        }
      },
    });
  };

  return (
    <>
      <ScreenScroll extraBottom={56}>
        <Rise>
          <View style={styles.pageHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>YOUR RHYTHM</Text>
              <Text style={styles.pageTitle}>Calendar</Text>
            </View>
          </View>
        </Rise>

        <Rise delay={70}>
          <Card style={styles.calendarCard}>
            <View style={[styles.calendarHead, gridWidth]}>
              <Pressable
                onPress={() => moveMonth(-1)}
                hitSlop={10}
                style={styles.calendarArrow}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <ChevronLeft size={20} color={c.tint} />
              </Pressable>
              <Text style={styles.calendarMonth}>{formatMonthYear(displayDate)}</Text>
              <Pressable
                onPress={() => moveMonth(1)}
                hitSlop={10}
                style={styles.calendarArrow}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <ChevronRight size={20} color={c.tint} />
              </Pressable>
            </View>
            <View style={[styles.weekRow, gridWidth]}>
              {DAYS.map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>
              ))}
            </View>
            <View style={[styles.calendarGrid, gridWidth]}>
              {calendarDays.map((dateKey, index) => {
                if (!dateKey) return <View key={`empty-${index}`} style={[styles.day, daySize]} />;
                const date = parseDateKey(dateKey);
                const isSelected = dateKey === selectedDate;
                const isToday = dateKey === getTodayKey();
                const isPeriod = periodDays.has(dateKey);
                return (
                  <Pressable
                    key={dateKey}
                    style={[styles.day, daySize]}
                    accessibilityRole="button"
                    accessibilityLabel={[
                      formatReadableDate(dateKey),
                      isSelected ? "selected" : null,
                      isToday ? "today" : null,
                      isPeriod ? "period" : null,
                      goldSet.has(dateKey) ? "gold day" : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSelectedDate(dateKey);
                    }}
                  >
                    <View style={[styles.dayInner, dayInnerSize, isPeriod && { backgroundColor: c.roseSoft }, isSelected && { backgroundColor: c.tint }]}>
                      <Text
                        style={[
                          styles.dayText,
                          isPeriod && !isSelected && { color: c.rose, fontFamily: BODY_SEMI },
                          isToday && !isSelected && { color: c.tint, fontFamily: BODY_BOLD },
                          isSelected && { color: "#FFFFFF", fontFamily: BODY_BOLD },
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                      {goldSet.has(dateKey) ? <View style={[styles.goldDot, { backgroundColor: c.gold }]} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={[styles.legend, gridWidth]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: c.rose }]} />
                <Text style={styles.legendText}>Period</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: c.tint }]} />
                <Text style={styles.legendText}>Selected</Text>
              </View>
            </View>
          </Card>
        </Rise>

        <SectionHeader title={formatReadableDate(selectedDate)} />
        {selectedPeriods.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={[styles.glyphLarge, { backgroundColor: c.roseSoft }]}>
              <Heart size={22} color={c.rose} />
            </View>
            <Text style={styles.emptyCardTitle}>Nothing logged</Text>
            <Text style={styles.emptyCardBody}>This day is still waiting for its first little entry.</Text>
          </Card>
        ) : (
          <Card>
            {selectedPeriods.map((period, index) => (
              <View key={period.id}>
                {index > 0 ? <View style={styles.separatorInset} /> : null}
                <View style={styles.row}>
                  <View style={[styles.glyph, { backgroundColor: c.roseSoft }]}>
                    <Heart size={17} color={c.rose} fill={c.rose} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>Period</Text>
                    <Text style={styles.rowMeta}>
                      {formatShortDate(period.startDate)}
                      {period.endDate ? ` to ${formatShortDate(period.endDate)}` : " · still going"}
                    </Text>
                  </View>
                  <Pressable onPress={() => openSheet(period)} hitSlop={12} accessibilityRole="button">
                    <Text style={styles.link}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removePeriod(period)}
                    hitSlop={10}
                    style={styles.deleteButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete period starting ${formatShortDate(period.startDate)}`}
                  >
                    <Trash2 size={17} color={c.label3} />
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScreenScroll>

      <Fab label="Log period" onPress={() => openSheet()} />
      <PeriodSheet
        visible={sheetOpen}
        period={editingPeriod}
        onClose={() => setSheetOpen(false)}
        onSave={async (data) => {
          await savePeriod(data);
          setSheetOpen(false);
        }}
      />
    </>
  );
}

// ============================================================
// STUDY
// ============================================================

function StudyScreen({ coupleData, coupleId, timer, backlog, streak }) {
  const { c } = useTheme();
  const styles = useStyles();
  const { isWide } = useLayout();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);

  const logs = Array.isArray(coupleData.studyLogs)
    ? [...coupleData.studyLogs].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    : [];
  const today = getTodayKey();
  const todayMinutes = logs
    .filter((log) => log?.date === today)
    .reduce((sum, log) => sum + (Number(log.duration) || 0), 0);
  const backlogMinutes = backlog?.balanceMinutes ?? 0;
  const pct = Math.round((todayMinutes / DAILY_GOAL_MINUTES) * 100);
  const status = todayMinutes >= DAILY_GOAL_MINUTES ? "Ahead — burning backlog" : pct >= 50 ? "On track" : "Behind — every hour counts";
  const statusColor = todayMinutes >= DAILY_GOAL_MINUTES ? c.mint : pct >= 50 ? c.gold : c.rose;
  const recentSubjects = Array.isArray(coupleData.recentSubjects) ? coupleData.recentSubjects : [];

  const openBlank = () => {
    setPrefill(null);
    setSheetOpen(true);
  };

  const finishTimer = () => {
    const minutes = timer.elapsedMinutes;
    if (minutes < 1) {
      Alert.alert("Too short to log", "Run the timer for at least a minute before saving a session.");
      return;
    }
    setPrefill({ minutes });
    setSheetOpen(true);
  };

  const discardTimer = () => {
    confirmDestructive({
      title: "Discard this timer?",
      message: "The elapsed time won't be saved.",
      confirmLabel: "Discard",
      onConfirm: timer.reset,
    });
  };

  const handleSave = async ({ subject, minutes, notes }) => {
    const cleanedSubject = subject.trim();
    if (!cleanedSubject) throw new Error("Add a subject first.");
    if (!minutes || minutes <= 0) throw new Error("Set how long you studied.");
    const updatedSubjects = [cleanedSubject, ...recentSubjects.filter((item) => item !== cleanedSubject)].slice(0, 6);
    // Stamp with the logical day at save time, not the day the screen rendered on.
    const stamp = dayKeyFor(new Date());
    await logStudySession(
      coupleId,
      { subject: cleanedSubject, duration: minutes, notes: notes.trim(), date: stamp, timestamp: Date.now() },
      updatedSubjects,
    );
    timer.reset();
  };

  const removeLog = (log) => {
    confirmDestructive({
      title: "Delete this session?",
      message: `${log.subject || "Study session"} · ${formatDuration(log.duration)}`,
      onConfirm: async () => {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await deleteStudySession(coupleId, log.timestamp);
        } catch {
          Alert.alert("Not deleted", "Check your connection and try again.");
        }
      },
    });
  };

  return (
    <>
      <ScreenScroll extraBottom={56}>
        <Split
          gap={24}
          left={
            <>
              <Rise>
                <View style={styles.pageHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eyebrow}>FOCUS</Text>
                    <Text style={styles.pageTitle}>Study</Text>
                  </View>
                  <View style={[styles.streakPill, { backgroundColor: c.goldSoft }]}>
                    <Flame size={14} color={c.gold} />
                    <Text style={[styles.streakPillText, { color: c.gold }]}>{streak ?? 0} day streak</Text>
                  </View>
                </View>
              </Rise>

              <Rise delay={70}>
                <TimerCard timer={timer} todayMinutes={todayMinutes} onFinish={finishTimer} onDiscard={discardTimer} />
              </Rise>

              <Rise delay={120}>
                <View style={[styles.backlogBanner, { backgroundColor: backlogMinutes === 0 ? c.mintSoft : c.goldSoft }]}>
                  <Hourglass size={18} color={backlogMinutes === 0 ? c.mint : c.gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.backlogTitle}>{backlogMinutes === 0 ? "Backlog clear — beautiful." : `${formatBacklog(backlogMinutes)} to catch up`}</Text>
                    <Text style={styles.backlogSub}>{status} · extra hours erase it</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                </View>
              </Rise>
            </>
          }
          right={
            <>
              <Rise delay={160}>
                <SectionHeader flush={isWide} title="Today" trailing={<Text style={styles.sectionDate}>Goal {formatHoursShort(DAILY_GOAL_MINUTES)} h</Text>} />
                <Card style={styles.todayCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                    <Ring size={104} stroke={11} progress={todayMinutes / DAILY_GOAL_MINUTES} trackColor={c.fill} fillColor={todayMinutes >= DAILY_GOAL_MINUTES ? c.mint : c.tint}>
                      <View style={{ alignItems: "center" }}>
                        <Text style={styles.ringValue}>{formatHoursShort(todayMinutes)}h</Text>
                        <Text style={styles.ringCaption}>{pct}%</Text>
                      </View>
                    </Ring>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.todayValue}>{formatDuration(todayMinutes)}</Text>
                      <Text style={styles.todayGoal}>{pct}% of today's goal</Text>
                      <Text style={[styles.todayGoal, { marginTop: 4, color: statusColor, fontFamily: BODY_SEMI }]}>
                        {todayMinutes >= DAILY_GOAL_MINUTES ? "Surplus burns backlog" : `${formatDuration(Math.max(0, DAILY_GOAL_MINUTES - todayMinutes))} to reach 8h`}
                      </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 14 }}>
                    <Progress value={todayMinutes / DAILY_GOAL_MINUTES} color={todayMinutes >= DAILY_GOAL_MINUTES ? c.mint : undefined} />
                  </View>
                </Card>
              </Rise>

              <SectionHeader title="Recent sessions" />
              {logs.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <View style={[styles.glyphLarge, { backgroundColor: c.tintSoft }]}>
                    <Timer size={22} color={c.tint} />
                  </View>
                  <Text style={styles.emptyCardTitle}>No sessions yet</Text>
                  <Text style={styles.emptyCardBody}>Start the timer, or log something you've already done.</Text>
                </Card>
              ) : (
                <Card>
                  {logs.slice(0, 15).map((log, index) => (
                    <View key={`${log.timestamp}-${index}`}>
                      {index > 0 ? <View style={styles.separatorInset} /> : null}
                      <View style={styles.row}>
                        <View style={[styles.glyph, { backgroundColor: c.tintSoft }]}>
                          <Timer size={17} color={c.tint} />
                        </View>
                        <View
                          style={{ flex: 1 }}
                          accessible
                          accessibilityLabel={`${log.subject || "Study session"}, ${formatRelativeDate(log.date)}, ${formatDuration(log.duration)}${log.notes ? `, ${log.notes}` : ""}`}
                        >
                          <Text style={styles.rowTitle} numberOfLines={1}>{log.subject || "Study session"}</Text>
                          <Text style={styles.rowMeta} numberOfLines={1}>
                            {formatRelativeDate(log.date)} · {formatDuration(log.duration)}
                            {log.notes ? ` · ${log.notes}` : ""}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => removeLog(log)}
                          hitSlop={10}
                          style={styles.deleteButton}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${log.subject} session, ${formatDuration(log.duration)}`}
                        >
                          <Trash2 size={17} color={c.label3} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </Card>
              )}
            </>
          }
        />
      </ScreenScroll>

      <Fab label="Log session" onPress={openBlank} />
      <StudySheet
        visible={sheetOpen}
        prefill={prefill}
        onClose={() => setSheetOpen(false)}
        onSave={async (data) => {
          await handleSave(data);
          setSheetOpen(false);
        }}
      />
    </>
  );
}

function TimerCard({ timer, todayMinutes, onFinish, onDiscard }) {
  const { c } = useTheme();
  const styles = useStyles();
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!timer.running) {
      breathe.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [timer.running, breathe]);

  const haloScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const haloOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.08] });
  const combined = todayMinutes + timer.elapsedMinutes;
  const combinedProgress = combined / DAILY_GOAL_MINUTES;

  return (
    <Card style={styles.timerCard}>
      <View style={styles.timerStage}>
        <Animated.View
          style={[
            styles.timerHalo,
            { opacity: timer.running ? haloOpacity : 0, transform: [{ scale: haloScale }], backgroundColor: c.tint },
          ]}
        />
        <LinearGradient
          colors={timer.running ? c.tintGradient : [c.surfaceSunken, c.surfaceSunken, c.surfaceSunken]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.timerRing}
        >
          <View style={styles.timerInner}>
            <Text style={styles.timerClock}>{formatClock(timer.elapsedMs)}</Text>
            <Text style={styles.timerCaption}>{timer.running ? "Focusing" : timer.active ? "Paused" : "Ready when you are"}</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.timerProgress}>
        <Progress value={combinedProgress} color={combined >= DAILY_GOAL_MINUTES ? c.mint : undefined} />
        <Text style={styles.timerProgressText}>
          {formatDuration(combined)} of {formatHoursShort(DAILY_GOAL_MINUTES)} h today
        </Text>
      </View>

      <View style={styles.timerControls}>
        {!timer.active ? (
          <Pressable
            onPress={timer.start}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ctaWrap, { flex: 1 }, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient colors={c.tintGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaSmall}>
              <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.ctaTextSmall}>Start focusing</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={onDiscard}
              style={({ pressed }) => [styles.ghostSquare, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Discard timer"
            >
              <RotateCcw size={19} color={c.label2} />
            </Pressable>
            <Pressable
              onPress={timer.running ? timer.pause : timer.resume}
              accessibilityRole="button"
              style={({ pressed }) => [styles.tintedButton, { flex: 1, marginTop: 0 }, pressed && { opacity: 0.7 }]}
            >
              {timer.running ? <Pause size={18} color={c.tint} fill={c.tint} /> : <Play size={18} color={c.tint} fill={c.tint} />}
              <Text style={styles.tintedButtonText}>{timer.running ? "Pause" : "Resume"}</Text>
            </Pressable>
            <Pressable
              onPress={onFinish}
              accessibilityRole="button"
              style={({ pressed }) => [styles.ctaWrap, { flex: 1 }, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <LinearGradient colors={c.tintGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaSmall}>
                <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.ctaTextSmall}>Log it</Text>
              </LinearGradient>
            </Pressable>
          </>
        )}
      </View>
    </Card>
  );
}

// ============================================================
// INSIGHTS
// ============================================================

function InsightsScreen({ coupleData, coupleId, backlog, streak, goldDays = [] }) {
  const { c } = useTheme();
  const styles = useStyles();
  const [testOpen, setTestOpen] = useState(false);

  const goldMonthCount = useMemo(() => {
    const prefix = dayKeyFor().slice(0, 7);
    return goldDays.filter((key) => typeof key === "string" && key.startsWith(prefix)).length;
  }, [goldDays]);

  const periods = normalizePeriods(coupleData.periods);
  const cycleStats = calculateCycleStats(periods);
  const logs = Array.isArray(coupleData.studyLogs) ? coupleData.studyLogs : [];
  const testScores = Array.isArray(coupleData.testScores)
    ? [...coupleData.testScores].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    : [];

  const totalMinutes = logs.reduce((sum, log) => sum + (Number(log.duration) || 0), 0);
  const uniqueStudyDays = new Set(logs.map((l) => l?.date).filter(Boolean)).size;

  const monthlyMinutes = useMemo(() => {
    const anchor = parseDateKey(dayKeyFor());
    const prefix = `${anchor.getFullYear()}-${pad(anchor.getMonth() + 1)}`;
    return logs
      .filter((l) => typeof l?.date === "string" && l.date.startsWith(prefix))
      .reduce((sum, l) => sum + (Number(l.duration) || 0), 0);
  }, [logs]);

  const weekly = useMemo(() => {
    const days = [];
    const anchor = parseDateKey(dayKeyFor());
    for (let i = 6; i >= 0; i--) {
      const date = new Date(anchor);
      date.setDate(date.getDate() - i);
      const key = formatDateKey(date);
      const minutes = logs.filter((l) => l?.date === key).reduce((sum, l) => sum + (Number(l.duration) || 0), 0);
      days.push({
        key,
        minutes,
        label: date.toLocaleDateString("en-IN", { weekday: "narrow" }),
        isToday: key === getTodayKey(),
      });
    }
    return days;
  }, [logs]);

  const weeklyMax = Math.max(...weekly.map((d) => d.minutes), 120);
  const weeklyTotal = weekly.reduce((sum, d) => sum + d.minutes, 0);

  // "This week vs last week" reads off the same byDay map the backlog uses; no
  // second chart, one line under the header.
  const duel = useMemo(
    () => weekOverWeek(backlog?.byDay, backlog?.todayKey || getTodayKey()),
    [backlog?.byDay, backlog?.todayKey],
  );

  const bestTest = testScores.length
    ? testScores.reduce((best, t) => {
        const p = Number(t.total) > 0 ? (Number(t.score) / Number(t.total)) * 100 : -1;
        const bp = best && Number(best.total) > 0 ? (Number(best.score) / Number(best.total)) * 100 : -1;
        return p > bp ? t : best;
      }, null)
    : null;

  const removeTest = (entry) => {
    confirmDestructive({
      title: "Delete this score?",
      message: `${entry.name} · ${entry.score}/${entry.total}`,
      onConfirm: async () => {
        try {
          await deleteTestScore(coupleId, entry.timestamp);
        } catch {
          Alert.alert("Not deleted", "Check your connection and try again.");
        }
      },
    });
  };

  return (
    <ScreenScroll>
      <Rise>
        <View style={styles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>YOUR STORY</Text>
            <Text style={styles.pageTitle}>Insights</Text>
          </View>
          <View style={[styles.streakPill, { backgroundColor: c.goldSoft }]}>
            <Flame size={14} color={c.gold} />
            <Text style={[styles.streakPillText, { color: c.gold }]}>{streak ?? 0} day streak</Text>
          </View>
        </View>
        <Text style={styles.goldLine}>
          {goldDays.length} gold days · {goldMonthCount} this month
        </Text>
        <Text
          style={[
            styles.duelLine,
            { color: duel.delta === 0 ? c.label2 : duel.delta > 0 ? c.mint : c.gold },
          ]}
        >
          {duel.delta === 0 ? "Same as last week" : `${formatSignedDelta(duel.delta)} vs last week`}
        </Text>
      </Rise>

      <Rise delay={70}>
        <View style={[styles.backlogBanner, { backgroundColor: (backlog?.balanceMinutes || 0) === 0 ? c.mintSoft : c.goldSoft }]}>
          <BarChart3 size={18} color={c.tint} />
          <View style={{ flex: 1 }}>
            <Text style={styles.backlogTitle}>
              {(backlog?.balanceMinutes || 0) === 0 ? "Backlog clear" : formatBacklog(backlog.balanceMinutes)} · {formatDuration(weeklyTotal)} this week
            </Text>
            <Text style={styles.backlogSub}>Missed 8h days stack up · surplus burns them · floor at 0</Text>
          </View>
        </View>
      </Rise>

      <Rise delay={110}>
        <SectionHeader title="This week" />
        <Card style={styles.chartCard}>
          <Text style={styles.chartValue}>
            {formatHoursShort(weeklyTotal)}
            <Text style={styles.chartUnit}> h</Text>
          </Text>
          <Text style={styles.chartMeta}>{formatDuration(Math.round(weeklyTotal / 7))} a day on average</Text>
          <View style={styles.chart}>
            {weekly.map((day) => (
              <View key={day.key} style={styles.chartColumn}>
                <View style={styles.chartTrack}>
                  {day.isToday ? (
                    <LinearGradient
                      colors={c.tintGradient}
                      style={[styles.chartBar, { height: `${Math.max(3, (day.minutes / weeklyMax) * 100)}%` }]}
                    />
                  ) : (
                    <View style={[styles.chartBar, { height: `${Math.max(3, (day.minutes / weeklyMax) * 100)}%`, backgroundColor: c.fillStrong }]} />
                  )}
                </View>
                <Text style={[styles.chartLabel, day.isToday && { color: c.tint, fontFamily: BODY_BOLD }]}>{day.label}</Text>
              </View>
            ))}
          </View>
        </Card>
      </Rise>

      <SectionHeader title="Study" />
      <Card>
        <StatRow label="Total studied" value={formatDuration(totalMinutes)} color={c.tint} />
        <View style={styles.separatorInset} />
        <StatRow label="Sessions logged" value={String(logs.length)} color={c.lilac} />
        <View style={styles.separatorInset} />
        <StatRow label="Days with study" value={String(uniqueStudyDays)} color={c.mint} />
        <View style={styles.separatorInset} />
        <StatRow label="This month" value={formatDuration(monthlyMinutes)} color={c.gold} />
      </Card>

      <SectionHeader title="Test scores" trailing={<Pressable onPress={() => setTestOpen(true)} hitSlop={8} accessibilityRole="button"><Text style={styles.link}>+ Add score</Text></Pressable>} />
      {testScores.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={[styles.glyphLarge, { backgroundColor: c.tintSoft }]}>
            <GraduationCap size={22} color={c.tint} />
          </View>
          <Text style={styles.emptyCardTitle}>No scores yet</Text>
          <Text style={styles.emptyCardBody}>Log a test with score and out-of total — percentages and bands appear here.</Text>
        </Card>
      ) : (
        <Card>
          {bestTest ? (
            <>
              <View style={[styles.bestRow, { backgroundColor: c.goldSoft }]}>
                <Award size={16} color={c.gold} />
                <Text style={styles.bestText}>
                  Best: {bestTest.name} · {bestTest.score}/{bestTest.total} ({Math.round((bestTest.score / bestTest.total) * 100)}%)
                </Text>
              </View>
              <View style={styles.separatorInset} />
            </>
          ) : null}
          {testScores.slice(0, 12).map((t, index) => {
            const pct = Number(t.total) > 0 ? (Number(t.score) / Number(t.total)) * 100 : 0;
            const g = gradeFor(pct);
            return (
              <View key={`${t.timestamp}-${index}`}>
                {index > 0 ? <View style={styles.separatorInset} /> : null}
                <View style={styles.row}>
                  <View style={[styles.glyph, { backgroundColor: c.tintSoft }]}>
                    <GraduationCap size={17} color={c.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{t.name}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {formatShortDate(t.date)} · {t.score}/{t.total} · {Math.round(pct)}% · {g.label}
                    </Text>
                  </View>
                  <View style={[styles.gradeDot, { backgroundColor: g.color }]} />
                  <Pressable
                    onPress={() => removeTest(t)}
                    hitSlop={10}
                    style={styles.deleteButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${t.name} score`}
                  >
                    <Trash2 size={17} color={c.label3} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      <SectionHeader title="Cycle" />
      <Card>
        <StatRow label="Average length" value={cycleStats.average ? `${cycleStats.average} days` : "—"} color={c.rose} />
        <View style={styles.separatorInset} />
        <StatRow label="Shortest" value={cycleStats.shortest ? `${cycleStats.shortest} days` : "—"} color={c.rose} />
        <View style={styles.separatorInset} />
        <StatRow label="Longest" value={cycleStats.longest ? `${cycleStats.longest} days` : "—"} color={c.rose} />
        <View style={styles.separatorInset} />
        <StatRow label="Periods logged" value={String(cycleStats.count)} color={c.rose} />
      </Card>

      {cycleStats.count < 2 ? (
        <Text style={styles.screenFootnote}>Two logged starts are enough to calculate a real cycle length.</Text>
      ) : null}

      <TestSheet
        visible={testOpen}
        onClose={() => setTestOpen(false)}
        onSave={async (entry) => {
          await logTestScore(coupleId, entry);
          setTestOpen(false);
        }}
      />
    </ScreenScroll>
  );
}

function StatRow({ label, value, color }) {
  const styles = useStyles();
  return (
    <View style={styles.statRow}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statRowLabel}>{label}</Text>
      <Text style={styles.statRowValue}>{value}</Text>
    </View>
  );
}

// ============================================================
// NEET TAB — countdown, competition, mock predictor, syllabus, feed
// ============================================================

const NEET_CATEGORIES = [
  { value: "Gen", label: "Gen" },
  { value: "EWS", label: "EWS" },
  { value: "OBC", label: "OBC" },
  { value: "SC", label: "SC" },
  { value: "ST", label: "ST" },
];

const NEET_SUBJECTS = ["Physics", "Chemistry", "Botany", "Zoology"];

const MISTAKE_REASON_LABELS = {
  concept: "Concept gap",
  silly: "Silly slip",
  time: "Ran out of time",
  guess: "Guessed",
};

// "tomorrow" reads better than "in 1d" right after logging.
function reviewLabel(reviewAt, now) {
  const days = Math.ceil((Number(reviewAt) - now) / 86400000);
  if (!Number.isFinite(days) || days <= 0) return "due now";
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}

function NeetScreen({ coupleId }) {
  const { c } = useTheme();
  const styles = useStyles();
  const { isWide } = useLayout();

  // --- live countdown ---
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const examAt = useMemo(() => new Date(`${NEET_EXAM_DATE}T00:00:00`).getTime(), []);
  const msLeft = Math.max(0, examAt - now);
  const daysLeft = Math.floor(msLeft / 86400000);
  const hoursLeft = Math.floor(msLeft / 3600000) % 24;
  const minutesLeft = Math.floor(msLeft / 60000) % 60;
  const secondsLeft = Math.floor(msLeft / 1000) % 60;

  // --- mock predictor ---
  const [scoreText, setScoreText] = useState("");
  const [category, setCategory] = useState("Gen");
  const [mocks, setMocks] = useState([]);
  const [mockResult, setMockResult] = useState(null);

  useEffect(() => {
    let alive = true;
    getMocks(coupleId).then((list) => alive && setMocks(list));
    return () => {
      alive = false;
    };
  }, [coupleId]);

  const logMock = () => {
    const score = Number(scoreText);
    if (!Number.isFinite(score) || score < 0 || score > 720) {
      Alert.alert("Check the score", "Enter a mock score between 0 and 720.");
      return;
    }
    const result = computeMockResult(score, category);
    const entry = {
      name: `Mock · ${score}/720`,
      score,
      category,
      percentileLabel: result.percentileLabel,
      air: result.air,
      cutoffGap: result.cutoffGap,
    };
    saveMock(coupleId, entry).then((saved) => {
      if (saved) setMocks((prev) => [saved, ...prev]);
    });
    setMockResult(result);
    setScoreText("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const removeMock = (entry) => {
    confirmDestructive({
      title: "Delete this mock?",
      message: `${entry.name} · ${entry.category}`,
      onConfirm: async () => {
        await deleteMock(coupleId, entry.id);
        setMocks((prev) => prev.filter((m) => m.id !== entry.id));
        if (mockResult && entry.score === mockResult.score) setMockResult(null);
      },
    });
  };

  const latestMock = mocks.length ? mocks[0] : null;
  const latestGap = latestMock ? computeMockResult(latestMock.score, latestMock.category).cutoffGap : null;

  // --- syllabus ---
  const [syllabusState, setSyllabusState] = useState({ checks: {}, percent: 0, checked: 0, total: SYLLABUS.length });
  const [openSubject, setOpenSubject] = useState("Physics");

  useEffect(() => {
    let alive = true;
    getSyllabusProgress(coupleId).then((s) => alive && setSyllabusState(s));
    return () => {
      alive = false;
    };
  }, [coupleId]);

  const toggleChapter = (chapterId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSyllabusState((prev) => {
      const checks = { ...prev.checks };
      // Unchecking deletes the entry; checking stamps the date the revision
      // clock counts from.
      if (checks[chapterId]) delete checks[chapterId];
      else checks[chapterId] = { done: true, at: new Date().toISOString() };
      const checked = Object.keys(checks).length;
      return {
        ...prev,
        checks,
        checked,
        percent: prev.total > 0 ? Math.round((checked / prev.total) * 100) : 0,
      };
    });
    toggleSyllabusChapter(coupleId, chapterId);
  };

  const subjectChapters = SYLLABUS.filter((ch) => ch.subject === openSubject);

  // --- revision due ---
  const [revisionOnly, setRevisionOnly] = useState(false);
  const dueRevision = useMemo(
    () => dueChapters(syllabusState.checks, now),
    [syllabusState.checks, now],
  );

  // Re-checking the last due chapter leaves the filter with nothing to show, so
  // drop back to the full syllabus instead of an empty card.
  useEffect(() => {
    if (revisionOnly && dueRevision.length === 0) setRevisionOnly(false);
  }, [revisionOnly, dueRevision.length]);

  // --- mistake log ---
  const [mistakes, setMistakes] = useState([]);
  const [mistakeSheet, setMistakeSheet] = useState(false);
  const [mistakeHint, setMistakeHint] = useState("");

  useEffect(() => {
    let alive = true;
    getMistakes(coupleId).then((list) => alive && setMistakes(list));
    return () => {
      alive = false;
    };
  }, [coupleId]);

  // Confirmation fades on its own so the card does not keep claiming something
  // was just added twenty minutes ago.
  useEffect(() => {
    if (!mistakeHint) return undefined;
    const id = setTimeout(() => setMistakeHint(""), 8000);
    return () => clearTimeout(id);
  }, [mistakeHint]);

  const due = useMemo(() => dueMistakes(mistakes, now), [mistakes, now]);
  const upcoming = useMemo(
    () =>
      mistakes
        .filter((m) => !m.resolvedAt && !due.some((d) => d.id === m.id))
        .sort((a, b) => Number(a.reviewAt) - Number(b.reviewAt)),
    [mistakes, due],
  );
  const shownMistakes = useMemo(() => [...due, ...upcoming].slice(0, 5), [due, upcoming]);

  const saveMistake = async (fields) => {
    const saved = await addMistake(coupleId, fields);
    if (!saved) return;
    setMistakes((prev) => [saved, ...prev]);
    setMistakeSheet(false);
    setMistakeHint(`Logged. Comes back ${reviewLabel(saved.reviewAt, now)}.`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const markReviewed = (id) => {
    Haptics.selectionAsync().catch(() => {});
    reviewMistake(coupleId, id, Date.now())
      .then((next) => setMistakes(next))
      .catch(() => {});
  };

  const removeMistake = (mistake) => {
    confirmDestructive({
      title: "Delete this mistake?",
      message: `${mistake.subject} · ${mistake.chapter}`,
      onConfirm: async () => {
        const next = await deleteMistake(coupleId, mistake.id);
        setMistakes(next);
      },
    });
  };

  return (
    <ScreenScroll>
      <Split
        gap={24}
        left={
          <>
            <Rise>
              <View style={styles.pageHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eyebrow}>NEET UG {new Date(examAt).getFullYear()}</Text>
                  <Text style={styles.pageTitle}>NEET</Text>
                </View>
                <View style={[styles.streakPill, { backgroundColor: c.tintSoft }]}>
                  <Target size={14} color={c.tint} />
                  <Text style={[styles.streakPillText, { color: c.tint }]}>{daysLeft} days</Text>
                </View>
              </View>
            </Rise>

            {/* 1 — countdown + competition */}
            <Rise delay={70}>
              <Card style={styles.neetHero} padding={0}>
                <Text style={styles.neetHeroLabel}>Days to exam · {formatShortDateFromISO(NEET_EXAM_DATE)}</Text>
                <Text style={styles.neetDays}>
                  {daysLeft}
                  <Text style={styles.neetDaysUnit}> days</Text>
                </Text>
                <Text style={styles.neetClock}>
                  {pad(hoursLeft)}:{pad(minutesLeft)}:{pad(secondsLeft)} until NEET opens
                </Text>
                <Text style={styles.neetCapacity}>
                  {daysLeft} days × 8h = {formatThousands(remainingCapacity(daysLeft) / 60)}h left
                </Text>
                <View style={styles.separatorInset} />
                <View style={styles.neetStatRow}>
                  <View style={styles.neetStatCell}>
                    <Text style={styles.neetStatNum}>24.2L</Text>
                    <Text style={styles.neetStatLabel}>aspirants</Text>
                  </View>
                  <View style={styles.neetStatCell}>
                    <Text style={styles.neetStatNum}>1.1L</Text>
                    <Text style={styles.neetStatLabel}>MBBS seats</Text>
                  </View>
                  <View style={styles.neetStatCell}>
                    <Text style={styles.neetStatNum}>1 in 22</Text>
                    <Text style={styles.neetStatLabel}>get in</Text>
                  </View>
                </View>
                <View style={styles.separatorInset} />
                <Text style={styles.neetFootnote}>
                  Last year Gen cutoff: 715/720
                  {latestGap !== null ? (
                    latestGap >= 0 ? (
                      <Text style={{ color: c.mint, fontFamily: BODY_SEMI }}> · you're +{latestGap} above it</Text>
                    ) : (
                      <Text style={{ color: c.gold, fontFamily: BODY_SEMI }}> · you're {Math.abs(latestGap)} short</Text>
                    )
                  ) : null}
                </Text>
              </Card>
            </Rise>

            {/* 2 — mock predictor */}
            <SectionHeader title="Mock predictor" />
            <Card style={{ padding: 20 }}>
              <Text style={styles.neetFootnote}>Log a mock to see percentile, AIR range and where you stand against last year's cutoff.</Text>
              <View style={styles.neetFieldRow}>
                <TextInput
                  value={scoreText}
                  onChangeText={setScoreText}
                  accessibilityLabel="Score out of 720"
                  placeholder="Score out of 720"
                  placeholderTextColor={c.label3}
                  keyboardType="number-pad"
                  style={styles.neetScoreInput}
                  maxLength={3}
                />
                <Pressable style={[styles.neetLogBtn, { backgroundColor: c.tint }]} onPress={logMock} accessibilityRole="button">
                  <Text style={styles.neetLogBtnText}>Log mock</Text>
                </Pressable>
              </View>
              <Segmented options={NEET_CATEGORIES} value={category} onChange={setCategory} />

              {mockResult ? (
                <View style={[styles.neetResult, { backgroundColor: c.tintSoft }]}>
                  <Text style={styles.neetResultTop}>
                    {mockResult.percentileLabel}%ile · AIR ~{mockResult.air.toLocaleString("en-IN")}
                  </Text>
                  <Text style={[styles.neetResultGap, { color: mockResult.isAboveCutoff ? c.mint : c.gold }]}>
                    {mockResult.isAboveCutoff ? `+${mockResult.cutoffGap} above` : `${Math.abs(mockResult.cutoffGap)} below`} {mockResult.category} cutoff ({mockResult.cutoff})
                  </Text>
                </View>
              ) : null}

              {mocks.length ? (
                <View style={{ marginTop: 12 }}>
                  {mocks.slice(0, 6).map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => removeMock(m)}
                      style={({ pressed }) => [styles.neetMockRow, pressed && { opacity: 0.6 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete mock, ${m.name}, ${m.category}`}
                    >
                      <Text style={styles.neetMockName} numberOfLines={1}>
                        {m.name} · {m.category}
                      </Text>
                      <Text style={styles.neetMockMeta}>
                        {m.percentileLabel}%ile · {m.cutoffGap >= 0 ? `+${m.cutoffGap}` : m.cutoffGap} vs cutoff
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Card>
          </>
        }
        right={
          <>
            {/* 3 — mistake log */}
            <SectionHeader
              flush={isWide}
              title="Mistakes"
              trailing={
                <Text style={[styles.neetProgress, { color: due.length ? c.gold : c.label3 }]}>
                  {due.length ? `${due.length} due` : "clear"}
                </Text>
              }
            />
            <Card style={{ padding: 20 }}>
              {shownMistakes.length ? (
                <View style={{ marginTop: -8 }}>
                  {shownMistakes.map((mistake, index) => {
                    const isDue = !mistake.resolvedAt && Number(mistake.reviewAt) <= now;
                    return (
                      <View key={mistake.id}>
                        {index > 0 ? <View style={styles.separatorInset} /> : null}
                        <View style={styles.mistakeRow}>
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={styles.mistakeTitle} numberOfLines={1}>
                              {mistake.subject} · {mistake.chapter}
                            </Text>
                            <View style={styles.mistakeMetaRow}>
                              <View style={[styles.neetWeight, { backgroundColor: c.fill }]}>
                                <Text style={[styles.neetWeightText, { color: c.label2 }]}>
                                  {MISTAKE_REASON_LABELS[mistake.reason] || mistake.reason}
                                </Text>
                              </View>
                              <Text style={[styles.mistakeMeta, isDue && { color: c.gold }]}>
                                {isDue ? "due now" : reviewLabel(mistake.reviewAt, now)}
                              </Text>
                            </View>
                            {mistake.note ? (
                              <Text style={styles.mistakeNote} numberOfLines={2}>
                                {mistake.note}
                              </Text>
                            ) : null}
                          </View>
                          {isDue ? (
                            <Pressable
                              onPress={() => markReviewed(mistake.id)}
                              hitSlop={8}
                              style={styles.mistakeAction}
                              accessibilityRole="button"
                              accessibilityLabel={`Mark ${mistake.chapter} reviewed`}
                            >
                              <CircleCheck size={22} color={c.mint} strokeWidth={2.1} />
                            </Pressable>
                          ) : null}
                          <Pressable
                            onPress={() => removeMistake(mistake)}
                            hitSlop={8}
                            style={styles.mistakeAction}
                            accessibilityRole="button"
                            accessibilityLabel={`Delete the ${mistake.chapter} mistake`}
                          >
                            <Trash2 size={17} color={c.label3} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.neetFootnote}>
                  Nothing due. Log a wrong question and it comes back tomorrow.
                </Text>
              )}

              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setMistakeSheet(true);
                }}
                style={({ pressed }) => [styles.mistakeAdd, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Log a mistake"
              >
                <Plus size={15} color={c.tint} strokeWidth={2.6} />
                <Text style={[styles.mistakeAddText, { color: c.tint }]}>Log mistake</Text>
              </Pressable>
              {mistakeHint ? (
                <Text style={[styles.mistakeHint, { color: c.mint }]}>{mistakeHint}</Text>
              ) : null}
            </Card>

            {/* 4 — syllabus checklist */}
            <SectionHeader
              flush={isWide}
              title="Syllabus"
              trailing={<Text style={styles.neetProgress}>{syllabusState.percent}% covered</Text>}
            />
            <Card style={{ padding: 20 }}>
              {dueRevision.length ? (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setRevisionOnly((value) => !value);
                  }}
                  style={[
                    styles.revisionPill,
                    revisionOnly
                      ? { backgroundColor: c.tint }
                      : { backgroundColor: c.fill, borderWidth: 1, borderColor: c.separator },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    revisionOnly
                      ? "Show the full syllabus"
                      : `Show the ${dueRevision.length} chapters due for revision`
                  }
                >
                  <RotateCcw size={13} color={revisionOnly ? "#FFFFFF" : c.gold} strokeWidth={2.4} />
                  <Text
                    style={[styles.revisionPillText, { color: revisionOnly ? "#FFFFFF" : c.label }]}
                  >
                    {revisionOnly
                      ? `Showing ${dueRevision.length} due`
                      : `${dueRevision.length} due for revision`}
                  </Text>
                </Pressable>
              ) : null}

              {revisionOnly ? null : (
                <Segmented
                  options={NEET_SUBJECTS.map((s) => ({ value: s, label: s }))}
                  value={openSubject}
                  onChange={setOpenSubject}
                />
              )}
              <View style={{ marginTop: revisionOnly ? 0 : 8 }}>
                {(revisionOnly ? dueRevision : subjectChapters).map((ch) => {
                  const done = Boolean(syllabusState.checks[ch.id]);
                  const wColor = ch.weightage === "High" ? c.mint : ch.weightage === "Medium" ? c.gold : c.label3;
                  return (
                    <Pressable
                      key={ch.id}
                      onPress={() => toggleChapter(ch.id)}
                      style={({ pressed }) => [styles.neetChapterRow, pressed && { opacity: 0.6 }]}
                      accessibilityRole="checkbox"
                      aria-checked={done}
                      accessibilityLabel={`${ch.subject}, ${ch.chapter}, ${ch.weightage} weightage`}
                    >
                      <View style={[styles.neetCheck, done && { backgroundColor: c.tint, borderColor: c.tint }]}>
                        {done ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
                      </View>
                      <Text style={[styles.neetChapterName, done && !revisionOnly && { color: c.label3, textDecorationLine: "line-through" }]} numberOfLines={1}>
                        {revisionOnly ? <Text style={{ color: c.label3 }}>{ch.subject} · </Text> : null}
                        {ch.chapter}
                      </Text>
                      <View style={[styles.neetWeight, { backgroundColor: c.fill }]}>
                        <Text style={[styles.neetWeightText, { color: wColor }]}>{ch.weightage}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* 5 — community links */}
            <SectionHeader title="Community" />
            <Card style={{ padding: 20 }}>
              {SUBREDDITS.map((sub, i) => (
                <Pressable
                  key={sub.name}
                  onPress={() => Linking.openURL(sub.url).catch(() => {})}
                  accessibilityRole="link"
                  accessibilityLabel={`${sub.name}, open community`}
                  style={({ pressed }) => [styles.neetSubRow, i === 0 && { paddingTop: 0 }, pressed && { opacity: 0.6 }]}
                >
                  <View style={styles.neetSubHead}>
                    <View style={[styles.neetSubBadge, { backgroundColor: c.fill }]}>
                      <Text style={[styles.neetSubBadgeText, { color: c.label2 }]}>{sub.name}</Text>
                    </View>
                    <Text style={styles.neetSubDesc}>{sub.desc}</Text>
                    <ExternalLink size={16} color={c.label3} />
                  </View>
                </Pressable>
              ))}
            </Card>
          </>
        }
      />

      <MistakeSheet
        visible={mistakeSheet}
        onClose={() => setMistakeSheet(false)}
        onSave={saveMistake}
      />
    </ScreenScroll>
  );
}

function MistakeSheet({ visible, onClose, onSave }) {
  const { c } = useTheme();
  const styles = useStyles();
  const [subject, setSubject] = useState(NEET_SUBJECTS[0]);
  const [chapter, setChapter] = useState("");
  const [reason, setReason] = useState(MISTAKE_REASONS[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSubject(NEET_SUBJECTS[0]);
    setChapter("");
    setReason(MISTAKE_REASONS[0]);
    setNote("");
    setSaving(false);
  }, [visible]);

  const chapters = SYLLABUS.filter((entry) => entry.subject === subject);

  const pickSubject = (next) => {
    Haptics.selectionAsync().catch(() => {});
    setSubject(next);
    // A chapter from another subject would not match the new list.
    setChapter("");
  };

  const submit = async () => {
    if (!chapter) {
      Alert.alert("Pick a chapter", "A mistake is only useful if you know where it came from.");
      return;
    }
    try {
      setSaving(true);
      await onSave({ subject, chapter, reason, note });
    } catch (error) {
      Alert.alert("Not saved", error?.message || "Try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      title="Log mistake"
      subtitle="It comes back tomorrow, then after 3, 7 and 21 days."
      onClose={onClose}
    >
      <Segmented
        options={NEET_SUBJECTS.map((s) => ({ value: s, label: s }))}
        value={subject}
        onChange={pickSubject}
      />

      <SectionHeader title="Chapter" />
      <View style={styles.chipWrap} accessibilityRole="radiogroup">
        {chapters.map((entry) => {
          const active = entry.chapter === chapter;
          return (
            <Pressable
              key={entry.id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setChapter(entry.chapter);
              }}
              style={[styles.chip, active && { backgroundColor: c.tint, borderColor: c.tint }]}
              accessibilityRole="radio"
              aria-checked={active}
              accessibilityLabel={entry.chapter}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{entry.chapter}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Why" />
      <View style={styles.chipWrap} accessibilityRole="radiogroup">
        {MISTAKE_REASONS.map((value) => {
          const active = value === reason;
          return (
            <Pressable
              key={value}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setReason(value);
              }}
              style={[styles.chip, active && { backgroundColor: c.tint, borderColor: c.tint }]}
              accessibilityRole="radio"
              aria-checked={active}
              accessibilityLabel={MISTAKE_REASON_LABELS[value]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {MISTAKE_REASON_LABELS[value]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.group}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Note</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            accessibilityLabel="Note"
            placeholder="What went wrong? Optional"
            placeholderTextColor={c.label3}
            style={styles.fieldInput}
            accessibilityLabel="Mistake note"
          />
        </View>
      </View>

      <Pressable
        onPress={submit}
        disabled={saving}
        style={({ pressed }) => [styles.ctaWrap, pressed && { transform: [{ scale: 0.98 }] }]}
        accessibilityRole="button"
        accessibilityLabel="Save mistake"
      >
        <LinearGradient colors={c.tintGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Save mistake</Text>}
        </LinearGradient>
      </Pressable>
    </Sheet>
  );
}

function formatShortDateFromISO(iso) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ============================================================
// STUDY SHEET + PERIOD SHEET + DATE FIELD
// ============================================================

function StudySheet({ visible, prefill, onClose, onSave }) {
  const { c } = useTheme();
  const styles = useStyles();
  const [subject, setSubject] = useState("");
  const [minutes, setMinutes] = useState(0);
  const [customHours, setCustomHours] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const preMinutes = prefill?.minutes || 0;
    setSubject("");
    setMinutes(preMinutes);
    setCustomHours(preMinutes ? (preMinutes / 60).toFixed(2).replace(/\.?0+$/, "") : "");
    setNotes("");
    setSaving(false);
  }, [visible, prefill]);

  const applyPreset = (hours) => {
    Haptics.selectionAsync().catch(() => {});
    setMinutes(hoursToMinutes(hours));
    setCustomHours(String(hours));
  };

  const applyCustom = (text) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    setCustomHours(cleaned);
    const parsed = Number(cleaned);
    setMinutes(Number.isFinite(parsed) && parsed > 0 ? hoursToMinutes(parsed) : 0);
  };

  const submit = async () => {
    try {
      setSaving(true);
      await onSave({ subject, minutes, notes });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("Not saved", error?.message || "Try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      title="Log study"
      subtitle={prefill?.minutes ? `From your timer · ${formatDuration(prefill.minutes)}` : "Just the subject and how long."}
      onClose={onClose}
    >
      <View style={styles.group}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Subject</Text>
          <TextInput value={subject} onChangeText={setSubject} placeholder="Chemistry" placeholderTextColor={c.label3} accessibilityLabel="Subject" style={styles.fieldInput} />
        </View>
      </View>

      <SectionHeader title="How long" />
      <View style={styles.presetRow} accessibilityRole="radiogroup">
        {HOUR_PRESETS.map((hours) => {
          const active = minutes === hoursToMinutes(hours);
          return (
            <Pressable
              key={hours}
              onPress={() => applyPreset(hours)}
              style={[styles.preset, active && { backgroundColor: c.tint }]}
              accessibilityRole="radio"
              aria-checked={active}
              accessibilityLabel={`${hours} hours`}
            >
              <Text style={[styles.presetText, active && { color: "#FFFFFF" }]}>{hours}h</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.group}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Exact hours</Text>
          <TextInput value={customHours} onChangeText={applyCustom} placeholder="1.5" placeholderTextColor={c.label3} keyboardType="decimal-pad" accessibilityLabel="Exact hours" style={[styles.fieldInput, { textAlign: "right" }]} />
          <Text style={styles.fieldSuffix}>h</Text>
        </View>
        <View style={styles.separatorInset} />
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Optional" placeholderTextColor={c.label3} accessibilityLabel="Notes" style={styles.fieldInput} />
        </View>
      </View>

      <Text style={styles.sheetHint}>Saving {formatDuration(minutes)}.</Text>

      <Pressable
        onPress={submit}
        disabled={saving}
        accessibilityRole="button"
        aria-busy={saving}
        style={({ pressed }) => [styles.ctaWrap, pressed && { transform: [{ scale: 0.98 }] }]}
      >
        <LinearGradient colors={c.tintGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Save session</Text>}
        </LinearGradient>
      </Pressable>
    </Sheet>
  );
}

function DateField({ label, value, onChange, onClear, optional }) {
  const { c } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const base = useMemo(() => parseDateKey(value) || new Date(), [value]);
  const [year, setYear] = useState(base.getFullYear());
  const [month, setMonth] = useState(base.getMonth());
  const [day, setDay] = useState(base.getDate());

  useEffect(() => {
    const parsed = parseDateKey(value);
    if (!parsed) return;
    setYear(parsed.getFullYear());
    setMonth(parsed.getMonth());
    setDay(parsed.getDate());
  }, [value]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const list = [];
    for (let y = current - 5; y <= current + 1; y++) list.push(y);
    return list;
  }, []);

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);

  const confirm = () => {
    onChange(formatDateKey(new Date(year, month, Math.min(day, daysInMonth))));
    Haptics.selectionAsync().catch(() => {});
    setOpen(false);
  };

  return (
    <>
      <Pressable
        style={styles.fieldRow}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value ? formatReadableDate(value) : "not set"}`}
      >
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, !value && { color: c.label3 }]}>
          {value ? formatReadableDate(value) : "Choose"}
        </Text>
        {optional && value ? (
          <Pressable
            onPress={onClear}
            hitSlop={10}
            style={{ paddingLeft: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
          >
            <X size={16} color={c.label3} />
          </Pressable>
        ) : (
          <ChevronRight size={17} color={c.label3} style={{ marginLeft: 4 }} />
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent navigationBarTranslucent>
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>{label}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerStrip}
              accessibilityRole="radiogroup"
            >
              {MONTHS.map((monthName, index) => (
                <Pressable
                  key={monthName}
                  onPress={() => {
                    setMonth(index);
                    Haptics.selectionAsync().catch(() => {});
                  }}
                  style={[styles.pickerPill, month === index && { backgroundColor: c.tint }]}
                  accessibilityRole="radio"
                  aria-checked={month === index}
                  accessibilityLabel={monthName}
                >
                  <Text style={[styles.pickerPillText, month === index && { color: "#FFFFFF" }]}>{monthName.slice(0, 3)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerStrip}
              accessibilityRole="radiogroup"
            >
              {years.map((y) => (
                <Pressable
                  key={y}
                  onPress={() => {
                    setYear(y);
                    Haptics.selectionAsync().catch(() => {});
                  }}
                  style={[styles.pickerPill, year === y && { backgroundColor: c.tint }]}
                  accessibilityRole="radio"
                  aria-checked={year === y}
                  accessibilityLabel={String(y)}
                >
                  <Text style={[styles.pickerPillText, year === y && { color: "#FFFFFF" }]}>{y}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.pickerGrid} accessibilityRole="radiogroup">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                const active = Math.min(day, daysInMonth) === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => {
                      setDay(d);
                      Haptics.selectionAsync().catch(() => {});
                    }}
                    style={[styles.pickerDay, active && { backgroundColor: c.tint }]}
                    accessibilityRole="radio"
                    aria-checked={active}
                    accessibilityLabel={`${d} ${MONTHS[month]} ${year}`}
                  >
                    <Text style={[styles.pickerDayText, active && { color: "#FFFFFF", fontFamily: BODY_SEMI }]}>{d}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.pickerActions}>
              <Pressable onPress={() => setOpen(false)} style={[styles.ghostButton, { flex: 1 }]} accessibilityRole="button">
                <Text style={styles.ghostButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirm} style={[styles.ctaWrap, { flex: 1 }]} accessibilityRole="button">
                <LinearGradient colors={c.tintGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaSmall}>
                  <Text style={styles.ctaTextSmall}>Done</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function PeriodSheet({ visible, period, onClose, onSave }) {
  const { c } = useTheme();
  const styles = useStyles();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStartDate(period?.startDate || getTodayKey());
    setEndDate(period?.endDate || "");
    setSaving(false);
  }, [visible, period]);

  const submit = async () => {
    try {
      setSaving(true);
      await onSave({ startDate: startDate.trim(), endDate: endDate.trim() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("Not saved", error?.message || "Check the dates.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} title={period ? "Edit period" : "Log a period"} subtitle="Leave the end date empty while it's still going." onClose={onClose}>
      <View style={styles.group}>
        <DateField label="Starts" value={startDate} onChange={setStartDate} />
        <View style={styles.separatorInset} />
        <DateField label="Ends" value={endDate} onChange={setEndDate} onClear={() => setEndDate("")} optional />
      </View>
      <Pressable
        onPress={submit}
        disabled={saving}
        accessibilityRole="button"
        aria-busy={saving}
        style={({ pressed }) => [styles.ctaWrap, pressed && { transform: [{ scale: 0.98 }] }]}
      >
        <LinearGradient colors={c.tintGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Save period</Text>}
        </LinearGradient>
      </Pressable>
    </Sheet>
  );
}

// ============================================================
// SETTINGS
// ============================================================

function SettingsSheet({ visible, profile, onClose, onLockNow }) {
  const { c, preference, setPreference } = useTheme();
  const { prefs, updatePrefs } = usePrefs();
  const styles = useStyles();
  // Reminders and the fingerprint lock are native-only. On web those controls
  // would be dead, so the sections are not rendered at all.
  const isWeb = Platform.OS === "web";
  const [nameDraft, setNameDraft] = useState(prefs.displayName);
  const [affirmDraft, setAffirmDraft] = useState(prefs.affirmation);

  useEffect(() => {
    if (visible) {
      setNameDraft(prefs.displayName);
      setAffirmDraft(prefs.affirmation);
    }
  }, [visible, prefs.displayName, prefs.affirmation]);

  const signOut = () => {
    Alert.alert("Sign out of Haven?", "You'll need your password to get back in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          onClose();
          await logoutUser();
        },
      },
    ]);
  };

  const toggleNotifs = async (key) => {
    if (!prefs[key]) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert("Notifications off", "Allow notifications in phone Settings, then enable again.");
        return;
      }
    }
    updatePrefs({ [key]: !prefs[key] });
  };

  const SettingRow = ({ icon: Icon, tint, title, sub, right }) => (
    <View style={styles.row}>
      <View style={[styles.glyph, { backgroundColor: tint }]}>
        <Icon size={17} color={c.label} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub ? <Text style={styles.rowMeta}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );

  const Toggle = ({ on, onPress, label }) => (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.toggle, on && { backgroundColor: c.tint }]}
      accessibilityRole="switch"
      aria-checked={on}
      accessibilityLabel={label}
    >
      <View style={[styles.toggleKnob, on && { alignSelf: "flex-end", backgroundColor: "#fff" }]} />
    </Pressable>
  );

  return (
    <Sheet
      visible={visible}
      title="Settings"
      subtitle={profile?.name ? `Signed in as ${profile.name}` : undefined}
      onClose={onClose}
    >
      <SectionHeader title="Personal" />
      <View style={styles.group}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Greeting name</Text>
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            accessibilityLabel="Greeting name"
            onBlur={() => updatePrefs({ displayName: nameDraft.trim() || "Chaaru" })}
            placeholder="Chaaru"
            placeholderTextColor={c.label3}
            style={[styles.fieldInput, { textAlign: "right" }]}
          />
        </View>
        <View style={styles.separatorInset} />
        <View style={[styles.fieldRow, { alignItems: "flex-start", paddingVertical: 12 }]}>
          <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Affirmation</Text>
          <TextInput
            value={affirmDraft}
            onChangeText={setAffirmDraft}
            accessibilityLabel="Affirmation"
            onBlur={() => updatePrefs({ affirmation: affirmDraft.trim() || DEFAULT_PREFS.affirmation })}
            placeholder={DEFAULT_PREFS.affirmation}
            placeholderTextColor={c.label3}
            multiline
            style={[styles.fieldInput, { textAlign: "right", minHeight: 44 }]}
          />
        </View>
      </View>
      <Text style={styles.sheetHint}>Your name appears once, in the Today greeting.</Text>

      <SectionHeader title="Appearance" />
      <Segmented
        value={preference}
        onChange={setPreference}
        options={[
          { value: "light", label: "Light", icon: Sun },
          { value: "dark", label: "Dark", icon: Moon },
          { value: "system", label: "Auto" },
        ]}
      />
      <Text style={styles.sheetHint}>Accent theme</Text>
      <View style={styles.accentRow} accessibilityRole="radiogroup">
        {ACCENT_OPTIONS.map((a) => {
          const active = prefs.accent === a.value;
          const dot = (ACCENTS[a.value]?.tintGradient?.dark || ["#ccc"])[1];
          return (
            <Pressable
              key={a.value}
              onPress={() => updatePrefs({ accent: a.value })}
              hitSlop={6}
              style={[styles.accentChip, active && { borderColor: c.tint, backgroundColor: c.tintSoft }]}
              accessibilityRole="radio"
              aria-checked={active}
              accessibilityLabel={`${a.label} accent`}
            >
              <View style={[styles.accentDot, { backgroundColor: dot }]} />
              <Text style={[styles.accentLabel, active && { color: c.tint, fontFamily: BODY_SEMI }]}>{a.label}</Text>
              {active ? <Check size={13} color={c.tint} /> : null}
            </Pressable>
          );
        })}
      </View>

      {isWeb ? null : (
        <>
          <SectionHeader title="Reminders" />
          <Card>
            <SettingRow icon={Moon} tint={c.tintSoft} title="Wind-down · 2:00 AM daily" sub="Today's hours + backlog + goodnight" right={<Toggle label="Wind-down reminders" on={prefs.windDownEnabled} onPress={() => toggleNotifs("windDownEnabled")} />} />
            <View style={styles.separatorInset} />
            <SettingRow icon={BarChart3} tint={c.goldSoft} title="Weekly report · Sun 8 PM" sub="Week total, goal progress, backlog change" right={<Toggle label="Weekly report" on={prefs.weeklyReportEnabled} onPress={() => toggleNotifs("weeklyReportEnabled")} />} />
          </Card>
          <Text style={styles.sheetHint}>Wind-down becomes a pure goodnight once 8h is done.</Text>

          <SectionHeader title="Privacy" />
          <Card>
            <SettingRow icon={Fingerprint} tint={c.mintSoft} title="Fingerprint lock" sub={prefs.lockEnabled ? "On — timer sessions bypass it" : "Off"} right={<Toggle label="Fingerprint lock" on={prefs.lockEnabled} onPress={() => updatePrefs({ lockEnabled: !prefs.lockEnabled })} />} />
            <View style={styles.separatorInset} />
            <Pressable
              onPress={() => {
                onClose();
                setTimeout(() => onLockNow?.(), 300);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
            >
              <View style={[styles.glyph, { backgroundColor: c.fill }]}>
                <ShieldCheck size={17} color={c.label2} />
              </View>
              <Text style={[styles.rowTitle, { flex: 1 }]}>Lock now</Text>
            </Pressable>
          </Card>
          <Text style={styles.sheetHint}>Lock triggers when the app returns from background — never while a focus timer runs.</Text>
        </>
      )}

      <SectionHeader title="Account" />
      <Card>
        <Pressable onPress={signOut} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]} accessibilityRole="button">
          <View style={[styles.glyph, { backgroundColor: c.redSoft }]}>
            <LogOut size={17} color={c.red} />
          </View>
          <Text style={[styles.rowTitle, { flex: 1, color: c.red }]}>Sign out</Text>
        </Pressable>
      </Card>
      <Text style={styles.sheetHint}>Haven · made with care</Text>
    </Sheet>
  );
}

// ============================================================
// STYLES
// ============================================================

const HAIRLINE = StyleSheet.hairlineWidth;

const makeStyles = (c) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    screenContent: { paddingHorizontal: 18 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
    screenFootnote: {
      marginTop: 18,
      fontSize: 13,
      lineHeight: 19,
      color: c.label3,
      textAlign: "center",
      fontFamily: BODY,
      ...TEXT_FIX,
    },

    // NEET TAB
    neetHero: { gap: 4, paddingHorizontal: 20, paddingVertical: 20 },
    neetHeroLabel: {
      fontSize: 13,
      lineHeight: 18,
      fontFamily: BODY_MED,
      color: c.label2,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      ...TEXT_FIX,
    },
    neetDays: {
      fontSize: 56,
      lineHeight: 62,
      fontFamily: DISPLAY,
      color: c.label,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    neetDaysUnit: { fontSize: 20, lineHeight: 28, fontFamily: BODY_MED, color: c.label2 },
    neetClock: {
      fontSize: 15,
      lineHeight: 20,
      fontFamily: BODY_MED,
      color: c.label2,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    neetCapacity: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: BODY,
      color: c.label3,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    neetStatRow: { flexDirection: "row", paddingVertical: 12 },
    neetStatCell: { flex: 1, alignItems: "center" },
    neetStatNum: {
      fontSize: 19,
      lineHeight: 24,
      fontFamily: DISPLAY,
      color: c.label,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    neetStatLabel: { fontSize: 12, lineHeight: 16, fontFamily: BODY, color: c.label3, marginTop: 2 },
    neetFootnote: { fontSize: 13, lineHeight: 18, fontFamily: BODY, color: c.label2, ...TEXT_FIX },
    neetFieldRow: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 12 },
    neetScoreInput: {
      flex: 1,
      // Without this a web <input> keeps its intrinsic width and shoves the
      // button past the card edge on a narrow screen.
      minWidth: 0,
      height: 44,
      borderRadius: 10,
      backgroundColor: c.surfaceSunken,
      paddingHorizontal: 14,
      fontSize: 17,
      fontFamily: BODY_MED,
      color: c.label,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    neetLogBtn: {
      height: 44,
      paddingHorizontal: 18,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    neetLogBtnText: { fontSize: 15, lineHeight: 20, fontFamily: BODY_SEMI, color: "#FFFFFF", ...TEXT_FIX },
    neetResult: { marginTop: 12, borderRadius: 10, padding: 14, gap: 4 },
    neetResultTop: {
      fontSize: 17,
      lineHeight: 22,
      fontFamily: BODY_SEMI,
      color: c.label,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    neetResultGap: { fontSize: 14, lineHeight: 19, fontFamily: BODY_MED, fontVariant: ["tabular-nums"], ...TEXT_FIX },
    neetMockRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      gap: 10,
    },
    neetMockName: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: BODY_MED, color: c.label, ...TEXT_FIX },
    neetMockMeta: { fontSize: 13, lineHeight: 18, fontFamily: BODY, color: c.label2, fontVariant: ["tabular-nums"], ...TEXT_FIX },
    neetProgress: { fontSize: 13, lineHeight: 18, fontFamily: BODY_SEMI, color: c.tint, fontVariant: ["tabular-nums"], ...TEXT_FIX },
    neetChapterRow: { flexDirection: "row", alignItems: "center", minHeight: 44, gap: 12 },
    neetCheck: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.separator,
      alignItems: "center",
      justifyContent: "center",
    },
    neetChapterName: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: BODY, color: c.label, ...TEXT_FIX },
    neetWeight: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    neetWeightText: { fontSize: 11, lineHeight: 15, fontFamily: BODY_SEMI, ...TEXT_FIX },
    neetFeedEmpty: { paddingVertical: 24, alignItems: "center", gap: 10 },
    neetRetry: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    neetRetryText: { fontSize: 14, lineHeight: 19, fontFamily: BODY_SEMI, ...TEXT_FIX },
    neetPostRow: { paddingVertical: 12, gap: 6 },
    neetPostHead: { flexDirection: "row", alignItems: "center", gap: 8 },
    neetSubBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    neetSubBadgeText: { fontSize: 11, lineHeight: 15, fontFamily: BODY_SEMI, ...TEXT_FIX },
    neetPostMeta: {
      flex: 1,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: BODY,
      color: c.label3,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    neetPostTitle: { fontSize: 15, lineHeight: 21, fontFamily: BODY_MED, color: c.label, ...TEXT_FIX },
    neetSubRow: { paddingVertical: 12 },
    neetSubHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    neetSubBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    neetSubBadgeText: { fontSize: 12, lineHeight: 16, fontFamily: BODY_SEMI, ...TEXT_FIX },
    neetSubDesc: { fontSize: 13, lineHeight: 18, fontFamily: BODY, color: c.label2, flex: 1, ...TEXT_FIX },

    // MISTAKE LOG
    mistakeRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10 },
    mistakeTitle: { fontSize: 14, lineHeight: 19, fontFamily: BODY_MED, color: c.label, ...TEXT_FIX },
    mistakeMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    mistakeMeta: {
      fontSize: 12,
      lineHeight: 16,
      fontFamily: BODY,
      color: c.label3,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    mistakeNote: { fontSize: 12, lineHeight: 16, fontFamily: BODY, color: c.label2, ...TEXT_FIX },
    mistakeAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    mistakeAdd: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingTop: 10 },
    mistakeAddText: { fontSize: 15, lineHeight: 20, fontFamily: BODY_SEMI, ...TEXT_FIX },
    mistakeHint: { fontSize: 12, lineHeight: 16, fontFamily: BODY_MED, marginTop: -6, ...TEXT_FIX },
    chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
    chip: {
      minHeight: 40,
      justifyContent: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "transparent",
      paddingHorizontal: 12,
      backgroundColor: c.surfaceSunken,
    },
    chipText: { fontSize: 14, lineHeight: 19, fontFamily: BODY_MED, color: c.label2, ...TEXT_FIX },
    chipTextActive: { color: "#FFFFFF", fontFamily: BODY_SEMI },
    revisionPill: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: 999,
      marginBottom: 12,
    },
    revisionPillText: { fontSize: 13, lineHeight: 18, fontFamily: BODY_SEMI, ...TEXT_FIX },

    // HEADERS
    homeHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20, gap: 12 },
    pageHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 10 },
    goldLine: { marginTop: -8, marginBottom: 16, fontSize: 13, lineHeight: 19, fontFamily: BODY_MED, color: c.label2, ...TEXT_FIX },
    duelLine: { marginTop: -12, marginBottom: 16, fontSize: 13, lineHeight: 19, fontFamily: BODY_SEMI, ...TEXT_FIX },
    eyebrow: {
      fontSize: 11,
      lineHeight: 15,
      fontFamily: BODY_BOLD,
      letterSpacing: 1.6,
      color: c.tint,
      marginBottom: 6,
      ...TEXT_FIX,
    },
    heroGreeting: {
      fontSize: 38,
      lineHeight: 44,
      fontFamily: DISPLAY,
      color: c.label,
      letterSpacing: -0.5,
      ...TEXT_FIX,
    },
    heroGreetingItalic: { fontFamily: DISPLAY_ITALIC, color: c.tint },
    affirmation: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 21,
      fontFamily: DISPLAY_ITALIC,
      color: c.label2,
      maxWidth: 300,
      ...TEXT_FIX,
    },
    pageTitle: {
      fontSize: 36,
      lineHeight: 42,
      fontFamily: DISPLAY,
      color: c.label,
      letterSpacing: -0.5,
      ...TEXT_FIX,
    },
    avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginTop: 4 },

    // HERO CARD
    heroCard: { borderRadius: 28, marginBottom: 6 },
    heroCardInner: {
      borderRadius: 28,
      overflow: "hidden",
      padding: 20,
      shadowColor: c.shadow,
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    heroGlow: {
      position: "absolute",
      width: 220,
      height: 220,
      borderRadius: 110,
      right: -70,
      top: -80,
      backgroundColor: "rgba(255,255,255,0.14)",
    },
    heroRow: { flexDirection: "row", alignItems: "center", gap: 16 },
    heroRingValue: {
      fontSize: 24,
      lineHeight: 29,
      fontFamily: BODY_BOLD,
      color: "#FFFFFF",
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    heroRingCaption: {
      fontSize: 11,
      lineHeight: 15,
      fontFamily: BODY_MED,
      color: "rgba(255,255,255,0.85)",
      ...TEXT_FIX,
    },
    // The pace line sits on the gradient card, so contrast comes from white text
    // and a tone-coloured dot rather than mint/gold text on iOS blue.
    heroPace: { flexDirection: "row", alignItems: "center", gap: 6 },
    heroPaceDot: { width: 6, height: 6, borderRadius: 3 },
    heroPaceText: {
      fontSize: 12,
      lineHeight: 16,
      fontFamily: BODY_MED,
      color: "rgba(255,255,255,0.92)",
      ...TEXT_FIX,
    },
    heroKicker: {
      fontSize: 10,
      lineHeight: 14,
      fontFamily: BODY_BOLD,
      letterSpacing: 1.6,
      color: "rgba(255,255,255,0.85)",
      ...TEXT_FIX,
    },
    heroLine: {
      marginTop: 6,
      fontSize: 21,
      lineHeight: 26,
      fontFamily: DISPLAY,
      color: "#FFFFFF",
      ...TEXT_FIX,
    },
    heroMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    heroPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.20)",
    },
    heroPillText: {
      fontSize: 11,
      lineHeight: 15,
      fontFamily: BODY_SEMI,
      color: "#FFFFFF",
      ...TEXT_FIX,
    },

    // SECTIONS
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 24,
      marginBottom: 12,
      paddingHorizontal: 2,
      gap: 10,
    },
    sectionTitle: { fontSize: 20, lineHeight: 26, fontFamily: DISPLAY, color: c.label, ...TEXT_FIX },
    sectionDate: { fontSize: 12, lineHeight: 17, color: c.label2, fontFamily: BODY_MED, ...TEXT_FIX },
    link: { fontSize: 13, lineHeight: 18, fontFamily: BODY_SEMI, color: c.tint, ...TEXT_FIX },

    // AT-A-GLANCE TRIO
    trioRow: { flexDirection: "row", gap: 12 },
    trioMain: { flex: 1.25, padding: 18, justifyContent: "center", gap: 6 },
    trioCol: { flex: 1, gap: 12 },
    trioSmall: { flex: 1, padding: 14, gap: 4 },
    trioValue: {
      fontSize: 30,
      lineHeight: 36,
      fontFamily: DISPLAY,
      color: c.label,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    trioValueSmall: {
      fontSize: 21,
      lineHeight: 26,
      fontFamily: DISPLAY,
      color: c.label,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    trioUnit: { fontSize: 13, lineHeight: 18, fontFamily: BODY, color: c.label2 },
    trioLabel: { fontSize: 12, lineHeight: 17, color: c.label2, fontFamily: BODY_MED, ...TEXT_FIX },
    trioLink: { fontSize: 12, lineHeight: 17, color: c.tint, fontFamily: BODY_SEMI, ...TEXT_FIX },

    // LIVE TIMER
    liveTimer: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 15 },
    liveDot: { width: 9, height: 9, borderRadius: 5 },
    liveTimerText: { flex: 1, fontSize: 14, lineHeight: 20, color: c.label, fontFamily: BODY_MED, ...TEXT_FIX },
    liveTimerClock: {
      fontSize: 17,
      lineHeight: 23,
      fontFamily: BODY_BOLD,
      color: c.tint,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },

    // CYCLE
    cycleCard: { padding: 18 },
    cycleMain: { flexDirection: "row", alignItems: "center", gap: 13 },
    cycleCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
    cycleLabel: { fontSize: 17, lineHeight: 23, fontFamily: DISPLAY, color: c.label, ...TEXT_FIX },
    cycleSubtext: { marginTop: 3, fontSize: 12, lineHeight: 18, color: c.label2, fontFamily: BODY, ...TEXT_FIX },
    cycleAvg: { alignItems: "center", backgroundColor: c.fill, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
    cycleAvgValue: { fontSize: 16, lineHeight: 21, fontFamily: BODY_BOLD, color: c.tint, ...TEXT_FIX },
    cycleAvgLabel: { fontSize: 9, lineHeight: 12, fontFamily: BODY_BOLD, letterSpacing: 1.2, color: c.label3, ...TEXT_FIX },

    // CARDS / ROWS
    card: {
      backgroundColor: c.surface,
      borderRadius: 24,
      overflow: "hidden",
      borderWidth: HAIRLINE,
      borderColor: c.separator,
      shadowColor: c.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 15, gap: 12, minHeight: 62 },
    rowTitle: { fontSize: 15, lineHeight: 21, color: c.label, fontFamily: BODY_SEMI, ...TEXT_FIX },
    rowMeta: { marginTop: 2, fontSize: 12, lineHeight: 18, color: c.label2, fontFamily: BODY, ...TEXT_FIX },
    glyph: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    glyphLarge: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
    deleteButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.fill },
    separatorInset: { height: HAIRLINE, backgroundColor: c.separator, marginLeft: 15 },
    emptyCard: { padding: 26, alignItems: "center" },
    emptyCardTitle: { marginTop: 14, fontSize: 19, lineHeight: 25, fontFamily: DISPLAY, color: c.label, textAlign: "center", ...TEXT_FIX },
    emptyCardBody: { marginTop: 6, fontSize: 13, lineHeight: 19, color: c.label2, textAlign: "center", maxWidth: 260, fontFamily: BODY, ...TEXT_FIX },
    emptyTitle: { marginTop: 18, fontSize: 26, lineHeight: 33, fontFamily: DISPLAY, color: c.label, textAlign: "center", ...TEXT_FIX },
    emptyBody: { marginTop: 8, fontSize: 15, lineHeight: 22, color: c.label2, textAlign: "center", maxWidth: 300, fontFamily: BODY, ...TEXT_FIX },

    // CTA
    ctaWrap: { marginTop: 20, borderRadius: 20, overflow: "hidden" },
    cta: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 16,
      shadowColor: c.shadow,
      shadowOpacity: 0.3,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 7 },
      elevation: 5,
    },
    ctaText: { color: "#FFFFFF", fontSize: 16, lineHeight: 22, fontFamily: BODY_BOLD, letterSpacing: 0.2, ...TEXT_FIX },
    ctaSmall: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14, borderRadius: 18 },
    ctaTextSmall: { color: "#FFFFFF", fontSize: 15, lineHeight: 21, fontFamily: BODY_BOLD, ...TEXT_FIX },
    filledButton: {
      marginTop: 20,
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: c.tint,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    filledButtonText: { color: "#FFFFFF", fontSize: 16, lineHeight: 22, fontFamily: BODY_BOLD, ...TEXT_FIX },
    tintedButton: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: c.tintSoft,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingHorizontal: 12,
      marginTop: 14,
    },
    tintedButtonText: { color: c.tint, fontSize: 15, lineHeight: 21, fontFamily: BODY_BOLD, ...TEXT_FIX },
    ghostButton: { minHeight: 52, borderRadius: 18, backgroundColor: c.fill, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
    ghostButtonText: { color: c.label2, fontSize: 15, lineHeight: 21, fontFamily: BODY_SEMI, ...TEXT_FIX },
    ghostSquare: { width: 52, height: 52, borderRadius: 18, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" },

    // FAB
    fabWrap: { position: "absolute", alignSelf: "center", borderRadius: 30, overflow: "hidden" },
    fab: {
      height: 60,
      paddingHorizontal: 26,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      shadowColor: c.shadow,
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    fabText: { color: "#FFFFFF", fontSize: 16, lineHeight: 22, fontFamily: BODY_BOLD, ...TEXT_FIX },

    // AUTH
    authScroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22 },
    authHead: { alignItems: "center", marginBottom: 26 },
    authIconWrap: {
      width: 96,
      height: 96,
      borderRadius: 32,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: HAIRLINE,
      borderColor: c.separator,
      shadowColor: c.shadow,
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
      overflow: "hidden",
    },
    authIcon: { width: 96, height: 96, borderRadius: 32 },
    splashIcon: { width: 88, height: 88, borderRadius: 28 },
    authTitle: { marginTop: 16, fontSize: 44, lineHeight: 50, fontFamily: DISPLAY_ITALIC, color: c.label, ...TEXT_FIX },
    authSubtitle: { marginTop: 6, fontSize: 15, lineHeight: 22, color: c.label2, textAlign: "center", fontFamily: BODY, ...TEXT_FIX },
    authFootnote: { marginTop: 16, fontSize: 12, lineHeight: 18, color: c.label3, textAlign: "center", fontFamily: BODY, ...TEXT_FIX },
    loadingTitle: { marginTop: 20, fontSize: 34, lineHeight: 41, fontFamily: DISPLAY_ITALIC, color: c.label, ...TEXT_FIX },
    fieldCard: { backgroundColor: c.surface, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 8, borderWidth: HAIRLINE, borderColor: c.separator },
    fieldEyebrow: { fontSize: 10, lineHeight: 14, fontFamily: BODY_BOLD, letterSpacing: 1.4, color: c.tint, marginTop: 10, ...TEXT_FIX },
    fieldBig: { fontSize: 17, lineHeight: 24, color: c.label, fontFamily: BODY_MED, paddingVertical: 8, ...TEXT_FIX },
    fieldDivider: { height: HAIRLINE, backgroundColor: c.separator, marginVertical: 2 },
    passwordRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    eyeButton: { padding: 8 },

    // FORM
    group: { backgroundColor: c.surface, borderRadius: 20, overflow: "hidden", marginTop: 10, borderWidth: HAIRLINE, borderColor: c.separator },
    fieldRow: { flexDirection: "row", alignItems: "center", minHeight: 56, paddingHorizontal: 16 },
    fieldLabel: { fontSize: 15, lineHeight: 21, color: c.label, width: 108, fontFamily: BODY_MED, ...TEXT_FIX },
    fieldInput: { flex: 1, fontSize: 15, color: c.label, fontFamily: BODY_MED, paddingVertical: 14, ...TEXT_FIX },
    fieldValue: { flex: 1, fontSize: 15, lineHeight: 21, color: c.label, textAlign: "right", fontFamily: BODY_MED, ...TEXT_FIX },
    fieldSuffix: { marginLeft: 6, fontSize: 15, lineHeight: 21, color: c.label2, fontFamily: BODY, ...TEXT_FIX },

    // CALENDAR
    calendarCard: { padding: 16 },
    calendarHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    calendarArrow: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" },
    calendarMonth: { fontSize: 21, lineHeight: 27, fontFamily: DISPLAY, color: c.label, ...TEXT_FIX },
    weekRow: { flexDirection: "row", marginBottom: 6 },
    weekDay: { width: `${100 / 7}%`, textAlign: "center", fontSize: 11, lineHeight: 16, fontFamily: BODY_BOLD, color: c.label3, ...TEXT_FIX },
    calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
    day: { width: `${100 / 7}%`, height: 46, alignItems: "center", justifyContent: "center" },
    dayInner: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    dayText: { fontSize: 14, lineHeight: 20, color: c.label, fontFamily: BODY_MED, fontVariant: ["tabular-nums"], ...TEXT_FIX },
    goldDot: { position: "absolute", bottom: 3, width: 4, height: 4, borderRadius: 2 },
    legend: { flexDirection: "row", gap: 20, marginTop: 14, paddingTop: 14, borderTopWidth: HAIRLINE, borderTopColor: c.separator },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 7, height: 7, borderRadius: 4 },
    legendText: { fontSize: 11, lineHeight: 16, color: c.label2, fontFamily: BODY, ...TEXT_FIX },

    // TIMER
    timerCard: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 18 },
    timerStage: { width: 268, height: 268, alignItems: "center", justifyContent: "center" },
    timerHalo: { position: "absolute", width: 268, height: 268, borderRadius: 134 },
    timerRing: { width: 252, height: 252, borderRadius: 126, alignItems: "center", justifyContent: "center", padding: 7 },
    timerInner: { flex: 1, alignSelf: "stretch", borderRadius: 120, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" },
    timerClock: {
      fontSize: 50,
      lineHeight: 60,
      fontFamily: BODY_BOLD,
      color: c.label,
      letterSpacing: -1,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    timerCaption: { marginTop: 4, fontSize: 14, lineHeight: 20, color: c.label2, fontFamily: BODY_SEMI, ...TEXT_FIX },
    timerProgress: { alignSelf: "stretch", marginTop: 24 },
    timerProgressText: { marginTop: 10, fontSize: 12, lineHeight: 18, color: c.label2, textAlign: "center", fontFamily: BODY, ...TEXT_FIX },
    timerControls: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 22, alignSelf: "stretch" },
    todayCard: { padding: 18 },
    todayValue: {
      fontSize: 32,
      lineHeight: 39,
      fontFamily: DISPLAY,
      color: c.label,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    todayGoal: { marginTop: 2, fontSize: 13, lineHeight: 19, color: c.label2, fontFamily: BODY, ...TEXT_FIX },

    // BACKLOG / STREAK
    backlogBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 22, padding: 16, marginTop: 14 },
    backlogTitle: { fontSize: 14, lineHeight: 19, fontFamily: BODY_BOLD, color: c.label, ...TEXT_FIX },
    backlogSub: { marginTop: 3, fontSize: 12, lineHeight: 17, color: c.label2, fontFamily: BODY, ...TEXT_FIX },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    ringValue: {
      fontSize: 20,
      lineHeight: 25,
      fontFamily: BODY_BOLD,
      color: c.label,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    ringCaption: { fontSize: 11, lineHeight: 15, fontFamily: BODY_SEMI, color: c.label2, ...TEXT_FIX },
    streakPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
    streakPillText: { fontSize: 12, lineHeight: 17, fontFamily: BODY_BOLD, ...TEXT_FIX },
    bestRow: { flexDirection: "row", alignItems: "center", gap: 8, margin: 12, padding: 12, borderRadius: 14 },
    bestText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: BODY_SEMI, color: c.label, ...TEXT_FIX },
    gradeDot: { width: 10, height: 10, borderRadius: 5 },

    // INSIGHTS
    chartCard: { padding: 18 },
    chartValue: {
      fontSize: 36,
      lineHeight: 43,
      fontFamily: DISPLAY,
      color: c.label,
      fontVariant: ["tabular-nums"],
      ...TEXT_FIX,
    },
    chartUnit: { fontSize: 17, lineHeight: 23, fontFamily: BODY, color: c.label2 },
    chartMeta: { marginTop: 2, fontSize: 13, lineHeight: 19, color: c.label2, fontFamily: BODY, ...TEXT_FIX },
    chart: { flexDirection: "row", height: 138, gap: 8, marginTop: 20 },
    chartColumn: { flex: 1, alignItems: "center" },
    chartTrack: { flex: 1, width: "100%", justifyContent: "flex-end", borderRadius: 10, overflow: "hidden", backgroundColor: c.surfaceSunken },
    chartBar: { width: "100%", borderRadius: 10 },
    chartLabel: { marginTop: 8, fontSize: 11, lineHeight: 16, color: c.label3, fontFamily: BODY_SEMI, ...TEXT_FIX },
    statRow: { flexDirection: "row", alignItems: "center", minHeight: 52, paddingHorizontal: 16, gap: 11 },
    statDot: { width: 8, height: 8, borderRadius: 4 },
    statRowLabel: { flex: 1, fontSize: 15, lineHeight: 21, color: c.label, fontFamily: BODY, ...TEXT_FIX },
    statRowValue: { fontSize: 15, lineHeight: 21, fontFamily: BODY_SEMI, color: c.label2, fontVariant: ["tabular-nums"], ...TEXT_FIX },

    // PROGRESS
    progressTrack: { height: 7, borderRadius: 4, backgroundColor: c.fill, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 4 },

    // SEGMENTED
    segmented: { flexDirection: "row", backgroundColor: c.fill, borderRadius: 16, padding: 3, marginTop: 10 },
    segment: { flex: 1, height: 40, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
    segmentText: { fontSize: 14, lineHeight: 20, fontFamily: BODY_SEMI, color: c.label2, ...TEXT_FIX },

    // ACCENT PICKER
    accentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    accentChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    accentDot: { width: 14, height: 14, borderRadius: 7 },
    accentLabel: { fontSize: 13, lineHeight: 18, fontFamily: BODY_MED, color: c.label, ...TEXT_FIX },

    // TOGGLE
    toggle: { width: 48, height: 29, borderRadius: 15, backgroundColor: c.fillStrong, padding: 3, justifyContent: "center" },
    toggleKnob: { width: 23, height: 23, borderRadius: 12, backgroundColor: c.surfaceRaised },

    // SHEETS
    sheetBackdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: "flex-end" },
    sheet: { backgroundColor: c.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 18, maxHeight: "90%" },
    grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: c.label3, marginTop: 10, marginBottom: 14 },
    sheetHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6, gap: 12 },
    sheetTitle: { fontSize: 27, lineHeight: 33, fontFamily: DISPLAY, color: c.label, ...TEXT_FIX },
    sheetSubtitle: { marginTop: 4, fontSize: 13, lineHeight: 19, color: c.label2, fontFamily: BODY, ...TEXT_FIX },
    sheetClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" },
    sheetHint: { marginTop: 12, paddingHorizontal: 4, fontSize: 12, lineHeight: 18, color: c.label2, fontFamily: BODY, ...TEXT_FIX },
    presetRow: { flexDirection: "row", gap: 8 },
    preset: { flex: 1, height: 46, borderRadius: 15, backgroundColor: c.surface, borderWidth: HAIRLINE, borderColor: c.separator, alignItems: "center", justifyContent: "center" },
    presetText: { fontSize: 15, lineHeight: 21, fontFamily: BODY_BOLD, color: c.label, ...TEXT_FIX },

    // DATE PICKER
    pickerBackdrop: { flex: 1, backgroundColor: c.scrim, alignItems: "center", justifyContent: "center", padding: 22 },
    pickerCard: { width: "100%", backgroundColor: c.surface, borderRadius: 26, padding: 18 },
    pickerTitle: { fontSize: 20, lineHeight: 26, fontFamily: DISPLAY, color: c.label, textAlign: "center", marginBottom: 14, ...TEXT_FIX },
    pickerStrip: { gap: 6, paddingBottom: 10 },
    pickerPill: { paddingHorizontal: 13, height: 34, borderRadius: 17, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" },
    pickerPillText: { fontSize: 13, lineHeight: 19, fontFamily: BODY_SEMI, color: c.label, ...TEXT_FIX },
    pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, justifyContent: "center" },
    pickerDay: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" },
    pickerDayText: { fontSize: 14, lineHeight: 20, color: c.label, fontFamily: BODY_MED, fontVariant: ["tabular-nums"], ...TEXT_FIX },
    pickerActions: { flexDirection: "row", gap: 10, marginTop: 18 },

    // PILL TAB BAR
    pillBar: {
      position: "absolute",
      alignSelf: "center",
      left: 20,
      right: 20,
      borderRadius: 28,
      overflow: "hidden",
      borderWidth: HAIRLINE,
      borderColor: c.separator,
      shadowColor: c.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    pillRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 6 },
    pillTab: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 6 },
    pillActive: { position: "absolute", top: 0, bottom: 0, left: 4, right: 4, borderRadius: 20 },
    pillLabel: { fontSize: 10, lineHeight: 14, fontFamily: BODY_MED, ...TEXT_FIX },
    pillDot: { position: "absolute", top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" },

    // IPAD SIDE RAIL — same family as the pill bar: bg + hairline separator.
    rail: { width: RAIL_WIDTH, borderRightWidth: HAIRLINE, paddingHorizontal: 6, gap: 6 },
    railTab: {
      minHeight: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    railLabel: { fontSize: 10, lineHeight: 14, fontFamily: BODY_MED, ...TEXT_FIX },
    railDot: { position: "absolute", top: -2, right: -5, width: 7, height: 7, borderRadius: 4 },

    // CELEBRATION
    celebrateBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 28 },
    celebrateCard: { width: "100%", maxWidth: 360, borderRadius: 30, backgroundColor: c.surface, overflow: "hidden", alignItems: "center", paddingBottom: 26 },
    celebrateTop: { position: "absolute", top: 0, left: 0, right: 0, height: 110, opacity: 0.95 },
    celebrateBadge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.tint,
      alignItems: "center",
      justifyContent: "center",
      marginTop: -32,
      borderWidth: 4,
      borderColor: c.surface,
    },
    celebrateTitle: { marginTop: 14, fontSize: 30, lineHeight: 36, fontFamily: DISPLAY_ITALIC, color: c.label, textAlign: "center", ...TEXT_FIX },
    celebrateSub: { marginTop: 8, fontSize: 14, lineHeight: 21, color: c.label2, textAlign: "center", paddingHorizontal: 24, fontFamily: BODY, ...TEXT_FIX },
    celebratePill: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: c.tintSoft },
    celebratePillText: { fontSize: 12, lineHeight: 17, fontFamily: BODY_SEMI, color: c.tint, ...TEXT_FIX },

    // 8-HOUR MOMENT — fixed navy in both schemes: it is a moment, not a screen.
    goalStage: { flex: 1, backgroundColor: "#0B1220", overflow: "hidden" },
    goalConfetti: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", opacity: 0.7 },
    goalContent: { flex: 1, width: "100%", paddingHorizontal: 24, paddingTop: 40, paddingBottom: 18, justifyContent: "space-between" },
    goalCentre: { flex: 1, alignItems: "center", justifyContent: "center" },
    goalRingFigure: { fontSize: 64, lineHeight: 72, fontFamily: DISPLAY, color: "#FFFFFF", fontVariant: ["tabular-nums"], ...TEXT_FIX },
    goalRingLabel: { marginTop: 4, fontSize: 13, lineHeight: 18, fontFamily: BODY_MED, color: "#FFFFFF", opacity: 0.55, ...TEXT_FIX },
    goalTitle: { marginTop: 28, fontSize: 36, lineHeight: 43, fontFamily: DISPLAY_ITALIC, color: "#FFFFFF", textAlign: "center", ...TEXT_FIX },
    goalSub: { marginTop: 8, fontSize: 15, lineHeight: 22, fontFamily: BODY, color: "#FFFFFF", opacity: 0.62, textAlign: "center", paddingHorizontal: 12, ...TEXT_FIX },
    goalGoldPill: {
      marginTop: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.10)",
    },
    goalGoldPillText: { fontSize: 12, lineHeight: 17, fontFamily: BODY_SEMI, color: c.gold, ...TEXT_FIX },
    goalFooter: { width: "100%", alignItems: "center" },
    goalButton: { alignSelf: "stretch", height: 52, borderRadius: 16, backgroundColor: c.tint, alignItems: "center", justifyContent: "center" },
    goalButtonText: { fontSize: 16, lineHeight: 22, fontFamily: BODY_BOLD, color: "#FFFFFF", letterSpacing: 0.2, ...TEXT_FIX },
    goalHint: { marginTop: 14, fontSize: 12, lineHeight: 17, fontFamily: BODY_MED, color: "#FFFFFF", opacity: 0.45, ...TEXT_FIX },

    // LOCK
    lockBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
    lockCard: {
      width: "100%",
      maxWidth: 340,
      borderRadius: 30,
      backgroundColor: "rgba(30,14,22,0.94)",
      padding: 28,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
    },
    lockGlyph: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
    lockTitle: { marginTop: 16, fontSize: 26, lineHeight: 32, fontFamily: DISPLAY, color: "#FDEFF5", ...TEXT_FIX },
    lockSub: { marginTop: 8, fontSize: 14, lineHeight: 21, color: "rgba(253,239,245,0.70)", textAlign: "center", fontFamily: BODY, ...TEXT_FIX },
    lockError: { marginTop: 10, fontSize: 12, lineHeight: 18, color: "#FF8F86", textAlign: "center", fontFamily: BODY, ...TEXT_FIX },
    lockButton: { alignSelf: "stretch", marginTop: 20, borderRadius: 18, overflow: "hidden" },
    lockButtonInner: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    lockButtonText: { color: "#fff", fontSize: 15, lineHeight: 21, fontFamily: BODY_BOLD, ...TEXT_FIX },
  });
