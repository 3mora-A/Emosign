import {
    startTransition,
    useDeferredValue,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import {
    Activity,
    ArrowRight,
    BarChart3,
    Brain,
    Camera,
    CheckCircle2,
    Clock,
    Compass,
    Download,
    Filter,
    History as HistoryIcon,
    LayoutDashboard,
    Palette,
    RotateCcw,
    Search,
    Settings as SettingsIcon,
    Shield,
    Sparkles,
    Trash2,
    Type as TypeIcon,
    Users,
    XCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
    AnalysisHeroCard,
    Badge,
    ButtonLink,
    EmptyState,
    InsightRow,
    OptionGridField,
    PageHeader,
    SelectField,
    SpotlightCard,
    StatCard,
    ToggleCard,
} from './components';
import { useAppContext } from './context';
import { quickActions, settingsLabels } from './data';
import { copyFor, cx, formatDate, formatNumber, formatPercent } from './utils';
import { ResultsSection, MediaPreviewViewport, EmptyPreviewPlaceholder } from './analysis-pages';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Play, Video } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
 *  Small layout primitives (kept local so we don't touch components.tsx)
 * ──────────────────────────────────────────────────────────── */

function SectionTitle({
    icon,
    title,
    description,
    action,
}: {
    icon: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-start gap-3">
                <span className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-2.5 text-[var(--primary)]">
                    {icon}
                </span>
                <div>
                    <h3 className="text-2xl font-bold leading-tight">{title}</h3>
                    {description ? (
                        <p className="body-soft mt-1 text-sm">{description}</p>
                    ) : null}
                </div>
            </div>
            {action ? <div>{action}</div> : null}
        </div>
    );
}

function StatusDot({ tone }: { tone: 'success' | 'warning' | 'error' | 'info' | 'neutral' }) {
    const colors: Record<string, string> = {
        success: 'bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]',
        warning: 'bg-amber-400 shadow-[0_0_0_4px_rgba(245,158,11,0.15)]',
        error: 'bg-rose-400 shadow-[0_0_0_4px_rgba(244,63,94,0.15)]',
        info: 'bg-sky-400 shadow-[0_0_0_4px_rgba(56,189,248,0.15)]',
        neutral: 'bg-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,0.15)]',
    };
    return <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[tone]}`} />;
}

function ConfidenceRing({
    value,
    size = 56,
}: {
    value: number;
    size?: number;
}) {
    const stroke = 5;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const normalizedValue = Math.max(0, Math.min(100, value)) / 100;
    const dash = c * normalizedValue;
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={stroke}
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="var(--primary)"
                    strokeWidth={stroke}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${c}`}
                />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-xs font-bold">
                {Math.round(Math.max(0, Math.min(100, value)))}%
            </span>
        </div>
    );
}

