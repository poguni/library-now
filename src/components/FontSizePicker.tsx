// 글자 크기 메뉴: 상단 바의 버튼 하나 → 펼치면 보통·크게·아주 크게
import { ALargeSmall, Check } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { FONT_SCALE, FONT_SIZE_LABEL, FONT_SIZES, type FontSize } from '../state/fontSize';
import styles from './FontSizePicker.module.css';

interface Props {
  value: FontSize;
  onChange(size: FontSize): void;
}

export function FontSizePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

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

  return (
    <div className={styles.wrap} ref={wrap}>
      <button
        ref={button}
        type="button"
        className={styles.trigger}
        aria-label={`글자 크기: ${FONT_SIZE_LABEL[value]}`}
        aria-expanded={open}
        aria-controls={menuId}
        data-tip="글자 크기"
        data-tip-pos="end"
        onClick={() => setOpen((o) => !o)}
      >
        <ALargeSmall size={20} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <div className={styles.panel} id={menuId} hidden={!open}>
        <p className={styles.title}>글자 크기</p>
        <div role="group" aria-label="글자 크기">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={styles.option}
              aria-pressed={value === size}
              onClick={() => {
                onChange(size);
                setOpen(false);
                button.current?.focus();
              }}
            >
              {/* 미리보기: 지금 크기와 상관없이 그 단계의 크기로 보여 줍니다 */}
              <span
                className={styles.sample}
                style={{ fontSize: `${16 * FONT_SCALE[size]}px` }}
                aria-hidden="true"
              >
                가
              </span>
              <span className={styles.name}>{FONT_SIZE_LABEL[size]}</span>
              {value === size && <Check size={16} strokeWidth={2} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
