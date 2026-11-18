// 즐겨찾기 별 버튼 (PRD F12). 보이는 크기는 작아도 누르는 영역은 44×44
import { Star } from 'lucide-react';
import styles from './StarButton.module.css';

interface Props {
  on: boolean;
  name: string;
  onToggle(): void;
  className?: string;
}

export function StarButton({ on, name, onToggle, className }: Props) {
  return (
    <button
      type="button"
      className={`${styles.star} ${className ?? ''}`}
      aria-pressed={on}
      aria-label={on ? `${name} 즐겨찾기 해제` : `${name} 즐겨찾기 추가`}
      onClick={onToggle}
    >
      <Star size={18} strokeWidth={1.8} fill={on ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  );
}
