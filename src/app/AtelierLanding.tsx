'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  GripVertical,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

function EditableText({
  value,
  isBuilder,
  onCommit,
  as: Tag = 'span',
  className = '',
}: {
  value: string;
  isBuilder: boolean;
  onCommit: (nextVal: string) => void;
  as?: any;
  className?: string;
}) {
  if (!isBuilder) {
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const nextText = e.currentTarget.innerText.trim();
        if (nextText !== value) {
          onCommit(nextText);
        }
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter' && Tag !== 'p') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      title="Clic para editar texto directamente en el lienzo"
      className={`${className} outline-none rounded-[2px] transition-colors hover:ring-1 hover:ring-[#9E5936]/80 focus:ring-2 focus:ring-[#9E5936] focus:bg-[#9E5936]/10 px-0.5 -mx-0.5 cursor-text`}
    >
      {value}
    </Tag>
  );
}

/**
 * Bespoke SVG Mortise-and-Tenon Emblem (Ensamble de Caja y Espiga)
 * Used as fallback or inline architectural mark alongside global.logoUrl from CMS.
 */
function AtelierEmblem({
  dark = false,
  className = 'w-9 h-9',
}: {
  dark?: boolean;
  className?: string;
}) {
  const bg = dark ? '#F5F2EB' : '#171412';
  const beam = dark ? '#171412' : '#E8DFD1';
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={`${className} shrink-0`}
    >
      <rect width="64" height="64" fill={bg} />
      <path d="M14 12H26V52H14V12Z" fill={beam} />
      <path d="M26 24H50V36H26V24Z" fill="#A66A46" />
      <path d="M38 12H50V24H38V12ZM38 36H50V52H38V36Z" fill={beam} />
      <rect x="26" y="24" width="2" height="12" fill={bg} />
    </svg>
  );
}

