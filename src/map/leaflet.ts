// MapProvider의 Leaflet + OpenStreetMap 구현 (PRD F1, 7.1, DESIGN 5.6·5.7)
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import './leaflet.css';
import { TAG_MIN_ZOOM, TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL } from './config';
import { clusterHtml, markerHtml, originHtml, popupContent } from './markup';
import type { CreateMap, MapMarker, MapOrigin } from './types';

function icon(m: MapMarker): L.DivIcon {
  return L.divIcon({
    className: 'ln-mk',
    html: markerHtml(m),
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function originIcon(o: MapOrigin): L.DivIcon {
  return L.divIcon({
    className: 'ln-origin',
    html: originHtml(o),
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

/** 가까운 마커를 숫자 원 하나로 묶습니다 (M5, 서울 전체 250여 곳) */
function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const n = cluster.getChildCount();
  return L.divIcon({
    className: 'ln-cluster',
    html: clusterHtml(n),
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
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

  const cluster = L.markerClusterGroup({
    iconCreateFunction: clusterIcon,
    showCoverageOnHover: false,
    // 가까이 확대하면 덜 묶어서 꼬리표가 보이게
    maxClusterRadius: (z) => (z >= TAG_MIN_ZOOM ? 24 : 56),
    spiderLegPolylineOptions: { className: 'ln-spider', weight: 1.5, opacity: 1 },
    animate: !reducedMotion(),
  }).addTo(map);
  // 묶음 원도 버튼처럼 읽히게
  cluster.on('animationend', labelClusters);
  map.on('zoomend moveend', labelClusters);
  function labelClusters() {
    for (const el of container.querySelectorAll<HTMLElement>('.ln-cluster')) {
      const n = el.textContent ?? '';
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `도서관 ${n}곳 묶음, 눌러서 확대`);
    }
  }

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
        cluster.removeLayer(entry.marker);
        entries.delete(id);
        if (id === selected) {
          selected = null;
          map.closePopup(popup);
          drawRoute();
        }
      }
      const added: L.Marker[] = [];
      for (const m of markers) {
        const key = `${m.tone}|${m.tag}|${m.lat}|${m.lng}`;
        const entry = entries.get(m.id);
        if (!entry) {
          const marker = L.marker([m.lat, m.lng], { icon: icon(m), keyboard: true });
          marker.on('click', () => onSelect(m.id));
          // 묶음에서 풀려 화면에 나올 때마다 상태 표시를 다시 붙임
          marker.on('add', () => decorate(m.id));
          entries.set(m.id, { marker, data: m, key });
          added.push(marker);
        } else {
          entry.data = m;
          if (entry.key !== key) {
            const moved = !entry.marker.getLatLng().equals([m.lat, m.lng]);
            if (moved) cluster.removeLayer(entry.marker);
            entry.marker.setLatLng([m.lat, m.lng]).setIcon(icon(m));
            if (moved) cluster.addLayer(entry.marker);
            entry.key = key;
          }
          decorate(m.id);
        }
      }
      cluster.addLayers(added);
      labelClusters();
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
      const id2 = selected;
      const marker = entries.get(id2)!.marker;
      // 묶음 안에 있으면 풀릴 때까지 확대한 뒤 팝업
      cluster.zoomToShowLayer(marker, () => {
        if (selected !== id2) return;
        decorate(id2);
        map.panTo(marker.getLatLng(), { animate: !reducedMotion(), duration: 0.3 });
        openPopup(id2);
      });
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
