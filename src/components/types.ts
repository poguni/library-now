import type { StatusView } from '../domain/present';
import type { Library } from '../domain/types';

/** 화면에 그릴 도서관 한 줄: 선택한 모드의 상태와 다른 실의 상태 */
export interface LibraryRow {
  lib: Library;
  view: StatusView;
  other: StatusView;
  /** 정기 휴관 규칙 문장 */
  ruleText: string;
}
