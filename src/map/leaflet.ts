// MapProvider의 Leaflet + OpenStreetMap 구현 (PRD F1, 7.1, DESIGN 5.6·5.7)
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './leaflet.css';
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL } from './config';
import type { CreateMap, MapMarker, MapOrigin } from './types';

const BOOK_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/></svg>';

const ORIGIN_SVG: Record<MapOrigin['kind'], string> = {
  home: '<path d="M3 11 12 4l9 7M5 10v10h14V10"/>',
  work: '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="M16 20V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v15"/>',
  current:
    '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>',
};

/** 꼬리표를 보이기 시작하는 확대 수준 (그보다 멀면 마커가 겹침) */
const TAG_MIN_ZOOM = 14;

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

function icon(m: MapMarker): L.DivIcon {
  return L.divIcon({
    className: 'ln-mk',
    html: `<span class="ln-dot">${BOOK_SVG}<span class="ln-sym" aria-hidden="true"></span></span><span class="ln-tag">${escapeHtml(m.tag)}</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function originIcon(o: MapOrigin): L.DivIcon {
  return L.divIcon({
    className: 'ln-origin',
    html: `<span class="ln-odot"><svg viewBox="0 0 24 24" aria-hidden="true">${ORIGIN_SVG[o.kind]}</svg></span><span class="ln-otag">${escapeHtml(o.name)}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function popupContent(m: MapMarker): HTMLElement {
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

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const createLeafletMap: CreateMap = (container, { center, zoom, onSelect }) => {
  const map = L.map(container, {
    center: [center.lat, center.lng],
    zoom,
    zoomControl: false,
  });
  map.attributionControl.setPrefix(false);
  L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: TILE_MAX_ZOOM }).addTo(map);

  const updateZoomClass = () => container.classList.toggle('ln-far', map.getZoom() < TAG_MIN_ZOOM);
  map.on('zoomend', updateZoomClass);
  updateZoomClass();

  const resize = new ResizeObserver(() => map.invalidateSize());
  resize.observe(container);

  const entries = new Map<string, { marker: L.Marker; data: MapMarker; key: string }>();
  let selected: string | null = null;
  let hovered: string | null = null;
  const popup = L.popup({
    className: 'ln-pop',
    offset: [0, -18],
    maxWidth: 240,
    minWidth: 200,
    autoPan: false,
  });

  let originMarker: L.Marker | null = null;
  let route: L.Polyline | null = null;

  function drawRoute() {
    route?.remove();
    route = null;
    const target = selected ? entries.get(selected) : undefined;
    if (!originMarker || !target) return;
    route = L.polyline([originMarker.getLatLng(), target.marker.getLatLng()], {
      className: 'ln-route',
      interactive: false,
    }).addTo(map);
  }

  function decorate(id: string) {
    const entry = entries.get(id);
    const el = entry?.marker.getElement();
    if (!entry || !el) return;
    const isSel = id === selected;
    el.dataset.tone = entry.data.tone;
    el.classList.toggle('is-sel', isSel);
    el.classList.toggle('is-hover', id === hovered);
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${entry.data.name}, ${entry.data.badge}`);
    el.setAttribute('aria-pressed', String(isSel));
    entry.marker.setZIndexOffset(isSel ? 1000 : id === hovered ? 500 : 0);
  }

  function openPopup(id: string) {
    const entry = entries.get(id);
    if (!entry) return;
    popup.setLatLng(entry.marker.getLatLng()).setContent(popupContent(entry.data)).openOn(map);
  }

  return {
    setMarkers(markers) {
      const ids = new Set(markers.map((m) => m.id));
      for (const [id, entry] of entries) {
        if (ids.has(id)) continue;
        entry.marker.remove();
        entries.delete(id);
        if (id === selected) {
          selected = null;
          map.closePopup(popup);
          drawRoute();
        }
      }
      for (const m of markers) {
        const key = `${m.tone}|${m.tag}|${m.lat}|${m.lng}`;
        const entry = entries.get(m.id);
        if (!entry) {
          const marker = L.marker([m.lat, m.lng], { icon: icon(m), keyboard: true }).addTo(map);
          marker.on('click', () => onSelect(m.id));
          entries.set(m.id, { marker, data: m, key });
        } else {
          entry.data = m;
          if (entry.key !== key) {
            entry.marker.setLatLng([m.lat, m.lng]).setIcon(icon(m));
            entry.key = key;
          }
        }
        decorate(m.id);
      }
      if (selected && map.hasLayer(popup)) openPopup(selected);
    },

    select(id) {
      const prev = selected;
      selected = id && entries.has(id) ? id : null;
      if (prev) decorate(prev);
      drawRoute();
      if (!selected) {
        map.closePopup(popup);
        return;
      }
      decorate(selected);
      const latLng = entries.get(selected)!.marker.getLatLng();
      map.panTo(latLng, { animate: !reducedMotion(), duration: 0.3 });
      openPopup(selected);
    },

    hover(id) {
      const prev = hovered;
      hovered = id;
      if (prev) decorate(prev);
      if (id) decorate(id);
    },

    setOrigin(origin) {
      if (!origin) {
        originMarker?.remove();
        originMarker = null;
      } else if (!originMarker) {
        originMarker = L.marker([origin.lat, origin.lng], {
          icon: originIcon(origin),
          interactive: false,
          keyboard: false,
          zIndexOffset: 800,
        }).addTo(map);
      } else {
        originMarker.setLatLng([origin.lat, origin.lng]).setIcon(originIcon(origin));
      }
      drawRoute();
    },

    startPick(onPick) {
      container.classList.add('ln-picking');
      const handler = (e: L.LeafletMouseEvent) => {
        cancel();
        onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
      };
      const cancel = () => {
        container.classList.remove('ln-picking');
        map.off('click', handler);
      };
      map.on('click', handler);
      return cancel;
    },

    panTo(point) {
      map.setView([point.lat, point.lng], Math.max(map.getZoom(), 14), {
        animate: !reducedMotion(),
      });
    },

    zoomIn: () => map.zoomIn(),
    zoomOut: () => map.zoomOut(),

    fitAll() {
      if (entries.size === 0) return;
      const bounds = L.latLngBounds([...entries.values()].map((e) => e.marker.getLatLng()));
      map.fitBounds(bounds, { padding: [48, 48], animate: !reducedMotion() });
    },

    destroy() {
      resize.disconnect();
      map.remove();
    },
  };
};