function MiniBar({ value, max, tone = 'primary' }: { value: number; max: number; tone?: 'primary' | 'success' | 'warning' | 'error' }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    const colors: Record<string, string> = {
        primary: 'from-[var(--primary)]/40 to-[var(--primary)]',
        success: 'from-emerald-500/40 to-emerald-400',
        warning: 'from-amber-500/40 to-amber-400',
        error: 'from-rose-500/40 to-rose-400',
    };
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-strong)]">
            <div
                className={`h-full rounded-full bg-gradient-to-r ${colors[tone]}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function greetingFor(language: 'ar' | 'en') {
    const h = new Date().getHours();
    if (language === 'ar') {
        if (h < 12) return 'صباح الخير';
        if (h < 18) return 'مساء النور';
        return 'مساء الخير';
    }
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
}

/* ─────────────────────────────────────────────────────────────
 *  Dashboard
 * ──────────────────────────────────────────────────────────── */

export function DashboardPage() {
    const { language, boot, history, latestAnalysis } = useAppContext();
    const recent = history.slice(0, 4);
    const userName = boot.auth.user?.name ?? (language === 'ar' ? 'صديقنا' : 'there');
    const greeting = greetingFor(language);

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Inference Dashboard"
                title={
                    language === 'ar'
                        ? `${greeting} ${userName}  لوحة مراقبة جلسات التحليل`
                        : `${greeting}, ${userName} your inference monitoring dashboard`
                }
                description={
                    language === 'ar'
                        ? 'مؤشرات أداء النظام، أفعال سريعة، وسياق أحدث جلسة استدلال — في مكان واحد منظم.'
                        : 'System performance metrics, quick actions, and the context of your latest inference session — in one organized place.'
                }
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <ButtonLink to="/upload">
                            {language === 'ar' ? 'استدلال جديد' : 'New inference'}
                        </ButtonLink>
                        <Link
                            to="/history"
                            className="button-secondary rounded-2xl px-4 py-3 text-sm font-semibold"
                        >
                            {language === 'ar' ? 'فتح السجل' : 'Open history'}
                        </Link>
                    </div>
                }
            />

            <div className="data-grid">
                <StatCard
                    icon="layout-dashboard"
                    label={language === 'ar' ? 'إجمالي جلسات التحليل' : 'Total inference sessions'}
                    value={formatNumber(language, boot.dashboard.stats.analyses)}
                    detail={
                        language === 'ar'
                            ? 'إجمالي الجلسات التي شغّلها هذا الحساب على النظام.'
                            : 'Total sessions this account has run on the system.'
                    }
                />
                <StatCard
                    icon="brain"
                    label={language === 'ar' ? 'نسبة النجاح' : 'Success rate'}
                    value={formatPercent(language, boot.dashboard.stats.successRate)}
                    detail={
                        language === 'ar'
                            ? 'نسبة الجلسات التي اكتمل استدلالها بنجاح.'
                            : 'Share of sessions whose inference completed successfully.'
                    }
                />
                <StatCard
                    icon="camera"
                    label={language === 'ar' ? 'متوسط زمن التحليل' : 'Average inference latency'}
                    value={`${formatNumber(language, boot.dashboard.stats.avgLatency)}ms`}
                    detail={
                        language === 'ar'
                            ? 'الزمن المقدّر من رفع العينة إلى عرض المخرجات.'
                            : 'Estimated time from sample submission to output rendering.'
                    }
                />
                <StatCard
                    icon="shield"
                    label={language === 'ar' ? 'النماذج النشطة' : 'Active models'}
                    value={formatNumber(language, boot.dashboard.stats.activeModels)}
                    detail={
                        language === 'ar'
                            ? 'نموذج تصنيف المشاعر مع خدمات المعالجة المساندة لخط التحليل.'
                            : 'Emotion classification models with supporting processing services.'
                    }
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                    {latestAnalysis ? (
                        <AnalysisHeroCard analysis={latestAnalysis} />
                    ) : (
                        <EmptyState
                            icon="sparkles"
                            title={
                                language === 'ar'
                                    ? 'ابدأ أول استدلال لتغذية اللوحة بالبيانات'
                                    : 'Run your first inference to populate the dashboard'
                            }
                            description={
                                language === 'ar'
                                    ? 'بمجرد رفع عينة، ستظهر هنا أحدث نتيجة استدلال مع درجة الثقة والملخص والتنبؤات البديلة.'
                                    : 'Once you upload a sample, the latest inference result will appear here with confidence, summary, and alternative predictions.'
                            }
                            action={
                                <ButtonLink to="/upload">
                                    {language === 'ar' ? 'ابدأ التحليل' : 'Start inference'}
                                </ButtonLink>
                            }
                        />
                    )}

                    <SpotlightCard>
                        <SectionTitle
                            icon={<Compass className="h-4 w-4" />}
                            title={language === 'ar' ? 'إجراءات سريعة' : 'Quick actions'}
                            description={
                                language === 'ar'
                                    ? 'اقفز مباشرة إلى المهام الأكثر استخدامًا في النظام.'
                                    : 'Jump directly to the most-used tasks in the system.'
                            }
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                            {quickActions.map((action) => (
                                <Link
                                    key={action.to}
                                    to={action.to}
                                    className="panel-soft group flex items-start gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40"
                                >
                                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] text-[var(--primary)]">
                                        <Compass className="h-5 w-5" />
                                    </span>
                                    <div className="flex-1">
                                        <h4 className="text-base font-bold">
                                            {copyFor(language, action.title)}
                                        </h4>
                                        <p className="body-soft mt-1 text-sm leading-6">
                                            {copyFor(language, action.description)}
                                        </p>
                                    </div>
                                    <ArrowRight className="mt-2 h-4 w-4 text-[var(--text-muted)] transition group-hover:text-[var(--primary)] rtl:rotate-180" />
                                </Link>
                            ))}
                        </div>
                    </SpotlightCard>
                </div>

                <div className="space-y-6">
                    <SpotlightCard>
                        <SectionTitle
                            icon={<Activity className="h-4 w-4" />}
                            title={language === 'ar' ? 'حالة النظام' : 'System status'}
                            action={
                                <Badge
                                    tone="success"
                                    text={language === 'ar' ? 'كل الخدمات تعمل' : 'All systems go'}
                                />
                            }
                        />
                        <div className="space-y-2.5">
                            {boot.dashboard.systemStatus.map((item) => (
                                <div
                                    key={copyFor(language, item.label)}
                                    className="panel-soft flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <StatusDot tone={item.tone} />
                                        <span className="text-sm font-semibold">
                                            {copyFor(language, item.label)}
                                        </span>
                                    </div>
                                    <span className="body-soft text-sm">
                                        {copyFor(language, item.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </SpotlightCard>

                    <SpotlightCard>
                        <SectionTitle
                            icon={<HistoryIcon className="h-4 w-4" />}
                            title={language === 'ar' ? 'آخر النشاطات' : 'Recent activity'}
                            action={
                                <Link
                                    to="/history"
                                    className="text-sm font-semibold text-[var(--primary)]"
                                >
                                    {language === 'ar' ? 'عرض الكل' : 'View all'}
                                </Link>
                            }
                        />
                        <div className="space-y-3">
                            {recent.length ? (
                                recent.map((item) => (
                                    <div
                                        key={item.id}
                                        className="panel-soft rounded-2xl p-4 transition hover:border-[var(--primary)]/30"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <ConfidenceRing value={item.confidence} size={44} />
                                                <div>
                                                    <p className="font-semibold leading-tight">
                                                        {copyFor(language, item.emotionLabel)}
                                                    </p>
                                                    <p className="body-soft mt-1.5 line-clamp-2 text-sm">
                                                        {copyFor(language, item.summary)}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge
                                                tone={item.status === 'processed' ? 'success' : 'warning'}
                                                text={
                                                    item.status === 'processed'
                                                        ? language === 'ar'
                                                            ? 'مكتمل'
                                                            : 'Processed'
                                                        : language === 'ar'
                                                          ? 'بحاجة مراجعة'
                                                          : 'Review'
                                                }
                                            />
                                        </div>
                                        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>{formatDate(language, item.createdAt)}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="body-soft py-6 text-center text-sm">
                                    {language === 'ar'
                                        ? 'لا توجد جلسات محفوظة بعد.'
                                        : 'No sessions saved yet.'}
                                </p>
                            )}
                        </div>
                    </SpotlightCard>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
 *  History
 * ──────────────────────────────────────────────────────────── */

type HistoryStatus = 'all' | 'processed' | 'failed';
type HistorySort = 'newest' | 'oldest' | 'confidence';

export function HistoryPage() {
    const { language, history, setLatestAnalysis } = useAppContext();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);
    const [status, setStatus] = useState<HistoryStatus>('all');
    const [sort, setSort] = useState<HistorySort>('newest');
    const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | number | null>(null);

    const selectedAnalysis = useMemo(() => {
        return history.find((h) => h.id === selectedAnalysisId) || null;
    }, [history, selectedAnalysisId]);

    const counts = useMemo(
        () => ({
            all: history.length,
            processed: history.filter((h) => h.status === 'processed').length,
            failed: history.filter((h) => h.status === 'failed').length,
        }),
        [history],
    );

    const items = useMemo(() => {
        const q = deferredQuery.trim().toLowerCase();
        const filtered = history.filter((entry) => {
            const matchesStatus = status === 'all' || entry.status === status;
            const matchesQuery =
                !q ||
                `${entry.fileName} ${entry.emotionLabel.ar} ${entry.emotionLabel.en}`
                    .toLowerCase()
                    .includes(q);
            return matchesStatus && matchesQuery;
        });
        const sorted = [...filtered].sort((a, b) => {
            if (sort === 'confidence') return (b.confidence ?? 0) - (a.confidence ?? 0);
            const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return sort === 'newest' ? bt - at : at - bt;
        });
        return sorted;
    }, [history, deferredQuery, status, sort]);

    const tabs: { value: HistoryStatus; labelAr: string; labelEn: string }[] = [
        { value: 'all', labelAr: 'الكل', labelEn: 'All' },
        { value: 'processed', labelAr: 'مكتمل', labelEn: 'Processed' },
        { value: 'failed', labelAr: 'فشل', labelEn: 'Failed' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Inference History"
                title={
                    language === 'ar'
                        ? 'سجل قابل للتصفية لكل جلسات التحليل السابقة'
                        : 'A filterable history of every previous inference session'
                }
                description={
                    language === 'ar'
                        ? 'استعرض الجلسات السابقة، صفِّها حسب الحالة، وافتح أي نتيجة استدلال للاطلاع على تفاصيلها.'
                        : 'Review previous sessions, filter by status, and open any inference result to inspect its details.'
                }
            />

            <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between px-2 text-sm text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                        <Filter className="h-4 w-4" />
                        {language === 'ar'
                            ? `${formatNumber(language, items.length)} نتيجة`
                            : `${formatNumber(language, items.length)} result${items.length === 1 ? '' : 's'}`}
                    </span>
                </div>

                {/* Results Grid */}
                <div className="mt-2">
                    {items.length ? (
                        <>
                            <div id="history-viewport-section">
                                <AnimatePresence mode="wait">
                                    {selectedAnalysis && selectedAnalysis.status === 'processed' && (
                                        <motion.div 
                                            key="viewport"
                                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            transition={{ duration: 0.15 }} // Faster fade transition
                                            className="overflow-hidden"
                                        >
                                                <SpotlightCard noHover className="relative flex min-h-0 flex-col overflow-hidden !p-0 shadow-xl ring-1 ring-[var(--line)]">
                                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(var(--secondary-rgb)/0.15),transparent_50%)]" />
                                                
                                                <div className="relative flex flex-1 flex-col p-4 sm:p-5">
                                                    {selectedAnalysis.previewUrl ? (
                                                        <MediaPreviewViewport 
                                                            previewUrl={selectedAnalysis.previewUrl} 
                                                            file={new File([], selectedAnalysis.fileName, { type: selectedAnalysis.mediaType === 'image' ? 'image/jpeg' : 'video/mp4' })} 
                                                        />
                                                    ) : (
                                                        <EmptyPreviewPlaceholder language={language} />
                                                    )}
                                                </div>

                                                <div className="border-t border-[var(--line)] bg-[var(--surface)]">
                                                    <div className="p-5 sm:p-6">
                                                        <div className="mb-5 flex items-center justify-between">
                                                            <h3 className="text-base font-bold text-[var(--text)]">
                                                                {language === 'ar' ? 'تفاصيل النتيجة' : 'Result Details'}
                                                            </h3>
                                                            <Badge tone="success" text={language === 'ar' ? 'مكتمل' : 'Completed'} />
                                                        </div>
                                                        <div className="grid gap-3 sm:grid-cols-3 xl:items-center">
                                                            <InsightRow label={language === 'ar' ? 'الحالة الشعورية' : 'Emotional state'} value={copyFor(language, selectedAnalysis.emotionLabel)} tone="info" />
                                                            <InsightRow label={language === 'ar' ? 'زمن التحليل' : 'Latency'} value={`${selectedAnalysis.latencyMs} ms`} tone="warning" />
                                                            <div className="xl:pl-3">
                                                                {/* We can use ConfidenceBar from components or just a simple display */}
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between text-sm">
                                                                        <span className="body-soft">{language === 'ar' ? 'درجة الثقة' : 'Confidence'}</span>
                                                                        <span className="font-bold text-[var(--primary)]">{selectedAnalysis.confidence.toFixed(1)}%</span>
                                                                    </div>
                                                                    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
                                                                        <div
                                                                            className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--secondary),var(--primary))]"
                                                                            style={{ width: `${Math.max(4, Math.min(100, selectedAnalysis.confidence))}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </SpotlightCard>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <AnimatePresence>
                                    {items.map((entry, index) => {
                                        const active = String(selectedAnalysisId) === String(entry.id);
                                        const isSuccess = entry.status === 'processed';

                                        return (
                                            <motion.button
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.02 }}
                                                key={entry.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedAnalysisId(entry.id);
                                                    const viewportElement = document.getElementById('history-viewport-section');
                                                    if (viewportElement) {
                                                        const targetPosition = viewportElement.getBoundingClientRect().top + window.scrollY - 24;
                                                        const startPosition = window.scrollY;
                                                        const distance = targetPosition - startPosition;
                                                        let startTime: number | null = null;
                                                        const duration = 300; // Much faster scroll (300ms)

                                                        const animation = (currentTime: number) => {
                                                            if (startTime === null) startTime = currentTime;
                                                            const timeElapsed = currentTime - startTime;
                                                            const progress = Math.min(timeElapsed / duration, 1);
                                                            // Simpler, faster easing function (ease-out-quad)
                                                            const ease = 1 - (1 - progress) * (1 - progress);
                                                            window.scrollTo(0, startPosition + distance * ease);
                                                            if (timeElapsed < duration) requestAnimationFrame(animation);
                                                        };
                                                        requestAnimationFrame(animation);
                                                    } else {
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }
                                                }}
                                                className={cx(
                                                    'group relative flex flex-col overflow-hidden rounded-xl border p-4 text-left transition-all duration-300',
                                                    active
                                                        ? 'border-[rgb(var(--primary-rgb)/0.5)] bg-[rgb(var(--primary-rgb)/0.1)] shadow-[0_8px_24px_rgba(var(--primary-rgb),0.15)] scale-[1.02] ring-1 ring-[rgb(var(--primary-rgb)/0.4)]'
                                                        : 'border-[var(--card-border)] bg-[var(--surface)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-strong)] hover:-translate-y-1 hover:shadow-lg',
                                                )}
                                            >
                                                {active && (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--primary-rgb)/0.1)] to-transparent pointer-events-none" />
                                                )}
                                                
                                                <div className="relative z-10 flex w-full items-start justify-between gap-3">
                                                    <div className={cx(
                                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                                                        active ? "border-[rgb(var(--primary-rgb)/0.4)] bg-[rgb(var(--primary-rgb)/0.2)] text-[var(--text)]" : "border-[var(--card-border)] bg-[var(--surface-strong)] text-[var(--text-soft)]"
                                                    )}>
                                                        {entry.mediaType === 'image' ? <ImageIcon className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                                                    </div>
                                                    <Badge
                                                        tone={isSuccess ? 'success' : 'error'}
                                                        text={isSuccess ? (language === 'ar' ? 'مكتمل' : 'Completed') : (language === 'ar' ? 'فشل' : 'Failed')}
                                                    />
                                                </div>

                                                <div className="relative z-10 mt-3 min-w-0 flex-1">
                                                    <p className={cx("truncate text-sm font-bold transition-colors", active ? "text-[var(--text)]" : "text-[var(--text)]")} title={entry.fileName}>{entry.fileName}</p>
                                                    <p className="body-soft mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-soft)]">
                                                        {copyFor(language, entry.summary)}
                                                    </p>
                                                </div>

                                                <div className="relative z-10 mt-4 flex w-full items-center justify-between border-t border-[var(--line)] pt-3">
                                                    <div className="flex items-center gap-2.5 text-[10px] font-medium text-[var(--text-muted)]">
                                                        <div className="flex items-center gap-1">
                                                            <Sparkles className={cx("h-3 w-3", active ? "text-[var(--primary)]" : "text-[var(--text-muted)]")} />
                                                            <span className={cx(isSuccess ? "text-[var(--text)]" : "")}>{entry.confidence.toFixed(1)}%</span>
                                                        </div>
                                                        <div className="h-1 w-1 rounded-full bg-[var(--line-strong)]" />
                                                        <div className="flex items-center gap-1">
                                                            <span>{entry.latencyMs} ms</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className={cx(
                                                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors",
                                                        active 
                                                            ? "bg-[rgb(var(--primary-rgb)/0.2)] text-[var(--primary)]" 
                                                            : "bg-[var(--surface-strong)] text-[var(--text-soft)] group-hover:bg-[var(--line)] group-hover:text-[var(--text)]"
                                                    )}>
                                                        <Play className="h-2.5 w-2.5 fill-current" />
                                                        <span>{language === 'ar' ? 'عرض' : 'View'}</span>
                                                    </div>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </>
                    ) : (
                        <SpotlightCard noHover>
                            <EmptyState
                                icon="history"
                                title={
                                    history.length === 0
                                        ? language === 'ar'
                                            ? 'لا توجد جلسات استدلال بعد'
                                            : 'No inference sessions yet'
                                        : language === 'ar'
                                          ? 'لا يوجد سجل مطابق'
                                          : 'No matching history'
                                }
                                description={
                                    history.length === 0
                                        ? language === 'ar'
                                            ? 'شغّل أول جلسة استدلال وستجدها هنا مع كل التفاصيل.'
                                            : 'Run your first inference session and it will appear here with all the details.'
                                        : language === 'ar'
                                          ? 'جرّب إزالة الفلاتر أو شغّل جلسة استدلال جديدة لإضافتها إلى السجل.'
                                          : 'Try clearing the filters or run a new inference session to add it to your history.'
                                }
                                action={
                                    <ButtonLink to="/upload">
                                        {language === 'ar' ? 'استدلال جديد' : 'New inference'}
                                    </ButtonLink>
                                }
                            />
                        </SpotlightCard>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
 *  Settings
 * ──────────────────────────────────────────────────────────── */

export function SettingsPage() {
    const { language, settings, updateSettings, resolvedTheme } = useAppContext();
    const [savedAt, setSavedAt] = useState<number | null>(null);

    const trackUpdate = (patch: Parameters<typeof updateSettings>[0]) => {
        updateSettings(patch);
        setSavedAt(Date.now());
    };

    const languageOptions = [
        { value: 'ar', label: language === 'ar' ? 'العربية' : 'Arabic' },
        { value: 'en', label: language === 'ar' ? 'الإنجليزية' : 'English' },
    ];
    const themeOptions = [
        { value: 'dark', label: copyFor(language, settingsLabels.dark) },
        { value: 'light', label: copyFor(language, settingsLabels.light) },
    ];
    const fontScaleOptions = [
        { value: 'comfortable', label: copyFor(language, settingsLabels.comfortable) },
        { value: 'large', label: copyFor(language, settingsLabels.large) },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Settings"
                title={
                    language === 'ar'
                        ? 'التحكم باللغة، المظهر، والوصول من مكان واحد'
                        : 'Control language, theme, and accessibility from one place'
                }
                description={
                    language === 'ar'
                        ? 'كل الإعدادات تنعكس مباشرة على الواجهة، مع حفظ تفضيلاتك محليًا بين الجلسات.'
                        : 'Every setting updates the UI immediately while persisting your preferences locally between sessions.'
                }
                actions={
                    savedAt ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {language === 'ar' ? 'تم الحفظ' : 'Saved'}
                        </span>
                    ) : null
                }
            />

            <div className="mx-auto max-w-2xl">
                <SpotlightCard>
                    <SectionTitle
                        icon={<Palette className="h-4 w-4" />}
                        title={language === 'ar' ? 'المظهر واللغة' : 'Appearance & language'}
                        description={
                            language === 'ar'
                                ? 'اختر ما يناسب راحتك البصرية، والتغيير يطبَّق فورًا.'
                                : 'Pick what suits your visual comfort — changes apply instantly.'
                        }
                    />
                    <div className="space-y-4">
                        <OptionGridField
                            label={language === 'ar' ? 'اللغة' : 'Language'}
                            value={settings.language}
                            options={languageOptions}
                            onChange={(value) =>
                                trackUpdate({ language: value as 'ar' | 'en' })
                            }
                        />
                        <OptionGridField
                            label={language === 'ar' ? 'الثيم' : 'Theme'}
                            value={settings.theme}
                            options={themeOptions}
                            onChange={(value) =>
                                trackUpdate({ theme: value as typeof settings.theme })
                            }
                        />
                        <OptionGridField
                            label={language === 'ar' ? 'حجم الخط' : 'Font scale'}
                            value={settings.fontScale}
                            options={fontScaleOptions}
                            onChange={(value) =>
                                trackUpdate({ fontScale: value as typeof settings.fontScale })
                            }
                        />

                    </div>
                </SpotlightCard>

            </div>
        </div>
    );
}