export function ClientSiteRenderer({ projectSlug = '' }: { projectSlug?: string }) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === '1' || searchParams.get('preview') === 'true';
  const isBuilder = searchParams.get('builder') === '1';
  const focusSectionKey = searchParams.get('section') || '';

  const rootRef = useRef<HTMLDivElement | null>(null);
  const processRailRef = useRef<HTMLDivElement | null>(null);
  const woodPreviewRef = useRef<HTMLDivElement | null>(null);

  const [payload, setPayload] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Interactive Hero Atmosphere Crossfade
  const [heroSceneIdx, setHeroSceneIdx] = useState(0);

  // Interactive Expanding Strip (Band of Unequal Panels)
  const [activeStripIdx, setActiveStripIdx] = useState<number>(0);

  // Interactive Live Wood & Dimension Configurator ("The One Live Thing")
  const [activeWood, setActiveWood] = useState<'ligera' | 'media' | 'oscura'>('oscura');
  const [tableLengthCm, setTableLengthCm] = useState<220 | 260 | 320>(260);

  // Gallery Filter & Technical Spec Drawer
  const [woodFilter, setWoodFilter] = useState<string>('TODOS');
  const [selectedPiece, setSelectedPiece] = useState<any | null>(null);

  // Horizontal Process Rail Progress (0..1)
  const [railProgress, setRailProgress] = useState(0.2);

  // Drag & Drop state on canvas (for /portal Visual Builder)
  const [selectedKey, setSelectedKey] = useState<string>(focusSectionKey);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  // Lead Form State
  const [leadForm, setLeadForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    city: 'Bogotá D.C.',
    preferredWood: 'Nogal Negro Ahumado',
    message: '',
  });
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  const fetchContent = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/delivery/${projectSlug}${isPreview || isBuilder ? '?preview=1' : ''}`,
        { cache: 'no-store' },
      );
      if (res.ok) {
        const data = await res.json();
        setPayload(data);
      }
    } catch {
      // Fallback handled below
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectSlug) {
      setLoading(false);
      return;
    }
    fetchContent();
    if (!isPreview && !isBuilder) {
      fetch(`${API_BASE}/api/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectSlug, eventType: 'pageview' }),
      }).catch(() => {});
    }
  }, [projectSlug, isPreview, isBuilder]);

  useEffect(() => {
    if (focusSectionKey) {
      setSelectedKey(focusSectionKey);
    }
  }, [focusSectionKey]);

  // Listen for instant zero-latency updates from /portal parent window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'CMS_LIVE_PREVIEW_STATE') {
        setPayload((prev: any) => {
          if (!prev) return prev;
          const next = { ...prev };
          if (Array.isArray(msg.sectionsList)) {
            next.sectionsList = msg.sectionsList;
            const byKey: Record<string, any> = {};
            msg.sectionsList.forEach((s: any) => {
              if (s.isVisible !== false) {
                byKey[s.key] =
                  s.draftData && Object.keys(s.draftData).length > 0 ? s.draftData : s.data;
              }
            });
            next.sections = byKey;
          }
          if (msg.globalData) {
            next.global = { ...(next.global || {}), ...msg.globalData };
          }
          if (msg.navigationConfig) {
            next.navigation = msg.navigationConfig;
          }
          return next;
        });

        if (msg.selectedSectionKey) {
          setSelectedKey(msg.selectedSectionKey);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Slow Architectural Crossfade on Hero (every 5.8s unless reduced motion or builder)
  useEffect(() => {
    if (isBuilder) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const timer = setInterval(() => {
      if (!document.hidden) {
        setHeroSceneIdx((prev) => (prev + 1) % 3);
      }
    }, 5800);
    return () => clearInterval(timer);
  }, [isBuilder]);

  // Animate Wood Configurator card when user switches wood or dimension
  useEffect(() => {
    if (!woodPreviewRef.current) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    gsap.fromTo(
      woodPreviewRef.current,
      { opacity: 0.45, y: 10 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', overwrite: true },
    );
  }, [activeWood, tableLengthCm]);

  // Master GSAP + ScrollTrigger Choreography
  useGSAP(
    () => {
      if (loading || !payload) return;
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return;

      // 1. Hero Entrance Stagger
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      heroTl
        .fromTo(
          '.gsap-hero-reveal',
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.05, stagger: 0.1 },
        )
        .fromTo(
          '.gsap-hero-stage',
          { clipPath: 'inset(8% 4% 8% 4%)', opacity: 0.2 },
          { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 1.25, ease: 'power4.out' },
          '-=0.75',
        );

      // 2. Hero Scroll-Linked Image Parallax
      gsap.to('.gsap-hero-parallax', {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: {
          trigger: '.gsap-hero-stage',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });

      // 3. Staggered Section Entrances (Headings -> Copy -> Media)
      const sections = gsap.utils.toArray<HTMLElement>('.gsap-section-trigger');
      sections.forEach((sec) => {
        const items = sec.querySelectorAll('.gsap-fade-up');
        if (items.length > 0) {
          gsap.fromTo(
            items,
            { y: 32, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.9,
              stagger: 0.08,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: sec,
                start: 'top 84%',
                toggleActions: 'play none none none',
              },
            },
          );
        }
      });

      // 4. Asymmetric Gallery Differential Parallax
      const offsetCards = gsap.utils.toArray<HTMLElement>('.gsap-gallery-offset');
      offsetCards.forEach((card) => {
        gsap.fromTo(
          card,
          { y: 28 },
          {
            y: -28,
            ease: 'none',
            scrollTrigger: {
              trigger: card,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6,
            },
          },
        );
      });

      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 250);
    },
    { dependencies: [loading, payload?.project?.id, woodFilter], scope: rootRef },
  );

  const emitCanvasAction = (action: string, data: Record<string, any> = {}) => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'CMS_CANVAS_ACTION',
          action,
          ...data,
        },
        '*',
      );
    }
  };

  const trackClick = (eventType: 'whatsapp_click' | 'cta_click') => {
    if (isPreview || isBuilder || !projectSlug) return;
    fetch(`${API_BASE}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectSlug, eventType }),
    }).catch(() => {});
  };

  const global = payload?.global || {
    brandName: 'Atelier · Madera & Materia',
    brandMonogram: 'Ebanistería arquitectónica en madera maciza',
    logoUrl: '/atelier-logo.svg',
    logoLightUrl: '/atelier-logo-light.svg',
    faviconUrl: '/atelier-favicon.svg',
    announcementText:
      'Ebanistería bajo pedido en Bogotá · Envíos asegurados en guante blanco a toda Colombia',
    whatsappNumber: '+573148901234',
    whatsappPrefill:
      'Hola Atelier, me gustaría cotizar una pieza de mobiliario en madera maciza.',
    primaryColor: '#9E5936',
    espressoColor: '#171412',
    footerAddress: 'Calle 79B # 7-45, El Nogal · Bogotá D.C.',
    footerHours: 'Lunes a Sábado · 10:00 a.m. a 7:00 p.m.',
  };

  const navigation = payload?.navigation || {
    headerCtaText: 'Encargar pieza',
    headerCtaHref: '#cotizar',
    headerLinks: [
      { id: 'nav-1', label: 'El oficio', href: '#oficio', isVisible: true },
      { id: 'nav-2', label: 'Maderas y medidas', href: '#maderas', isVisible: true },
      { id: 'nav-3', label: 'Colección', href: '#coleccion', isVisible: true },
      { id: 'nav-4', label: 'Proceso', href: '#proceso', isVisible: true },
      { id: 'nav-5', label: 'Showrooms', href: '#espacios', isVisible: true },
      { id: 'nav-6', label: 'A medida', href: '#cotizar', isVisible: true },
    ],
    promoBanner: {
      enabled: false,
      title: 'Colección Monolito 2026',
      description:
        'Agenda cita privada en nuestro taller de Bogotá para elegir personalmente los tablones de tu comedor.',
      ctaText: 'Agendar visita',
      ctaHref: '#cotizar',
    },
  };

  const orderedSections: any[] = useMemo(() => {
    if (Array.isArray(payload?.sectionsList) && payload.sectionsList.length > 0) {
      return payload.sectionsList.filter((s: any) => s.isVisible !== false);
    }
    const secMap = payload?.sections || {};
    return Object.entries(secMap).map(([key, data], idx) => ({
      id: `sec-${key}`,
      key,
      name: key.toUpperCase(),
      order: idx,
      isVisible: true,
      data,
    }));
  }, [payload]);

  const piecesCollection: any[] =
    payload?.collections?.['piezas-mobiliario'] ||
    payload?.collections?.['cafes-de-origen'] ||
    [];

  const spacesCollection: any[] =
    payload?.collections?.['espacios-atelier'] ||
    payload?.collections?.['tiendas-experiencia'] ||
    [];

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    piecesCollection.forEach((p: any) => {
      if (p.category) set.add(p.category);
      else if (p.wood) set.add(p.wood);
    });
    return ['TODOS', ...Array.from(set)];
  }, [piecesCollection]);

  const filteredPieces = useMemo(() => {
    if (woodFilter === 'TODOS') return piecesCollection;
    return piecesCollection.filter(
      (item: any) =>
        (item.category || '').toLowerCase() === woodFilter.toLowerCase() ||
        (item.wood || '').toLowerCase().includes(woodFilter.toLowerCase()),
    );
  }, [piecesCollection, woodFilter]);

  const whatsappUrl = `https://wa.me/${(global.whatsappNumber || '+573148901234').replace(
    /[^0-9]/g,
    '',
  )}?text=${encodeURIComponent(
    global.whatsappPrefill ||
      'Hola Atelier, deseo cotizar una pieza de mobiliario en madera maciza.',
  )}`;

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLead(true);
    setLeadError(null);
    try {
      const res = await fetch(`${API_BASE}/api/leads/submit/${projectSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: leadForm.fullName,
          email: leadForm.email,
          phone: leadForm.phone,
          company: leadForm.company,
          subject: `Proyecto en ${leadForm.preferredWood} (${leadForm.city})`,
          message: leadForm.message || `Interesado en mobiliario en ${leadForm.preferredWood}.`,
          sourceSection: 'cotizacion_medida',
          metadata: {
            city: leadForm.city,
            preferredWood: leadForm.preferredWood,
            configuredLengthCm: tableLengthCm,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'No se pudo enviar la solicitud');
      }
      setLeadSubmitted(true);
    } catch (err: any) {
      setLeadError(err.message || 'Error al registrar tu solicitud');
    } finally {
      setSubmittingLead(false);
    }
  };

  const scrollProcessRail = (dir: 'prev' | 'next') => {
    const el = processRailRef.current;
    if (!el) return;
    const step = 380;
    const target = dir === 'next' ? el.scrollLeft + step : el.scrollLeft - step;
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-[100svh] bg-[#F5F2EB] text-[#171412] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm tracking-wide text-[#5C5349]">
          <AtelierEmblem className="w-7 h-7" />
          <span>Cargando Atelier · Madera &amp; Materia...</span>
        </div>
      </div>
    );
  }

  if (!payload || !payload.project) {
    return (
      <div className="min-h-[100svh] bg-[#F5F2EB] text-[#171412] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#FCFBF8] p-10 text-center space-y-4">
          <div className="text-xs text-[#6E6359]">Sitio no disponible</div>
          <h1 className="font-serif text-2xl font-normal text-[#171412]">
            No encontramos el proyecto &ldquo;{projectSlug}&rdquo;
          </h1>
          <p className="text-xs text-[#6E6359] leading-relaxed">
            Verifica que el identificador del proyecto exista en el panel de administración.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 h-10 px-5 bg-[#171412] text-[#F5F2EB] text-xs font-medium"
            >
              <span>Ir al acceso administrativo</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const renderSectionContent = (sec: any) => {
    const key = sec.key;
    const data =
      sec.draftData && Object.keys(sec.draftData).length > 0 ? sec.draftData : sec.data || {};
    const style = data._style || {};
    const widgets: any[] = Array.isArray(data.widgets) ? data.widgets : [];

    const commitField = (fieldKey: string, value: any) => {
      emitCanvasAction('INLINE_FIELD_CHANGE', {
        sectionId: sec.id,
        sectionKey: sec.key,
        fieldKey,
        value,
      });
    };

    const renderModularWidgetsGrid = () => {
      if (widgets.length === 0) return null;
      const cols = Number(data.columnsCount || 3);
      const gridClass =
        cols === 1
          ? 'grid-cols-1'
          : cols === 2
          ? 'grid-cols-1 md:grid-cols-2'
          : cols === 4
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          : 'grid-cols-1 md:grid-cols-3';

      return (
        <div className={`grid ${gridClass} gap-6 pt-10`}>
          {widgets.map((w: any, wIdx: number) => {
            const spanClass =
              Number(w.colSpan) === 3
                ? 'md:col-span-3'
                : Number(w.colSpan) === 2
                ? 'md:col-span-2'
                : '';

            return (
              <div
                key={w.id || wIdx}
                style={{
                  backgroundColor: w.cardBg || '#FCFBF8',
                  color: w.cardText || '#171412',
                }}
                className={`gsap-fade-up p-8 flex flex-col justify-between transition-colors ${spanClass}`}
              >
                <div className="space-y-4">
                  {w.imageUrl ? (
                    <div className="aspect-[16/10] overflow-hidden bg-[#EAE4D8] mb-4">
                      <img
                        src={w.imageUrl}
                        alt={w.title || 'Fotografía'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : null}

                  {w.badge ? (
                    <div className="text-[13px] font-medium opacity-70">{w.badge}</div>
                  ) : null}

                  {w.metric ? (
                    <div className="font-serif text-3xl sm:text-4xl font-normal tracking-tight tabular-nums">
                      {w.metric}
                    </div>
                  ) : null}

                  {w.title ? (
                    <h3 className="font-serif text-2xl font-normal leading-snug">{w.title}</h3>
                  ) : null}

                  {w.body ? (
                    <p className="text-[15px] opacity-80 leading-relaxed">{w.body}</p>
                  ) : null}
                </div>

                {w.ctaText ? (
                  <div className="pt-6 mt-6">
                    <a
                      href={w.ctaHref || '#cotizar'}
                      className="inline-flex items-center gap-2 text-[13px] font-medium hover:opacity-75 transition-opacity"
                    >
                      <span>{w.ctaText}</span>
                      <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
                    </a>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    };

    // =========================================================================
    // 1. HERO ARQUITECTÓNICO (Curtain Reveal + Parallax + Slow Crossfade)
    // =========================================================================
    if (key === 'hero') {
      const heroScenes = [
        {
          url:
            data.heroImage ||
            'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=85',
          title: data.featuredTitle || 'Mesa de Comedor Monolito · 320 × 110 cm',
          label: data.featuredLabel || 'Obra residencial · Casa Rosales, Bogotá',
          meta:
            data.featuredMeta ||
            'Nogal negro secado al 8% · Ensamble ciego sin herrajes · Acabado al aceite-cera',
        },
        {
          url:
            data.heroImageAlt2 ||
            'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2000&q=85',
          title: 'Credenza Arquitectónica Bóveda · 210 × 46 cm',
          label: 'Sala de música · El Retiro, Antioquia',
          meta: 'Roble blanco alisado con frente alistonado continuo y herrajes ocultos',
        },
        {
          url:
            data.heroImageAlt3 ||
            'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=2000&q=85',
          title: 'Poltrona Baja Calma & Mesa Travertino',
          label: 'Showroom Principal · Barrio El Nogal, Bogotá',
          meta: 'Teca certificada FSC torneada a mano y lino belga sin teñir',
        },
      ];
      const currentScene = heroScenes[heroSceneIdx] || heroScenes[0];

      return (
        <div
          style={{
            backgroundColor: style.backgroundColor || '#F5F2EB',
            color: style.textColor || '#171412',
          }}
          className="pt-10 pb-20 lg:pt-16 lg:pb-28 px-5 sm:px-10 lg:px-14"
        >
          <div className="max-w-[1440px] mx-auto">
            {/* Upper Architectural 12-Col Grid: Giant 2-Line Headline + Corner Spec */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end pb-10 lg:pb-14">
              <div className="lg:col-span-8 space-y-5">
                <div className="gsap-hero-reveal text-[14px] text-[#6E6359]">
                  <EditableText
                    value={
                      data.badgeText || 'Taller de Ebanistería Arquitectónica · Bogotá D.C.'
                    }
                    isBuilder={isBuilder}
                    onCommit={(v) => commitField('badgeText', v)}
                  />
                </div>

                <EditableText
                  as="h1"
                  value={
                    data.headline || 'Madera maciza esculpida para habitar el tiempo.'
                  }
                  isBuilder={isBuilder}
                  onCommit={(v) => commitField('headline', v)}
                  className="gsap-hero-reveal font-serif text-[clamp(2.5rem,5.6vw,5.4rem)] font-normal tracking-[-0.025em] leading-[0.98] text-[#171412] max-w-[18ch]"
                />
              </div>

              <div className="lg:col-span-4 space-y-6 lg: pb-1">
                <EditableText
                  as="p"
                  value={
                    data.subheadline ||
                    'Diseñamos y construimos comedores monolíticos, credenzas y mobiliario de autor en roble, nogal y teca certificada. Ensambles de caja y espiga hechos a mano bajo pedido.'
                  }
                  isBuilder={isBuilder}
                  onCommit={(v) => commitField('subheadline', v)}
                  className="gsap-hero-reveal text-[16px] text-[#3F3831] leading-[1.55]"
                />

                <div className="gsap-hero-reveal flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href={data.ctaHref || '#coleccion'}
                    onClick={() => trackClick('cta_click')}
                    style={{ backgroundColor: global.espressoColor || '#171412' }}
                    className="h-12 px-7 text-[#F5F2EB] text-[14px] font-medium inline-flex items-center gap-2.5 hover:opacity-90 transition-opacity"
                  >
                    <EditableText
                      value={data.ctaText || 'Explorar colección'}
                      isBuilder={isBuilder}
                      onCommit={(v) => commitField('ctaText', v)}
                    />
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </a>

                  <a
                    href="#maderas"
                    className="h-12 px-6 bg-[#EAE4D8] hover:bg-[#DFD7C8] text-[#171412] text-[14px] font-medium inline-flex items-center transition-colors"
                  >
                    <EditableText
                      value={data.secondaryCtaText || 'Configurar mesa a medida'}
                      isBuilder={isBuilder}
                      onCommit={(v) => commitField('secondaryCtaText', v)}
                    />
                  </a>
                </div>
              </div>
            </div>

            {/* Full-Width Architectural Stage with GSAP Parallax & Slow Crossfade */}
            <div className="gsap-hero-stage relative w-full h-[58svh] sm:h-[68svh] lg:h-[76svh] overflow-hidden bg-[#171412]">
              {heroScenes.map((scene, idx) => (
                <img
                  key={scene.url + idx}
                  src={scene.url}
                  alt={scene.title}
                  width={2000}
                  height={1200}
                  className={`gsap-hero-parallax absolute inset-0 w-full h-[116%] -top-[8%] object-cover transition-opacity duration-[1500ms] ease-out ${
                    heroSceneIdx === idx ? 'opacity-95' : 'opacity-0 pointer-events-none'
                  }`}
                />
              ))}

              {/* Subtle neutral corner scrim for caption legibility */}
              <div className="absolute inset-0 bg-[#171412]/25 pointer-events-none" />

              {/* Bottom-left architectural plate caption */}
              <div className="absolute bottom-5 left-5 sm:bottom-8 sm:left-8 right-5 sm:right-auto max-w-md bg-[#F5F2EB] text-[#171412] p-5 sm:p-6">
                <div className="text-[13px] text-[#6E6359]">
                  {heroSceneIdx === 0 ? (
                    <EditableText
                      value={currentScene.label}
                      isBuilder={isBuilder}
                      onCommit={(v) => commitField('featuredLabel', v)}
                    />
                  ) : (
                    currentScene.label
                  )}
                </div>
                <div className="font-serif text-xl sm:text-2xl font-normal text-[#171412] mt-1">
                  {heroSceneIdx === 0 ? (
                    <EditableText
                      value={currentScene.title}
                      isBuilder={isBuilder}
                      onCommit={(v) => commitField('featuredTitle', v)}
                    />
                  ) : (
                    currentScene.title
                  )}
                </div>
                <div className="text-[13px] text-[#4A423B] mt-1.5 leading-snug">
                  {heroSceneIdx === 0 ? (
                    <EditableText
                      value={currentScene.meta}
                      isBuilder={isBuilder}
                      onCommit={(v) => commitField('featuredMeta', v)}
                    />
                  ) : (
                    currentScene.meta
                  )}
                </div>
              </div>

              {/* Bottom-right scene selector buttons */}
              <div className="hidden sm:flex items-center gap-1.5 absolute bottom-8 right-8 bg-[#171412]/85 p-1.5">
                {['Comedor Monolito', 'Credenza Bóveda', 'Showroom El Nogal'].map(
                  (label, idx) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setHeroSceneIdx(idx)}
                      className={`h-9 px-3.5 text-[12px] font-medium transition-colors ${
                        heroSceneIdx === idx
                          ? 'bg-[#F5F2EB] text-[#171412]'
                          : 'text-[#E8DFD1]/80 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>

            {renderModularWidgetsGrid()}
          </div>
        </div>
      );
    }

    // =========================================================================
    // 2. EL OFICIO — BAND OF UNEQUAL PANELS (Blueprint: showcase strip)
    // =========================================================================
    if (key === 'propuesta_valor') {
      const panels = [
        {
          title: data.metric1Value || '100% Maciza',
          desc:
            data.metric1Label ||
            'Tablones continuos de 45 mm de espesor seleccionados por veta y densidad.',
          img:
            data.panel1Image ||
            'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=1200&q=85',
          valKey: 'metric1Value',
          lblKey: 'metric1Label',
          baseGrow: 'lg:flex-[5]',
        },
        {
          title: data.metric2Value || '8% Humedad',
          desc:
            data.metric2Label ||
            'Secado técnico en cámara durante 90 días para evitar alabeos o fisuras.',
          img:
            data.panel2Image ||
            'https://images.unsplash.com/photo-1581539250439-c96689b516dd?auto=format&fit=crop&w=1200&q=85',
          valKey: 'metric2Value',
          lblKey: 'metric2Label',
          baseGrow: 'lg:flex-[2.5]',
        },
        {
          title: data.metric3Value || 'Caja y Espiga',
          desc:
            data.metric3Label ||
            'Uniones estructurales talladas en madera maciza sin tornillería vista.',
          img:
            data.panel3Image ||
            'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1200&q=85',
          valKey: 'metric3Value',
          lblKey: 'metric3Label',
          baseGrow: 'lg:flex-[3]',
        },
        {
          title: data.metric4Value || 'Poro Abierto',
          desc:
            data.metric4Label ||
            'Ceras vegetales y aceites puros que protegen sin plastificar la madera.',
          img:
            data.panel4Image ||
            'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=1200&q=85',
          valKey: 'metric4Value',
          lblKey: 'metric4Label',
          baseGrow: 'lg:flex-[2.5]',
        },
      ];

      return (
        <div
          id="oficio"
          style={{
            backgroundColor: style.backgroundColor || '#EAE4D8',
            color: style.textColor || '#171412',
          }}
          className="gsap-section-trigger py-24 lg:py-36"
        >
          <div className="max-w-[1440px] mx-auto px-5 sm:px-10 lg:px-14 mb-14 lg:mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
              <div className="lg:col-span-7 space-y-4">
                <div className="gsap-fade-up text-[14px] text-[#6E6359]">
                  <EditableText
                    value={data.eyebrow || 'Principios constructivos'}
                    isBuilder={isBuilder}
                    onCommit={(v) => commitField('eyebrow', v)}
                  />
                </div>
                <EditableText
                  as="h2"
                  value={
                    data.heading || 'Sin aglomerados, sin enchapes, sin atajos.'
                  }
                  isBuilder={isBuilder}
                  onCommit={(v) => commitField('heading', v)}
                  className="gsap-fade-up font-serif text-[clamp(2.1rem,4.2vw,3.8rem)] font-normal tracking-[-0.02em] leading-[1.04] max-w-[18ch]"
                />
              </div>

              <div className="lg:col-span-5">
                <EditableText
                  as="p"
                  value={
                    data.subheading ||
                    'Rechazamos la carpintería industrial desechable. Seleccionamos tablones enteros de aserraderos certificados y respetamos el movimiento natural de la fibra mediante ensambles mecánicos tradicionales.'
                  }
                  isBuilder={isBuilder}
                  onCommit={(v) => commitField('subheading', v)}
                  className="gsap-fade-up text-[16px] text-[#3F3831] leading-[1.6]"
                />
              </div>
            </div>
          </div>

          {/* Full-Bleed Band of Unequal Panels (66svh on Desktop) */}
          <div className="gsap-fade-up w-full h-auto lg:h-[64svh] flex flex-col lg:flex-row overflow-hidden bg-[#171412]">
            {panels.map((panel, idx) => {
              const isExpanded = activeStripIdx === idx;
              return (
                <div
                  key={panel.valKey}
                  onMouseEnter={() => setActiveStripIdx(idx)}
                  onClick={() => setActiveStripIdx(idx)}
                  className={`relative min-h-[280px] lg:min-h-0 overflow-hidden cursor-pointer transition-[flex-grow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isExpanded ? 'lg:flex-[6]' : 'lg:flex-[2]'
                  }`}
                >
                  <img
                    src={panel.img}
                    alt={panel.title}
                    width={1200}
                    height={900}
                    loading="lazy"
                    className={`w-full h-full object-cover transition-transform duration-700 ${
                      isExpanded ? 'scale-100 brightness-90' : 'scale-105 brightness-60'
                    }`}
                  />
                  <div className="absolute inset-0 bg-[#171412]/35 pointer-events-none" />

                  <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between text-[#F5F2EB]">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-[#171412]/80 text-[13px] font-medium">
                        <EditableText
                          value={panel.title}
                          isBuilder={isBuilder}
                          onCommit={(v) => commitField(panel.valKey, v)}
                        />
                      </span>
                    </div>

                    <div
                      className={`max-w-md bg-[#171412]/85 p-5 transition-opacity duration-300 ${
                        isExpanded ? 'opacity-100' : 'opacity-90 lg:opacity-75'
                      }`}
                    >
                      <p className="text-[15px] text-[#F5F2EB] leading-relaxed">
                        <EditableText
                          value={panel.desc}
                          isBuilder={isBuilder}
                          onCommit={(v) => commitField(panel.lblKey, v)}
                        />
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="max-w-[1440px] mx-auto px-5 sm:px-10 lg:px-14">
            {renderModularWidgetsGrid()}
          </div>
        </div>
      );
    }

    // =========================================================================
    // 3. CONFIGURADOR EN VIVO DE MADERAS Y ESCALA ("THE ONE LIVE THING")
    // =========================================================================
    if (key === 'muestrario_maderas' || key === 'laboratorio_tostion') {
      const woods = {
        ligera: {
          name: data.wood1Name || 'Roble Blanco Alisado',
          origin: data.wood1Origin || 'Cordillera Oriental · Densidad 740 kg/m³ · Secado 8%',
          tone:
            data.wood1Tone ||
            'Veta recta y luminosa con matices arena, trigo y miel pálida. Aporta serenidad arquitectónica y amplitud visual en comedores y bibliotecas de luz natural.',
          finish: data.wood1Finish || 'Aceite-cera mate natural de poro abierto',
          image:
            data.wood1Image ||
            'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1400&q=85',
          swatch: '#D8C5A8',
          beamFill: '#CBB38E',
          densityKgM3: 740,
          nameKey: 'wood1Name',
          originKey: 'wood1Origin',
          toneKey: 'wood1Tone',
          finishKey: 'wood1Finish',
        },
        media: {
          name: data.wood2Name || 'Teca Dorada Certificada',
          origin: data.wood2Origin || 'Magdalena Medio · Plantación FSC · Densidad 680 kg/m³',
          tone:
            data.wood2Tone ||
            'Rica en aceites naturales con transiciones cálidas entre ámbar, tabaco suave y bronce. Extraordinaria resistencia a la humedad tanto en interiores como en terrazas cubiertas.',
          finish: data.wood2Finish || 'Aceite de tung puro frotado a mano en cuatro capas',
          image:
            data.wood2Image ||
            'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1400&q=85',
          swatch: '#9E6B43',
          beamFill: '#94623B',
          densityKgM3: 680,
          nameKey: 'wood2Name',
          originKey: 'wood2Origin',
          toneKey: 'wood2Tone',
          finishKey: 'wood2Finish',
        },
        oscura: {
          name: data.wood3Name || 'Nogal Negro Ahumado',
          origin: data.wood3Origin || 'Bosques Andinos · Selección Especial · Densidad 660 kg/m³',
          tone:
            data.wood3Tone ||
            'Profundidad dramática en tonos chocolate amargo, grafito cálido y vetas flameadas. La elección predilecta para mesas escultóricas de gran formato y estudios de autor.',
          finish: data.wood3Finish || 'Cera de abejas orgánica y aceite danés satinado',
          image:
            data.wood3Image ||
            'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=1400&q=85',
          swatch: '#3D2B22',
          beamFill: '#4A352A',
          densityKgM3: 660,
          nameKey: 'wood3Name',
          originKey: 'wood3Origin',
          toneKey: 'wood3Tone',
          finishKey: 'wood3Finish',
        },
      };

      const currentWood = woods[activeWood];
      const seatsLabel =
        tableLengthCm === 220
          ? '6 a 8 puestos'
          : tableLengthCm === 260
          ? '8 a 10 puestos'
          : '10 a 12 puestos';
      const widthCm = tableLengthCm === 220 ? 100 : tableLengthCm === 260 ? 108 : 115;
      const estimatedWeightKg = Math.round(
        (tableLengthCm / 100) * (widthCm / 100) * 0.045 * currentWood.densityKgM3 * 1.35,
      );
      const svgWidthPx = tableLengthCm === 220 ? 220 : tableLengthCm === 260 ? 270 : 330;

      return (
        <div
          id="maderas"
          style={{
            backgroundColor: style.backgroundColor || '#F5F2EB',
            color: style.textColor || '#171412',
          }}
          className="gsap-section-trigger py-24 lg:py-36 px-5 sm:px-10 lg:px-14"
        >
          <div className="max-w-[1440px] mx-auto space-y-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
              <div className="lg:col-span-7 space-y-3">
                <div className="gsap-fade-up text-[14px] text-[#6E6359]">
                  <EditableText
                    value={data.eyebrow || 'Muestrario interactivo de materia prima'}
                    isBuilder={isBuilder}
                    onCommit={(v) => commitField('eyebrow', v)}
                  />
                </div>
                <EditableText
                  as="h2"
                  value={data.heading || 'Elige la madera y la escala de tu pieza.'}
                  isBuilder={isBuilder}
                  onCommit={(v) => commitField('heading', v)}
                  className="gsap-fade-up font-serif text-[clamp(2.1rem,4.2vw,3.8rem)] font-normal tracking-[-0.02em] leading-[1.04] max-w-[18ch]"
                />
              </div>
              <div className="lg:col-span-5">
                <EditableText
                  as="p"
                  value={
                    data.subheading ||
                    'Cada árbol posee una densidad, veta y respuesta lumínica irrepetible. Explora nuestras tres maderas de colección y simula las proporciones para tu espacio.'
                  }
                  isBuilder={isBuilder}
                  onCommit={(v) => commitField('subheading', v)}
                  className="gsap-fade-up text-[16px] text-[#3F3831] leading-[1.6]"
                />
              </div>
            </div>

            {/* Interactive Controls Row: Wood Species + Table Scale */}
            <div className="gsap-fade-up grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#EAE4D8] p-5 sm:p-7">
              <div className="lg:col-span-7 space-y-2.5">
                <div className="text-[13px] font-medium text-[#4A423B]">
                  Especie de madera maciza certificada
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(['ligera', 'media', 'oscura'] as const).map((keyId) => {
                    const item = woods[keyId];
                    const isSelected = activeWood === keyId;
                    return (
                      <button
                        key={keyId}
                        type="button"
                        onClick={() => setActiveWood(keyId)}
                        className={`h-12 px-4 text-left flex items-center gap-3 transition-colors ${
                          isSelected
                            ? 'bg-[#171412] text-[#F5F2EB]'
                            : 'bg-[#F5F2EB] text-[#171412] hover:bg-[#FCFBF8]'
                        }`}
                      >
                        <span
                          className="w-4 h-4 shrink-0"
                          style={{ backgroundColor: item.swatch }}
                        />
                        <span className="text-[13px] font-medium truncate">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-2.5">
                <div className="text-[13px] font-medium text-[#4A423B]">
                  Escala arquitectónica del sobre (Largo)
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {([220, 260, 320] as const).map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setTableLengthCm(len)}
                      className={`h-12 px-3 text-[13px] font-medium tabular-nums transition-colors ${
                        tableLengthCm === len
                          ? 'bg-[#9E5936] text-[#F5F2EB]'
                          : 'bg-[#F5F2EB] text-[#171412] hover:bg-[#FCFBF8]'
                      }`}
                    >
                      {len} cm
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Configurator Stage */}
            <div
              ref={woodPreviewRef}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch bg-[#FCFBF8] p-6 sm:p-10 lg:p-12"
            >
              <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2.5 px-3 py-1 bg-[#EAE4D8] text-[#171412] text-[13px]">
                    <span
                      className="w-3 h-3"
                      style={{ backgroundColor: currentWood.swatch }}
                    />
                    <EditableText
                      value={currentWood.origin}
                      isBuilder={isBuilder}
                      onCommit={(v) => commitField(currentWood.originKey, v)}
                    />
                  </div>

                  <EditableText
                    as="h3"
                    value={currentWood.name}
                    isBuilder={isBuilder}
                    onCommit={(v) => commitField(currentWood.nameKey, v)}
                    className="font-serif text-3xl sm:text-4xl font-normal text-[#171412] tracking-tight"
                  />

                  <EditableText
                    as="p"
                    value={currentWood.tone}
                    isBuilder={isBuilder}
                    onCommit={(v) => commitField(currentWood.toneKey, v)}
                    className="text-[16px] text-[#3F3831] leading-[1.6]"
                  />
                </div>

                {/* Live Orthographic Proportion Drawing */}
                <div className="bg-[#F5F2EB] p-6 space-y-4">
                  <div className="flex items-center justify-between text-[13px] text-[#5C5349]">
                    <span>Plano proporcional en vivo · Espesor 45 mm</span>
                    <span className="font-medium text-[#171412] tabular-nums">
                      {tableLengthCm} × {widthCm} × 76 cm ({seatsLabel})
                    </span>
                  </div>

                  <div className="h-28 flex items-center justify-center overflow-hidden">
                    <svg
                      viewBox="0 0 380 100"
                      className="w-full max-w-[380px] h-24"
                      aria-label="Diagrama ortogonal de mesa en madera maciza"
                    >
                      {/* Top slab */}
                      <rect
                        x={(380 - svgWidthPx) / 2}
                        y="22"
                        width={svgWidthPx}
                        height="12"
                        fill={currentWood.beamFill}
                        className="transition-[x,width,fill] duration-500"
                      />
                      {/* Left architectural trestle leg */}
                      <rect
                        x={(380 - svgWidthPx) / 2 + 28}
                        y="34"
                        width="16"
                        height="52"
                        fill={currentWood.swatch}
                        className="transition-[x,fill] duration-500"
                      />
                      {/* Right architectural trestle leg */}
                      <rect
                        x={(380 + svgWidthPx) / 2 - 44}
                        y="34"
                        width="16"
                        height="52"
                        fill={currentWood.swatch}
                        className="transition-[x,fill] duration-500"
                      />
                      {/* Stretcher beam */}
                      <rect
                        x={(380 - svgWidthPx) / 2 + 44}
                        y="56"
                        width={svgWidthPx - 88}
                        height="7"
                        fill="#171412"
                        opacity="0.75"
                        className="transition-[x,width] duration-500"
                      />
                    </svg>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2 text-[13px]">
                    <div>
                      <div className="text-[#6E6359]">Capacidad</div>
                      <div className="font-medium text-[#171412] mt-0.5">{seatsLabel}</div>
                    </div>
                    <div>
                      <div className="text-[#6E6359]">Peso macizo est.</div>
                      <div className="font-medium text-[#171412] tabular-nums mt-0.5">
                        ~{estimatedWeightKg} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[#6E6359]">Acabado</div>
                      <div className="font-medium text-[#171412] truncate mt-0.5">
                        <EditableText
                          value={currentWood.finish}
                          isBuilder={isBuilder}
                          onCommit={(v) => commitField(currentWood.finishKey, v)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <a
                    href="#cotizar"
                    onClick={() => {
                      setLeadForm((prev) => ({
                        ...prev,
                        preferredWood: currentWood.name,
                        message: `Deseo cotizar una pieza en ${currentWood.name} en formato ${tableLengthCm} × ${widthCm} cm (${seatsLabel}).`,
                      }));
                    }}
                    className="h-12 px-7 bg-[#171412] text-[#F5F2EB] text-[14px] font-medium inline-flex items-center gap-2.5 hover:bg-[#2B2521] transition-colors"
                  >
                    <span>
                      Solicitar muestras y cotización ({tableLengthCm} cm)
                    </span>
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-full min-h-[340px] lg:min-h-[480px] overflow-hidden bg-[#EAE4D8]">
                  <img
                    src={currentWood.image}
                    alt={currentWood.name}
                    width={1200}
                    height={900}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            {renderModularWidgetsGrid()}
          </div>
        </div>
      );
    }

    // =========================================================================
    // 4. COLECCIÓN ASIMÉTRICA — PHOTOGRAPHS AT UNEVEN SIZES (Blueprint: work)
    // =========================================================================
    if (key === 'coleccion_destacada' || key === 'coleccion_origen') {
      // Repeatable uneven placement pattern on the 12-column architectural grid
      const placementClasses = [
        'lg:col-span-7 aspect-[16/10]',
        'lg:col-span-5 aspect-[4/5] lg:mt-20 gsap-gallery-offset',
        'lg:col-span-5 aspect-[1/1]',
        'lg:col-span-7 aspect-[16/10] lg:mt-14 gsap-gallery-offset',
        'lg:col-span-6 aspect-[4/5]',
        'lg:col-span-6 aspect-[3/2] lg:mt-16 gsap-gallery-offset',
      ];

      return (
        <div
          id="coleccion"
          style={{
            backgroundColor: style.backgroundColor || '#F5F2EB',
            color: style.textColor || '#171412',
          }}
          className="gsap-section-trigger py-24 lg:py-36 px-5 sm:px-10 lg:px-14"
        >
          <div className="max-w-[1440px] mx-auto space-y-16">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="space-y-3 max-w-2xl">
                <div className="gsap-fade-up text-[14px] text-[#6E6359]">
                  <EditableText
                    value={data.eyebrow || 'Colección permanente 2026'}
                    isBuilder={isBuilder}
                    onCommit={(v) => commitField('eyebrow', v)}
                  />
                </div>
                <EditableText
                  as="h2"
                  value={
                    data.heading || 'Piezas numeradas de factura arquitectónica.'
                  }
                  isBuilder={isBuilder}
                  onCommit={(v) => commitField('heading', v)}
                  className="gsap-fade-up font-serif text-[clamp(2.1rem,4.2vw,3.8rem)] font-normal tracking-[-0.02em] leading-[1.04] max-w-[18ch]"
                />
                <EditableText
                  as="p"
                  value={
                    data.subheading ||
                    'Cada pieza se construye bajo pedido en nuestro taller de Bogotá y puede ajustarse en largo, ancho y especie de madera según los planos de tu espacio.'
                  }
                  isBuilder={isBuilder}
                  onCommit={(v) => commitField('subheading', v)}
                  className="gsap-fade-up text-[16px] text-[#3F3831] leading-relaxed pt-1"
                />
              </div>

              {/* Filter by Category / Wood */}
              <div className="gsap-fade-up flex flex-wrap gap-2">
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setWoodFilter(cat)}
                    className={`h-10 px-4 text-[13px] font-medium transition-colors ${
                      woodFilter === cat
                        ? 'bg-[#171412] text-[#F5F2EB]'
                        : 'bg-[#EAE4D8] text-[#3F3831] hover:bg-[#DFD7C8]'
                    }`}
                  >
                    {cat === 'TODOS' ? 'Todas las piezas' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Uneven Gallery Wall on 12-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-16 lg:gap-x-12 lg:gap-y-24 items-start">
              {filteredPieces.map((piece: any, idx: number) => {
                const layoutSlot = placementClasses[idx % placementClasses.length];
                const spanOnly = layoutSlot
                  .split(' ')
                  .filter((c) => !c.startsWith('aspect-'))
                  .join(' ');
                const aspectOnly =
                  layoutSlot.split(' ').find((c) => c.startsWith('aspect-')) ||
                  'aspect-[16/10]';

                return (
                  <article
                    key={piece.id || piece.slug}
                    onClick={() => setSelectedPiece(piece)}
                    className={`gsap-fade-up group cursor-pointer ${spanOnly}`}
                  >
                    {/* Above top-left corner: Wood species & Lead time */}
                    <div className="flex items-center justify-between text-[13px] text-[#6E6359] mb-2.5">
                      <span>
                        {piece.category || 'Mobiliario'} · {piece.wood || 'Madera maciza'}
                      </span>
                      <span>{piece.leadTime || 'Bajo pedido'}</span>
                    </div>

                    {/* Square-cornered architectural frame */}
                    <div className={`${aspectOnly} w-full overflow-hidden bg-[#EAE4D8]`}>
                      {piece.imageUrl ? (
                        <img
                          src={piece.imageUrl}
                          alt={piece.title}
                          width={1200}
                          height={900}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                          loading="lazy"
                        />
                      ) : null}
                    </div>

                    {/* Beneath bottom-left corner: Title, Dimensions & Price */}
                    <div className="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <div>
                        <h3 className="font-serif text-2xl sm:text-[26px] font-normal text-[#171412] group-hover:text-[#9E5936] transition-colors">
                          {piece.title}
                        </h3>
                        <p className="text-[14px] text-[#5C5349] mt-1 max-w-[52ch]">
                          {piece.dimensions ? `${piece.dimensions} — ` : ''}
                          {piece.description}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-3 pt-1 sm:pt-0">
                        <span className="font-serif text-xl text-[#171412] tabular-nums">
                          {piece.priceCop || 'A medida'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[#9E5936]">
                          <span>Ficha</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {renderModularWidgetsGrid()}
          </div>
        </div>
      );
    }

    // =========================================================================
    // 5. PROCESO DE TALLER — DRAG ROW OF MOMENTS (Blueprint: how-it-works)
    // =========================================================================
    if (key === 'proceso_taller') {
      const steps = [
        {
          title: data.step1Title || 'Semana 1 · Selección de tablones en bruto',
          body:
            data.step1Body ||
            'Emparejamos los tablones de un mismo tronco para garantizar continuidad cromática y simetría en la veta del sobre.',
          img:
            data.step1Image ||
            'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=900&q=85',
          titleKey: 'step1Title',
          bodyKey: 'step1Body',
          topGap: 'pt-4',
        },
        {
          title: data.step2Title || 'Semana 2 · Estabilización y cepillado',
          body:
            data.step2Body ||
            'Verificamos el equilibrio higrométrico al 8% y rectificamos las caras en banco antes de trazar los cortes.',
          img:
            data.step2Image ||
            'https://images.unsplash.com/photo-1581539250439-c96689b516dd?auto=format&fit=crop&w=900&q=85',
          titleKey: 'step2Title',
          bodyKey: 'step2Body',
          topGap: 'pt-12 lg:pt-16',
        },
        {
          title: data.step3Title || 'Semana 3 · Ensambles de caja y espiga',
          body:
            data.step3Body ||
            'Tallamos las uniones mecánicas y colas de milano que permiten a la madera respirar sin perder rigidez estructural.',
          img:
            data.step3Image ||
            'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=900&q=85',
          titleKey: 'step3Title',
          bodyKey: 'step3Body',
          topGap: 'pt-6',
        },
        {
          title: data.step4Title || 'Semana 4 · Pulido progresivo y aceite-cera',
          body:
            data.step4Body ||
            'Lijamos manualmente en seis etapas hasta grano 320 y nutrimos la fibra con tres manos de aceite-cera vegetal.',
          img:
            data.step4Image ||
            'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=900&q=85',
          titleKey: 'step4Title',
          bodyKey: 'step4Body',
          topGap: 'pt-14 lg:pt-20',
        },
        {
          title: data.step5Title || 'Semana 5 · Entrega e instalación en sitio',
          body:
            data.step5Body ||
            'Transportamos en guante blanco, armamos en tu residencia y entregamos el kit de mantenimiento con certificado de origen.',
          img:
            data.step5Image ||
            'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=85',
          titleKey: 'step5Title',
          bodyKey: 'step5Body',
          topGap: 'pt-8',
        },
      ];

      return (
        <div
          id="proceso"
          style={{
            backgroundColor: style.backgroundColor || '#EAE4D8',
            color: style.textColor || '#171412',
          }}
          className="gsap-section-trigger py-24 lg:py-36 overflow-hidden"
        >
          <div className="max-w-[1440px] mx-auto px-5 sm:px-10 lg:px-14 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <EditableText
                  as="h2"
                  value={data.heading || 'Cinco semanas de oficio paciente.'}
                  isBuilder={isBuilder}
                  onCommit={(v) => commitField('heading', v)}
                  className="gsap-fade-up font-serif text-[clamp(2.1rem,4.2vw,3.6rem)] font-normal tracking-[-0.02em] leading-[1.04]"
                />
                <EditableText
                  as="p"
                  value={
                    data.subheading ||
                    'Desde que eliges los tablones en bruto hasta que nivelamos la pieza en tu comedor, cada etapa es ejecutada por el mismo maestro ebanista.'
                  }
                  isBuilder={isBuilder}
                  onCommit={(v) => commitField('subheading', v)}
                  className="gsap-fade-up text-[16px] text-[#3F3831] leading-relaxed"
                />
              </div>

              {/* Two solid 48px square buttons for back and forward */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  aria-label="Etapa anterior"
                  onClick={() => scrollProcessRail('prev')}
                  className="w-12 h-12 bg-[#171412] text-[#F5F2EB] flex items-center justify-center hover:bg-[#9E5936] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  aria-label="Siguiente etapa"
                  onClick={() => scrollProcessRail('next')}
                  className="w-12 h-12 bg-[#171412] text-[#F5F2EB] flex items-center justify-center hover:bg-[#9E5936] transition-colors"
                >
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* 6px Progress Bar */}
            <div className="w-full h-1.5 bg-[#D8D0C1] overflow-hidden">
              <div
                className="h-full bg-[#171412] transition-[width] duration-300"
                style={{ width: `${Math.max(20, Math.min(100, railProgress * 100))}%` }}
              />
            </div>
          </div>

          {/* Horizontal Scroll Sequence with Uneven Vertical Image Rhythm */}
          <div
            ref={processRailRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const maxScroll = el.scrollWidth - el.clientWidth;
              if (maxScroll > 0) {
                setRailProgress(0.2 + (el.scrollLeft / maxScroll) * 0.8);
              }
            }}
            className="mt-12 flex gap-8 overflow-x-auto snap-x snap-mandatory px-5 sm:px-10 lg:px-14 pb-6 no-scrollbar"
          >
            {steps.map((st) => (
              <div
                key={st.titleKey}
                className="gsap-fade-up snap-start shrink-0 w-[78vw] sm:w-[320px] lg:w-[340px] flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <h3 className="text-[18px] font-medium text-[#171412] leading-snug">
                    <EditableText
                      value={st.title}
                      isBuilder={isBuilder}
                      onCommit={(v) => commitField(st.titleKey, v)}
                    />
                  </h3>
                  <p className="text-[15px] text-[#4A423B] leading-relaxed">
                    <EditableText
                      value={st.body}
                      isBuilder={isBuilder}
                      onCommit={(v) => commitField(st.bodyKey, v)}
                    />
                  </p>
                </div>

                <div className={st.topGap}>
                  <div className="aspect-[4/5] w-full overflow-hidden bg-[#D8D0C1]">
                    <img
                      src={st.img}
                      alt={st.title}
                      width={700}
                      height={875}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // =========================================================================
    // 6. SHOWROOMS & TALLER — ARCHITECTURAL MOSAIC (Blueprint: about mosaic)
    // =========================================================================
    if (key === 'espacios_showroom' || key === 'tiendas_experiencia') {
      const mainSpace = spacesCollection[0] || {
        title: 'Casa Showroom El Nogal',
        city: 'Bogotá D.C.',
        address: 'Calle 79B # 7-45 · Barrio El Nogal',
        hours: 'Lunes a Sábado · 10:00 a.m. – 7:00 p.m.',
        specialty:
          'Casa de dos niveles con comedores, salas, estudio y muestroteca completa de maderas macizas, piedras y linos.',
        imageUrl:
          'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85',
      };

      return (
        <div
          id="espacios"
          style={{
            backgroundColor: style.backgroundColor || '#F5F2EB',
            color: style.textColor || '#171412',
          }}
          className="gsap-section-trigger py-24 lg:py-36 px-5 sm:px-10 lg:px-14"
        >
          <div className="max-w-[1440px] mx-auto space-y-16">
            <div className="max-w-3xl space-y-4">
              <div className="gsap-fade-up text-[14px] text-[#6E6359]">
                <EditableText
                  value={data.eyebrow || 'Bogotá D.C. & Medellín'}
                  isBuilder={isBuilder}
                  onCommit={(v) => commitField('eyebrow', v)}
                />
              </div>
              <EditableText
                as="h2"
                value={
                  data.heading ||
                  'Toca la veta en persona antes de encargar tu pieza.'
                }
                isBuilder={isBuilder}
                onCommit={(v) => commitField('heading', v)}
                className="gsap-fade-up font-serif text-[clamp(2.1rem,4.2vw,3.8rem)] font-normal tracking-[-0.02em] leading-[1.04] max-w-[18ch]"
              />
              <EditableText
                as="p"
                value={
                  data.subheading ||
                  'Agenda una sesión privada con nuestros arquitectos de interiores o solicita el envío sin costo de nuestra caja de muestras de madera y lino a tu ciudad.'
                }
                isBuilder={isBuilder}
                onCommit={(v) => commitField('subheading', v)}
                className="gsap-fade-up text-[18px] text-[#3F3831] leading-relaxed"
              />
            </div>

            {/* Mosaic: Columns 1-8 Wide Photo + Overlaid Paper Block | Columns 9-12 Architectural Plan Tile */}
            <div className="gsap-fade-up grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 relative">
                <div className="aspect-[16/10] w-full overflow-hidden bg-[#EAE4D8]">
                  <img
                    src={mainSpace.imageUrl}
                    alt={mainSpace.title}
                    width={1400}
                    height={875}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="lg:absolute lg:top-0 lg:right-0 lg:w-[340px] bg-[#FCFBF8] p-6 text-[#171412]">
                  <div className="text-[13px] font-medium text-[#9E5936]">
                    {mainSpace.city} · Sede Principal
                  </div>
                  <h3 className="font-serif text-2xl font-normal mt-1">{mainSpace.title}</h3>
                  <p className="text-[14px] text-[#4A423B] leading-relaxed mt-2">
                    {mainSpace.specialty}
                  </p>
                  <div className="text-[13px] font-medium text-[#171412] mt-3">
                    {mainSpace.address}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                {/* Architectural Floor Plan SVG Tile */}
                <div className="bg-[#171412] text-[#F5F2EB] p-8 aspect-[4/3] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[13px] text-[#C4B9AA]">
                    <span>Planta arquitectónica · Taller &amp; Sala</span>
                    <span className="inline-flex items-center gap-1.5 text-[#F5F2EB]">
                      <span className="w-2 h-2 rounded-full bg-[#9E5936]" />
                      <span>Cita previa</span>
                    </span>
                  </div>

                  <svg
                    viewBox="0 0 240 130"
                    className="w-full h-28"
                    fill="none"
                    aria-label="Plano esquemático de Showroom Atelier"
                  >
                    <rect
                      x="10"
                      y="10"
                      width="220"
                      height="110"
                      fill="#241F1C"
                    />
                    <rect x="24" y="24" width="95" height="82" fill="#332B26" />
                    <rect x="130" y="24" width="86" height="46" fill="#332B26" />
                    <rect x="130" y="78" width="86" height="28" fill="#9E5936" />
                    <circle cx="173" cy="92" r="5" fill="#F5F2EB" />
                  </svg>

                  <div className="text-[13px] text-[#C4B9AA]">
                    Muestroteca de maderas, linos y piedra natural disponible para préstamo a estudios de arquitectura.
                  </div>
                </div>

                {/* 2x2 Architectural Facts */}
                <div className="grid grid-cols-2 gap-4 bg-[#EAE4D8] p-6 text-[14px]">
                  <div>
                    <div className="text-[#6E6359]">Altitud taller</div>
                    <div className="font-medium text-[#171412] mt-0.5">2.600 m · Bogotá</div>
                  </div>
                  <div>
                    <div className="text-[#6E6359]">Secado en horno</div>
                    <div className="font-medium text-[#171412] mt-0.5">8% – 10% humedad</div>
                  </div>
                  <div>
                    <div className="text-[#6E6359]">Despachos</div>
                    <div className="font-medium text-[#171412] mt-0.5">Toda Colombia</div>
                  </div>
                  <div>
                    <div className="text-[#6E6359]">Garantía</div>
                    <div className="font-medium text-[#171412] mt-0.5">25 años en uniones</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Remaining Showrooms & Workshops from CMS Collection */}
            {spacesCollection.length > 1 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                {spacesCollection.slice(1).map((space: any) => (
                  <div
                    key={space.id || space.slug}
                    className="gsap-fade-up bg-[#FCFBF8] grid grid-cols-1 sm:grid-cols-12 overflow-hidden"
                  >
                    <div className="sm:col-span-5 aspect-[4/3] sm:aspect-auto bg-[#EAE4D8]">
                      {space.imageUrl ? (
                        <img
                          src={space.imageUrl}
                          alt={space.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="sm:col-span-7 p-6 sm:p-7 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="text-[13px] font-medium text-[#9E5936]">
                          {space.city}
                        </div>
                        <h3 className="font-serif text-2xl font-normal text-[#171412] mt-1">
                          {space.title}
                        </h3>
                        <p className="text-[14px] text-[#4A423B] leading-relaxed mt-2">
                          {space.specialty}
                        </p>
                      </div>
                      <div className="space-y-1 text-[13px] text-[#171412]">
                        <div className="font-medium">{space.address}</div>
                        <div className="text-[#6E6359]">{space.hours}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {renderModularWidgetsGrid()}
          </div>
        </div>
      );
    }

    // =========================================================================
    // 7. ENCARGOS A MEDIDA Y FORMULARIO CRM
    // =========================================================================
    if (key === 'cotizacion_medida' || key === 'reserva_cata_form') {
      return (
        <div
          id="cotizar"
          style={{
            backgroundColor: style.backgroundColor || '#171412',
            color: style.textColor || '#F5F2EB',
          }}
          className="gsap-section-trigger py-24 lg:py-36 px-5 sm:px-10 lg:px-14"
        >
          <div className="max-w-[1440px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-5 space-y-6">
                <div className="gsap-fade-up text-[14px] text-[#C4B9AA]">
                  <EditableText
                    value={
                      data.eyebrow || 'Proyectos residenciales y arquitectura comercial'
                    }
                    isBuilder={isBuilder}
                    onCommit={(v) => commitField('eyebrow', v)}
                  />
                </div>

                <EditableText
                  as="h2"
                  value={data.heading || 'Diseñemos una pieza para tu espacio.'}
                  isBuilder={isBuilder}
                  onCommit={(v) => commitField('heading', v)}
                  className="gsap-fade-up font-serif text-[clamp(2.2rem,4.2vw,3.8rem)] font-normal tracking-[-0.02em] leading-[1.04] max-w-[16ch]"
                />

                <EditableText
                  as="p"
                  value={
                    data.subheading ||
                    'Cuéntanos qué mueble o ambiente deseas desarrollar. En menos de 24 horas hábiles nuestro equipo te enviará propuesta económica, plano preliminar y muestras físicas.'
                  }
                  isBuilder={isBuilder}
                  onCommit={(v) => commitField('subheading', v)}
                  className="gsap-fade-up text-[16px] text-[#D8D0C1] leading-relaxed"
                />

                <ul className="gsap-fade-up space-y-3.5 pt-2 text-[15px] text-[#E8DFD1]">
                  {[
                    {
                      k: 'bullet1',
                      val:
                        data.bullet1 ||
                        'Envío sin costo de muestras de roble, nogal, teca y linos belgas',
                    },
                    {
                      k: 'bullet2',
                      val:
                        data.bullet2 ||
                        'Planos técnicos 2D y modelo 3D previos al corte en taller',
                    },
                    {
                      k: 'bullet3',
                      val:
                        data.bullet3 ||
                        'Programa Trade con condiciones especiales para arquitectos e interioristas',
                    },
                  ].map((b) => (
                    <li key={b.k} className="flex items-start gap-3">
                      <Check
                        className="w-4 h-4 text-[#9E5936] shrink-0 mt-1"
                        strokeWidth={2}
                      />
                      <EditableText
                        value={b.val}
                        isBuilder={isBuilder}
                        onCommit={(v) => commitField(b.k, v)}
                      />
                    </li>
                  ))}
                </ul>

                <div className="gsap-fade-up pt-4">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackClick('whatsapp_click')}
                    className="inline-flex items-center gap-2 text-[14px] font-medium text-[#E8DFD1] underline underline-offset-4 hover:text-white"
                  >
                    <span>Hablar directamente con un ebanista por WhatsApp</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-7 bg-[#F5F2EB] text-[#171412] p-7 sm:p-10 lg:p-12">
                {leadSubmitted ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-12 h-12 bg-[#171412] text-[#F5F2EB] flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" strokeWidth={1.8} />
                    </div>
                    <h3 className="font-serif text-3xl font-normal text-[#171412]">
                      Solicitud recibida en el taller
                    </h3>
                    <p className="text-[15px] text-[#4A423B] max-w-md mx-auto leading-relaxed">
                      Hemos registrado las especificaciones de tu proyecto. Un arquitecto de
                      interiores de Atelier te contactará hoy mismo.
                    </p>
                    <button
                      type="button"
                      onClick={() => setLeadSubmitted(false)}
                      className="h-11 px-6 bg-[#171412] text-[#F5F2EB] text-[13px] font-medium"
                    >
                      Enviar otra especificación
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleLeadSubmit} className="space-y-5">
                    <div className="font-serif text-2xl font-normal text-[#171412] pb-1">
                      Ficha de encargo o visita privada
                    </div>

                    {leadError ? (
                      <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs">
                        {leadError}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="lead-name"
                          className="block text-[13px] font-medium text-[#3F3831] mb-1.5"
                        >
                          Nombre completo
                        </label>
                        <input
                          id="lead-name"
                          type="text"
                          required
                          placeholder="Ej. Alejandro Gaviria"
                          value={leadForm.fullName}
                          onChange={(e) =>
                            setLeadForm({ ...leadForm, fullName: e.target.value })
                          }
                          className="w-full h-11 px-3.5 bg-[#FCFBF8] border border-[#D4C9B8] text-[14px] text-[#171412] focus:outline-none focus:border-[#171412]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="lead-email"
                          className="block text-[13px] font-medium text-[#3F3831] mb-1.5"
                        >
                          Correo electrónico
                        </label>
                        <input
                          id="lead-email"
                          type="email"
                          required
                          placeholder="nombre@estudio.com"
                          value={leadForm.email}
                          onChange={(e) =>
                            setLeadForm({ ...leadForm, email: e.target.value })
                          }
                          className="w-full h-11 px-3.5 bg-[#FCFBF8] border border-[#D4C9B8] text-[14px] text-[#171412] focus:outline-none focus:border-[#171412]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label
                          htmlFor="lead-phone"
                          className="block text-[13px] font-medium text-[#3F3831] mb-1.5"
                        >
                          WhatsApp / Teléfono
                        </label>
                        <input
                          id="lead-phone"
                          type="tel"
                          required
                          placeholder="+57 310 000 0000"
                          value={leadForm.phone}
                          onChange={(e) =>
                            setLeadForm({ ...leadForm, phone: e.target.value })
                          }
                          className="w-full h-11 px-3.5 bg-[#FCFBF8] border border-[#D4C9B8] text-[14px] text-[#171412] focus:outline-none focus:border-[#171412]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="lead-city"
                          className="block text-[13px] font-medium text-[#3F3831] mb-1.5"
                        >
                          Ciudad de entrega
                        </label>
                        <select
                          id="lead-city"
                          value={leadForm.city}
                          onChange={(e) =>
                            setLeadForm({ ...leadForm, city: e.target.value })
                          }
                          className="w-full h-11 px-3 bg-[#FCFBF8] border border-[#D4C9B8] text-[14px] text-[#171412] focus:outline-none focus:border-[#171412]"
                        >
                          <option value="Bogotá D.C.">Bogotá D.C.</option>
                          <option value="Medellín">Medellín / Rionegro</option>
                          <option value="Cali">Cali</option>
                          <option value="Cartagena / Barranquilla">
                            Cartagena / Barranquilla
                          </option>
                          <option value="Otra ciudad">Otra ciudad</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="lead-wood"
                          className="block text-[13px] font-medium text-[#3F3831] mb-1.5"
                        >
                          Madera preferida
                        </label>
                        <select
                          id="lead-wood"
                          value={leadForm.preferredWood}
                          onChange={(e) =>
                            setLeadForm({ ...leadForm, preferredWood: e.target.value })
                          }
                          className="w-full h-11 px-3 bg-[#FCFBF8] border border-[#D4C9B8] text-[14px] text-[#171412] focus:outline-none focus:border-[#171412]"
                        >
                          <option value="Nogal Negro Ahumado">Nogal Negro Ahumado</option>
                          <option value="Roble Blanco Alisado">Roble Blanco Alisado</option>
                          <option value="Teca Dorada Certificada">
                            Teca Dorada Certificada
                          </option>
                          <option value="Deseo recibir muestras">
                            Deseo recibir caja de muestras
                          </option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="lead-message"
                        className="block text-[13px] font-medium text-[#3F3831] mb-1.5"
                      >
                        Pieza, dimensiones aproximadas o detalles del espacio
                      </label>
                      <textarea
                        id="lead-message"
                        rows={3}
                        placeholder="Ej. Buscamos una mesa de comedor en nogal para 8 puestos (aprox. 260 × 108 cm) o agendar visita al showroom."
                        value={leadForm.message}
                        onChange={(e) =>
                          setLeadForm({ ...leadForm, message: e.target.value })
                        }
                        className="w-full p-3.5 bg-[#FCFBF8] border border-[#D4C9B8] text-[14px] text-[#171412] focus:outline-none focus:border-[#171412]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingLead}
                      style={{ backgroundColor: global.primaryColor || '#9E5936' }}
                      className="w-full h-12 text-[#F5F2EB] text-[14px] font-medium hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                    >
                      <span>
                        {submittingLead
                          ? 'Registrando encargo...'
                          : data.submitButtonText || 'Enviar solicitud al taller'}
                      </span>
                      <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // =========================================================================
    // 8. FALLBACK MODULAR SECTION (For any new section added from /portal)
    // =========================================================================
    return (
      <div
        style={{
          backgroundColor: style.backgroundColor || '#F5F2EB',
          color: style.textColor || '#171412',
          paddingTop: style.paddingTop ? `${style.paddingTop}px` : undefined,
          paddingBottom: style.paddingBottom ? `${style.paddingBottom}px` : undefined,
          textAlign: style.textAlign || 'left',
        }}
        className="gsap-section-trigger py-24 px-5 sm:px-10 lg:px-14"
      >
        <div className="max-w-[1440px] mx-auto space-y-6">
          <EditableText
            as="h2"
            value={data.heading || data.headline || sec.name}
            isBuilder={isBuilder}
            onCommit={(v) => commitField('heading', v)}
            className="gsap-fade-up font-serif text-3xl sm:text-5xl font-normal tracking-tight"
          />
          {data.subheading || data.subheadline ? (
            <EditableText
              as="p"
              value={data.subheading || data.subheadline}
              isBuilder={isBuilder}
              onCommit={(v) => commitField('subheading', v)}
              className="gsap-fade-up text-[16px] opacity-80 max-w-2xl leading-relaxed"
            />
          ) : null}
          {renderModularWidgetsGrid()}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      className="min-h-[100svh] bg-[#F5F2EB] text-[#171412] flex flex-col selection:bg-[#9E5936] selection:text-white"
    >
      {/* Top Announcement Bar */}
      {global.announcementText ? (
        <div
          style={{ backgroundColor: global.espressoColor || '#171412' }}
          className="text-[#E8DFD1] text-[13px] py-2.5 px-5 text-center"
        >
          {global.announcementText}
        </div>
      ) : null}

      {/* Minimal Architectural Header with Custom CMS Logo */}
      <header className="sticky top-0 z-30 bg-[#F5F2EB]/95">
        <div className="max-w-[1440px] mx-auto h-20 px-5 sm:px-10 lg:px-14 flex items-center justify-between gap-6">
          <a href="#top" className="flex items-center gap-3.5">
            {global.logoUrl ? (
              <img
                src={global.logoUrl}
                alt={global.brandName || 'Atelier'}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <>
                <AtelierEmblem className="w-9 h-9" />
                <div>
                  <div className="font-serif text-xl tracking-[0.14em] text-[#171412] leading-none">
                    ATELIER
                  </div>
                  <div className="text-[11px] text-[#6E6359] mt-1">
                    {global.brandMonogram || 'Madera & Materia'}
                  </div>
                </div>
              </>
            )}
          </a>

          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-8 text-[14px] text-[#3F3831]"
          >
            {(navigation.headerLinks || [])
              .filter((l: any) => l.isVisible !== false)
              .map((lnk: any) => (
                <a
                  key={lnk.id || lnk.label}
                  href={lnk.href}
                  className="hover:text-[#171412] transition-colors"
                >
                  {lnk.label}
                </a>
              ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={navigation.headerCtaHref || '#cotizar'}
              onClick={() => trackClick('cta_click')}
              style={{ backgroundColor: global.espressoColor || '#171412' }}
              className="h-11 px-5 text-[#F5F2EB] text-[13px] font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <span>{navigation.headerCtaText || 'Encargar pieza'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </header>

      {/* Optional Promotional Campaign Banner from CMS */}
      {navigation.promoBanner?.enabled ? (
        <div className="bg-[#9E5936] text-[#F5F2EB] px-5 py-3">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3 text-[13px]">
            <div>
              <span className="font-semibold mr-2">{navigation.promoBanner.title}:</span>
              <span>{navigation.promoBanner.description}</span>
            </div>
            {navigation.promoBanner.ctaText ? (
              <a
                href={navigation.promoBanner.ctaHref || '#cotizar'}
                className="underline font-medium"
              >
                {navigation.promoBanner.ctaText} →
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Main Dynamic Sections Canvas */}
      <main id="top" className="flex-1">
        {orderedSections.map((sec, idx) => {
          const isSelected = isBuilder && selectedKey === sec.key;
          const isDragOver = isBuilder && dragOverSectionId === sec.id;

          return (
            <section
              key={sec.id || sec.key}
              id={`cms-section-${sec.key}`}
              draggable={isBuilder}
              onDragStart={() => {
                if (!isBuilder) return;
                setDraggedSectionId(sec.id);
              }}
              onDragOver={(e) => {
                if (!isBuilder) return;
                e.preventDefault();
                if (dragOverSectionId !== sec.id) {
                  setDragOverSectionId(sec.id);
                }
              }}
              onDrop={(e) => {
                if (!isBuilder) return;
                e.preventDefault();
                setDragOverSectionId(null);
                if (draggedSectionId && draggedSectionId !== sec.id) {
                  emitCanvasAction('REORDER_DROP', {
                    sourceSectionId: draggedSectionId,
                    targetSectionId: sec.id,
                  });
                }
                setDraggedSectionId(null);
              }}
              onClick={() => {
                if (!isBuilder) return;
                setSelectedKey(sec.key);
                emitCanvasAction('SELECT_SECTION', {
                  sectionId: sec.id,
                  sectionKey: sec.key,
                });
              }}
              className={`relative transition-colors ${
                isBuilder
                  ? isSelected
                    ? 'ring-2 ring-inset ring-[#9E5936]'
                    : 'hover:ring-1 hover:ring-inset hover:ring-[#9E5936]/50'
                  : ''
              } ${isDragOver ? 'border-t-4 border-[#9E5936]' : ''}`}
            >
              {/* Floating Visual Builder Toolbar */}
              {isBuilder ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`sticky top-20 z-20 mx-4 mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#171412] text-[#F5F2EB] text-[11px] ${
                    isSelected ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <GripVertical className="w-3.5 h-3.5 text-[#C4B9AA] cursor-grab" />
                  <span className="font-medium px-1">{sec.name}</span>

                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() =>
                      emitCanvasAction('MOVE_SECTION', {
                        sectionId: sec.id,
                        direction: 'UP',
                      })
                    }
                    title="Subir sección"
                    className="p-1 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === orderedSections.length - 1}
                    onClick={() =>
                      emitCanvasAction('MOVE_SECTION', {
                        sectionId: sec.id,
                        direction: 'DOWN',
                      })
                    }
                    title="Bajar sección"
                    className="p-1 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      emitCanvasAction('DUPLICATE_SECTION', { sectionId: sec.id })
                    }
                    title="Duplicar sección"
                    className="p-1 hover:bg-white/10"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      emitCanvasAction('DELETE_SECTION', { sectionId: sec.id })
                    }
                    title="Eliminar sección"
                    className="p-1 hover:bg-red-500/20 text-red-300"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : null}

              {renderSectionContent(sec)}
            </section>
          );
        })}

        {isBuilder ? (
          <div className="py-10 px-6 bg-[#EAE4D8] flex justify-center">
            <button
              type="button"
              onClick={() => emitCanvasAction('OPEN_ADD_BLOCK_MODAL')}
              className="h-11 px-6 bg-[#171412] text-[#F5F2EB] text-xs font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Insertar nueva sección en la página</span>
            </button>
          </div>
        ) : null}
      </main>

      {/* Architectural Specification Slide-Over Drawer for Selected Furniture Piece */}
      {selectedPiece ? (
        <div
          onClick={() => setSelectedPiece(null)}
          className="fixed inset-0 z-50 bg-[#171412]/70 flex items-center justify-end p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FCFBF8] text-[#171412] max-w-xl w-full h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto p-6 sm:p-10 space-y-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[13px] font-medium text-[#9E5936]">
                  {selectedPiece.category || 'Colección Atelier'} · {selectedPiece.wood}
                </div>
                <h3 className="font-serif text-3xl font-normal text-[#171412] mt-1">
                  {selectedPiece.title}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Cerrar ficha técnica"
                onClick={() => setSelectedPiece(null)}
                className="w-10 h-10 bg-[#EAE4D8] flex items-center justify-center text-[#171412] hover:bg-[#171412] hover:text-[#F5F2EB] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedPiece.imageUrl ? (
              <div className="aspect-[16/10] bg-[#EAE4D8] overflow-hidden">
                <img
                  src={selectedPiece.imageUrl}
                  alt={selectedPiece.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}

            <p className="text-[15px] text-[#3F3831] leading-relaxed">
              {selectedPiece.description}
            </p>

            <div className="grid grid-cols-2 gap-4 p-5 bg-[#F5F2EB] text-[13px]">
              <div>
                <div className="text-[#6E6359]">Dimensiones estándar</div>
                <div className="font-medium text-[#171412] mt-0.5">
                  {selectedPiece.dimensions || 'Personalizable a medida'}
                </div>
              </div>
              <div>
                <div className="text-[#6E6359]">Madera certificada</div>
                <div className="font-medium text-[#171412] mt-0.5">
                  {selectedPiece.wood || 'Roble / Nogal / Teca'}
                </div>
              </div>
              <div>
                <div className="text-[#6E6359]">Tiempo de ebanistería</div>
                <div className="font-medium text-[#171412] mt-0.5">
                  {selectedPiece.leadTime || '4 a 5 semanas'}
                </div>
              </div>
              <div>
                <div className="text-[#6E6359]">Valor base de referencia</div>
                <div className="font-serif text-lg font-medium text-[#171412] mt-0.5 tabular-nums">
                  {selectedPiece.priceCop || 'Bajo cotización'}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href="#cotizar"
                onClick={() => {
                  setLeadForm((prev) => ({
                    ...prev,
                    preferredWood: selectedPiece.wood || prev.preferredWood,
                    message: `Me interesa encargar la pieza "${selectedPiece.title}" (${
                      selectedPiece.dimensions || 'medidas estándar'
                    }).`,
                  }));
                  setSelectedPiece(null);
                }}
                className="flex-1 h-12 px-6 bg-[#171412] text-[#F5F2EB] text-[14px] font-medium inline-flex items-center justify-center gap-2"
              >
                <span>Solicitar cotización de esta pieza</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="h-12 px-5 bg-[#EAE4D8] text-[#171412] text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:bg-[#DFD7C8]"
              >
                <span>Consultar por WhatsApp</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================================================================== */}
      {/* MONUMENTAL FULL-BLEED ARCHITECTURAL FOOTER (Blueprint: footer)        */}
      {/* ===================================================================== */}
      <footer className="relative w-full min-h-[78svh] bg-[#171412] text-[#F5F2EB] flex flex-col justify-between overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1581539250439-c96689b516dd?auto=format&fit=crop&w=2000&q=80"
          alt="Taller de ebanistería Atelier"
          width={2000}
          height={1100}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover brightness-[0.38] pointer-events-none"
        />

        {/* Top Row: Links on Left, Workshop Details on Right */}
        <div className="relative z-10 max-w-[1440px] w-full mx-auto px-5 sm:px-10 lg:px-14 pt-12 sm:pt-16 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-4">
            {global.logoLightUrl ? (
              <img
                src={global.logoLightUrl}
                alt={global.brandName}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div className="flex items-center gap-3">
                <AtelierEmblem dark className="w-9 h-9" />
                <span className="font-serif text-lg tracking-[0.16em]">ATELIER</span>
              </div>
            )}
            <p className="text-[15px] text-[#E8DFD1]/85 max-w-sm leading-relaxed">
              {global.brandMonogram || 'Ebanistería arquitectónica en madera maciza'}
            </p>
          </div>

          <div className="md:col-span-3 space-y-2 text-[15px]">
            {(navigation.headerLinks || [])
              .filter((l: any) => l.isVisible !== false)
              .map((lnk: any) => (
                <div key={lnk.id || lnk.label}>
                  <a
                    href={lnk.href}
                    className="text-[#E8DFD1]/85 hover:text-white transition-colors"
                  >
                    {lnk.label}
                  </a>
                </div>
              ))}
          </div>

          <div className="md:col-span-4 space-y-2 text-[15px] text-[#E8DFD1]/90">
            <div className="font-medium text-white">Showroom &amp; Taller Principal</div>
            <div>{global.footerAddress}</div>
            {global.footerHours ? (
              <div className="text-[#C4B9AA] text-[14px]">{global.footerHours}</div>
            ) : null}
            <div className="pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 text-white"
              >
                WhatsApp: {global.whatsappNumber}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Row: Monumental Edge-to-Edge Wordmark + Legal Line */}
        <div className="relative z-10 max-w-[1440px] w-full mx-auto px-5 sm:px-10 lg:px-14 pb-8 pt-20">
          <div
            aria-hidden="true"
            className="font-serif text-[clamp(4.2rem,17.5vw,15.5rem)] leading-[0.82] tracking-[0.04em] text-[#F5F2EB]/95 select-none"
          >
            ATELIER
          </div>
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px] text-[#C4B9AA]">
            <span>
              © {new Date().getFullYear()} {global.brandName}. Madera certificada de origen
              responsable.
            </span>
            <span>Bogotá D.C. · Medellín · Colombia</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
