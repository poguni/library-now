// MapProvider의 카카오맵 구현 (PRD 7.1·F17, M5). 화면 코드는 Leaflet 구현과 똑같이 MapHandle만 씁니다.
// SDK는 카카오맵을 고를 때만 불러오고, 실패하면 onError로 알려 OSM 지도로 돌아가게 합니다.
import './leaflet.css';
import './kakao.css';
import { groupPoints, kakaoLevel, leafletZoom } from './cluster';
import { TAG_MIN_ZOOM } from './config';
import { clusterHtml, markerHtml, originHtml, popupContent } from './markup';
import type { CreateMap, MapMarker, MapOrigin } from './types';

const SDK_TIMEOUT_MS = 10_000;
/** 이 레벨 이하(아주 가까이)에서는 묶지 않습니다 */
const NO_CLUSTER_LEVEL = 2;

let sdk: Promise<typeof kakao> | null = null;

/** SDK를 한 번만 불러옵니다. 실패하면 다음에 다시 시도할 수 있게 비웁니다 */
export function loadKakaoSdk(key: string): Promise<typeof kakao> {
  sdk ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.async = true;
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      sdk = null;
      reject(new Error('카카오맵 SDK를 불러오지 못했습니다'));
    };
    const timer = setTimeout(fail, SDK_TIMEOUT_MS);
    script.onerror = fail;
    script.onload = () => {
      const k = window.kakao;
      if (!k?.maps?.load) return fail();
      k.maps.load(() => {
        clearTimeout(timer);
        resolve(k);
      });
    };
    document.head.append(script);
  });
  return sdk;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Entry {
  data: MapMarker;
  el: HTMLElement;
  overlay: kakao.maps.CustomOverlay | null;
}

