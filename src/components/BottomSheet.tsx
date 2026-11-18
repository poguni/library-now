// 스마트폰 바텀 시트 (PRD 8.4, DESIGN 4.3·5.10): 낮게 / 기본 / 전체 3단계로 멈춤
// 손잡이를 끌거나, 손잡이 버튼을 눌러(키보드 포함) 단계를 바꿉니다.
import { type ReactNode, useRef, useState } from 'react';
import styles from './BottomSheet.module.css';

export type SheetSnap = 'low' | 'mid' | 'full';

const LOW = 120;
const MID = 416;
const ORDER: SheetSnap[] = ['low', 'mid', 'full'];
const LABEL: Record<SheetSnap, string> = { low: '낮게', mid: '기본', full: '전체' };

interface Props {
  snap: SheetSnap;
  onSnap(snap: SheetSnap): void;
  title: ReactNode;
  children: ReactNode;
}

export function BottomSheet({ snap, onSnap, title, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  const maxHeight = () => ref.current?.parentElement?.clientHeight ?? 800;
  const heightOf = (s: SheetSnap) =>
    s === 'low' ? LOW : s === 'mid' ? Math.min(MID, maxHeight()) : maxHeight();

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, h: ref.current?.offsetHeight ?? heightOf(snap), moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - e.clientY;
    if (Math.abs(dy) > 5) d.moved = true;
    if (d.moved) setDragHeight(Math.max(LOW, Math.min(maxHeight(), d.h + dy)));
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    justDragged.current = Boolean(d?.moved);
    if (!d?.moved || dragHeight === null) return;
    const nearest = ORDER.reduce((a, b) =>
      Math.abs(heightOf(b) - dragHeight) < Math.abs(heightOf(a) - dragHeight) ? b : a,
    );
    setDragHeight(null);
    onSnap(nearest);
  };

  /** 끌지 않고 누르면 다음 단계로 */
  const onClick = () => {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    onSnap(ORDER[(ORDER.indexOf(snap) + 1) % ORDER.length]!);
  };

  return (
    <div
      ref={ref}
      className={`${styles.sheet} ln-sheet`}
      data-snap={snap}
      data-dragging={dragHeight !== null || undefined}
      style={dragHeight !== null ? { height: dragHeight } : undefined}
    >
      <button
        type="button"
        className={styles.handle}
        aria-label={`목록 높이: ${LABEL[snap]}. 눌러서 바꾸기`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setDragHeight(null);
        }}
        onClick={onClick}
      >
        <i aria-hidden="true" />
      </button>
      <div className={styles.title}>{title}</div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
