import { describe, expect, it } from 'vitest';
import { parseShare, shareUrl } from './shareLink';

describe('링크 공유 (F17)', () => {
  it('도서관과 모드를 주소에 담고 다시 읽음', () => {
    const url = shareUrl('https://example.com/library-now/', 'yp-01', 'reading');
    expect(url).toBe('https://example.com/library-now/?lib=yp-01&mode=reading');
    expect(parseShare(new URL(url).search)).toEqual({ lib: 'yp-01', mode: 'reading' });
  });

  it('특수 문자는 인코딩', () => {
    const url = shareUrl('https://example.com/', 'a b&c', 'lending');
    expect(parseShare(new URL(url).search).lib).toBe('a b&c');
  });

  it('값이 없거나 모르는 모드면 null', () => {
    expect(parseShare('')).toEqual({ lib: null, mode: null });
    expect(parseShare('?lib=&mode=sleep')).toEqual({ lib: null, mode: null });
  });
});
