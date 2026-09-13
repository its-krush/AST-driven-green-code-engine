(() => {
  const vscode = acquireVsCodeApi();
  const pet = document.getElementById('pet');
  const state = document.getElementById('state');
  const bar = document.getElementById('bar');
  window.addEventListener('message', ({ data }) => {
    if (data.type !== 'state') return;
    const labels = { happy: 'Happy — no energy anti-patterns found', alert: `${data.count} high-impact pattern(s) need attention`, idle: `Idle — ${data.count} suggestion(s) found` };
    pet.textContent = data.state === 'happy' ? '🌱' : data.state === 'alert' ? '⚠️' : '🤖';
    pet.style.transform = data.state === 'happy' ? 'scale(1.12)' : 'scale(1)';
    state.textContent = labels[data.state] || labels.idle;
    bar.style.width = `${Math.max(0, Math.min(100, data.score))}%`;
  });
  vscode.postMessage({ type: 'ready' });
})();
