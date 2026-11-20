// 마커·출발지·팝업 마크업. Leaflet과 카카오맵이 같은 모양(leaflet.css의 .ln-* 클래스)을 씁니다.
import type { MapMarker, MapOrigin } from './types';

const BOOK_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/></svg>';

const ORIGIN_SVG: Record<MapOrigin['kind'], string> = {
  home: '<path d="M3 11 12 4l9 7M5 10v10h14V10"/>',
  work: '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="M16 20V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v15"/>',
  current:
    '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>',
};

export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/** 도서관 마커 안쪽 (상태색 점 + 상태 기호 + 꼬리표) */
export function markerHtml(m: MapMarker): string {
  return `<span class="ln-dot">${BOOK_SVG}<span class="ln-sym" aria-hidden="true"></span></span><span class="ln-tag">${escapeHtml(m.tag)}</span>`;
}

export function originHtml(o: MapOrigin): string {
  return `<span class="ln-odot"><svg viewBox="0 0 24 24" aria-hidden="true">${ORIGIN_SVG[o.kind]}</svg></span><span class="ln-otag">${escapeHtml(o.name)}</span>`;
}

export function clusterHtml(count: number): string {
  return `<span class="ln-cnum">${count}</span>`;
}

export function popupContent(m: MapMarker): HTMLElement {
  const box = document.createElement('div');
  const name = document.createElement('b');
  name.textContent = m.name;
  const badge = document.createElement('span');
  badge.className = 'ln-badge';
  badge.dataset.tone = m.tone;
  badge.textContent = m.badge;
  const line = document.createElement('span');
  line.className = 'ln-pop-line';
  line.textContent = m.summary;
  box.append(name, badge, line);
  return box;
}
