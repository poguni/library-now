// public/data/*.json의 구조 (PRD 6.3). 앱과 데이터 빌드 스크립트가 함께 씁니다.

/** "HH:MM" 형식, 서울 시각 */
export type Time = string;

export interface TimeRange {
  open: Time;
  close: Time;
}

/** null = 그날 운영하지 않음 */
export interface WeekHours {
  weekday: TimeRange | null;
  saturday: TimeRange | null;
  sunday: TimeRange | null;
  holiday: TimeRange | null;
}

export interface Season {
  /** "MM-DD" */
  from: string;
  /** "MM-DD" */
  to: string;
  hours: WeekHours;
}

export interface Room {
  label: string;
  /** null = 운영시간 확인 필요 */
  hours: WeekHours | null;
  seasons: Season[] | null;
  memo: string | null;
}

export type RoomKey = 'lending' | 'reading';

export type HolidayRule = 'closed' | 'closed_except_sunday' | 'seollal_chuseok_only' | 'open';

export interface MonthlyRule {
  /** 1~5, -1 = 마지막 주 */
  nth: number[];
  /** 0=일 ~ 6=토 */
  weekday: number;
}

export interface ClosedRule {
  weekly: number[];
  monthly: MonthlyRule[];
  holiday: HolidayRule;
  appliesTo: RoomKey[];
}

export interface Closure {
  /** "YYYY-MM-DD" */
  from: string;
  to: string;
  reason: string;
  rooms: RoomKey[];
}

export interface Library {
  id: string;
  name: string;
  district: string;
  type: string;
  operator: string;
  address: string;
  phone: string | null;
  homepage: string | null;
  lat: number;
  lng: number;
  rooms: {
    lending: Room;
    /** null = 열람실 없음 */
    reading: Room | null;
  };
  closed: ClosedRule;
  closedRaw: string;
  closures: Closure[];
  notes: string[];
  source: {
    dataset: string;
    baseDate: string | null;
    /** 홈페이지와 대조한 날. null = 공공데이터 자동 변환(미검수) */
    checkedAt: string | null;
    verifiedAt: string | null;
    /** "homepage" = 홈페이지 대조, "auto" = 공공데이터 자동 변환(미검수) */
    verifiedBy: string;
  };
}

export interface LibrariesFile {
  version: number;
  generatedAt: string;
  libraries: Library[];
}

export interface Holiday {
  date: string;
  name: string;
  substitute?: boolean;
}

export interface HolidaysFile {
  year: number;
  updatedAt: string;
  holidays: Holiday[];
}
