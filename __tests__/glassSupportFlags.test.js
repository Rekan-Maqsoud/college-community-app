import { isLiquidGlassEnabled as defaultFlag } from '../app/utils/glassSupport';
import { isLiquidGlassEnabled as iosFlag } from '../app/utils/glassSupport.ios';
import { isLiquidGlassEnabled as androidFlag } from '../app/utils/glassSupport.android';

describe('glass support flags', () => {
  it('keeps liquid glass disabled across default and platform exports', () => {
    expect(defaultFlag).toBe(false);
    expect(iosFlag).toBe(false);
    expect(androidFlag).toBe(false);
  });
});
