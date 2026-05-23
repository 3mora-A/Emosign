import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { Clapperboard, Sparkles, Trash2, UploadCloud, Video, Image as ImageIcon, CheckCircle2, AlertCircle, Play, LoaderCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge, LoadingPanel, PageHeader, ProgressTimeline, SpotlightCard, AnalysisHeroCard, InsightRow, ConfidenceBar } from './components';
import { useAppContext } from './context';
import { copyFor, cx, toAppUrl } from './utils';
import type { AnalysisResult, Language } from './types';

type UploadResponsePayload = {
    message?: string;
    analysis?: AnalysisResult | null;
};

function fileSignature(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`;
}

function isImageFile(file: Pick<File, 'name' | 'type'>): boolean {
    return file.type.startsWith('image') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name);
}

function mediaLabel(language: Language, file: Pick<File, 'name' | 'type'>): string {
    return isImageFile(file) ? (language === 'ar' ? 'صورة' : 'Image') : (language === 'ar' ? 'فيديو' : 'Video');
}

function uniqueFiles(files: File[]): File[] {
    const known = new Set<string>();

    return files.filter((file) => {
        const signature = fileSignature(file);
        if (known.has(signature)) {
            return false;
        }

        known.add(signature);
        return true;
    });
}

function buildBatchMessage(language: Language, successCount: number, failedCount: number): string {
    const total = successCount + failedCount;

    if (total === 0) {
        return language === 'ar' ? 'لا توجد ملفات لتحليلها.' : 'There are no files to analyze.';
    }

    if (failedCount === 0) {
        return language === 'ar'
            ? `تم تحليل ${successCount} ${successCount === 1 ? 'ملف' : 'ملفات'} بنجاح.`
            : `Successfully analyzed ${successCount} ${successCount === 1 ? 'file' : 'files'}.`;
    }

    if (successCount === 0) {
        return language === 'ar'
            ? `تعذر تحليل ${failedCount} ${failedCount === 1 ? 'ملف' : 'ملفات'} من هذه الدفعة.`
            : `Could not analyze ${failedCount} ${failedCount === 1 ? 'file' : 'files'} from this batch.`;
    }

    return language === 'ar'
        ? `اكتمل تحليل ${successCount} ${successCount === 1 ? 'ملف' : 'ملفات'}، وتعذر تحليل ${failedCount} ${failedCount === 1 ? 'ملف' : 'ملفات'}.`
        : `Analyzed ${successCount} ${successCount === 1 ? 'file' : 'files'}, while ${failedCount} ${failedCount === 1 ? 'file was' : 'files were'} not completed.`;
}

function buildClientFailureAnalysis(file: File, language: Language, message?: string): AnalysisResult {
    const fallbackSummary =
        language === 'ar'
            ? message ?? 'تعذر إكمال تحليل هذا الملف. يرجى المحاولة مرة أخرى.'
            : message ?? 'This file could not be analyzed. Please try again.';

    return {
        id: `${fileSignature(file)}-failed`,
        status: 'failed',
        fileName: file.name,
        mediaType: isImageFile(file) ? 'image' : 'video',
        previewUrl: undefined,
        createdAt: new Date().toISOString(),
        framesAnalyzed: 0,
        latencyMs: 0,
        confidence: 0,
        emotionKey: 'unknown',
        emotionLabel: { ar: 'غير متوفر', en: 'Unavailable' },
        summary: {
            ar: language === 'ar' ? fallbackSummary : 'تعذر إكمال تحليل هذا الملف. يرجى المحاولة مرة أخرى.',
            en: language === 'en' ? fallbackSummary : 'This file could not be analyzed. Please try again.',
        },
        alternatives: [],
    };
}

export function UploadPage() {
    const { language, boot, addHistoryItem, setLatestAnalysis, setToast } = useAppContext();
    const [files, setFiles] = useState<File[]>([]);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const [selectedFileIndex, setSelectedFileIndex] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [activeStep, setActiveStep] = useState(0);
    const [currentAnalyses, setCurrentAnalyses] = useState<AnalysisResult[]>([]);
    const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | string | null>(null);
    const [currentFileName, setCurrentFileName] = useState<string | null>(null);

    const steps = useMemo(
        () => [
            {
                label: language === 'ar' ? 'استقبال العينة' : 'Sample received',
                description:
                    language === 'ar'
                        ? 'التحقق من نوع العينة وحجمها ثم إدخالها إلى مسار التحليل.'
                        : 'Validating the sample type and size, then passing it into the inference pipeline.',
            },
            {
                label: language === 'ar' ? 'استخراج الإطارات' : 'Frames extracted',
                description:
                    language === 'ar'
                        ? 'تقسيم العينة إلى إطارات وتجهيزها لمراحل المعالجة اللاحقة.'
                        : 'Splitting the sample into frames and preparing it for downstream processing.',
            },
            {
                label: language === 'ar' ? 'تجهيز الخصائص' : 'Features prepared',
                description:
                    language === 'ar'
                        ? 'تهيئة الخصائص المرئية المطلوبة لتغذية نموذج المشاعر.'
                        : 'Preparing the visual features required by the emotion model.',
            },
            {
                label: language === 'ar' ? 'تصنيف المشاعر' : 'Emotion classified',
                description:
                    language === 'ar'
                        ? 'تشغيل نموذج المشاعر لتحديد الحالة الشعورية الأقرب.'
                        : 'Running the emotion model to determine the most likely state.',
            },
            {
                label: language === 'ar' ? 'معايرة الثقة' : 'Confidence calibrated',
                description:
                    language === 'ar'
                        ? 'احتساب درجة الثقة النهائية اعتمادًا على نتيجة كل فيديو.'
                        : 'Calculating the final confidence score for each analyzed video.',
            },
            {
                label: language === 'ar' ? 'إخراج التقرير' : 'Report generated',
                description:
                    language === 'ar'
                        ? 'تجميع الملخص ودرجة الثقة والنتائج البديلة ضمن التقرير.'
                        : 'Composing the summary, confidence score, and alternative predictions into the final report.',
            },
        ],
        [language],
    );

    const selectedFile = files[selectedFileIndex] ?? null;
    const selectedAnalysis = useMemo(() => {
        const matched = currentAnalyses.find((analysis) => String(analysis.id) === String(selectedAnalysisId));
        return matched ?? currentAnalyses[0] ?? null;
    }, [currentAnalyses, selectedAnalysisId]);

    useEffect(() => {
        if (!files.length) {
            setSelectedFileIndex(0);
            return;
        }

        setSelectedFileIndex((current) => Math.min(current, files.length - 1));
    }, [files.length]);

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return;
        }

        const nextUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(nextUrl);
        return () => URL.revokeObjectURL(nextUrl);
    }, [selectedFile]);

    useEffect(() => {
        if (!busy) {
            return undefined;
        }

        const interval = window.setInterval(() => {
            setActiveStep((current) => {
                if (current >= steps.length - 1) {
                    return 0;
                }

                return current + 1;
            });
        }, 820);

        return () => window.clearInterval(interval);
    }, [busy, steps.length]);

    function resetBatchOutput() {
        setCurrentAnalyses([]);
        setSelectedAnalysisId(null);
        setCurrentFileName(null);
        setError(null);
        setProgress(0);
        setActiveStep(0);
    }

    function mergeQueuedFiles(incomingFiles: File[]) {
        if (!incomingFiles.length || busy) {
            return;
        }

        setFiles((current) => uniqueFiles([...current, ...incomingFiles]));
        setHasAnalyzed(false);
        resetBatchOutput();
    }

    function clearQueue() {
        if (busy) {
            return;
        }

        setFiles([]);
        setPreviewUrl(null);
        setHasAnalyzed(false);
        resetBatchOutput();
    }

    function removeQueuedFile(index: number) {
        if (busy) {
            return;
        }

        setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
        resetBatchOutput();
    }

    function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
        mergeQueuedFiles(Array.from(event.target.files ?? []));
        event.currentTarget.value = '';
    }

    function focusQueuedFile(fileName: string) {
        const nextIndex = files.findIndex((file) => file.name === fileName);
        if (nextIndex >= 0) {
            setSelectedFileIndex(nextIndex);
        }
    }

    function syncHistoryWithBatch(analyses: AnalysisResult[]) {
        if (!analyses.length) {
            return;
        }

        const latestCandidate =
            [...analyses].reverse().find((analysis) => analysis.status === 'processed')
            ?? analyses[analyses.length - 1];

        analyses.forEach((analysis) => {
            if (String(analysis.id) !== String(latestCandidate.id)) {
                addHistoryItem(analysis);
            }
        });

        setLatestAnalysis(latestCandidate);
        setSelectedAnalysisId(latestCandidate.id);
    }

    async function submitAnalysis() {
        if (!files.length || busy) {
            return;
        }

        setBusy(true);
        setHasAnalyzed(true);
        resetBatchOutput();
        setProgress(4);
        setActiveStep(0);

        const analyses: AnalysisResult[] = [];

        try {
            for (let index = 0; index < files.length; index += 1) {
                const queuedFile = files[index];
                setCurrentFileName(queuedFile.name);
                setSelectedFileIndex(index);
                setActiveStep(0);

                const formData = new FormData();
                formData.append('media', queuedFile);

                let nextAnalysis: AnalysisResult;

                try {
                    const response = await fetch(toAppUrl(boot.routes.upload), {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                            'X-CSRF-TOKEN': boot.csrfToken,
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'include',
                        body: formData,
                    });

                    const payload = (await response.json().catch(() => null)) as UploadResponsePayload | null;
                    nextAnalysis = payload?.analysis ?? buildClientFailureAnalysis(queuedFile, language, payload?.message);

                    if (!response.ok && !payload?.analysis) {
                        nextAnalysis = buildClientFailureAnalysis(queuedFile, language, payload?.message);
                    }
                } catch (submissionError) {
                    nextAnalysis = buildClientFailureAnalysis(
                        queuedFile,
                        language,
                        submissionError instanceof Error ? submissionError.message : undefined,
                    );
                }

                analyses.push(nextAnalysis);
                setCurrentAnalyses([...analyses]);
                setSelectedAnalysisId((current) => current ?? nextAnalysis.id);
                setProgress(Math.max(8, Math.round(((index + 1) / files.length) * 100)));
            }

            setActiveStep(steps.length);
            syncHistoryWithBatch(analyses);

            const failedCount = analyses.filter((analysis) => analysis.status !== 'processed').length;
            const successCount = analyses.length - failedCount;
            const message = buildBatchMessage(language, successCount, failedCount);

            setError(successCount === 0 ? message : null);
            setToast({
                tone: failedCount === 0 ? 'success' : successCount > 0 ? 'warning' : 'error',
                message,
            });
        } finally {
            setBusy(false);
            setCurrentFileName(null);
        }
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="space-y-6 pb-12"
        >
            <PageHeader
                className="!mb-4 !gap-4 border-b border-white/[0.08] !pb-4 xl:flex-row xl:items-start xl:justify-between"
                eyebrow={language === 'ar' ? 'وحدة التحليل الذكية' : 'Smart Inference Module'}
                title={language === 'ar' ? 'رفع العينات وتشغيل التحليل' : 'Upload & Run Inference'}
                description={language === 'ar' ? 'قم برفع مقاطع الفيديو أو الصور الخاصة بك. سيقوم نظام الذكاء الاصطناعي الخاص بنا بتحليل كل ملف بدقة واستخراج المشاعر وعرض النتائج في لوحة تحكم متكاملة.' : 'Upload your video or image samples. Our AI system will deeply analyze each file, extract emotions, and present the results in an integrated dashboard.'}
            />

            <section className="grid min-h-0 gap-6 xl:grid-cols-12 xl:items-start">
                <div className="xl:col-span-12 flex flex-col gap-6">
                    <SpotlightCard noHover className="relative flex min-h-0 flex-col overflow-hidden !p-0 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.05]">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgb(var(--primary-rgb)/0.15),transparent_50%)]" />
                        <InferenceStepHeader
                            icon={<UploadCloud className="h-5 w-5 text-[var(--primary)]" />}
                            eyebrow={language === 'ar' ? 'إدخال العينات' : 'Batch ingest'}
                            title={language === 'ar' ? 'منطقة الرفع' : 'Upload Zone'}
                            stepBadge={language === 'ar' ? 'الخطوة ١' : 'Step 1'}
                            stepTone="info"
                        />

                        <div className="relative flex flex-1 flex-col gap-4 px-4 pb-5 pt-4 sm:px-5">
                            <div
                                className={cx(
                                    'group relative flex min-h-[200px] flex-1 items-center justify-center overflow-hidden rounded-[1.25rem] border-2 border-dashed transition-all duration-300 ease-out',
                                    dragActive
                                        ? 'scale-[1.02] border-[rgb(var(--primary-rgb)/0.8)] bg-[rgb(var(--primary-rgb)/0.12)] shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]'
                                        : 'border-white/20 bg-black/40 hover:border-[rgb(var(--primary-rgb)/0.4)] hover:bg-black/60',
                                )}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    setDragActive(true);
                                }}
                                onDragLeave={(event) => {
                                    event.preventDefault();
                                    setDragActive(false);
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    setDragActive(false);
                                    mergeQueuedFiles(Array.from(event.dataTransfer.files));
                                }}
                            >
                                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:24px_24px] opacity-50" />
                                
                                {dragActive && (
                                    <motion.div 
                                        layoutId="drag-glow"
                                        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgb(var(--primary-rgb)/0.2),transparent_70%)]" 
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    />
                                )}

                                <div className="relative flex min-h-[180px] flex-col items-center justify-center px-4 py-6 text-center z-10">
                                    <motion.div
                                        animate={dragActive ? { y: -5, scale: 1.05 } : { y: 0, scale: 1 }}
                                        className={cx(
                                            'mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgb(var(--primary-rgb)/0.3)] bg-gradient-to-br from-[rgb(var(--primary-rgb)/0.2)] to-white/[0.05] shadow-lg backdrop-blur-md',
                                            dragActive && 'ring-4 ring-[rgb(var(--primary-rgb)/0.3)]',
                                        )}
                                    >
                                        <UploadCloud className={`h-8 w-8 ${dragActive ? 'text-white' : 'text-[var(--primary)]'}`} />
                                    </motion.div>
                                    <h3 className="text-balance text-lg font-extrabold tracking-tight text-white">{language === 'ar' ? 'اسحب ملفاتك هنا' : 'Drag & Drop Files'}</h3>
                                    <p className="body-soft mt-2 max-w-[240px] text-xs leading-relaxed text-white/60">
                                        {language === 'ar' ? 'يدعم الفيديو والصور. يمكنك اختيار عدة ملفات معًا للتحليل المجمع.' : 'Supports video and images. Select multiple files for batch analysis.'}
                                    </p>
                                    <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                                        {(['MP4', 'MOV', 'AVI', 'JPG', 'PNG'] as const).map((fmt) => (
                                            <span key={fmt} className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] font-bold text-white/50 tracking-wider">{fmt}</span>
                                        ))}
                                    </div>
                                    <label className="button-primary mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-[0_4px_15px_rgba(var(--primary-rgb),0.3)] transition-transform hover:scale-105 active:scale-95">
                                        <Sparkles className="h-4 w-4 shrink-0" />
                                        {language === 'ar' ? 'تصفح الملفات' : 'Browse Files'}
                                        <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={handleFileInputChange} />
                                    </label>
                                </div>
                            </div>

                            <AnimatePresence>
                                {files.length > 0 && !hasAnalyzed && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="rounded-[1.5rem] border border-white/[0.08] bg-black/40 p-5 shadow-inner backdrop-blur-xl">
                                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--primary-rgb)/0.2)] text-[var(--primary)] font-bold text-sm">
                                                        {files.length}
                                                    </div>
                                                    <p className="text-sm font-bold text-white">
                                                        {language === 'ar' ? 'الملفات المحددة' : 'Selected Files'}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                                                    onClick={clearQueue}
                                                    disabled={busy}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    {language === 'ar' ? 'مسح الكل' : 'Clear all'}
                                                </button>
                                            </div>

                                <div className="mt-6 max-h-[400px] space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                                    <AnimatePresence mode="popLayout">
                                        {files.map((queuedFile, index) => {
                                            const active = index === selectedFileIndex;
                                            const isImg = isImageFile(queuedFile);

                                            return (
                                                <motion.div
                                                    layout
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    transition={{ duration: 0.2 }}
                                                    key={fileSignature(queuedFile)}
                                                    className={cx(
                                                        'group flex items-center gap-3 rounded-xl border p-2.5 transition-all duration-200',
                                                        active
                                                            ? 'border-[rgb(var(--primary-rgb)/0.5)] bg-[rgb(var(--primary-rgb)/0.15)] shadow-[0_4px_20px_rgba(var(--primary-rgb),0.1)]'
                                                            : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]',
                                                    )}
                                                >
                                                    <button
                                                        type="button"
                                                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                                        onClick={() => setSelectedFileIndex(index)}
                                                    >
                                                        <span className={cx(
                                                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors",
                                                            active ? "border-[rgb(var(--primary-rgb)/0.4)] bg-[rgb(var(--primary-rgb)/0.2)] text-white" : "border-white/10 bg-black/50 text-white/60 group-hover:text-white"
                                                        )}>
                                                            {isImg ? <ImageIcon className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className={cx("truncate text-xs font-bold transition-colors", active ? "text-white" : "text-white/80 group-hover:text-white")}>{queuedFile.name}</p>
                                                            <div className="mt-0.5 flex items-center gap-2 text-[10px] font-medium text-white/50">
                                                                <span className="uppercase tracking-wider">{mediaLabel(language, queuedFile)}</span>
                                                                <span className="h-1 w-1 rounded-full bg-white/20" />
                                                                <span>{`${(queuedFile.size / 1024 / 1024).toFixed(2)} MB`}</span>
                                                                {active && (
                                                                    <>
                                                                        <span className="h-1 w-1 rounded-full bg-[var(--primary)]" />
                                                                        <span className="text-[var(--primary)]">{language === 'ar' ? 'معاينة' : 'Previewing'}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/40 opacity-0 transition-all hover:bg-rose-500/20 hover:text-rose-400 group-hover:opacity-100 disabled:opacity-50"
                                                        onClick={() => removeQueuedFile(index)}
                                                        disabled={busy}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>

                                            <div className="mt-5 pt-2">
                                                <button
                                                    type="button"
                                                    className="button-primary relative w-full overflow-hidden rounded-2xl py-4 text-sm font-extrabold shadow-[0_8px_24px_rgba(var(--primary-rgb),0.25)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-70"
                                                    onClick={submitAnalysis}
                                                    disabled={busy}
                                                >
                                                    {busy && (
                                                        <motion.div 
                                                            className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)]"
                                                            animate={{ x: ['-100%', '100%'] }}
                                                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                                        />
                                                    )}
                                                    <span className="relative flex items-center justify-center gap-2.5">
                                                        {busy ? (
                                                            <>
                                                                <LoaderCircle className="h-5 w-5 animate-spin" />
                                                                {language === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Play className="h-4 w-4 fill-current" />
                                                                {language === 'ar' ? `بدء تحليل ${files.length} ملف` : `Analyze ${files.length} ${files.length === 1 ? 'file' : 'files'}`}
                                                            </>
                                                        )}
                                                    </span>
                                                </button>
                                            </div>

                                            <AnimatePresence>
                                                {error && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                                        className="mt-4 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"
                                                    >
                                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                                                        <p className="leading-relaxed">{error}</p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </SpotlightCard>
                </div>

                <div id="media-viewport-section" className="xl:col-span-12 flex min-h-0 flex-col gap-6 xl:h-full">
                    <SpotlightCard noHover className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden !p-0 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.05]">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(var(--secondary-rgb)/0.15),transparent_50%)]" />
                        <InferenceStepHeader
                            icon={<Video className="h-5 w-5 text-[var(--secondary)]" />}
                            eyebrow={language === 'ar' ? 'معاينة ونتائج' : 'Preview & Results'}
                            title={language === 'ar' ? 'شاشة العرض والتحليل' : 'Media & Analysis'}
                            stepBadge={language === 'ar' ? 'الخطوة ٢' : 'Step 2'}
                            stepTone={previewUrl ? 'success' : 'info'}
                        />

                        <div className="relative flex flex-1 flex-col overflow-y-auto custom-scrollbar">
                            <div className="p-4 sm:p-5">
                                {previewUrl && selectedFile ? (
                                    <MediaPreviewViewport previewUrl={previewUrl} file={selectedFile} />
                                ) : (
                                    <EmptyPreviewPlaceholder language={language} />
                                )}
                            </div>

                            <AnimatePresence>
                                {!busy && selectedAnalysis && selectedAnalysis.status === 'processed' && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="border-t border-white/[0.06] bg-black/20"
                                    >
                                        <div className="p-5 sm:p-6">
                                            <div className="mb-5 flex items-center justify-between">
                                                <h3 className="text-base font-bold text-white">
                                                    {language === 'ar' ? 'تفاصيل النتيجة' : 'Result Details'}
                                                </h3>
                                                <Badge tone="success" text={language === 'ar' ? 'مكتمل' : 'Completed'} />
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-3 xl:items-center">
                                                <InsightRow label={language === 'ar' ? 'الحالة الشعورية' : 'Emotional state'} value={copyFor(language, selectedAnalysis.emotionLabel)} tone="info" />
                                                <InsightRow label={language === 'ar' ? 'زمن التحليل' : 'Latency'} value={`${selectedAnalysis.latencyMs} ms`} tone="warning" />
                                                <div className="xl:pl-3">
                                                    <ConfidenceBar label={language === 'ar' ? 'درجة الثقة' : 'Confidence'} value={selectedAnalysis.confidence} />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </SpotlightCard>

                    <AnimatePresence>
                        {busy && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                                className="space-y-4"
                            >
                                <SpotlightCard className="relative overflow-hidden !p-5 ring-1 ring-[rgb(var(--primary-rgb)/0.3)]">
                                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(var(--primary-rgb),0.05)_50%,transparent_75%)] bg-[length:250%_250%] animate-[gradient-move_3s_linear_infinite]" />
                                    <div className="relative z-10 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--primary-rgb)/0.15)] ring-1 ring-[rgb(var(--primary-rgb)/0.3)]">
                                                <LoaderCircle className="h-5 w-5 animate-spin text-[var(--primary)]" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-extrabold text-white">{language === 'ar' ? 'جاري التحليل...' : 'Inference running...'}</h3>
                                                <p className="text-xs font-medium text-white/60">
                                                    {currentFileName ? (language === 'ar' ? `الملف: ${currentFileName}` : `Processing: ${currentFileName}`) : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className="text-xl font-black text-[var(--primary)]">{progress}%</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{language === 'ar' ? 'مكتمل' : 'Complete'}</span>
                                        </div>
                                    </div>
                                    <div className="relative z-10 mt-4">
                                        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
                                            <motion.div 
                                                className="h-full bg-gradient-to-r from-[var(--secondary)] to-[var(--primary)]"
                                                initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                        <ProgressTimeline steps={steps} activeIndex={activeStep} />
                                    </div>
                                </SpotlightCard>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </section>

            <BatchResultsSection
                analyses={currentAnalyses}
                selectedAnalysisId={selectedAnalysisId}
                onSelectAnalysis={(analysis) => {
                    setSelectedAnalysisId(analysis.id);
                    focusQueuedFile(analysis.fileName);
                }}
            />
        </motion.div>
    );
}

function InferenceStepHeader({
    icon,
    eyebrow,
    title,
    stepBadge,
    stepTone,
}: {
    icon: ReactNode;
    eyebrow: string;
    title: string;
    stepBadge: string;
    stepTone: 'info' | 'success';
}) {
    return (
        <div className="relative z-[1] shrink-0 border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[rgb(var(--primary-rgb)/0.2)] bg-[rgb(var(--primary-rgb)/0.06)]">{icon}</span>
                    <div className="min-w-0">
                        <p className="truncate text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">{eyebrow}</p>
                        <p className="mt-1 truncate text-base font-bold sm:text-[1.05rem]">{title}</p>
                    </div>
                </div>
                <Badge tone={stepTone === 'success' ? 'success' : 'info'} text={stepBadge} />
            </div>
        </div>
    );
}

export function MediaPreviewViewport({ previewUrl, file }: { previewUrl: string; file: File }) {
    const isImage = file.type.startsWith('image');

    return (
        <div className="relative flex w-full min-h-[16rem] items-center justify-center overflow-hidden rounded-xl bg-black/20">
            <AnimatePresence mode="wait">
                {isImage ? (
                    <motion.img
                        key={previewUrl}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        src={previewUrl}
                        alt={file.name}
                        loading="lazy"
                        draggable={false}
                        className="block max-h-[55vh] w-full object-contain"
                    />
                ) : (
                    <motion.video
                        key={previewUrl}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        src={previewUrl}
                        controls
                        autoPlay
                        loop
                        playsInline
                        preload="metadata"
                        className="block max-h-[55vh] w-full object-contain outline-none rounded-xl"
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export function EmptyPreviewPlaceholder({ language }: { language: 'ar' | 'en' }) {
    return (
        <div className="relative z-[1] flex min-h-[16rem] flex-1 flex-col">
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-2 border-dashed border-white/20 bg-black/40 shadow-inner">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:24px_24px] opacity-50" />
                
                <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-10 text-center z-10">
                    <motion.div 
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgb(var(--primary-rgb)/0.3)] bg-gradient-to-br from-[rgb(var(--primary-rgb)/0.2)] to-white/[0.05] shadow-lg backdrop-blur-md"
                    >
                        <ImageIcon className="h-8 w-8 text-[var(--primary)]" strokeWidth={1.5} />
                    </motion.div>
                    
                    <h3 className="mt-2 max-w-md text-lg font-extrabold tracking-tight text-white">
                        {language === 'ar' ? 'مساحة العرض فارغة' : 'Viewport is empty'}
                    </h3>
                    <p className="body-soft mt-2 max-w-sm text-xs leading-relaxed text-white/60">
                        {language === 'ar'
                            ? 'بمجرد اختيارك للملفات، ستظهر معاينة الملف المحدد هنا.'
                            : 'Once you select files, the preview of the active file will appear here.'}
                    </p>
                </div>
            </div>
        </div>
    );
}

function BatchResultsSection({
    analyses,
    selectedAnalysisId,
    onSelectAnalysis,
}: {
    analyses: AnalysisResult[];
    selectedAnalysisId: number | string | null;
    onSelectAnalysis: (analysis: AnalysisResult) => void;
}) {
    const { language } = useAppContext();

    if (!analyses.length) {
        return null;
    }

    const failedCount = analyses.filter((analysis) => analysis.status !== 'processed').length;
    const successCount = analyses.length - failedCount;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pt-8"
        >
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--primary-rgb)/0.15)] text-[var(--primary)] ring-1 ring-[rgb(var(--primary-rgb)/0.3)]">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-extrabold sm:text-3xl text-white">
                        {language === 'ar' ? 'نتائج التحليل' : 'Analysis Results'}
                    </h2>
                </div>
                <p className="body-soft text-sm text-white/60 ml-13">{buildBatchMessage(language, successCount, failedCount)}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                    {analyses.map((analysis, index) => {
                        const active = String(selectedAnalysisId) === String(analysis.id);
                        const isSuccess = analysis.status === 'processed';

                        return (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                key={analysis.id}
                                type="button"
                                onClick={() => {
                                    onSelectAnalysis(analysis);
                                    const viewportElement = document.getElementById('media-viewport-section');
                                    if (viewportElement) {
                                        viewportElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                                className={cx(
                                    'group relative flex flex-col overflow-hidden rounded-xl border p-4 text-left transition-all duration-300',
                                    active
                                        ? 'border-[rgb(var(--primary-rgb)/0.5)] bg-[rgb(var(--primary-rgb)/0.1)] shadow-[0_8px_24px_rgba(var(--primary-rgb),0.15)] scale-[1.02] ring-1 ring-[rgb(var(--primary-rgb)/0.4)]'
                                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] hover:-translate-y-1 hover:shadow-lg',
                                )}
                            >
                                {active && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--primary-rgb)/0.1)] to-transparent pointer-events-none" />
                                )}
                                
                                <div className="relative z-10 flex w-full items-start justify-between gap-3">
                                    <div className={cx(
                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                                        active ? "border-[rgb(var(--primary-rgb)/0.4)] bg-[rgb(var(--primary-rgb)/0.2)] text-white" : "border-white/10 bg-black/40 text-white/70"
                                    )}>
                                        {analysis.mediaType === 'image' ? <ImageIcon className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                                    </div>
                                    <Badge
                                        tone={isSuccess ? 'success' : 'error'}
                                        text={isSuccess ? (language === 'ar' ? 'مكتمل' : 'Completed') : (language === 'ar' ? 'فشل' : 'Failed')}
                                    />
                                </div>

                                <div className="relative z-10 mt-3 min-w-0 flex-1">
                                    <p className={cx("truncate text-sm font-bold transition-colors", active ? "text-white" : "text-white/90")} title={analysis.fileName}>{analysis.fileName}</p>
                                    <p className="body-soft mt-1 line-clamp-2 text-xs leading-relaxed text-white/60">
                                        {copyFor(language, analysis.summary)}
                                    </p>
                                </div>

                                <div className="relative z-10 mt-4 flex w-full items-center justify-between border-t border-white/10 pt-3">
                                    <div className="flex items-center gap-2.5 text-[10px] font-medium text-white/50">
                                        <div className="flex items-center gap-1">
                                            <Sparkles className={cx("h-3 w-3", active ? "text-[var(--primary)]" : "text-white/40")} />
                                            <span className={cx(isSuccess ? "text-white" : "")}>{analysis.confidence.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-1 w-1 rounded-full bg-white/20" />
                                        <div className="flex items-center gap-1">
                                            <span>{analysis.latencyMs} ms</span>
                                        </div>
                                    </div>
                                    
                                    <div className={cx(
                                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors",
                                        active 
                                            ? "bg-[rgb(var(--primary-rgb)/0.2)] text-[var(--primary)]" 
                                            : "bg-white/10 text-white/80 group-hover:bg-white/20 group-hover:text-white"
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
        </motion.div>
    );
}

export function ResultsSection({ analysis, showHeader = false, showHero = true, showDetails = true }: { analysis?: AnalysisResult | null, showHeader?: boolean, showHero?: boolean, showDetails?: boolean }) {
    const { language } = useAppContext();

    if (!analysis) {
        return null;
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cx('mt-8', showHeader ? 'border-t border-white/[0.08] pt-8' : '')}
        >
            {showHeader && (
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--primary-rgb)/0.15)] text-[var(--primary)] ring-1 ring-[rgb(var(--primary-rgb)/0.3)]">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-extrabold sm:text-3xl text-white">
                        {language === 'ar' ? 'التقرير المفصل' : 'Detailed Report'}
                    </h2>
                </div>
            )}

            <div className="space-y-6">
                {showHero && <AnalysisHeroCard analysis={analysis} />}
            </div>
        </motion.div>
    );
}

export function ResultsPage() {
    return <UploadPage />;
}
