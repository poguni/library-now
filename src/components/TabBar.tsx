// 스마트폰 아래 탭 바 (DESIGN 5.10): 지도 · 목록 · 달력 · 설정
import { CalendarDays, List, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import styles from './TabBar.module.css';

export type PhoneTab = 'map' | 'list' | 'calendar' | 'settings';

const TABS: { key: PhoneTab; label: string; Icon: typeof MapIcon }[] = [
  { key: 'map', label: '지도', Icon: MapIcon },
  { key: 'list', label: '목록', Icon: List },
  { key: 'calendar', label: '달력', Icon: CalendarDays },
  { key: 'settings', label: '설정', Icon: SlidersHorizontal },
];

interface Props {
  active: PhoneTab;
  onTab(tab: PhoneTab): void;
}

export function TabBar({ active, onTab }: Props) {
  return (
    <nav className={`${styles.bar} ln-tabbar`} aria-label="화면 전환">
      {TABS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          aria-current={active === key ? 'page' : undefined}
          onClick={() => onTab(key)}
        >
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  );
}
