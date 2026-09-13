import { analyze, refactor } from '../src/core';

describe('AST Green-Code Engine', () => {
  const source = `for (let i = 0; i < 3; i++) { document.querySelector('.card'); items.map(render); } window.addEventListener('scroll', () => update());`;
  test('detects the three supported anti-pattern classes', () => {
    const result = analyze(source);
    expect(result.findings.map(f => f.id)).toEqual(expect.arrayContaining(['dom-access-in-loop', 'heavy-array-traversal', 'unthrottled-event-listener']));
    expect(result.score).toBeLessThan(100);
  });
  test('refactors event handlers and preserves valid syntax', () => {
    const result = refactor(source);
    expect(result.code).toContain('throttle');
    expect(result.code).not.toContain("addEventListener('scroll', () =>");
    expect(analyze(result.code).findings.find(f => f.id === 'unthrottled-event-listener')).toBeUndefined();
  });
  test('accepts TypeScript syntax', () => expect(analyze('const value: number = 1;').findings).toHaveLength(0));
});
