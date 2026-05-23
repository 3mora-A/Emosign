import { motion } from 'framer-motion';
import { Eye, EyeOff, MoveRight, ShieldEllipsis, Sparkles, Star, WandSparkles, Smile, Frown, Zap, ScanFace, Cpu, PlaySquare, Image as ImageIcon, Hand, UploadCloud, BrainCircuit, BarChart3, GraduationCap, HeartPulse, Headphones, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    AppIcon,
    Badge,
    ButtonLink,
    ConfidenceBar,
    InputField,
    PageHeader,
    SectionHeading,
    SelectField,
    SpotlightCard,
    StatCard,
    motionVariants,
} from './components';
import { useAppContext } from './context';
import { landingHighlights, testimonials, whyItMatters, workflowSteps } from './data';
import type { Language, LocalizedText } from './types';
import { copyFor, cx, toAppPath, toAppUrl } from './utils';

async function submitForm(
    url: string,
    token: string,
    fields: Record<string, string>,
): Promise<{ message?: string; redirect?: string }> {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value));

    const response = await fetch(toAppUrl(url), {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'X-CSRF-TOKEN': token,
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: formData,
    });

    const payload = (await response.json().catch(() => null)) as { message?: string; redirect?: string } | null;

    if (!response.ok) {
        throw new Error(payload?.message ?? 'Something went wrong.');
    }

    return payload ?? {};
}

function AuthShell({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: ReactNode;
}) {
    const { language, boot } = useAppContext();

    return (
        <div className="app-container section-shell">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <motion.div variants={motionVariants.pageTransition} initial="initial" animate="animate" className="panel relative overflow-hidden rounded-[2rem] p-7 md:p-10">
                    <div className="hero-mesh" />
                    <div className="relative z-10">
                        <div className="eyebrow">{language === 'ar' ? 'الوصول إلى النظام' : 'Access the system'}</div>
                        <h1 className="section-title mt-6 max-w-2xl">{title}</h1>
                        <p className="body-soft mt-5 max-w-2xl text-lg leading-8">{subtitle}</p>

                        <div className="mt-10 data-grid">
                            {landingHighlights.map((item) => (
                                <SpotlightCard key={copyFor(language, item.title)} className="min-h-[190px] relative overflow-hidden group">
                                    {/* Abstract background shape for visual interest */}
                                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[var(--primary)]/10 rounded-full blur-2xl group-hover:bg-[var(--primary)]/20 transition-colors duration-500" />
                                    
                                    <div className="mb-4 inline-flex rounded-2xl border border-[rgb(var(--primary-rgb)/0.12)] bg-gradient-to-br from-[var(--primary)]/10 via-[var(--primary)]/5 to-transparent p-3 shadow-inner ring-1 ring-[var(--line)] relative z-10">
                                        <AppIcon name={item.icon} className="h-5 w-5 text-[var(--primary)]" />
                                    </div>
                                    <h3 className="text-xl font-bold relative z-10">{copyFor(language, item.title)}</h3>
                                    <p className="body-soft mt-3 leading-7 relative z-10">{copyFor(language, item.description)}</p>
                                </SpotlightCard>
                            ))}
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={motionVariants.pageTransition} initial="initial" animate="animate" className="panel-strong rounded-[2rem] p-7 md:p-8">
                    {children}
                    <p className="body-muted mt-4 text-sm">
                        {boot.auth.isAuthenticated
                            ? language === 'ar'
                                ? 'لديك جلسة نشطة بالفعل. يمكنك المتابعة إلى لوحة التحكم في أي وقت.'
                                : 'You already have an active session and can continue to the dashboard at any time.'
                            : language === 'ar'
                              ? 'سجّل الدخول للوصول إلى محرّك التحليل وإدارة جلساتك.'
                              : 'Sign in to access the inference engine and manage your analysis sessions.'}
                    </p>
                </motion.div>
            </div>
        </div>
    );
}