export function createKakaoMap(key: string): CreateMap {
  return (container, { center, zoom, onSelect, onError }) => {
    let k: typeof kakao | null = null;
    let map: kakao.maps.Map | null = null;
    let destroyed = false;

    const entries = new Map<string, Entry>();
    let selected: string | null = null;
    let hovered: string | null = null;
    let origin: MapOrigin | null = null;
    let originOverlay: kakao.maps.CustomOverlay | null = null;
    let route: kakao.maps.Polyline | null = null;
    let popup: kakao.maps.CustomOverlay | null = null;
    let groups: kakao.maps.CustomOverlay[] = [];
    let pick: ((e?: kakao.maps.MouseEvent) => void) | null = null;

    const latLng = (p: { lat: number; lng: number }) => new k!.maps.LatLng(p.lat, p.lng);

    function decorate(id: string) {
      const entry = entries.get(id);
      if (!entry) return;
      const { el, data } = entry;
      const isSel = id === selected;
      el.dataset.tone = data.tone;
      el.classList.toggle('is-sel', isSel);
      el.classList.toggle('is-hover', id === hovered);
      el.setAttribute('aria-label', `${data.name}, ${data.badge}`);
      el.setAttribute('aria-pressed', String(isSel));
      entry.overlay?.setZIndex(isSel ? 1000 : id === hovered ? 500 : 1);
    }

    function markerElement(m: MapMarker): HTMLElement {
      const el = document.createElement('div');
      el.className = 'ln-mk ln-kmk';
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.innerHTML = markerHtml(m);
      el.addEventListener('click', () => onSelect(m.id));
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onSelect(m.id);
      });
      return el;
    }

    /** 화면 좌표로 가까운 마커를 묶어 다시 그립니다 (지도가 멈출 때마다) */
    function render() {
      if (!map || !k) return;
      const level = map.getLevel();
      container.classList.toggle('ln-far', leafletZoom(level) < TAG_MIN_ZOOM);
      const proj = map.getProjection();
      const points = [...entries.entries()]
        .filter(([id]) => id !== selected) // 고른 도서관은 늘 따로 보이게
        .map(([id, e]) => ({ id, ...proj.containerPointFromCoords(latLng(e.data)) }));
      const radius = level <= NO_CLUSTER_LEVEL ? -1 : leafletZoom(level) >= TAG_MIN_ZOOM ? 24 : 56;

      for (const g of groups) g.setMap(null);
      groups = [];
      const single = new Set<string>(selected && entries.has(selected) ? [selected] : []);
      for (const g of groupPoints(points, radius)) {
        if (g.ids.length === 1) {
          single.add(g.ids[0]!);
          continue;
        }
        groups.push(clusterOverlay(g.ids));
      }
      for (const [id, entry] of entries) {
        const show = single.has(id);
        if (show && !entry.overlay) {
          entry.overlay = new k.maps.CustomOverlay({
            content: entry.el,
            position: latLng(entry.data),
            clickable: true,
          });
          entry.overlay.setMap(map);
          decorate(id);
        } else if (!show && entry.overlay) {
          entry.overlay.setMap(null);
          entry.overlay = null;
        }
      }
    }

    function clusterOverlay(ids: string[]): kakao.maps.CustomOverlay {
      const members = ids.map((id) => entries.get(id)!.data);
      const lat = members.reduce((s, m) => s + m.lat, 0) / members.length;
      const lng = members.reduce((s, m) => s + m.lng, 0) / members.length;
      const el = document.createElement('div');
      el.className = 'ln-cluster ln-kcl';
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `도서관 ${ids.length}곳 묶음, 눌러서 확대`);
      el.innerHTML = clusterHtml(ids.length);
      const zoomIn = () => {
        const target = Math.max(1, map!.getLevel() - 2);
        map!.setLevel(target, { animate: !reducedMotion(), anchor: latLng({ lat, lng }) });
      };
      el.addEventListener('click', zoomIn);
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        zoomIn();
      });
      const overlay = new k!.maps.CustomOverlay({
        content: el,
        position: latLng({ lat, lng }),
        clickable: true,
        zIndex: 3,
      });
      overlay.setMap(map);
      return overlay;
    }

    function closePopup() {
      popup?.setMap(null);
      popup = null;
    }

    function openPopup(id: string) {
      const entry = entries.get(id);
      if (!entry || !map || !k) return;
      closePopup();
      const box = document.createElement('div');
      box.className = 'ln-kpop';
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'ln-kpop-close';
      close.setAttribute('aria-label', '팝업 닫기');
      close.textContent = '×';
      close.addEventListener('click', closePopup);
      box.append(popupContent(entry.data), close);
      popup = new k.maps.CustomOverlay({
        content: box,
        position: latLng(entry.data),
        clickable: true,
        yAnchor: 1,
        zIndex: 2000,
      });
      popup.setMap(map);
    }

    function drawRoute() {
      route?.setMap(null);
      route = null;
      const target = selected ? entries.get(selected) : undefined;
      if (!map || !k || !origin || !target) return;
      // 선 색은 SVG 속성이라 CSS 변수를 못 받습니다. 지금 테마의 --accent 값을 읽어 넣습니다
      const color = getComputedStyle(container).getPropertyValue('--accent').trim() || '#2e5240';
      route = new k.maps.Polyline({
        path: [latLng(origin), latLng(target.data)],
        strokeWeight: 3.5,
        strokeColor: color,
        strokeOpacity: 1,
        strokeStyle: 'shortdot',
      });
      route.setMap(map);
    }

    function drawOrigin() {
      originOverlay?.setMap(null);
      originOverlay = null;
      if (!map || !k || !origin) return;
      const el = document.createElement('div');
      el.className = 'ln-origin ln-korigin';
      el.innerHTML = originHtml(origin);
      originOverlay = new k.maps.CustomOverlay({
        content: el,
        position: latLng(origin),
        zIndex: 800,
      });
      originOverlay.setMap(map);
    }

    function attachPick() {
      if (map && k && pick) k.maps.event.addListener(map, 'click', pick);
    }

    function showSelected(animate: boolean) {
      if (!map || !selected) return;
      const entry = entries.get(selected);
      if (!entry) return;
      render();
      if (animate && !reducedMotion()) map.panTo(latLng(entry.data));
      else map.setCenter(latLng(entry.data));
      openPopup(selected);
    }

    // 테마를 바꾸면 경로 점선 색도 다시
    const themeWatch = new MutationObserver(drawRoute);
    themeWatch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    const resize = new ResizeObserver(() => {
      map?.relayout();
      render();
    });

    container.classList.add('ln-kakao');
    loadKakaoSdk(key).then(
      (sdkObj) => {
        if (destroyed) return;
        k = sdkObj;
        map = new k.maps.Map(container, {
          center: latLng(center),
          level: kakaoLevel(zoom),
          keyboardShortcuts: false,
        });
        k.maps.event.addListener(map, 'idle', render);
        k.maps.event.addListener(map, 'click', () => {
          if (!pick) closePopup();
        });
        resize.observe(container);
        drawOrigin();
        drawRoute();
        attachPick();
        render();
        if (selected) showSelected(false);
      },
      () => {
        if (!destroyed) onError?.();
      },
    );

    return {
      setMarkers(markers) {
        const ids = new Set(markers.map((m) => m.id));
        for (const [id, entry] of entries) {
          if (ids.has(id)) continue;
          entry.overlay?.setMap(null);
          entries.delete(id);
          if (id === selected) {
            selected = null;
            closePopup();
            drawRoute();
          }
        }
        for (const m of markers) {
          const entry = entries.get(m.id);
          if (!entry) {
            entries.set(m.id, { data: m, el: markerElement(m), overlay: null });
            continue;
          }
          const moved = entry.data.lat !== m.lat || entry.data.lng !== m.lng;
          if (entry.data.tag !== m.tag) entry.el.innerHTML = markerHtml(m);
          entry.data = m;
          if (moved && entry.overlay && k) entry.overlay.setPosition(latLng(m));
          decorate(m.id);
        }
        render();
        if (selected && popup) openPopup(selected);
      },

      select(id) {
        const prev = selected;
        selected = id && entries.has(id) ? id : null;
        if (prev) decorate(prev);
        drawRoute();
        if (!selected) {
          closePopup();
          render();
          return;
        }
        decorate(selected);
        showSelected(true);
      },

      hover(id) {
        const prev = hovered;
        hovered = id;
        if (prev) decorate(prev);
        if (id) decorate(id);
      },

      setOrigin(next) {
        origin = next;
        drawOrigin();
        drawRoute();
      },

      startPick(onPick) {
        container.classList.add('ln-picking');
        const handler = (e?: kakao.maps.MouseEvent) => {
          if (!e) return;
          cancel();
          onPick({ lat: e.latLng.getLat(), lng: e.latLng.getLng() });
        };
        const cancel = () => {
          container.classList.remove('ln-picking');
          if (map && k && pick === handler) k.maps.event.removeListener(map, 'click', handler);
          if (pick === handler) pick = null;
        };
        pick = handler;
        attachPick();
        return cancel;
      },

      panTo(point) {
        if (!map) return;
        const closest = kakaoLevel(14);
        if (map.getLevel() > closest) map.setLevel(closest);
        map.panTo(latLng(point));
      },

      zoomIn: () => map?.setLevel(Math.max(1, map.getLevel() - 1), { animate: !reducedMotion() }),
      zoomOut: () => map?.setLevel(Math.min(14, map.getLevel() + 1), { animate: !reducedMotion() }),

      fitAll() {
        if (!map || !k || entries.size === 0) return;
        const bounds = new k.maps.LatLngBounds();
        for (const e of entries.values()) bounds.extend(latLng(e.data));
        map.setBounds(bounds, 48, 48, 48, 48);
      },

      destroy() {
        destroyed = true;
        themeWatch.disconnect();
        resize.disconnect();
        container.replaceChildren();
        container.classList.remove('ln-kakao', 'ln-far', 'ln-picking');
      },
    };
  };
}
