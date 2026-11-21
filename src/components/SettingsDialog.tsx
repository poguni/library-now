// 설정 화면 (PRD 8.5, F6·F14·F16): 테마, 출발지 관리, 데이터 정보, 내 데이터 내보내기·가져오기, 초기화
import { Download, MapPin, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PLACE_LABEL, type PlaceKind, type Places } from '../state/places';
import { describeCoverage, describeDateRange } from '../domain/present';
import type { MapKind } from '../state/settings';
import { THEMES, THEME_LABEL, type Theme } from '../state/theme';
import type { MetaFile } from '../state/useLibraryData';
import styles from './SettingsDialog.module.css';

interface Props {
  open: boolean;
  onClose(): void;
  theme: Theme;
  onTheme(theme: Theme): void;
  /** null = 카카오맵 키가 없어 지도 종류를 고를 수 없음 (선택지 숨김) */
  mapKind: MapKind | null;
  onMapKind(kind: MapKind): void;
  places: Places;
  onRenamePlace(kind: PlaceKind, name: string): void;
  onPickPlace(kind: PlaceKind): void;
  onDeletePlace(kind: PlaceKind): void;
  meta: MetaFile | null;
  libraryCount: number;
  /** 홈페이지와 대조한(검수된) 도서관 수 */
  reviewedCount: number;
  onReset(): void;
  onExport(): void;
  /** 실패하면 안내 문구, 성공하면 null (새로고침) */
  onImport(file: File): Promise<string | null>;
}

const MAP_KINDS: { kind: MapKind; name: string; desc: string }[] = [
  { kind: 'osm', name: 'OpenStreetMap', desc: '기본 지도' },
  { kind: 'kakao', name: '카카오맵', desc: '건물·지명 정보가 자세함' },
];

