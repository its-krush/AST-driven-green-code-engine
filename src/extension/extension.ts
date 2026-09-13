import * as vscode from 'vscode';
import { analyze, refactor, Finding } from '../core';

const diagnosticCollection = vscode.languages.createDiagnosticCollection('green-code');
let companion: CompanionPanel | undefined;

function toDiagnostic(item: Finding): vscode.Diagnostic {
  const range = new vscode.Range(new vscode.Position(item.line - 1, item.column), new vscode.Position(item.endLine - 1, item.endColumn));
  const d = new vscode.Diagnostic(range, `${item.title}: ${item.message}`, item.severity === 'error' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information);
  d.code = item.id;
  d.source = 'AST Green-Code';
  return d;
}
function analyzeDocument(document: vscode.TextDocument) {
  if (!['javascript', 'javascriptreact', 'typescript', 'typescriptreact'].includes(document.languageId)) return;
  try { const result = analyze(document.getText(), document.fileName); diagnosticCollection.set(document.uri, result.findings.map(toDiagnostic)); companion?.update(result.findings.length, result.score); }
  catch (error) { diagnosticCollection.delete(document.uri); console.warn('Green-Code parse skipped:', error); }
}
class RefactorActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] {
    const result = analyze(document.getText(), document.fileName);
    return result.findings.filter(f => f.line - 1 <= range.end.line && f.endLine - 1 >= range.start.line).map(f => {
      const action = new vscode.CodeAction(`Refactor: ${f.title}`, vscode.CodeActionKind.QuickFix);
      action.diagnostics = [toDiagnostic(f)];
      action.command = { command: 'greenCode.refactorDocument', title: 'Apply AST refactoring', arguments: [document.uri] };
      return action;
    });
  }
}
class CompanionPanel {
  private constructor(private panel: vscode.WebviewPanel) { panel.webview.html = this.html(); panel.onDidDispose(() => companion = undefined); }
  static open(context: vscode.ExtensionContext) { if (companion) return; companion = new CompanionPanel(vscode.window.createWebviewPanel('greenCodeCompanion', 'Green-Code Companion', vscode.ViewColumn.Beside, { enableScripts: true })); }
  update(count: number, score: number) { this.panel.webview.postMessage({ type: 'state', state: count === 0 ? 'happy' : count > 2 ? 'alert' : 'idle', count, score }); }
  private html() { return `<!doctype html><html><body style="font-family:system-ui;background:#101827;color:#e5f5e9;padding:20px"><h2>Green-Code Companion</h2><div id="pet" style="font-size:72px;text-align:center;transition:transform .3s">🤖</div><p id="state">Idle — analyzing your code</p><div style="height:8px;background:#26354b;border-radius:8px"><div id="bar" style="height:100%;width:100%;background:#41d17d;border-radius:8px"></div></div><script>const vscode=acquireVsCodeApi(); addEventListener('message',e=>{const d=e.data;if(d.type!=='state')return;document.getElementById('pet').textContent=d.state==='happy'?'🌱':d.state==='alert'?'⚠️':'🤖';document.getElementById('state').textContent=d.state==='happy'?'Happy — no energy anti-patterns found':d.state==='alert'?d.count+' high-impact patterns need attention':'Idle — '+d.count+' suggestion(s) found';document.getElementById('bar').style.width=d.score+'%'});</script></body></html>`; }
}

export function activate(context: vscode.ExtensionContext) {
  const selector = [{ language: 'javascript' }, { language: 'javascriptreact' }, { language: 'typescript' }, { language: 'typescriptreact' }];
  context.subscriptions.push(diagnosticCollection, vscode.languages.registerCodeActionsProvider(selector, new RefactorActionProvider(), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }));
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(analyzeDocument), vscode.workspace.onDidChangeTextDocument(e => analyzeDocument(e.document)), vscode.commands.registerCommand('greenCode.openCompanion', () => CompanionPanel.open(context)), vscode.commands.registerCommand('greenCode.refactorDocument', (uri: vscode.Uri) => {
    const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString()); if (!document) return;
    const result = refactor(document.getText(), document.fileName); const edit = new vscode.WorkspaceEdit(); edit.replace(uri, new vscode.Range(0, 0, document.lineCount, 0), result.code); vscode.workspace.applyEdit(edit).then(() => analyzeDocument(document));
  }));
  vscode.workspace.textDocuments.forEach(analyzeDocument); CompanionPanel.open(context);
}
export function deactivate() { diagnosticCollection.clear(); }
