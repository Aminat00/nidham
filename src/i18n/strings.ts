/**
 * Trilingual copy for Nidham — English, Turkish, Arabic (RTL). Strings are taken
 * verbatim from the Claude Design source (Nidham.dc.html). `lang` drives both these
 * UI strings and the agent's generated text (summary + step titles).
 */

export type Lang = 'en' | 'ar' | 'tr';

export const LANGS: Lang[] = ['en', 'tr', 'ar'];

/** Which languages render right-to-left. */
export const isRTL = (lang: Lang): boolean => lang === 'ar';

/** Label shown on the language toggle. */
export const LANG_LABEL: Record<Lang, string> = { en: 'EN', tr: 'TR', ar: 'ع' };

export interface Strings {
  // Capture
  capTitle: string;
  capIntro: string;
  capPlaceholder: string;
  capHint: string;
  listening: string;
  thinking: string;
  recentLabel: string;
  scheduledBy: string;
  projectChip: string;
  brokenSteps: string;
  startHere: string;
  urgent: string;
  // Today
  dateLine: string;
  greeting: string;
  nowStripSub: string;
  now: string;
  flowTitle: string;
  done: string; // suffix in "2 / 7 done"
  // tesbihat card: "<Prayer><suffix>" (ar wraps as "تسبيحات <Prayer>")
  tesbihatSuffix: string;
  // schedule-chip words
  today: string;
  tomorrow: string;
  nextWeek: string;
  after: string; // "after {prayer}"
  // manual controls
  pushToTomorrow: string;
  pushedToast: string;
  undo: string;
  // nav
  navToday: string;
  navCapture: string;
  navTasks: string;
  // Tasks backlog
  tasksTitle: string;
  tasksIntro: string;
  projectsSection: string;
  doToday: string;
  savedToTasks: string;
  sentToToday: string;
  stepsOfLabel: string; // "{done} / {total} steps"
  onMilestone: string; // "on {name}"
  emptyTasks: string;
  // Project interview
  planReady: string;
  projectCreated: string;
  answerPlaceholder: string;
  talkHint: string;
  // Do-today window picker
  whenToday: string;
  openLabel: string;
  // Voice
  micBlocked: string;
}

