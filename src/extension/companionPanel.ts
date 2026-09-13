import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class CompanionPanel {
  private constructor(private readonly panel: vscode.WebviewPanel, private readonly context: vscode.ExtensionContext) {
    panel.webview.html = this.html();
    panel.onDidDispose(() => CompanionPanel.current = undefined);
  }
  private static current: CompanionPanel | undefined;
  static open(context: vscode.ExtensionContext) {
    if (CompanionPanel.current) { CompanionPanel.current.panel.reveal(vscode.ViewColumn.Beside); return CompanionPanel.current; }
    const panel = vscode.window.createWebviewPanel('greenCodeCompanion', 'Green-Code Companion', vscode.ViewColumn.Beside, { enableScripts: true });
    CompanionPanel.current = new CompanionPanel(panel, context);
    return CompanionPanel.current;
  }
  update(count: number, score: number) { this.panel.webview.postMessage({ type: 'state', state: count === 0 ? 'happy' : count > 2 ? 'alert' : 'idle', count, score }); }
  private html() {
    const script = fs.readFileSync(path.join(this.context.extensionPath, 'webview', 'companion.js'), 'utf8');
    return `<!doctype html><html><body style="font-family:system-ui;background:#101827;color:#e5f5e9;padding:20px"><h2>Green-Code Companion</h2><div id="pet" style="font-size:72px;text-align:center;transition:transform .3s">🤖</div><p id="state">Idle — analyzing your code</p><div style="height:8px;background:#26354b;border-radius:8px"><div id="bar" style="height:100%;width:100%;background:#41d17d;border-radius:8px;transition:width .3s"></div></div><script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
  }
}
