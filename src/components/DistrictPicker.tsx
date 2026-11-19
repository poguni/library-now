// 지역 선택 (PRD F2, M5): 상단 바의 버튼 하나 → 펼치면 구 칩 25개 (여러 개 선택)
import { ChevronDown, MapPin } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import styles from './DistrictPicker.module.css';

interface Props {
  districts: readonly string[];
  offDistricts: ReadonlySet<string>;
  /** 끈 구 목록을 통째로 바꿈 */
  onChange(off: string[]): void;
}

export function DistrictPicker({ districts, offDistricts, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const sorted = [...districts].sort((a, b) => a.localeCompare(b, 'ko'));
  const on = sorted.filter((d) => !offDistricts.has(d));
  const summary =
    on.length === sorted.length
      ? `전체 ${sorted.length}개 구`
      : on.length === 0
        ? '선택 없음'
        : on.length === 1
          ? on[0]
          : `${on.length}개 구`;

  // 바깥을 누르거나 Esc를 누르면 닫힘
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (d: string) => {
    const next = new Set(offDistricts);
    if (!next.delete(d)) next.add(d);
    onChange([...next]);
  };

  return (
    <div className={styles.wrap} ref={wrap}>
      <button
        ref={button}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <MapPin size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className={styles.label}>지역</span>
        <b>{summary}</b>
        <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <div className={styles.panel} id={panelId} hidden={!open}>
        <div className={styles.actions}>
          <p>
            <b>{on.length}</b> / {sorted.length}개 구
          </p>
          <button type="button" onClick={() => onChange([])}>
            전체 선택
          </button>
          <button type="button" onClick={() => onChange([...sorted])}>
            전체 해제
          </button>
        </div>
        <div className={styles.chips} role="group" aria-label="지역 선택">
          {sorted.map((d) => (
            <button
              key={d}
              type="button"
              className={styles.chip}
              aria-pressed={!offDistricts.has(d)}
              onClick={() => toggle(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
