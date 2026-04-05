import React from 'react';
import renderer, { act } from 'react-test-renderer';

let mockSvgXml;

jest.mock('react-native-svg', () => {
  const ReactModule = require('react');
  mockSvgXml = jest.fn();
  return {
    SvgXml: (props) => {
      mockSvgXml(props);
      return ReactModule.createElement('svgxml-mock', props, null);
    },
  };
});

import IoniconSvg from '../app/components/icons/IoniconSvg';

describe('IoniconSvg color mapping', () => {
  beforeEach(() => {
    mockSvgXml.mockClear();
  });

  it('applies custom color to filled heart icons', async () => {
    await act(async () => {
      renderer.create(<IoniconSvg name="heart" color="#EF4444" size={24} />);
    });

    const lastCall = mockSvgXml.mock.calls.at(-1);
    expect(lastCall).toBeDefined();

    const { xml } = lastCall[0];
    expect(xml).toMatch(/<path[^>]*fill="#EF4444"/i);
    expect(xml).toContain('fill="#EF4444"');
    expect(xml).toContain('stroke="#EF4444"');
    expect(xml).not.toMatch(/#000(?:000)?/i);
    expect(xml).not.toMatch(/\bblack\b/i);
  });

  it('applies custom color to outlined heart icons', async () => {
    await act(async () => {
      renderer.create(<IoniconSvg name="heart-outline" color="#A1B2C3" size={24} />);
    });

    const lastCall = mockSvgXml.mock.calls.at(-1);
    expect(lastCall).toBeDefined();

    const { xml } = lastCall[0];
    expect(xml).toContain('stroke="#A1B2C3"');
    expect(xml).not.toMatch(/#000(?:000)?/i);
    expect(xml).not.toMatch(/\bblack\b/i);
  });

  it('keeps class-based outline icons tinted and non-black', async () => {
    await act(async () => {
      renderer.create(<IoniconSvg name="chatbubble-ellipses-outline" color="#12AB34" size={24} />);
    });

    const lastCall = mockSvgXml.mock.calls.at(-1);
    expect(lastCall).toBeDefined();

    const { xml } = lastCall[0];
    expect(xml).toContain('stroke="#12AB34"');
    expect(xml).toContain('stroke-width="32"');
    expect(xml).not.toMatch(/#000(?:000)?/i);
    expect(xml).not.toMatch(/\bblack\b/i);
  });
});