function FloatingBadge({ icon, text, delay, className }: { icon: ReactNode, text: string, delay: number, className: string }) {
    return (
        <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay, ease: "easeInOut" }}
            className={cx("absolute flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)]/90 p-3 md:p-4 backdrop-blur-xl shadow-2xl z-20", className)}
        >
            {icon}
            <span className="font-bold text-xs md:text-sm tracking-wide text-[var(--text)]">{text}</span>
        </motion.div>
    );
}

export function LandingPage() {
    const { language, boot } = useAppContext();

    return (
        <div className="space-y-32 pb-24 overflow-hidden">
            {/* HERO SECTION */}
            <section className="relative pt-12 lg:pt-24">
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--primary)]/20 rounded-full blur-[120px] pointer-events-none" />

                <div className="app-container grid lg:grid-cols-2 gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: language === 'ar' ? 50 : -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative z-10"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-bold mb-8">
                            <Sparkles className="h-4 w-4" />
                            {language === 'ar' ? 'الجيل الجديد من الذكاء الاصطناعي' : 'Next-Gen AI Technology'}
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.2] tracking-tight text-[var(--text)]">
                            {language === 'ar' ? (
                                <>نظام تعلم عميق متكامل <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">لتحليل المشاعر</span></>
                            ) : (
                                <>End-to-End Deep Learning System for <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">Emotion Analysis</span></>
                            )}
                        </h1>

                        <p className="mt-6 text-lg text-[var(--text-soft)] leading-relaxed max-w-lg">
                            {language === 'ar'
                                ? 'ارفع أي صورة أو فيديو، وسيقوم محرك التعلم العميق الخاص بنا بتحليل تعابير الوجه بدقة متناهية لاستخراج الحالة الشعورية فوراً.'
                                : 'Upload any image or video, and our deep learning engine will analyze facial expressions with extreme accuracy to extract the emotional state instantly.'}
                        </p>

                        <div className="mt-10 flex flex-wrap gap-4">
                            <ButtonLink to={boot.auth.isAuthenticated ? '/upload' : '/register'} className="px-8 py-4 text-base rounded-full shadow-[0_0_40px_rgba(var(--primary-rgb),0.4)] hover:scale-105 transition-transform">
                                {language === 'ar' ? 'ابدأ التحليل مجاناً' : 'Start Analyzing Free'}
                                <MoveRight className="h-5 w-5 rtl:rotate-180" />
                            </ButtonLink>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="relative h-[400px] sm:h-[500px] lg:h-[600px] w-full z-10 mt-10 lg:mt-0"
                    >
                        <div className="absolute inset-0 rounded-[3rem] overflow-hidden border border-[var(--card-border)] shadow-2xl bg-[var(--surface-strong)]">
                            <img src="/images/hero-face.png" alt="AI Face Analysis" className="w-full h-full object-cover opacity-100" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-strong)] via-[var(--surface-strong)]/40 to-transparent" />
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
                        </div>

                        {/* Floating Elements */}
                        <FloatingBadge icon={<Smile className="text-emerald-400 h-5 w-5 md:h-6 md:w-6"/>} text={language === 'ar' ? 'سعيد' : 'Happy'} delay={0} className="top-12 -left-4 md:-left-8 lg:-left-12" />
                        <FloatingBadge icon={<Frown className="text-blue-400 h-5 w-5 md:h-6 md:w-6"/>} text={language === 'ar' ? 'حزين' : 'Sad'} delay={1.5} className="bottom-24 -right-4 md:-right-8 lg:-right-12" />
                        <FloatingBadge icon={<Zap className="text-amber-400 h-5 w-5 md:h-6 md:w-6"/>} text={language === 'ar' ? '0.5ث استجابة' : '0.5s Latency'} delay={0.7} className="top-1/2 -left-8 md:-left-12 lg:-left-16" />
                        <FloatingBadge icon={<ScanFace className="text-[var(--primary)] h-5 w-5 md:h-6 md:w-6"/>} text={language === 'ar' ? 'تحليل المشاعر' : 'Emotion Analysis'} delay={2.2} className="top-1/4 -right-4 md:-right-6 lg:-right-10" />
                    </motion.div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="how-it-works" className="app-container scroll-mt-32 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-gradient-to-r from-[var(--primary)]/10 via-[var(--accent)]/10 to-[var(--secondary)]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
                <div className="text-center mb-16 relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black text-[var(--text)] mb-4">{language === 'ar' ? 'كيف يعمل النظام؟' : 'How It Works?'}</h2>
                    <p className="text-[var(--text-soft)] text-lg max-w-2xl mx-auto">{language === 'ar' ? 'ثلاث خطوات بسيطة تفصلك عن تحليل المشاعر بدقة' : 'Three simple steps to accurate emotion analysis'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Connecting Line */}
                    <div className="hidden md:block absolute top-1/3 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-[var(--primary)]/50 to-transparent -translate-y-1/2 z-0" />
                    
                    {[
                        { 
                            icon: UploadCloud, 
                            titleAr: '1. اختيار أفضل إطار', titleEn: '1. Keyframe Selection', 
                            descAr: 'عند رفع فيديو، نقوم بتحليل الإطارات برمجياً واختيار الأفضل بناءً على درجة الوضوح (Sharpness) ومقدار الحركة.', descEn: 'For videos, we programmatically analyze frames and select the best one based on sharpness and motion scores.',
                            img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop'
                        },
                        { 
                            icon: ScanFace, 
                            titleAr: '2. استخراج معالم الوجه', titleEn: '2. Facial Landmark Extraction', 
                            descAr: 'نستخدم تقنيات الرؤية الحاسوبية المتقدمة لتحديد واستخراج النقاط الدقيقة لملامح الوجه استعداداً لتحليلها.', descEn: 'We use advanced computer vision techniques to detect and extract precise facial landmarks in preparation for analysis.',
                            img: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=800&auto=format&fit=crop'
                        },
                        { 
                            icon: BrainCircuit, 
                            titleAr: '3. التصنيف بالتعلم العميق', titleEn: '3. Deep Learning Classification', 
                            descAr: 'يتم تمرير الصورة عبر شبكة CNN لاستخراج الخصائص، ثم لنموذج SVM لتصنيف الحالة الشعورية.', descEn: 'The image passes through a CNN for feature extraction, then to an SVM model for emotion classification.',
                            img: 'https://bluesoft.com/wp-content/uploads/2024/11/machine-learning.jpg'
                        }
                    ].map((step, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: i * 0.2, duration: 0.5 }} className="relative z-10 flex flex-col bg-gradient-to-b from-[var(--surface)] to-[var(--surface-strong)] backdrop-blur-sm border border-[var(--card-border)] rounded-3xl overflow-hidden shadow-xl">
                            {/* Image Header */}
                            <div className="relative h-48 w-full overflow-visible">
                                <div className="absolute inset-0 overflow-hidden">
                                    <img src={step.img} alt={step.titleEn} className="w-full h-full object-cover opacity-100" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-strong)] via-[var(--surface-strong)]/20 to-transparent opacity-90" />
                                </div>
                                
                                {/* Icon Over Image */}
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full bg-[var(--bg)] border-2 border-[var(--primary)] flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] z-20">
                                    <step.icon className="h-7 w-7 text-[var(--primary)]" />
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="pt-10 pb-8 px-6 text-center flex-1 flex flex-col relative z-10">
                                <h3 className="text-xl font-bold text-[var(--text)] mb-3">{language === 'ar' ? step.titleAr : step.titleEn}</h3>
                                <p className="text-[var(--text-soft)] text-sm leading-relaxed">{language === 'ar' ? step.descAr : step.descEn}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ABOUT US - BENTO GRID */}
            <section id="about" className="app-container scroll-mt-32 relative">
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--primary)]/15 rounded-full blur-[120px] pointer-events-none -z-10" />
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--accent)]/15 rounded-full blur-[120px] pointer-events-none -z-10" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[var(--secondary)]/10 rounded-full blur-[100px] pointer-events-none -z-10" />
                <div className="text-center mb-16 relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black text-[var(--text)] mb-4">{language === 'ar' ? 'عن النظام' : 'About The System'}</h2>
                    <p className="text-[var(--text-soft)] text-lg max-w-2xl mx-auto">{language === 'ar' ? 'بنية تحتية متطورة تجمع بين سرعة الأداء ودقة الذكاء الاصطناعي' : 'Advanced infrastructure combining high-speed performance with AI accuracy'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
                    {/* Large Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }}
                        className="md:col-span-2 md:row-span-2 relative rounded-[2.5rem] overflow-hidden shadow-xl bg-gradient-to-br from-[var(--surface-strong)] to-[var(--primary)]/10 border border-[var(--card-border)]"
                    >
                        <img src="/images/sign-language-ai.png" alt="Sign Language AI Tracking" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-strong)] via-[var(--surface-strong)]/40 to-transparent" />
                        <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end">
                            <h3 className="text-3xl md:text-4xl font-black text-[var(--text)] mb-4">{language === 'ar' ? 'تحليل متقدم لتعابير الوجه' : 'Advanced Facial Expression Analysis'}</h3>
                            <p className="text-[var(--text-soft)] text-lg max-w-md leading-relaxed">{language === 'ar' ? 'يقوم نظامنا برصد وتحليل أدق التغيرات في ملامح الوجه في الوقت الفعلي، مما يتيح فهماً عميقاً ودقيقاً للحالة الشعورية للمستخدم في أجزاء من الثانية.' : 'Our system detects and analyzes the subtlest changes in facial features in real-time, enabling a deep and accurate understanding of the user\'s emotional state in milliseconds.'}</p>
                        </div>
                    </motion.div>

                    {/* Small Card 1 */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: 0.2, duration: 0.5 }}
                        className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-[var(--surface)] to-[var(--primary)]/5 border border-[var(--card-border)] p-8 flex flex-col justify-center items-center text-center shadow-xl"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgb(var(--primary-rgb)/0.1),transparent_70%)] opacity-50" />
                        <ScanFace className="h-16 w-16 text-[var(--primary)] mb-6" />
                        <h3 className="text-2xl font-bold text-[var(--text)] mb-2">{language === 'ar' ? 'دقة عالية' : 'High Accuracy'}</h3>
                        <p className="text-[var(--text-soft)]">{language === 'ar' ? 'نماذج مدربة على ملايين الصور لضمان دقة لا مثيل لها.' : 'Models trained on millions of images to ensure unmatched precision.'}</p>
                    </motion.div>

                    {/* Small Card 2 */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: 0.4, duration: 0.5 }}
                        className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-[var(--surface)] to-[var(--accent)]/5 border border-[var(--card-border)] p-8 flex flex-col justify-center items-center text-center shadow-xl"
                    >
                        <div className="flex gap-4 mb-6">
                            <PlaySquare className="h-12 w-12 text-[var(--primary)]" />
                            <ImageIcon className="h-12 w-12 text-[var(--primary)]" />
                        </div>
                        <h3 className="text-2xl font-bold text-[var(--text)] mb-2">{language === 'ar' ? 'دعم شامل' : 'Universal Support'}</h3>
                        <p className="text-[var(--text-soft)]">{language === 'ar' ? 'نحلل الصور الثابتة ومقاطع الفيديو بنفس الكفاءة.' : 'We analyze static images and video clips with the same efficiency.'}</p>
                    </motion.div>
                </div>
            </section>

            {/* ACHIEVEMENTS */}
            <section id="achievements" className="app-container scroll-mt-32 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-r from-[var(--secondary)]/10 to-[var(--primary)]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
                <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-[var(--surface-strong)] to-[var(--surface)] border border-[var(--card-border)] py-20 px-8 md:px-16 text-center shadow-2xl">
                    <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=1000&auto=format&fit=crop')" }} />
                    <div className="absolute inset-0 bg-[var(--surface-strong)]/60 backdrop-blur-sm" />
                    
                    <div className="relative z-10">
                        <h2 className="text-4xl md:text-5xl font-black text-[var(--text)] mb-16">{language === 'ar' ? 'أرقام تتحدث عن نفسها' : 'Numbers That Speak'}</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 divide-y md:divide-y-0 md:divide-x divide-[var(--line)] rtl:divide-x-reverse">
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }} className="flex flex-col items-center justify-center pt-6 md:pt-0">
                                <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[var(--primary)] to-[var(--secondary)] mb-4">85%</div>
                                <p className="text-xl text-[var(--text)] font-bold mb-2">{language === 'ar' ? 'دقة التعرف' : 'Recognition Accuracy'}</p>
                                <p className="text-[var(--text-soft)] text-sm max-w-[200px] mx-auto">{language === 'ar' ? 'متوسط الدقة في ظروف الإضاءة الطبيعية' : 'Average accuracy in natural lighting conditions'}</p>
                            </motion.div>
                            
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: 0.2, duration: 0.5 }} className="flex flex-col items-center justify-center pt-10 md:pt-0">
                                <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[var(--primary)] to-[var(--secondary)] mb-4">0.5s</div>
                                <p className="text-xl text-[var(--text)] font-bold mb-2">{language === 'ar' ? 'سرعة الاستجابة' : 'Response Time'}</p>
                                <p className="text-[var(--text-soft)] text-sm max-w-[200px] mx-auto">{language === 'ar' ? 'متوسط زمن المعالجة للطلب الواحد' : 'Average processing time per request'}</p>
                            </motion.div>

                            <motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: 0.4, duration: 0.5 }} className="flex flex-col items-center justify-center pt-10 md:pt-0">
                                <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[var(--primary)] to-[var(--secondary)] mb-4">500+</div>
                                <p className="text-xl text-[var(--text)] font-bold mb-2">{language === 'ar' ? 'عينة اختبار' : 'Test Samples'}</p>
                                <p className="text-[var(--text-soft)] text-sm max-w-[200px] mx-auto">{language === 'ar' ? 'تم اختبارها بنجاح على النظام' : 'Successfully tested on the system'}</p>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* OUR TEAM */}
            <section id="team" className="app-container scroll-mt-32 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-t from-[var(--accent)]/10 to-[var(--primary)]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
                <div className="text-center mb-16 relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black text-[var(--text)] mb-4">{language === 'ar' ? 'فريق العمل' : 'Our Team'}</h2>
                    <p className="text-[var(--text-soft)] text-lg max-w-2xl mx-auto">{language === 'ar' ? 'المطورون والباحثون خلف هذا النظام' : 'The developers and researchers behind this system'}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-10">
                    {[
                        { name: 'الطالب الأول', roleAr: 'مطور ذكاء اصطناعي', roleEn: 'AI Developer', img: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=500&auto=format&fit=crop' },
                        { name: 'الطالب الثاني', roleAr: 'مطور واجهات', roleEn: 'Frontend Developer', img: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=500&auto=format&fit=crop' },
                        { name: 'الطالب الثالث', roleAr: 'مطور خلفية', roleEn: 'Backend Developer', img: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=500&auto=format&fit=crop' },
                        { name: 'الطالب الرابع', roleAr: 'محلل بيانات', roleEn: 'Data Analyst', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=500&auto=format&fit=crop' },
                        { name: 'الدكتور المشرف', roleAr: 'المشرف الأكاديمي', roleEn: 'Academic Supervisor', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=500&auto=format&fit=crop' }
                    ].map((member, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: i * 0.1, duration: 0.5 }} className="flex flex-col items-center text-center">
                            <div className="relative w-40 h-40 rounded-full overflow-hidden mb-6 border-4 border-[var(--card-border)] bg-[var(--surface-strong)] shadow-xl">
                                <img src={member.img} alt={member.name} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--text)] mb-1">{member.name}</h3>
                            <p className="text-[var(--primary)] text-sm font-semibold">{language === 'ar' ? member.roleAr : member.roleEn}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="app-container text-center pb-10">
                <motion.div 
                    initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }}
                    className="inline-flex flex-col items-center"
                >
                    <h2 className="text-3xl md:text-5xl font-black text-[var(--text)] mb-8">{language === 'ar' ? 'هل أنت مستعد للتجربة؟' : 'Ready to experience it?'}</h2>
                    <ButtonLink to={boot.auth.isAuthenticated ? '/upload' : '/register'} className="px-10 py-5 text-xl rounded-full shadow-[0_0_60px_rgba(var(--primary-rgb),0.3)] hover:scale-110 transition-transform duration-300">
                        <WandSparkles className="h-6 w-6 ltr:mr-2 rtl:ml-2" />
                        {language === 'ar' ? 'ابدأ التحليل الآن' : 'Start Analyzing Now'}
                    </ButtonLink>
                </motion.div>
            </section>
        </div>
    );
}

