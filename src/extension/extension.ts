import * as vscode from 'vscode';
import { analyze, refactor, Finding } from '../core';
import { CompanionPanel } from './companionPanel';

const diagnosticCollection = vscode.languages.createDiagnosticCollection('green-code');
let companion: CompanionPanel | undefined;
const supportedLanguages = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'];

function toDiagnostic(item: Finding): vscode.Diagnostic {
  const range = new vscode.Range(new vscode.Position(item.line - 1, item.column), new vscode.Position(item.endLine - 1, item.endColumn));
  const diagnostic = new vscode.Diagnostic(range, `${item.title}: ${item.message}`, item.severity === 'error' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information);
  diagnostic.code = item.id;
  diagnostic.source = 'AST Green-Code';
  return diagnostic;
}
function analyzeDocument(document: vscode.TextDocument) {
  if (!supportedLanguages.includes(document.languageId)) return;
  try {
    const result = analyze(document.getText(), document.fileName);
    diagnosticCollection.set(document.uri, result.findings.map(toDiagnostic));
    companion?.update(result.findings.length, result.score);
  } catch (error) {
    diagnosticCollection.delete(document.uri);
    console.warn('Green-Code parse skipped:', error);
  }
}
class RefactorActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] {
    let result;
    try { result = analyze(document.getText(), document.fileName); } catch { return []; }
    return result.findings.filter(f => f.line - 1 <= range.end.line && f.endLine - 1 >= range.start.line).map(f => {
      const action = new vscode.CodeAction(`Refactor: ${f.title}`, vscode.CodeActionKind.QuickFix);
      action.diagnostics = [toDiagnostic(f)];
      action.command = { command: 'greenCode.refactorDocument', title: 'Apply AST refactoring', arguments: [document.uri] };
      return action;
    });
  }
}
export function activate(context: vscode.ExtensionContext) {
  const selector = supportedLanguages.map(language => ({ language }));
  companion = CompanionPanel.open(context);
  context.subscriptions.push(diagnosticCollection, vscode.languages.registerCodeActionsProvider(selector, new RefactorActionProvider(), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }));
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(analyzeDocument), vscode.workspace.onDidChangeTextDocument(event => analyzeDocument(event.document)), vscode.commands.registerCommand('greenCode.openCompanion', () => { companion = CompanionPanel.open(context); }), vscode.commands.registerCommand('greenCode.refactorDocument', async (uri: vscode.Uri) => {
    const document = vscode.workspace.textDocuments.find(item => item.uri.toString() === uri.toString());
    if (!document) return;
    try {
      const result = refactor(document.getText(), document.fileName);
      const edit = new vscode.WorkspaceEdit();
      edit.replace(uri, new vscode.Range(0, 0, document.lineCount, 0), result.code);
      await vscode.workspace.applyEdit(edit);
      analyzeDocument(document);
    } catch (error: any) { vscode.window.showErrorMessage(`Green-Code refactoring failed: ${error.message}`); }
  }));
  vscode.workspace.textDocuments.forEach(analyzeDocument);
}
export function deactivate() { diagnosticCollection.clear(); }
