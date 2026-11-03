'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowDown,
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
      className={`${className} outline-none rounded-[4px] transition-colors hover:ring-1 hover:ring-[#9E4F32]/70 focus:ring-2 focus:ring-[#9E4F32] focus:bg-[#9E4F32]/5 px-0.5 -mx-0.5 cursor-text`}
    >
      {value}
    </Tag>
  );
}

export function ClientSiteRenderer({ projectSlug = '' }: { projectSlug?: string }) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === '1' || searchParams.get('preview') === 'true';
  const isBuilder = searchParams.get('builder') === '1';
  const focusSectionKey = searchParams.get('section') || '';

  const [payload, setPayload] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWood, setActiveWood] = useState<'ligera' | 'media' | 'oscura'>('ligera');
  const [woodFilter, setWoodFilter] = useState<string>('TODOS');
  const [selectedPiece, setSelectedPiece] = useState<any | null>(null);

  // Drag & Drop state on canvas
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
    preferredWood: 'Roble Blanco Alisado',
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
      // Fallback
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
          if (msg.globalData) {
            next.global = { ...next.global, ...msg.globalData };
          }
          if (msg.navigationConfig) {
            next.navigation = { ...next.navigation, ...msg.navigationConfig };
          }
          if (msg.sectionsList && Array.isArray(msg.sectionsList)) {
            const sectionsMap: Record<string, any> = {};
            msg.sectionsList.forEach((s: any) => {
              sectionsMap[s.key] = s.draftData || s.data || {};
            });
            next.pages = (next.pages || []).map((p: any, idx: number) =>
              idx === 0
                ? {
                    ...p,
                    sections: sectionsMap,
                    sectionsList: msg.sectionsList.map((s: any) => ({
                      id: s.id,
                      key: s.key,
                      name: s.name,
                      isVisible: s.isVisible,
                      order: s.order,
                      data: s.draftData || s.data || {},
                    })),
                  }
                : p,
            );
          }
          return next;
        });
        if (msg.selectedSectionKey) {
          setSelectedKey(msg.selectedSectionKey);
        }
      }

      if (msg.type === 'CMS_SCROLL_TO_SECTION' && msg.sectionKey) {
        setSelectedKey(msg.sectionKey);
        const el = document.getElementById(`cms-sec-${msg.sectionKey}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const notifyParent = (action: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'CMS_CANVAS_ACTION', ...action }, '*');
    }
  };

  const handleInlineFieldUpdate = (
    sectionId: string,
    sectionKey: string,
    fieldKey: string,
    value: any,
  ) => {
    setPayload((prev: any) => {
      if (!prev) return prev;
      const next = { ...prev };
      next.pages = (next.pages || []).map((p: any) => ({
        ...p,
        sections: {
          ...p.sections,
          [sectionKey]: { ...(p.sections?.[sectionKey] || {}), [fieldKey]: value },
        },
        sectionsList: (p.sectionsList || []).map((s: any) =>
          s.id === sectionId || s.key === sectionKey
            ? { ...s, data: { ...(s.data || {}), [fieldKey]: value } }
            : s,
        ),
      }));
      return next;
    });

    notifyParent({
      action: 'INLINE_FIELD_CHANGE',
      sectionId,
      sectionKey,
      fieldKey,
      value,
    });
  };

  const handleWidgetUpdate = (sectionId: string, sectionKey: string, widgets: any[]) => {
    handleInlineFieldUpdate(sectionId, sectionKey, 'widgets', widgets);
  };

  const trackEvent = (eventType: 'whatsapp_click' | 'cta_click') => {
    fetch(`${API_BASE}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectSlug, eventType }),
    }).catch(() => {});
  };

  const homePage = useMemo(() => {
    if (!payload?.pages) return null;
    return payload.pages.find((p: any) => p.slug === '/') || payload.pages[0];
  }, [payload]);

  const orderedSections: any[] = useMemo(() => {
    const list = homePage?.sectionsList || [];
    return [...list].filter((s) => s.isVisible !== false).sort((a, b) => a.order - b.order);
  }, [homePage]);

  const global = payload?.global || {};
  const navConfig = payload?.navigation || {};
  const headerLinks: any[] = Array.isArray(navConfig.headerLinks)
    ? navConfig.headerLinks.filter((l: any) => l.isVisible !== false)
    : [
        { id: '1', label: 'El oficio', href: '#oficio' },
        { id: '2', label: 'Maderas', href: '#maderas' },
        { id: '3', label: 'Piezas', href: '#coleccion' },
        { id: '4', label: 'Showroom', href: '#espacios' },
        { id: '5', label: 'A medida', href: '#cotizar' },
      ];

  const pieces: any[] =
    payload?.collections?.['piezas-mobiliario'] ||
    payload?.collections?.['cafes-origen'] ||
    [];
  const spaces: any[] =
    payload?.collections?.['espacios-atelier'] ||
    payload?.collections?.['tiendas-experiencias'] ||
    [];

  const filteredPieces = useMemo(() => {
    if (woodFilter === 'TODOS') return pieces;
    return pieces.filter((p) => {
      const w = (p.wood || p.roast || p.category || '').toLowerCase();
      return w.includes(woodFilter.toLowerCase());
    });
  }, [pieces, woodFilter]);

  const whatsappUrl = useMemo(() => {
    const phone = (global.whatsappNumber || '+573148901234').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      global.whatsappPrefill ||
        `Hola ${global.brandName || 'Atelier'}, me gustaría cotizar una pieza en madera maciza.`,
    );
    return `https://wa.me/${phone}?text=${text}`;
  }, [global]);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLead(true);
    setLeadError(null);
    try {
      const res = await fetch(`${API_BASE}/api/leads/submit/${projectSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formName: 'Cotización Mobiliario a Medida',
          fullName: leadForm.fullName,
          email: leadForm.email,
          phone: leadForm.phone,
          company: leadForm.company,
          subject: `Pieza a medida (${leadForm.preferredWood}) · ${leadForm.city}`,
          message: leadForm.message,
          sourcePage: '/',
          utmSource: 'Sitio Web Directo',
          payload: {
            city: leadForm.city,
            preferredWood: leadForm.preferredWood,
          },
        }),
      });
      if (!res.ok) throw new Error('No fue posible registrar la solicitud');
      setLeadSubmitted(true);
    } catch (err: any) {
      setLeadError(err.message || 'Error al enviar el formulario');
    } finally {
      setSubmittingLead(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F3EC] text-[#5C544B] flex items-center justify-center text-[13px]">
        Cargando colección...
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-[#F6F3EC] text-[#1B1714] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-[14px] border border-[#1B1714]/12 bg-[#FCFBF8] p-8 text-center space-y-4">
          <div className="font-mono text-[12px] text-[#82786D]">Sitio no encontrado</div>
          <h1 className="font-serif text-[26px] text-[#1B1714]">
            El proyecto &ldquo;{projectSlug}&rdquo; aún no está publicado
          </h1>
          <p className="text-[14px] text-[#5C544B] leading-relaxed">
            Inicia sesión en el panel de administración para vincular o publicar este sitio.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="h-9 px-4 rounded-[8px] bg-[#1B1714] text-[#F6F3EC] text-[13px] font-medium inline-flex items-center"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Interactive frame when opened inside Visual Builder (/portal)
  const renderSectionFrame = (
    sec: any,
    index: number,
    total: number,
    content: React.ReactNode,
  ) => {
    const isSelected = isBuilder && selectedKey === sec.key;
    const isDragOver = isBuilder && dragOverSectionId === sec.id;
    const customStyle = sec.data?._style || {};

    return (
      <div
        key={sec.id || sec.key}
        id={`cms-sec-${sec.key}`}
        draggable={isBuilder}
        onDragStart={(e) => {
          if (!isBuilder) return;
          setDraggedSectionId(sec.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          if (!isBuilder || !draggedSectionId || draggedSectionId === sec.id) return;
          e.preventDefault();
          setDragOverSectionId(sec.id);
        }}
        onDragLeave={() => {
          if (dragOverSectionId === sec.id) setDragOverSectionId(null);
        }}
        onDrop={(e) => {
          if (!isBuilder || !draggedSectionId || draggedSectionId === sec.id) return;
          e.preventDefault();
          setDragOverSectionId(null);
          notifyParent({
            action: 'REORDER_DROP',
            sourceSectionId: draggedSectionId,
            targetSectionId: sec.id,
          });
          setDraggedSectionId(null);
        }}
        onClick={(e) => {
          if (!isBuilder) return;
          e.stopPropagation();
          setSelectedKey(sec.key);
          notifyParent({
            action: 'SELECT_SECTION',
            sectionId: sec.id,
            sectionKey: sec.key,
          });
        }}
        style={{
          backgroundColor: customStyle.backgroundColor || undefined,
          color: customStyle.textColor || undefined,
          paddingTop:
            customStyle.paddingTop !== undefined ? `${customStyle.paddingTop}px` : undefined,
          paddingBottom:
            customStyle.paddingBottom !== undefined ? `${customStyle.paddingBottom}px` : undefined,
          textAlign: customStyle.textAlign || undefined,
        }}
        className={`relative group/sec transition-colors ${
          isBuilder
            ? isSelected
              ? 'ring-2 ring-inset ring-[#9E4F32]'
              : 'hover:ring-1 hover:ring-inset hover:ring-[#9E4F32]/60'
            : ''
        } ${isDragOver ? 'border-t-2 border-t-[#9E4F32]' : ''}`}
      >
        {isBuilder ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`z-30 flex items-center justify-between gap-2 px-2.5 py-1 text-[11px] font-sans transition-opacity ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover/sec:opacity-100'
            } absolute top-2 left-3 right-3 pointer-events-none`}
          >
            <div className="pointer-events-auto inline-flex items-center gap-1.5 bg-[#1B1714] text-[#F6F3EC] px-2.5 py-1 rounded-[6px] font-medium cursor-grab active:cursor-grabbing">
              <GripVertical className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{sec.name}</span>
            </div>

            <div className="pointer-events-auto inline-flex items-center gap-1 bg-[#1B1714] text-[#F6F3EC] px-1.5 py-1 rounded-[6px]">
              <button
                type="button"
                disabled={index === 0}
                onClick={() =>
                  notifyParent({ action: 'MOVE_SECTION', sectionId: sec.id, direction: 'UP' })
                }
                title="Subir sección"
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
              >
                <ArrowUp className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                disabled={index === total - 1}
                onClick={() =>
                  notifyParent({ action: 'MOVE_SECTION', sectionId: sec.id, direction: 'DOWN' })
                }
                title="Bajar sección"
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
              >
                <ArrowDown className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => notifyParent({ action: 'DUPLICATE_SECTION', sectionId: sec.id })}
                title="Duplicar sección"
                className="p-1 rounded hover:bg-white/10"
              >
                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() =>
                  notifyParent({
                    action: 'OPEN_ADD_BLOCK_MODAL',
                    insertAtOrder: index + 1,
                  })
                }
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#9E4F32] text-white text-[11px] font-medium"
              >
                <Plus className="w-3 h-3" strokeWidth={1.5} />
                <span>Insertar sección</span>
              </button>
              <button
                type="button"
                onClick={() => notifyParent({ action: 'DELETE_SECTION', sectionId: sec.id })}
                title="Eliminar sección"
                className="p-1 rounded hover:bg-red-600/80 text-red-300 hover:text-white"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ) : null}

        {content}
      </div>
    );
  };

  const renderSectionContent = (sec: any) => {
    const d = sec.data || {};
    const key = sec.key || '';

    // 1. HERO SECTION (Asymmetric split, zero pill badges, quiet chrome)
    if (key.startsWith('hero')) {
      return (
        <section className="border-b border-[#1B1714]/10">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-8 py-14 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <EditableText
                as="h1"
                isBuilder={isBuilder}
                value={
                  d.headline ||
                  'Mobiliario en madera maciza pensado para habitar el tiempo'
                }
                onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'headline', val)}
                className="font-serif text-[38px] sm:text-[52px] leading-[1.05] tracking-[-0.02em] font-normal text-[#1B1714] block"
              />

              <EditableText
                as="p"
                isBuilder={isBuilder}
                value={
                  d.subheadline ||
                  'Construimos mesas de comedor, credenzas y sillas mediante ensambles tradicionales de ebanistería.'
                }
                onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'subheadline', val)}
                className="text-[16px] sm:text-[17px] leading-[1.65] text-[#5C544B] max-w-[34rem] block"
              />

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href={d.primaryCtaHref || '#coleccion'}
                  onClick={(e) => {
                    if (isBuilder) e.preventDefault();
                    else trackEvent('cta_click');
                  }}
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-[8px] bg-[#1B1714] hover:bg-[#302A25] text-[#F6F3EC] text-[14px] font-medium transition-colors"
                >
                  <EditableText
                    isBuilder={isBuilder}
                    value={d.primaryCtaText || 'Ver colección de piezas'}
                    onCommit={(val) =>
                      handleInlineFieldUpdate(sec.id, sec.key, 'primaryCtaText', val)
                    }
                  />
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </a>

                <a
                  href={d.secondaryCtaHref || '#cotizar'}
                  onClick={(e) => {
                    if (isBuilder) e.preventDefault();
                  }}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-[8px] border border-[#1B1714]/15 bg-[#FCFBF8] hover:bg-[#EDE8DE] text-[#1B1714] text-[14px] transition-colors"
                >
                  <EditableText
                    isBuilder={isBuilder}
                    value={d.secondaryCtaText || 'Cotizar diseño a medida'}
                    onCommit={(val) =>
                      handleInlineFieldUpdate(sec.id, sec.key, 'secondaryCtaText', val)
                    }
                  />
                </a>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-[14px] overflow-hidden border border-[#1B1714]/12 bg-[#FCFBF8] p-3">
                <div className="relative rounded-[10px] overflow-hidden aspect-[16/10] bg-[#191614]">
                  <img
                    src={
                      d.heroImage ||
                      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=85'
                    }
                    alt={d.headline || 'Pieza principal'}
                    width={920}
                    height={580}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Quiet specification caption bar below the photograph */}
                <div className="pt-3 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px]">
                  <div className="space-y-0.5">
                    <EditableText
                      as="div"
                      isBuilder={isBuilder}
                      value={d.featuredLotName || 'Mesa de Comedor Aura · 8 puestos'}
                      onCommit={(val) =>
                        handleInlineFieldUpdate(sec.id, sec.key, 'featuredLotName', val)
                      }
                      className="font-serif text-[16px] text-[#1B1714]"
                    />
                    <EditableText
                      as="div"
                      isBuilder={isBuilder}
                      value={
                        d.featuredLotNotes ||
                        'Roble blanco macizo con acabado al aceite de linaza'
                      }
                      onCommit={(val) =>
                        handleInlineFieldUpdate(sec.id, sec.key, 'featuredLotNotes', val)
                      }
                      className="text-[12px] text-[#5C544B]"
                    />
                  </div>

                  <div className="flex items-center gap-4 font-mono text-[12px] tabular-nums">
                    <EditableText
                      isBuilder={isBuilder}
                      value={d.featuredLotAltitude || '240 × 110 × 76 cm'}
                      onCommit={(val) =>
                        handleInlineFieldUpdate(sec.id, sec.key, 'featuredLotAltitude', val)
                      }
                      className="text-[#82786D]"
                    />
                    <EditableText
                      isBuilder={isBuilder}
                      value={d.featuredLotScore || '$4.850.000 COP'}
                      onCommit={(val) =>
                        handleInlineFieldUpdate(sec.id, sec.key, 'featuredLotScore', val)
                      }
                      className="text-[#1B1714] font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    // 2. CRAFTSMANSHIP & MATERIALS SECTION
    if (key.startsWith('manifiesto_')) {
      return (
        <section id="oficio" className="border-b border-[#1B1714]/10 bg-[#EFECE4]/60">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-8 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="text-[13px] text-[#9E4F32] font-medium">
                Oficio y procedencia de la madera
              </div>
              <EditableText
                as="h2"
                isBuilder={isBuilder}
                value={
                  d.heading || 'Sin enchapes sintéticos ni producción en serie'
                }
                onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'heading', val)}
                className="font-serif text-[32px] sm:text-[42px] leading-[1.1] tracking-[-0.015em] text-[#1B1714] block"
              />
              <EditableText
                as="p"
                isBuilder={isBuilder}
                value={
                  d.statement ||
                  'Trabajamos exclusivamente con tablones enteros de bosques reforestados.'
                }
                onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'statement', val)}
                className="text-[16px] leading-[1.7] text-[#5C544B] max-w-[38rem] block"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#1B1714]/10">
                <div>
                  <EditableText
                    as="div"
                    isBuilder={isBuilder}
                    value={d.stat1Value || '100% Maciza'}
                    onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'stat1Value', val)}
                    className="font-serif text-[28px] text-[#1B1714] tabular-nums"
                  />
                  <EditableText
                    as="div"
                    isBuilder={isBuilder}
                    value={d.stat1Label || 'Tablones continuos sin aglomerados'}
                    onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'stat1Label', val)}
                    className="text-[13px] text-[#5C544B] mt-1"
                  />
                </div>
                <div>
                  <EditableText
                    as="div"
                    isBuilder={isBuilder}
                    value={d.stat2Value || '15 años'}
                    onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'stat2Value', val)}
                    className="font-serif text-[28px] text-[#1B1714] tabular-nums"
                  />
                  <EditableText
                    as="div"
                    isBuilder={isBuilder}
                    value={d.stat2Label || 'Garantía estructural en ensambles'}
                    onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'stat2Label', val)}
                    className="text-[13px] text-[#5C544B] mt-1"
                  />
                </div>
                <div>
                  <EditableText
                    as="div"
                    isBuilder={isBuilder}
                    value={d.stat3Value || '3 a 5 semanas'}
                    onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'stat3Value', val)}
                    className="font-serif text-[28px] text-[#1B1714] tabular-nums"
                  />
                  <EditableText
                    as="div"
                    isBuilder={isBuilder}
                    value={d.stat3Label || 'Fabricación artesanal bajo pedido'}
                    onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'stat3Label', val)}
                    className="text-[13px] text-[#5C544B] mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <figure className="rounded-[14px] overflow-hidden border border-[#1B1714]/12 bg-[#FCFBF8] p-3">
                <div className="rounded-[10px] overflow-hidden aspect-[4/3]">
                  <img
                    src={
                      d.editorialImage ||
                      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85'
                    }
                    alt="Taller de ebanistería"
                    width={600}
                    height={450}
                    className="w-full h-full object-cover"
                  />
                </div>
                <EditableText
                  as="figcaption"
                  isBuilder={isBuilder}
                  value={
                    d.editorialCaption ||
                    'Acabado manual con cera de abejas y aceite natural en nuestro taller de Bogotá.'
                  }
                  onCommit={(val) =>
                    handleInlineFieldUpdate(sec.id, sec.key, 'editorialCaption', val)
                  }
                  className="text-[12px] text-[#5C544B] pt-3 px-1 block"
                />
              </figure>
            </div>
          </div>
        </section>
      );
    }

    // 3. INTERACTIVE WOOD & FINISHES SELECTOR
    if (key.startsWith('selector_')) {
      const currentWood =
        activeWood === 'ligera'
          ? {
              title: d.profileLigeraTitle || 'Roble Blanco Alisado',
              altitude: d.profileLigeraAltitude || 'Densidad 740 kg/m³ · Tono miel pálido',
              notes:
                d.profileLigeraNotes ||
                'Veta recta y luminosa con poros abiertos sutiles. Aporta amplitud visual y calidez serena.',
              hardness: Number(d.profileLigeraAcidity ?? 85),
              grain: Number(d.profileLigeraBody ?? 88),
              warmth: Number(d.profileLigeraSweetness ?? 92),
              useCase: d.profileLigeraMethod || 'Comedores principales, escritorios y bibliotecas',
            }
          : activeWood === 'oscura'
          ? {
              title: d.profileOscuraTitle || 'Nogal Negro Americano',
              altitude: d.profileOscuraAltitude || 'Densidad 660 kg/m³ · Tono chocolate profundo',
              notes:
                d.profileOscuraNotes ||
                'Catedrales orgánicas con contrastes entre albura cremosa y corazón oscuro.',
              hardness: Number(d.profileOscuraAcidity ?? 78),
              grain: Number(d.profileOscuraBody ?? 94),
              warmth: Number(d.profileOscuraSweetness ?? 88),
              useCase: d.profileOscuraMethod || 'Credenzas de autor, mesas de juntas y cabeceros',
            }
          : {
              title: d.profileMediaTitle || 'Teca Natural Aceitada',
              altitude: d.profileMediaAltitude || 'Densidad 680 kg/m³ · Tono ámbar dorado',
              notes:
                d.profileMediaNotes ||
                'Rica en aceites naturales que la protegen de la humedad y los cambios térmicos.',
              hardness: Number(d.profileMediaAcidity ?? 90),
              grain: Number(d.profileMediaBody ?? 82),
              warmth: Number(d.profileMediaSweetness ?? 95),
              useCase: d.profileMediaMethod || 'Terrazas cubiertas, salas de estar y poltronas',
            };

      return (
        <section id="maderas" className="border-b border-[#1B1714]/10 bg-[#191614] text-[#EFE9DE]">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-8 py-20 lg:py-28">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
              <div className="space-y-3">
                <div className="text-[13px] text-[#9E4F32]">
                  Muestrario de maderas macizas
                </div>
                <EditableText
                  as="h2"
                  isBuilder={isBuilder}
                  value={d.heading || 'La materia prima define cada espacio'}
                  onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'heading', val)}
                  className="font-serif text-[32px] sm:text-[42px] leading-[1.1] text-[#EFE9DE] block"
                />
                <EditableText
                  as="p"
                  isBuilder={isBuilder}
                  value={
                    d.subheading ||
                    'Puedes solicitar cualquiera de nuestras piezas en tres especies seleccionadas por su estabilidad y veta.'
                  }
                  onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'subheading', val)}
                  className="text-[15px] text-[#AAA398] max-w-[36rem] block"
                />
              </div>

              <div
                role="tablist"
                aria-label="Selector de especie de madera"
                className="inline-flex p-1 rounded-[10px] bg-[#24201D] border border-white/10 self-start"
              >
                {[
                  { id: 'ligera', label: 'Roble Blanco' },
                  { id: 'media', label: 'Teca Natural' },
                  { id: 'oscura', label: 'Nogal Negro' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeWood === tab.id}
                    onClick={() => setActiveWood(tab.id as any)}
                    className={`px-4 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
                      activeWood === tab.id
                        ? 'bg-[#EFE9DE] text-[#191614]'
                        : 'text-[#AAA398] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 rounded-[14px] bg-[#211D1A] border border-white/10">
              <div className="lg:col-span-7 space-y-4">
                <div className="font-mono text-[12px] text-[#9E4F32] tabular-nums">
                  {currentWood.altitude}
                </div>
                <h3 className="font-serif text-[28px] sm:text-[32px] text-[#EFE9DE]">
                  {currentWood.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-[#AAA398] max-w-[38rem]">
                  {currentWood.notes}
                </p>
                <div className="pt-2 text-[13px] text-[#EFE9DE]">
                  <span className="text-[#82786D]">Aplicación recomendada: </span>
                  <span>{currentWood.useCase}</span>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col justify-center space-y-5">
                {[
                  { label: 'Resistencia a humedad y uso diario', value: currentWood.hardness },
                  { label: 'Pronunciación de veta y textura', value: currentWood.grain },
                  { label: 'Estabilidad estructural en gran formato', value: currentWood.warmth },
                ].map((metric) => (
                  <div key={metric.label} className="space-y-1.5">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[#AAA398]">{metric.label}</span>
                      <span className="font-mono text-[#EFE9DE] tabular-nums">{metric.value}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#9E4F32]"
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      );
    }

    // 4. FURNITURE CATALOG SECTION (DYNAMIC COLLECTION)
    if (key.startsWith('vitrina_')) {
      return (
        <section id="coleccion" className="border-b border-[#1B1714]/10">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-8 py-20 lg:py-28">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="space-y-2">
                <EditableText
                  as="div"
                  isBuilder={isBuilder}
                  value={d.badgeText || 'Colección permanente 2026'}
                  onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'badgeText', val)}
                  className="text-[13px] font-medium text-[#9E4F32]"
                />
                <EditableText
                  as="h2"
                  isBuilder={isBuilder}
                  value={d.heading || 'Piezas de serie corta hechas a mano'}
                  onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'heading', val)}
                  className="font-serif text-[32px] sm:text-[42px] leading-[1.1] text-[#1B1714] block"
                />
                <EditableText
                  as="p"
                  isBuilder={isBuilder}
                  value={
                    d.subheading ||
                    'Todas las piezas pueden fabricarse en las medidas exactas de tu comedor o sala.'
                  }
                  onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'subheading', val)}
                  className="text-[15px] text-[#5C544B] max-w-[38rem] block"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['TODOS', 'Roble', 'Nogal', 'Teca'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setWoodFilter(filter)}
                    className={`h-9 px-3.5 rounded-[8px] text-[13px] transition-colors border ${
                      woodFilter === filter
                        ? 'bg-[#1B1714] text-[#F6F3EC] border-[#1B1714]'
                        : 'bg-[#FCFBF8] text-[#5C544B] border-[#1B1714]/15 hover:border-[#1B1714]'
                    }`}
                  >
                    {filter === 'TODOS' ? 'Todas las piezas' : filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPieces.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[14px] bg-[#FCFBF8] border border-[#1B1714]/12 overflow-hidden flex flex-col justify-between hover:border-[#1B1714]/35 transition-colors"
                >
                  <div>
                    <div className="relative aspect-[16/11] bg-[#191614] overflow-hidden">
                      <img
                        src={
                          item.imageUrl ||
                          'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=900&q=85'
                        }
                        alt={item.title}
                        width={440}
                        height={300}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="p-6 space-y-2.5">
                      <div className="flex items-center justify-between text-[12px] text-[#82786D]">
                        <span>{item.category || item.region || 'Mobiliario'}</span>
                        <span className="font-mono tabular-nums">
                          {item.dimensions || item.altitude}
                        </span>
                      </div>
                      <h3 className="font-serif text-[22px] text-[#1B1714] leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-[13px] text-[#5C544B] leading-relaxed">
                        {item.description || item.tastingNotes}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-[#1B1714]/10 bg-[#F6F3EC]/50 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[14px] font-medium text-[#1B1714] tabular-nums">
                        {item.priceCop}
                      </div>
                      <div className="text-[11px] text-[#82786D]">
                        {item.wood || item.roast} · {item.leadTime || item.weight}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPiece(item)}
                      className="h-9 px-3.5 rounded-[8px] border border-[#1B1714]/20 bg-[#FCFBF8] hover:bg-[#1B1714] hover:text-[#F6F3EC] text-[#1B1714] text-[12px] font-medium transition-colors"
                    >
                      Ficha técnica
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      );
    }

    // 5. SHOWROOM & WORKSHOP SPACES
    if (key.startsWith('espacios_') || key.startsWith('experiencia_')) {
      return (
        <section id="espacios" className="border-b border-[#1B1714]/10 bg-[#EFECE4]/50">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-8 py-20 lg:py-28">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="space-y-2">
                <div className="text-[13px] font-medium text-[#9E4F32]">
                  Salas de exhibición y taller abierto
                </div>
                <EditableText
                  as="h2"
                  isBuilder={isBuilder}
                  value={d.heading || 'Conoce la textura de la madera en persona'}
                  onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'heading', val)}
                  className="font-serif text-[32px] sm:text-[42px] leading-[1.1] text-[#1B1714] block"
                />
                <EditableText
                  as="p"
                  isBuilder={isBuilder}
                  value={
                    d.subheading ||
                    'Recibimos visitas para mostrarte muestrarios de madera, textiles en lino belga y piezas terminadas.'
                  }
                  onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'subheading', val)}
                  className="text-[15px] text-[#5C544B] max-w-[38rem] block"
                />
              </div>

              <a
                href="#cotizar"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-[8px] border border-[#1B1714] text-[#1B1714] hover:bg-[#1B1714] hover:text-[#F6F3EC] text-[13px] font-medium transition-colors self-start"
              >
                <span>{d.highlightLabel || 'Agendar cita con diseñador'}</span>
                <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {spaces.map((store) => (
                <div
                  key={store.id}
                  className="rounded-[14px] bg-[#FCFBF8] border border-[#1B1714]/12 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[16/10] bg-[#191614] overflow-hidden relative">
                      <img
                        src={store.imageUrl}
                        alt={store.title}
                        width={420}
                        height={260}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6 space-y-2">
                      <div className="text-[12px] text-[#82786D]">{store.city}</div>
                      <h3 className="font-serif text-[21px] text-[#1B1714]">{store.title}</h3>
                      <p className="text-[13px] text-[#5C544B]">{store.address}</p>
                      <p className="pt-1 text-[13px] text-[#5C544B] leading-relaxed">
                        {store.specialty}
                      </p>
                    </div>
                  </div>
                  <div className="px-6 py-3.5 border-t border-[#1B1714]/10 text-[12px] font-mono text-[#82786D] tabular-nums">
                    {store.hours}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    // 6. CUSTOM QUOTE & SHOWROOM VISIT FORM
    if (key.startsWith('cotizacion_') || key.startsWith('reserva_')) {
      return (
        <section id="cotizar" className="border-b border-[#1B1714]/10">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-8 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-5">
              <div className="text-[13px] font-medium text-[#9E4F32]">
                Diseño a medida y proyectos residenciales
              </div>
              <EditableText
                as="h2"
                isBuilder={isBuilder}
                value={d.heading || 'Cotiza una pieza en las medidas de tu espacio'}
                onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'heading', val)}
                className="font-serif text-[32px] sm:text-[40px] leading-[1.1] text-[#1B1714] block"
              />
              <EditableText
                as="p"
                isBuilder={isBuilder}
                value={
                  d.subheading ||
                  'Compártenos qué mueble buscas o las dimensiones de tu comedor. Nuestro equipo te enviará planos preliminares y presupuesto.'
                }
                onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'subheading', val)}
                className="text-[15px] leading-relaxed text-[#5C544B] block"
              />

              <div className="p-6 rounded-[14px] bg-[#EFECE4]/70 border border-[#1B1714]/10 space-y-4 text-[13px]">
                <div>
                  <div className="font-medium text-[#1B1714]">Entregas e instalación</div>
                  <EditableText
                    as="div"
                    isBuilder={isBuilder}
                    value={
                      d.locationNote ||
                      'Entregas con instalación propia en Bogotá, Sabana, Medellín y Eje Cafetero.'
                    }
                    onCommit={(val) =>
                      handleInlineFieldUpdate(sec.id, sec.key, 'locationNote', val)
                    }
                    className="text-[#5C544B] mt-1 leading-relaxed"
                  />
                </div>
                <div className="pt-3 border-t border-[#1B1714]/10">
                  <div className="font-medium text-[#1B1714]">Horario de atención</div>
                  <EditableText
                    as="div"
                    isBuilder={isBuilder}
                    value={d.conciergeHours || 'Lunes a Sábado · 9:30 a.m. a 6:30 p.m.'}
                    onCommit={(val) =>
                      handleInlineFieldUpdate(sec.id, sec.key, 'conciergeHours', val)
                    }
                    className="text-[#5C544B] mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-[16px] bg-[#FCFBF8] border border-[#1B1714]/12 p-6 sm:p-8">
                <EditableText
                  as="h3"
                  isBuilder={isBuilder}
                  value={d.formTitle || 'Solicitar cotización o agendar visita al showroom'}
                  onCommit={(val) => handleInlineFieldUpdate(sec.id, sec.key, 'formTitle', val)}
                  className="font-serif text-[24px] text-[#1B1714] mb-6 block"
                />

                {leadSubmitted ? (
                  <div className="p-6 rounded-[12px] bg-[#EFECE4] border border-[#1B1714]/15 text-[#1B1714] space-y-2">
                    <div className="flex items-center gap-2 font-medium text-[15px]">
                      <Check className="w-4 h-4 text-[#9E4F32]" strokeWidth={1.5} />
                      <span>Solicitud recibida por nuestro equipo de diseño</span>
                    </div>
                    <p className="text-[13px] text-[#5C544B]">
                      Te contactaremos hoy mismo con disponibilidad de maderas, tiempos de taller y cotización formal.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleLeadSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="lead-name"
                          className="block text-[12px] font-medium text-[#1B1714] mb-1"
                        >
                          Nombre completo
                        </label>
                        <input
                          id="lead-name"
                          type="text"
                          required
                          value={leadForm.fullName}
                          onChange={(e) =>
                            setLeadForm({ ...leadForm, fullName: e.target.value })
                          }
                          placeholder="Tu nombre"
                          className="w-full h-10 px-3 rounded-[8px] border border-[#1B1714]/15 bg-[#F6F3EC] text-[13px]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="lead-email"
                          className="block text-[12px] font-medium text-[#1B1714] mb-1"
                        >
                          Correo electrónico
                        </label>
                        <input
                          id="lead-email"
                          type="email"
                          required
                          value={leadForm.email}
                          onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                          placeholder="correo@ejemplo.com"
                          className="w-full h-10 px-3 rounded-[8px] border border-[#1B1714]/15 bg-[#F6F3EC] text-[13px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label
                          htmlFor="lead-phone"
                          className="block text-[12px] font-medium text-[#1B1714] mb-1"
                        >
                          Teléfono / WhatsApp
                        </label>
                        <input
                          id="lead-phone"
                          type="tel"
                          value={leadForm.phone}
                          onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                          placeholder="+57 310 000 0000"
                          className="w-full h-10 px-3 rounded-[8px] border border-[#1B1714]/15 bg-[#F6F3EC] text-[13px]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="lead-city"
                          className="block text-[12px] font-medium text-[#1B1714] mb-1"
                        >
                          Ciudad de entrega
                        </label>
                        <select
                          id="lead-city"
                          value={leadForm.city}
                          onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })}
                          className="w-full h-10 px-3 rounded-[8px] border border-[#1B1714]/15 bg-[#F6F3EC] text-[13px]"
                        >
                          <option value="Bogotá D.C.">Bogotá D.C.</option>
                          <option value="Medellín">Medellín</option>
                          <option value="Cali">Cali</option>
                          <option value="Cartagena">Cartagena</option>
                          <option value="Otra ciudad">Otra ciudad</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="lead-wood"
                          className="block text-[12px] font-medium text-[#1B1714] mb-1"
                        >
                          Madera o pieza de interés
                        </label>
                        <select
                          id="lead-wood"
                          value={leadForm.preferredWood}
                          onChange={(e) =>
                            setLeadForm({ ...leadForm, preferredWood: e.target.value })
                          }
                          className="w-full h-10 px-3 rounded-[8px] border border-[#1B1714]/15 bg-[#F6F3EC] text-[13px]"
                        >
                          <option value="Roble Blanco Alisado">Roble Blanco Alisado</option>
                          <option value="Nogal Negro Americano">Nogal Negro Americano</option>
                          <option value="Teca Natural Aceitada">Teca Natural Aceitada</option>
                          {pieces.map((p) => (
                            <option key={p.id} value={p.title}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="lead-message"
                        className="block text-[12px] font-medium text-[#1B1714] mb-1"
                      >
                        Dimensiones deseadas o comentarios
                      </label>
                      <textarea
                        id="lead-message"
                        rows={3}
                        value={leadForm.message}
                        onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                        placeholder="Ej. Busco una mesa de comedor de 220 x 100 cm en roble claro para 8 personas..."
                        className="w-full p-3 rounded-[8px] border border-[#1B1714]/15 bg-[#F6F3EC] text-[13px]"
                      />
                    </div>

                    {leadError ? (
                      <div className="text-[12px] text-red-700">{leadError}</div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={submittingLead}
                      className="h-11 px-6 rounded-[8px] bg-[#1B1714] hover:bg-[#302A25] text-[#F6F3EC] text-[14px] font-medium transition-colors"
                    >
                      {submittingLead
                        ? 'Enviando solicitud...'
                        : d.submitButtonText || 'Enviar solicitud al taller'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      );
    }

    // 7. MODULAR CUSTOM SECTIONS / WIDGETS ADDED BY THE CLIENT IN THE BUILDER
    const widgets: any[] = Array.isArray(d.widgets) ? d.widgets : [];
    const colsCount = String(d.columnsCount || '3');
    const gridColsClass =
      colsCount === '1'
        ? 'grid-cols-1'
        : colsCount === '2'
        ? 'grid-cols-1 md:grid-cols-2'
        : colsCount === '4'
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 md:grid-cols-3';

    return (
      <section className="border-b border-[#1B1714]/10">
        <div className="max-w-[1360px] mx-auto px-6 sm:px-8 py-20 space-y-10">
          {(d.heading || d.headline || d.subheading || d.body) && (
            <div className="max-w-[40rem] space-y-3">
              {(d.heading || d.headline) && (
                <EditableText
                  as="h2"
                  isBuilder={isBuilder}
                  value={d.heading || d.headline}
                  onCommit={(val) =>
                    handleInlineFieldUpdate(
                      sec.id,
                      sec.key,
                      d.heading !== undefined ? 'heading' : 'headline',
                      val,
                    )
                  }
                  className="font-serif text-[30px] sm:text-[38px] leading-[1.12] text-current block"
                />
              )}
              {(d.subheading || d.body) && (
                <EditableText
                  as="p"
                  isBuilder={isBuilder}
                  value={d.subheading || d.body}
                  onCommit={(val) =>
                    handleInlineFieldUpdate(
                      sec.id,
                      sec.key,
                      d.subheading !== undefined ? 'subheading' : 'body',
                      val,
                    )
                  }
                  className="text-[15px] opacity-80 leading-relaxed block"
                />
              )}
            </div>
          )}

          {widgets.length > 0 ? (
            <div className={`grid ${gridColsClass} gap-6`}>
              {widgets.map((w: any, wIdx: number) => {
                const spanNum = Number(w.colSpan || 1);
                const colSpanClass =
                  spanNum === 3
                    ? 'md:col-span-3'
                    : spanNum === 2
                    ? 'md:col-span-2'
                    : 'col-span-1';

                return (
                  <div
                    key={w.id || wIdx}
                    style={{
                      backgroundColor: w.cardBg || '#FCFBF8',
                      color: w.cardText || '#1B1714',
                    }}
                    className={`${colSpanClass} rounded-[14px] border border-[#1B1714]/12 p-6 flex flex-col justify-between space-y-4`}
                  >
                    <div className="space-y-3">
                      {w.imageUrl ? (
                        <div className="rounded-[10px] overflow-hidden aspect-[16/10] bg-[#191614] mb-3">
                          <img
                            src={w.imageUrl}
                            alt={w.title || 'Imagen'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}
                      {w.badge ? (
                        <div className="font-mono text-[11px] opacity-70">{w.badge}</div>
                      ) : null}
                      {w.metric ? (
                        <div className="font-serif text-[30px] tabular-nums">{w.metric}</div>
                      ) : null}
                      <EditableText
                        as="h3"
                        isBuilder={isBuilder}
                        value={w.title || 'Título del bloque'}
                        onCommit={(val) => {
                          const next = [...widgets];
                          next[wIdx] = { ...next[wIdx], title: val };
                          handleWidgetUpdate(sec.id, sec.key, next);
                        }}
                        className="font-serif text-[21px] leading-snug block"
                      />
                      <EditableText
                        as="p"
                        isBuilder={isBuilder}
                        value={w.body || ''}
                        onCommit={(val) => {
                          const next = [...widgets];
                          next[wIdx] = { ...next[wIdx], body: val };
                          handleWidgetUpdate(sec.id, sec.key, next);
                        }}
                        className="text-[14px] opacity-80 leading-relaxed block"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F3EC] text-[#1B1714] selection:bg-[#1B1714] selection:text-[#F6F3EC]">
      {/* Optional Top Bar */}
      {global.announcementText ? (
        <div
          style={{ backgroundColor: global.espressoColor || '#191614' }}
          className="text-[#EFE9DE] text-[12px] py-2 px-4 text-center"
        >
          <span>{global.announcementText}</span>
        </div>
      ) : null}

      {isPreview && !isBuilder ? (
        <div className="bg-[#191614] text-[#EFE9DE] px-6 py-2 text-[12px] flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-[#9E4F32]" strokeWidth={1.5} />
            <span>Vista previa de borrador</span>
          </div>
          <Link href={`/portal?project=${projectSlug}`} className="underline">
            Volver al editor
          </Link>
        </div>
      ) : null}

      {/* Minimalist Architectural Header */}
      <header className="sticky top-0 z-20 bg-[#F6F3EC]/95 backdrop-blur-sm border-b border-[#1B1714]/10">
        <div className="max-w-[1360px] mx-auto px-6 sm:px-8 h-16 flex items-center justify-between gap-6">
          <div>
            <div className="font-serif text-[20px] leading-none text-[#1B1714]">
              {global.brandName || 'Atelier · Madera & Materia'}
            </div>
            {global.brandMonogram ? (
              <div className="text-[11px] text-[#82786D] mt-0.5">{global.brandMonogram}</div>
            ) : null}
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[14px] text-[#5C544B]">
            {headerLinks.map((lnk: any, idx: number) => (
              <a
                key={lnk.id || idx}
                href={lnk.href || '#'}
                className="hover:text-[#1B1714] transition-colors"
              >
                {lnk.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent('whatsapp_click')}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-[#1B1714] hover:bg-[#302A25] text-[#F6F3EC] text-[13px] font-medium transition-colors"
            >
              <span>{navConfig.headerCtaText || 'Agendar visita'}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Dynamic Ordered Sections */}
      <main>
        {orderedSections.map((sec, idx) =>
          renderSectionFrame(sec, idx, orderedSections.length, renderSectionContent(sec)),
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="bg-[#191614] text-[#AAA398] border-t border-white/10">
        <div className="max-w-[1360px] mx-auto px-6 sm:px-8 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-[13px]">
          <div className="space-y-1">
            <div className="font-serif text-[18px] text-[#EFE9DE]">
              {global.brandName || 'Atelier · Madera & Materia'}
            </div>
            <div className="text-[12px] text-[#82786D]">
              {global.footerAddress || 'Bogotá D.C. · Taller y Sala de Exhibición'}
            </div>
          </div>
          <div className="flex items-center gap-6 text-[12px]">
            <a
              href="https://webproai.tech/login"
              className="hover:text-[#EFE9DE] transition-colors"
            >
              Administración del sitio
            </a>
          </div>
        </div>
      </footer>

      {/* Technical Specification Modal */}
      {selectedPiece ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPiece(null)}
        >
          <div
            className="bg-[#FCFBF8] text-[#1B1714] border border-[#1B1714]/15 rounded-[16px] max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-56 bg-[#191614]">
              <img
                src={selectedPiece.imageUrl}
                alt={selectedPiece.title}
                width={520}
                height={240}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                aria-label="Cerrar ficha técnica"
                onClick={() => setSelectedPiece(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-[12px] font-mono text-[#82786D] tabular-nums">
                <span>
                  {selectedPiece.category || 'Mobiliario'} · {selectedPiece.wood}
                </span>
                <span>{selectedPiece.dimensions}</span>
              </div>
              <h3 className="font-serif text-[26px] text-[#1B1714]">{selectedPiece.title}</h3>
              <p className="text-[14px] text-[#5C544B] leading-relaxed">
                {selectedPiece.description}
              </p>
              <div className="p-4 rounded-[10px] bg-[#F6F3EC] text-[13px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#82786D]">Tiempo de entrega</span>
                  <span className="font-medium text-[#1B1714]">{selectedPiece.leadTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#82786D]">Valor de la pieza</span>
                  <span className="font-mono font-medium text-[#1B1714] tabular-nums">
                    {selectedPiece.priceCop} COP
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPiece(null)}
                  className="h-9 px-4 rounded-[8px] border border-[#1B1714]/15 text-[13px]"
                >
                  Cerrar
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent('whatsapp_click')}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-[#1B1714] text-[#F6F3EC] text-[13px] font-medium"
                >
                  <span>Encargar por WhatsApp</span>
                  <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const JuanValdezSiteInner = ClientSiteRenderer;

export default function ClientSiteDefaultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F3EC] text-[#5C544B] flex items-center justify-center text-sm">
          Cargando colección...
        </div>
      }
    >
      <ClientSiteRenderer />
    </Suspense>
  );
}
