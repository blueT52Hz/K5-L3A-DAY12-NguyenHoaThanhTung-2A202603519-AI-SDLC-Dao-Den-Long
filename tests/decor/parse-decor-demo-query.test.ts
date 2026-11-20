import { describe, it, expect } from 'vitest';
import { parseDecorDemoQuery } from '../../src/web/decor-demo/parse-decor-demo-query';

describe('parseDecorDemoQuery', () => {
  it('parses, defaults and clamps', () => {
    expect(parseDecorDemoQuery('?night=2&lit=3')).toEqual({ night: 2, lit: 3 });
    expect(parseDecorDemoQuery('?night=9&lit=-1')).toEqual({ night: 1, lit: 0 });
    expect(parseDecorDemoQuery('?night=3&lit=99')).toEqual({ night: 3, lit: 7 });
    expect(parseDecorDemoQuery('?night=abc&lit=x')).toEqual({ night: 1, lit: 0 });
    expect(parseDecorDemoQuery('')).toEqual({ night: 1, lit: 0 });
  });
});