export function SettingsDialog(props: Props) {
  const { open, onClose, theme, places, meta } = props;
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!window.confirm('파일의 내용으로 지금 저장된 설정·출발지·즐겨찾기·메모를 바꿀까요?'))
      return;
    setImportError(await props.onImport(file));
  };

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="settings-title" onClose={onClose}>
      <div className={styles.head}>
        <h2 id="settings-title" className="ln-detail-title">
          설정
        </h2>
        <button
          type="button"
          className={styles.icon}
          aria-label="설정 닫기"
          data-tip="닫기"
          data-tip-pos="end"
          onClick={onClose}
        >
          <X size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.body}>
        <fieldset className={styles.sec}>
          <legend className="ln-sec-title">화면 테마</legend>
          <div className={styles.themes}>
            {THEMES.map((t) => (
              <label key={t} className={styles.theme} data-theme={t}>
                <input
                  type="radio"
                  name="theme"
                  value={t}
                  checked={theme === t}
                  onChange={() => props.onTheme(t)}
                />
                {/* 작은 미리보기: 그 테마의 토큰으로 그립니다 */}
                <span className={styles.preview} aria-hidden="true">
                  <span className={styles.pTop} />
                  <span className={styles.pCard}>
                    <i className="ln-badge" data-tone="open">
                      운영 중
                    </i>
                  </span>
                </span>
                <span className={styles.themeName}>{THEME_LABEL[t].name}</span>
                <span className={styles.themeDesc}>{THEME_LABEL[t].desc}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {props.mapKind && (
          <fieldset className={styles.sec}>
            <legend className="ln-sec-title">지도</legend>
            <div className={styles.maps}>
              {MAP_KINDS.map(({ kind, name, desc }) => (
                <label key={kind} className={styles.mapKind}>
                  <input
                    type="radio"
                    name="map"
                    value={kind}
                    checked={props.mapKind === kind}
                    onChange={() => props.onMapKind(kind)}
                  />
                  <span className={styles.themeName}>{name}</span>
                  <span className={styles.themeDesc}>{desc}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <section className={styles.sec}>
          <h3 className="ln-sec-title">출발지</h3>
          <p className={styles.hint}>위치는 이 브라우저에만 저장되고 밖으로 보내지 않습니다.</p>
          {(['home', 'work'] as const).map((kind) => {
            const place = places[kind];
            return (
              <div key={kind} className={styles.place}>
                {place ? (
                  <>
                    <label className={styles.field}>
                      <span>{PLACE_LABEL[kind]} 이름</span>
                      <input
                        type="text"
                        defaultValue={place.name}
                        maxLength={12}
                        onBlur={(e) => props.onRenamePlace(kind, e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={() => props.onPickPlace(kind)}
                    >
                      <MapPin size={16} strokeWidth={1.8} aria-hidden="true" />
                      다시 지정
                    </button>
                    <button
                      type="button"
                      className={styles.icon}
                      aria-label={`${place.name} 지우기`}
                      data-tip="지우기"
                      data-tip-pos="end"
                      onClick={() => props.onDeletePlace(kind)}
                    >
                      <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={styles.empty}>{PLACE_LABEL[kind]}: 지정하지 않음</span>
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={() => props.onPickPlace(kind)}
                    >
                      <MapPin size={16} strokeWidth={1.8} aria-hidden="true" />
                      지도에서 지정
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </section>

        <section className={styles.sec}>
          <h3 className="ln-sec-title">데이터 정보</h3>
          {meta ? (
            <dl className={styles.info}>
              <dt>범위</dt>
              <dd>{describeCoverage(meta.districts, props.libraryCount)}</dd>
              <dt>검수</dt>
              <dd>
                홈페이지 확인 {props.reviewedCount}곳 · 공공데이터 자동 변환(미검수){' '}
                {props.libraryCount - props.reviewedCount}곳
              </dd>
              <dt>데이터 기준일</dt>
              <dd>
                {describeDateRange(meta.baseDates)}
                <br />
                <span className={styles.hint}>도서관마다 다르며, 상세 화면 아래에 표시합니다</span>
              </dd>
              <dt>만든 날</dt>
              <dd>{meta.generatedAt.slice(0, 10)}</dd>
              <dt>공휴일</dt>
              <dd>{meta.holidayYears.join(', ')}년</dd>
              <dt>출처</dt>
              <dd>
                <ul>
                  {meta.sources.map((s) => (
                    <li key={s.name}>
                      {s.name} ({s.provider}
                      {s.license ? `, ${s.license}` : ''})
                    </li>
                  ))}
                </ul>
              </dd>
            </dl>
          ) : (
            <p className={styles.hint}>데이터를 불러오는 중입니다.</p>
          )}
          <p className={styles.hint}>
            검수된 도서관의 운영시간은 홈페이지에서 확인한 값이고, 미검수 도서관은 공공데이터
            값입니다. 임시 휴관은 홈페이지 공지를 함께 확인해 주세요.
          </p>
        </section>

        <section className={styles.sec}>
          <h3 className="ln-sec-title">내 데이터</h3>
          <p className={styles.hint}>
            설정·출발지·즐겨찾기·메모를 JSON 파일로 내려받아 다른 기기에서 가져올 수 있습니다.
            파일에는 집·직장 좌표가 들어 있으니 보관에 유의해 주세요.
          </p>
          <div className={styles.row}>
            <button type="button" className={styles.btn} onClick={props.onExport}>
              <Download size={16} strokeWidth={1.8} aria-hidden="true" />
              내보내기
            </button>
            <button type="button" className={styles.btn} onClick={() => fileRef.current?.click()}>
              <Upload size={16} strokeWidth={1.8} aria-hidden="true" />
              가져오기
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              aria-label="가져올 파일"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          {importError && (
            <p className={styles.error} role="alert">
              {importError}
            </p>
          )}
        </section>

        <section className={styles.sec}>
          <h3 className="ln-sec-title">초기화</h3>
          <button type="button" className={styles.btn} onClick={props.onReset}>
            저장된 설정·출발지·즐겨찾기·메모 모두 지우기
          </button>
        </section>
      </div>
    </dialog>
  );
}