export function LoginPage() {
    const { language, boot, setToast } = useAppContext();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({ email: '', password: '', remember: true });

    const title = language === 'ar' ? 'الدخول إلى نظام تحليل المشاعر' : 'Sign in to the Emotion Analysis system';
    const subtitle =
        language === 'ar'
            ? 'سجّل دخولك للوصول إلى محرّك التحليل، السجل، والإعدادات الخاصة بحسابك.'
            : 'Sign in to access the inference engine, history, and your account settings.';

    return (
        <AuthShell title={title} subtitle={subtitle}>
            <PageHeader
                eyebrow="Login"
                title={language === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
                description={language === 'ar' ? 'استخدم حسابك الحالي، أو تابع إلى إنشاء حساب جديد إذا كانت هذه أول زيارة.' : 'Use your existing account, or continue to registration if this is your first visit.'}
            />
            <form
                className="space-y-4"
                onSubmit={async (event) => {
                    event.preventDefault();
                    setBusy(true);
                    setError(null);

                    try {
                        const payload = await submitForm(boot.routes.login, boot.csrfToken, {
                            email: form.email,
                            password: form.password,
                            remember: form.remember ? '1' : '0',
                        });
                        setToast({ tone: 'success', message: payload.message ?? (language === 'ar' ? 'تم تسجيل الدخول بنجاح.' : 'Signed in successfully.') });
                        const target = toAppPath(payload.redirect) || '/upload';
                        // استخدم إعادة تحميل كاملة لضمان تحديث جلسة Laravel وبيانات boot بدون انتظار إعادة الإقلاع داخل SPA
                        window.location.assign(target);
                    } catch (submissionError) {
                        setError(submissionError instanceof Error ? submissionError.message : language === 'ar' ? 'فشل تسجيل الدخول.' : 'Unable to sign in.');
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <InputField label={language === 'ar' ? 'البريد الإلكتروني' : 'Email address'} icon="user" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" required />
                <label className="block space-y-3">
                    <span className="text-sm font-semibold text-[var(--text-soft)]">{language === 'ar' ? 'كلمة المرور' : 'Password'}</span>
                    <div className="relative">
                        <input
                            className="input-shell ltr:pr-11 rtl:pl-11"
                            type={passwordVisible ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={form.password}
                            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setPasswordVisible((value) => !value)}
                            className="absolute inset-y-0 top-0 my-auto rounded-full text-[var(--text-muted)] transition hover:text-[var(--text)] ltr:right-4 rtl:left-4"
                        >
                            {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </label>
                <div className="flex items-center justify-between gap-4">
                    <label className="inline-flex items-center gap-3 text-sm text-[var(--text-soft)]">
                        <input type="checkbox" checked={form.remember} onChange={(event) => setForm((current) => ({ ...current, remember: event.target.checked }))} className="h-4 w-4 rounded border-[var(--line-strong)] bg-transparent text-[var(--primary)] focus:ring-[rgb(var(--primary-rgb)/0.35)]" />
                        {language === 'ar' ? 'تذكرني' : 'Remember me'}
                    </label>
                    <Link to="/forgot-password" className="text-sm font-semibold text-[var(--primary)] transition hover:text-[var(--primary-strong)]">
                        {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                    </Link>
                </div>
                {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
                <button disabled={busy} className="button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold disabled:opacity-60">
                    {busy ? <Sparkles className="h-4 w-4 animate-pulse" /> : <ShieldEllipsis className="h-4 w-4" />}
                    {busy ? (language === 'ar' ? 'جارٍ التحقق...' : 'Authenticating...') : language === 'ar' ? 'دخول آمن' : 'Secure sign in'}
                </button>
            </form>
            <p className="body-soft mt-6 text-sm">
                {language === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
                <Link to="/register" className="font-bold text-[var(--primary)]">
                    {language === 'ar' ? 'أنشئ حسابًا جديدًا' : 'Create one'}
                </Link>
            </p>
        </AuthShell>
    );
}

export function RegisterPage() {
    const { language, boot, setToast } = useAppContext();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<{ name: string; email: string; password: string; confirmPassword: string; preferred_language: Language }>({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        preferred_language: language,
    });

    return (
        <AuthShell
            title={language === 'ar' ? 'أنشئ حسابك للوصول إلى نظام التعلم العميق' : 'Create your account to access the deep learning system'}
            subtitle={language === 'ar' ? 'بمجرد إنشاء الحساب، يمكنك رفع العينات وتشغيل مسار التحليل ومراجعة السجل.' : 'Once your account is created, you can upload samples, run the inference pipeline, and review your history.'}
        >
            <PageHeader
                eyebrow="Register"
                title={language === 'ar' ? 'إنشاء حساب جديد' : 'Create account'}
                description={language === 'ar' ? 'املأ المعلومات الأساسية وسنجهز لك مساحة العمل فورًا.' : 'Fill in the essentials and your workspace will be ready instantly.'}
            />
            <form
                className="space-y-4"
                onSubmit={async (event) => {
                    event.preventDefault();
                    setBusy(true);
                    setError(null);

                    try {
                        const payload = await submitForm(boot.routes.register, boot.csrfToken, {
                            name: form.name,
                            email: form.email,
                            password: form.password,
                            password_confirmation: form.confirmPassword,
                            preferred_language: form.preferred_language,
                        });
                        setToast({ tone: 'success', message: payload.message ?? (language === 'ar' ? 'تم إنشاء الحساب بنجاح.' : 'Account created successfully.') });
                        const target = toAppPath(payload.redirect) || '/upload';
                        window.location.assign(target);
                    } catch (submissionError) {
                        setError(submissionError instanceof Error ? submissionError.message : language === 'ar' ? 'تعذر إنشاء الحساب.' : 'Unable to create account.');
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <InputField label={language === 'ar' ? 'الاسم الكامل' : 'Full name'} icon="user" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                <InputField label={language === 'ar' ? 'البريد الإلكتروني' : 'Email address'} icon="user" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
                <div className="grid gap-4 md:grid-cols-2">
                    <InputField label={language === 'ar' ? 'كلمة المرور' : 'Password'} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
                    <InputField label={language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password'} type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} required />
                </div>
                {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
                <button disabled={busy} className="button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold disabled:opacity-60">
                    {busy ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Star className="h-4 w-4" />}
                    {busy ? (language === 'ar' ? 'جارٍ إنشاء الحساب...' : 'Creating account...') : language === 'ar' ? 'إنشاء الحساب' : 'Create account'}
                </button>
            </form>
            <p className="body-soft mt-6 text-sm">
                {language === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                <Link to="/login" className="font-bold text-[var(--primary)]">
                    {language === 'ar' ? 'سجّل الدخول' : 'Sign in'}
                </Link>
            </p>
        </AuthShell>
    );
}

export function ForgotPasswordPage() {
    const { language, setToast } = useAppContext();
    const [email, setEmail] = useState('');

    return (
        <AuthShell
            title={language === 'ar' ? 'استعادة كلمة المرور' : 'Password recovery'}
            subtitle={language === 'ar' ? 'هذه الصفحة جاهزة للربط مع Laravel password broker لتفعيل الاسترجاع.' : 'This screen is ready to connect to Laravel password broker for real recovery.'}
        >
            <PageHeader
                eyebrow="Recovery"
                title={language === 'ar' ? 'استعادة كلمة المرور' : 'Password recovery'}
                description={language === 'ar' ? 'أدخل بريدك الإلكتروني وسنرسل لك خطوات إعادة التعيين عند تفعيل الربط النهائي.' : 'Enter your email and we will send the reset steps once backend wiring is enabled.'}
            />
            <form
                className="space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    setToast({
                        tone: 'info',
                        message:
                            language === 'ar'
                                ? 'الواجهة جاهزة. بقي فقط ربط password broker أو endpoint مخصص للإرسال.'
                                : 'The UI is ready. The remaining step is wiring a password broker or custom endpoint.',
                    });
                }}
            >
                <InputField label={language === 'ar' ? 'البريد الإلكتروني' : 'Email address'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                <button className="button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold">
                    <MoveRight className="h-4 w-4" />
                    {language === 'ar' ? 'معاينة إرسال رابط الاستعادة' : 'Preview recovery send state'}
                </button>
            </form>
        </AuthShell>
    );
}

export function ResetPasswordPage() {
    const { language, setToast } = useAppContext();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    return (
        <AuthShell
            title={language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset your password'}
            subtitle={language === 'ar' ? 'نموذج واضح لتلقي التوكن وإتمام تحديث كلمة المرور بأمان.' : 'A clean form to receive the token and securely finalize the password update.'}
        >
            <PageHeader
                eyebrow="Reset"
                title={language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset password'}
                description={language === 'ar' ? 'أدخل كلمة المرور الجديدة وأكّدها لإكمال العملية.' : 'Enter your new password and confirm it to complete the process.'}
            />
            <form
                className="space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    setToast({
                        tone: password && confirmPassword && password === confirmPassword ? 'success' : 'error',
                        message:
                            password && confirmPassword && password === confirmPassword
                                ? language === 'ar'
                                    ? 'الشكل النهائي جاهز. بقي فقط endpoint التحديث والتوكن.'
                                    : 'The final state is ready. Only the update endpoint and token remain.'
                                : language === 'ar'
                                  ? 'كلمتا المرور غير متطابقتين.'
                                  : 'Passwords do not match.',
                    });
                }}
            >
                <InputField label={language === 'ar' ? 'كلمة المرور الجديدة' : 'New password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <InputField label={language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password'} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                <button className="button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold">
                    <ShieldEllipsis className="h-4 w-4" />
                    {language === 'ar' ? 'معاينة حالة النجاح' : 'Preview success state'}
                </button>
            </form>
        </AuthShell>
    );
}

export function VerifyEmailPage() {
    const { language } = useAppContext();
    const featureCopy = useMemo<LocalizedText>(
        () => ({
            ar: 'تحقّق من بريدك الإلكتروني لتفعيل حسابك والوصول الكامل إلى نظام التحليل.',
            en: 'Verify your email to activate your account and gain full access to the inference system.',
        }),
        [],
    );

    return (
        <AuthShell
            title={language === 'ar' ? 'تأكيد البريد الإلكتروني' : 'Verify your email'}
            subtitle={language === 'ar' ? 'خطوة أمان أساسية قبل الوصول إلى محرّك التعلم العميق.' : 'A core security step before accessing the deep learning engine.'}
        >
            <PageHeader
                eyebrow="Verify"
                title={language === 'ar' ? 'تأكيد البريد الإلكتروني' : 'Verify your email'}
                description={copyFor(language, featureCopy)}
            />
            <SpotlightCard>
                <div className="w-fit rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
                    <ShieldEllipsis className="h-6 w-6 text-[var(--primary)]" />
                </div>
                <h3 className="mt-5 text-2xl font-bold">{language === 'ar' ? 'الحالة الحالية' : 'Current state'}</h3>
                <p className="body-soft mt-4 leading-8">
                    {language === 'ar'
                        ? 'الواجهة تدعم رسائل التأكيد، إعادة الإرسال، وتوضيح الخطوة التالية للمستخدم.'
                        : 'The interface supports verification messages, resend states, and clear next-step guidance.'}
                </p>
                <div className="mt-6">
                    <ConfidenceBar label={language === 'ar' ? 'جاهزية الحساب' : 'Account readiness'} value={97.2} />
                </div>
            </SpotlightCard>
        </AuthShell>
    );
}