export const UI: Record<Lang, Strings> = {
  en: {
    capTitle: 'Capture',
    capIntro: 'Empty your mind. Nidham finds the right time for each — around your prayers.',
    capPlaceholder: 'What’s on your mind?',
    capHint: 'Type or hold to speak — no lists, no fields.',
    listening: 'Listening…',
    thinking: 'Nidham is thinking…',
    recentLabel: 'Just captured',
    scheduledBy: 'Nidham scheduled',
    projectChip: 'Project',
    brokenSteps: 'BROKEN INTO STEPS',
    startHere: 'start here',
    urgent: 'urgent',
    dateLine: 'Wed · 9 Muḥarram 1448',
    greeting: 'Salām, {name}',
    nowStripSub: 'Tesbihat after {prayer}',
    now: 'NOW',
    flowTitle: 'Today’s flow',
    done: ' done',
    tesbihatSuffix: ' tesbihat',
    today: 'Today',
    tomorrow: 'Tomorrow',
    nextWeek: 'next wk',
    after: 'after {prayer}',
    pushToTomorrow: 'Push to tomorrow',
    pushedToast: 'Moved to tomorrow.',
    undo: 'Undo',
    navToday: 'Today',
    navCapture: 'Capture',
    navTasks: 'Tasks',
    tasksTitle: 'Tasks',
    tasksIntro: 'Everything you captured — parked by area until you’re ready.',
    projectsSection: 'Projects',
    doToday: 'Do today',
    savedToTasks: 'Saved to Tasks.',
    sentToToday: 'Added to today.',
    stepsOfLabel: '{done} / {total} steps',
    onMilestone: 'on {name}',
    emptyTasks: 'Nothing here yet — talk to Nidham to capture something.',
    planReady: 'Here’s a plan — start with the first step.',
    projectCreated: 'Added to Projects.',
    answerPlaceholder: 'Type your answer…',
    talkHint: 'Say a task, or a big goal to break down.',
    whenToday: 'When today?',
    openLabel: 'Open',
    micBlocked: 'Mic blocked — allow access, or type',
  },
  tr: {
    capTitle: 'Yakala',
    capIntro: 'Zihnini boşalt. Nidham her biri için doğru vakti bulur — namazlarının etrafında.',
    capPlaceholder: 'Aklında ne var?',
    capHint: 'Yaz ya da basılı tut — liste yok, alan yok.',
    listening: 'Dinliyor…',
    thinking: 'Nidham düşünüyor…',
    recentLabel: 'Az önce yakalanan',
    scheduledBy: 'Nidham planladı',
    projectChip: 'Proje',
    brokenSteps: 'ADIMLARA BÖLÜNDÜ',
    startHere: 'buradan başla',
    urgent: 'acil',
    dateLine: 'Çar · 9 Muharrem 1448',
    greeting: 'Selam, {name}',
    nowStripSub: '{prayer} tesbihatı',
    now: 'ŞİMDİ',
    flowTitle: 'Günün akışı',
    done: ' tamam',
    tesbihatSuffix: ' tesbihatı',
    today: 'Bugün',
    tomorrow: 'Yarın',
    nextWeek: 'gelecek hf',
    after: '{prayer} sonrası',
    pushToTomorrow: 'Yarına ertele',
    pushedToast: 'Yarına taşındı.',
    undo: 'Geri al',
    navToday: 'Bugün',
    navCapture: 'Yakala',
    navTasks: 'Görevler',
    tasksTitle: 'Görevler',
    tasksIntro: 'Yakaladığın her şey — hazır olana dek alanına göre bekliyor.',
    projectsSection: 'Projeler',
    doToday: 'Bugün yap',
    savedToTasks: 'Görevlere kaydedildi.',
    sentToToday: 'Bugüne eklendi.',
    stepsOfLabel: '{done} / {total} adım',
    onMilestone: '{name} aşamasında',
    emptyTasks: 'Henüz bir şey yok — yakalamak için Nidham’la konuş.',
    planReady: 'İşte bir plan — ilk adımla başla.',
    projectCreated: 'Projelere eklendi.',
    answerPlaceholder: 'Cevabını yaz…',
    talkHint: 'Bir görev söyle ya da bölünecek büyük bir hedef.',
    whenToday: 'Bugün ne zaman?',
    openLabel: 'Aç',
    micBlocked: 'Mikrofon engelli — izin ver ya da yaz',
  },
  ar: {
    capTitle: 'التقاط',
    capIntro: 'أفرغ ذهنك. نظام يجد الوقت المناسب لكلٍّ منها — حول أوقات صلواتك.',
    capPlaceholder: 'ما الذي يشغل بالك؟',
    capHint: 'اكتب أو اضغط للتحدث — لا قوائم، لا حقول.',
    listening: 'يستمع…',
    thinking: 'نظام يفكّر…',
    recentLabel: 'التُقط للتو',
    scheduledBy: 'نظام جدوَل',
    projectChip: 'مشروع',
    brokenSteps: 'مقسّم إلى خطوات',
    startHere: 'ابدأ هنا',
    urgent: 'عاجل',
    dateLine: 'الأربعاء · ٩ محرّم ١٤٤٨',
    greeting: 'السلام عليكم يا {name}',
    nowStripSub: 'تسبيحات بعد {prayer}',
    now: 'الآن',
    flowTitle: 'مسار اليوم',
    done: ' مكتمل',
    tesbihatSuffix: '', // handled specially (prefix) for Arabic
    today: 'اليوم',
    tomorrow: 'غداً',
    nextWeek: 'الأسبوع القادم',
    after: 'بعد {prayer}',
    pushToTomorrow: 'أجّل إلى الغد',
    pushedToast: 'نُقلت إلى الغد.',
    undo: 'تراجع',
    navToday: 'اليوم',
    navCapture: 'التقاط',
    navTasks: 'المهام',
    tasksTitle: 'المهام',
    tasksIntro: 'كل ما التقطته — مُرتّب حسب المجال حتى تكون مستعدًّا.',
    projectsSection: 'المشاريع',
    doToday: 'افعلها اليوم',
    savedToTasks: 'حُفظت في المهام.',
    sentToToday: 'أُضيفت إلى اليوم.',
    stepsOfLabel: '{done} / {total} خطوات',
    onMilestone: 'عند {name}',
    emptyTasks: 'لا شيء بعد — تحدّث إلى نظام لتلتقط شيئًا.',
    planReady: 'إليك خطة — ابدأ بالخطوة الأولى.',
    projectCreated: 'أُضيف إلى المشاريع.',
    answerPlaceholder: 'اكتب إجابتك…',
    talkHint: 'قل مهمة، أو هدفًا كبيرًا لتقسيمه.',
    whenToday: 'متى اليوم؟',
    openLabel: 'افتح',
    micBlocked: 'الميكروفون محظور — اسمح بالوصول أو اكتب',
  },
};

/** Life-area labels for the Tasks backlog section headers. */
export const AREA_LABEL: Record<Lang, Record<import('../types/item').Area, string>> = {
  en: { chore: 'Chores', admin: 'Admin', personal: 'Personal', 'self-dev': 'Self-dev', spiritual: 'Spiritual', errand: 'Errands', project: 'Projects' },
  tr: { chore: 'Ev işleri', admin: 'İdari', personal: 'Kişisel', 'self-dev': 'Gelişim', spiritual: 'Manevi', errand: 'Ayak işleri', project: 'Projeler' },
  ar: { chore: 'أعمال منزلية', admin: 'إداري', personal: 'شخصي', 'self-dev': 'تطوير الذات', spiritual: 'روحاني', errand: 'مشاوير', project: 'مشاريع' },
};

/** Fill `{name}`-style placeholders. */
export function t(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Render Western digits as Arabic-Indic when lang = ar. */
export function digits(value: string | number, lang: Lang): string {
  const s = String(value);
  return lang === 'ar' ? s.replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]) : s;
}

/** Short weekday names, index 0 = Sunday. */
export const WEEKDAYS: Record<Lang, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  tr: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};

/** Non-prayer window words used in schedule chips. */
export const WINDOW_WORD: Record<Lang, Record<'morning' | 'afternoon' | 'evening' | 'anytime', string>> = {
  en: { morning: 'morning', afternoon: 'afternoon', evening: 'evening', anytime: 'anytime' },
  tr: { morning: 'sabah', afternoon: 'öğleden sonra', evening: 'akşam', anytime: 'istediğin zaman' },
  ar: { morning: 'صباحًا', afternoon: 'بعد الظهر', evening: 'مساءً', anytime: 'في أي وقت' },
};
