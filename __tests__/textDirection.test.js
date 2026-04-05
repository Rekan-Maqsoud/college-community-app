import { detectTextDir, getPostBodyDir } from '../app/utils/textDirection';

describe('textDirection utilities', () => {
  it('detects RTL for Arabic-script-only text with no English letters', () => {
    expect(detectTextDir('کوردی تەنها', 'ltr')).toBe('rtl');
  });

  it('forces the post body to RTL when the title is Arabic-script only', () => {
    expect(
      getPostBodyDir({
        topic: 'پرسیارێک دەربارەی وانە',
        text: '12345 - test placeholders',
        fallbackDir: 'ltr',
      })
    ).toBe('rtl');
  });

  it('keeps body detection independent when the title contains English', () => {
    expect(
      getPostBodyDir({
        topic: 'Kurdish title',
        text: 'plain english description',
        fallbackDir: 'rtl',
      })
    ).toBe('ltr');
  });

  it('falls back to body detection when the title is empty', () => {
    expect(
      getPostBodyDir({
        topic: '',
        text: 'plain english description',
        fallbackDir: 'rtl',
      })
    ).toBe('ltr');
  });
});