/* ─────────────────────────────────────────────────────────────
 *  Admin
 * ──────────────────────────────────────────────────────────── */

export function AdminDashboardPage() {
    const { language, boot } = useAppContext();

    if (!boot.auth.isAdmin || !boot.admin) {
        return (
            <EmptyState
                icon="shield"
                title={
                    language === 'ar'
                        ? 'هذه الصفحة مخصصة للإدارة فقط'
                        : 'This page is reserved for admins'
                }
                description={
                    language === 'ar'
                        ? 'الوصول مقيّد عبر Laravel middleware ويتطلّب صلاحيات إدارية.'
                        : 'Access is restricted via Laravel middleware and requires administrative privileges.'
                }
            />
        );
    }

    const total =
        boot.admin.metrics.users +
        boot.admin.metrics.videos +
        boot.admin.metrics.processed +
        boot.admin.metrics.failed;

    const log: { time: string; ar: string; en: string; tone: 'info' | 'success' | 'warning' | 'error' }[] = [
        {
            time: '21:14',
            ar: 'تحليل جديد قيد التنفيذ',
            en: 'New analysis is processing',
            tone: 'info',
        },
        {
            time: '20:58',
            ar: 'Laravel API مستقر',
            en: 'Laravel API stable',
            tone: 'success',
        },
        {
            time: '20:47',
            ar: 'تحديث إعدادات الوصول',
            en: 'Accessibility settings updated',
            tone: 'warning',
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Admin"
                title={
                    language === 'ar'
                        ? 'لوحة الإدارة لمراقبة النظام والنماذج'
                        : 'Admin panel for monitoring the system and models'
                }
                description={
                    language === 'ar'
                        ? 'متابعة المستخدمين، الجلسات، صحة النماذج، وحالة النظام بشكل مركّز للمراقبة السريعة.'
                        : 'Track users, sessions, model health, and overall system state in a focused layout for fast monitoring.'
                }
                actions={
                    <Badge
                        tone="success"
                        text={language === 'ar' ? 'النظام مستقر' : 'System healthy'}
                    />
                }
            />

            <div className="data-grid">
                <StatCard
                    icon="users"
                    label={language === 'ar' ? 'المستخدمون' : 'Users'}
                    value={formatNumber(language, boot.admin.metrics.users)}
                    detail={
                        language === 'ar'
                            ? 'عدد الحسابات على مستوى المنصة.'
                            : 'Total accounts across the platform.'
                    }
                />
                <StatCard
                    icon="history"
                    label={language === 'ar' ? 'الجلسات' : 'Sessions'}
                    value={formatNumber(language, boot.admin.metrics.videos)}
                    detail={
                        language === 'ar'
                            ? 'كل ملفات التحليل المسجلة حاليًا.'
                            : 'All recorded analysis files currently tracked.'
                    }
                />
                <StatCard
                    icon="brain"
                    label={language === 'ar' ? 'مكتمل' : 'Processed'}
                    value={formatNumber(language, boot.admin.metrics.processed)}
                    detail={
                        language === 'ar'
                            ? 'جلسات تمت معالجتها بنجاح.'
                            : 'Sessions successfully processed.'
                    }
                />
                <StatCard
                    icon="shield"
                    label={language === 'ar' ? 'فشل' : 'Failed'}
                    value={formatNumber(language, boot.admin.metrics.failed)}
                    detail={
                        language === 'ar'
                            ? 'جلسات تحتاج إلى مراجعة أو إعادة تشغيل.'
                            : 'Sessions that need review or retry.'
                    }
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <SpotlightCard>
                    <SectionTitle
                        icon={<Brain className="h-4 w-4" />}
                        title={
                            language === 'ar' ? 'صحة النماذج' : 'Model health'
                        }
                        action={
                            <Badge
                                tone="info"
                                text={language === 'ar' ? 'إصداران نشطان' : '2 active'}
                            />
                        }
                    />
                    <div className="space-y-4">
                        {[
                            { name: 'Emotion Classifier', version: 'v1.8.0', score: 0.94, tone: 'success' as const },
                            { name: 'Media Pipeline', version: 'v3.0.0', score: 0.72, tone: 'warning' as const },
                        ].map((m) => (
                            <div key={m.name} className="panel-soft rounded-2xl p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <StatusDot tone={m.tone} />
                                        <div>
                                            <p className="font-semibold leading-tight">{m.name}</p>
                                            <p className="body-soft text-xs">{m.version}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold">
                                        {formatPercent(language, m.score)}
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <MiniBar value={m.score} max={1} tone={m.tone === 'info' ? 'primary' : m.tone} />
                                </div>
                            </div>
                        ))}
                    </div>
                </SpotlightCard>

                <SpotlightCard>
                    <SectionTitle
                        icon={<Activity className="h-4 w-4" />}
                        title={
                            language === 'ar'
                                ? 'سجل المراقبة المختصر'
                                : 'Recent monitoring log'
                        }
                        action={
                            <span className="text-xs text-[var(--text-muted)]">
                                {language === 'ar'
                                    ? `آخر ${log.length} حدث`
                                    : `Last ${log.length} events`}
                            </span>
                        }
                    />
                    <div className="space-y-3">
                        {log.map((entry, i) => (
                            <div
                                key={i}
                                className="panel-soft flex items-start gap-3 rounded-2xl p-4"
                            >
                                <StatusDot tone={entry.tone} />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold">
                                            {language === 'ar' ? entry.ar : entry.en}
                                        </p>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {entry.time}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </SpotlightCard>

                <SpotlightCard className="xl:col-span-2">
                    <SectionTitle
                        icon={<LayoutDashboard className="h-4 w-4" />}
                        title={
                            language === 'ar'
                                ? 'توزيع الحمل على المنصة'
                                : 'Platform load distribution'
                        }
                        description={
                            language === 'ar'
                                ? 'نظرة سريعة على وزن كل قسم ضمن المجموع الكلي.'
                                : 'A quick overview of each segment’s weight within the total.'
                        }
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                        {[
                            {
                                label: language === 'ar' ? 'المستخدمون' : 'Users',
                                value: boot.admin.metrics.users,
                                tone: 'primary' as const,
                                icon: <Users className="h-4 w-4" />,
                            },
                            {
                                label: language === 'ar' ? 'الجلسات' : 'Sessions',
                                value: boot.admin.metrics.videos,
                                tone: 'primary' as const,
                                icon: <Camera className="h-4 w-4" />,
                            },
                            {
                                label: language === 'ar' ? 'مكتمل' : 'Processed',
                                value: boot.admin.metrics.processed,
                                tone: 'success' as const,
                                icon: <CheckCircle2 className="h-4 w-4" />,
                            },
                            {
                                label: language === 'ar' ? 'فشل' : 'Failed',
                                value: boot.admin.metrics.failed,
                                tone: 'error' as const,
                                icon: <XCircle className="h-4 w-4" />,
                            },
                        ].map((row) => (
                            <div key={row.label} className="panel-soft rounded-2xl p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 text-sm font-semibold">
                                        <span className="text-[var(--primary)]">{row.icon}</span>
                                        {row.label}
                                    </div>
                                    <span className="text-sm font-bold">
                                        {formatNumber(language, row.value)}
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <MiniBar value={row.value} max={total || 1} tone={row.tone} />
                                </div>
                            </div>
                        ))}
                    </div>
                </SpotlightCard>
            </div>
        </div>
    );
}
