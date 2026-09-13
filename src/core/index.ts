import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

export type AntiPatternId = 'dom-access-in-loop' | 'unthrottled-event-listener' | 'heavy-array-traversal';
export type Severity = 'info' | 'warning' | 'error';
export interface Finding { id: AntiPatternId; title: string; message: string; severity: Severity; line: number; column: number; endLine: number; endColumn: number; suggestion: string; }
export interface AnalysisResult { code: string; findings: Finding[]; ast: unknown; score: number; }

const parserPlugins: any[] = ['typescript', 'jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'];
const loc = (node: any) => ({ line: node.loc?.start.line ?? 1, column: node.loc?.start.column ?? 0, endLine: node.loc?.end.line ?? node.loc?.start.line ?? 1, endColumn: node.loc?.end.column ?? node.loc?.start.column ?? 0 });
const finding = (id: AntiPatternId, title: string, message: string, node: any, suggestion: string, severity: Severity = 'warning'): Finding => ({ id, title, message, severity, suggestion, ...loc(node) });

export function parseSource(code: string, filename = 'source.ts'): t.File {
  return parse(code, { sourceType: 'unambiguous', sourceFilename: filename, plugins: parserPlugins });
}

export function analyze(code: string, filename = 'source.ts'): AnalysisResult {
  const ast = parseSource(code, filename);
  const findings: Finding[] = [];
  traverse(ast, {
    Loop(path) {
      path.traverse({
        CallExpression(inner) {
          const callee = inner.node.callee;
          if (t.isMemberExpression(callee) && t.isIdentifier(callee.object, { name: 'document' }) && t.isIdentifier(callee.property) && ['querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName', 'getElementsByTagName'].includes(callee.property.name)) {
            findings.push(finding('dom-access-in-loop', 'DOM access inside loop', 'Repeated DOM queries in a loop force avoidable selector and layout work.', inner.node, 'Cache the DOM reference before entering the loop.', 'error'));
          }
          if (t.isMemberExpression(callee) && t.isIdentifier(callee.property) && ['map', 'filter', 'reduce', 'flatMap', 'sort'].includes(callee.property.name)) {
            findings.push(finding('heavy-array-traversal', 'Heavy array traversal in hot path', `Array.${callee.property.name}() is nested inside a loop and may multiply CPU work.`, inner.node, 'Move the traversal outside the loop or use one bounded pass.'));
          }
        }
      });
    },
    CallExpression(path) {
      const callee = path.node.callee;
      if (t.isMemberExpression(callee) && t.isIdentifier(callee.object, { name: 'window' }) && t.isIdentifier(callee.property, { name: 'addEventListener' })) {
        const event = path.node.arguments[0];
        if (t.isStringLiteral(event) && ['scroll', 'resize', 'wheel', 'touchmove'].includes(event.value)) {
          const callback = path.node.arguments[1];
          if (callback && !t.isCallExpression(callback)) findings.push(finding('unthrottled-event-listener', 'Unthrottled high-frequency listener', `${event.value} events can fire many times per frame without throttling.`, path.node, 'Wrap the handler with requestAnimationFrame or a throttle.', 'error'));
        }
      }
    }
  });
  const score = Math.max(0, Math.round(100 - findings.reduce((sum, item) => sum + (item.severity === 'error' ? 18 : 10), 0)));
  return { code, findings, ast, score };
}

function throttleHelper(): t.FunctionDeclaration {
  return t.functionDeclaration(t.identifier('throttle'), [t.identifier('fn'), t.identifier('wait')], t.blockStatement([
    t.variableDeclaration('let', [t.variableDeclarator(t.identifier('last'), t.numericLiteral(0))]),
    t.returnStatement(t.arrowFunctionExpression([t.restElement(t.identifier('args'))], t.blockStatement([
      t.variableDeclaration('const', [t.variableDeclarator(t.identifier('now'), t.callExpression(t.memberExpression(t.identifier('Date'), t.identifier('now')), []))]),
      t.ifStatement(t.binaryExpression('>=', t.binaryExpression('-', t.identifier('now'), t.identifier('last')), t.identifier('wait')), t.blockStatement([
        t.expressionStatement(t.assignmentExpression('=', t.identifier('last'), t.identifier('now'))),
        t.returnStatement(t.callExpression(t.memberExpression(t.identifier('fn'), t.identifier('apply')), [t.thisExpression(), t.identifier('args')]))
      ]))
    ])))
  ]));
}

export function refactor(code: string, filename = 'source.ts'): AnalysisResult {
  const ast = parseSource(code, filename);
  let changed = false;
  let throttleNeeded = false;
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      if (t.isMemberExpression(callee) && t.isIdentifier(callee.object, { name: 'window' }) && t.isIdentifier(callee.property, { name: 'addEventListener' })) {
        const event = path.node.arguments[0];
        const callback = path.node.arguments[1];
        if (t.isStringLiteral(event) && ['scroll', 'resize', 'wheel', 'touchmove'].includes(event.value) && callback && !t.isCallExpression(callback)) {
          path.node.arguments[1] = t.callExpression(t.identifier('throttle'), [callback as t.Expression, t.numericLiteral(100)]);
          changed = true; throttleNeeded = true;
        }
      }
    },
    Loop(path) {
      path.traverse({
        CallExpression(inner) {
          const callee = inner.node.callee;
          if (t.isMemberExpression(callee) && t.isIdentifier(callee.object, { name: 'document' }) && t.isIdentifier(callee.property) && ['querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName', 'getElementsByTagName'].includes(callee.property.name)) {
            const parent = path.parentPath;
            if (parent.isProgram() || parent.isBlockStatement()) {
              const cacheName = path.scope.generateUidIdentifier('cachedElement');
              const declaration = t.variableDeclaration('const', [t.variableDeclarator(cacheName, inner.node)]);
              path.insertBefore(declaration);
              inner.replaceWith(cacheName);
              changed = true;
            }
          }
        }
      });
    }
  });
  if (throttleNeeded && ast.program.body.every(node => !(t.isFunctionDeclaration(node) && t.isIdentifier(node.id, { name: 'throttle' })))) ast.program.body.unshift(throttleHelper());
  const output = generate(ast, { retainLines: false, comments: true }).code;
  return { ...analyze(output, filename), code: output, ast };
}

export function astSummary(ast: t.File): { type: string; body: number; language: string } { return { type: ast.type, body: ast.program.body.length, language: 'JavaScript / TypeScript' }; }
