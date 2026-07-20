/**
 * Personal progress sync for ai-engineering-from-scratch (forked).
 *
 * The live site at aiengineeringfromscratch.com cannot be modified, and the
 * upstream repo's localStorage-only progress.js does not travel across
 * devices. This module lets a fork owner:
 *
 *   - Pull committed progress from /progress.json into localStorage
 *     (run the site locally, click "Sync" -> "Pull from progress.json")
 *   - Export the current localStorage blob to /progress.json
 *     (click "Sync" -> "Export to progress.json" -> a download is offered
 *      that you then commit on the personal/progress branch and push)
 *
 * Why two steps instead of an auto-commit? Browser fetch() cannot write to
 * the repo. The export step produces a file the user commits by hand, which
 * keeps secrets out of the browser and avoids needing a GitHub token in
 * localStorage.
 *
 * Loaded only when serving the site locally (open the page via the same
 * server that serves /progress.json). It is a no-op on the live upstream
 * site because progress-sync.js is not referenced from there.
 */
(function () {
  var STORAGE_KEY = 'aifs:progress:v1';
  var PROGRESS_PATH = '../progress.json'; // site/* served at /site/*, json at /progress.json

  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { lessons: {}, updatedAt: 0 };
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.lessons) {
        return { lessons: {}, updatedAt: 0 };
      }
      return parsed;
    } catch (e) {
      return { lessons: {}, updatedAt: 0 };
    }
  }

  function write(state) {
    state.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* quota or disabled storage */ }
  }

  function mergePreferIncoming(localState, remoteState) {
    // Per-lesson merge: keep whichever completedAt is later, union the
    // answer history. This way two devices editing different lessons do
    // not stomp each other.
    var out = { lessons: {}, updatedAt: Date.now() };
    var keys = {};
    Object.keys(localState.lessons || {}).forEach(function (k) { keys[k] = 1; });
    Object.keys(remoteState.lessons || {}).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      var l = (localState.lessons || {})[k] || { answers: {}, completedAt: null, visitedAt: 0 };
      var r = (remoteState.lessons || {})[k] || { answers: {}, completedAt: null, visitedAt: 0 };
      var lc = l.completedAt || 0;
      var rc = r.completedAt || 0;
      var lv = l.visitedAt || 0;
      var rv = r.visitedAt || 0;
      out.lessons[k] = {
        answers: Object.assign({}, r.answers || {}, l.answers || {}),
        completedAt: lc && rc ? Math.max(lc, rc) : (lc || rc || null),
        visitedAt: Math.max(lv, rv),
      };
    });
    return out;
  }

  function pullFromFile() {
    return fetch(PROGRESS_PATH, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (remote) {
        var local = read();
        var merged = mergePreferIncoming(local, remote);
        write(merged);
        if (window.AIFSProgress && window.AIFSProgress.onChange) {
          // AIFSProgress.onChange is a list; fire one to refresh listeners.
          window.AIFSProgress.totalCompleted();
        }
        return merged;
      });
  }

  function exportToFile() {
    var state = read();
    var payload = {
      schema: 'aifs:progress:v1',
      exportedAt: new Date().toISOString(),
      lessons: state.lessons,
      updatedAt: state.updatedAt,
    };
    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'progress.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function mountUI() {
    if (document.getElementById('aifs-progress-sync')) return;
    var bar = document.createElement('div');
    bar.id = 'aifs-progress-sync';
    bar.style.cssText = [
      'position:fixed', 'right:16px', 'bottom:16px', 'z-index:9999',
      'display:flex', 'gap:8px', 'align-items:center',
      'padding:8px 10px', 'background:var(--bg-surface,#fafaf5)',
      'border:1px solid var(--border,#3553ff)', 'border-radius:6px',
      'font:12px/1.2 ui-monospace,monospace',
      'box-shadow:0 2px 6px rgba(0,0,0,0.08)'
    ].join(';');
    bar.innerHTML =
      '<span style="opacity:.7">progress</span>' +
      '<button data-act="pull" style="all:unset;cursor:pointer;padding:4px 8px;border:1px solid #3553ff">Pull</button>' +
      '<button data-act="export" style="all:unset;cursor:pointer;padding:4px 8px;border:1px solid #3553ff">Export</button>' +
      '<span data-role="msg" style="opacity:.6;margin-left:4px"></span>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;
      var act = t.getAttribute('data-act');
      var msg = bar.querySelector('[data-role="msg"]');
      if (act === 'pull') {
        msg.textContent = 'pulling...';
        pullFromFile()
          .then(function (m) {
            var n = Object.keys(m.lessons).filter(function (k) {
              return m.lessons[k].completedAt;
            }).length;
            msg.textContent = 'merged. ' + n + ' done.';
            setTimeout(function () { msg.textContent = ''; }, 3000);
            // Notify any page (catalog/lesson) that listens.
            window.dispatchEvent(new CustomEvent('aifs:progress:loaded', { detail: m }));
          })
          .catch(function (err) {
            msg.textContent = 'pull failed: ' + err.message + ' (serve the repo root, not /site)';
            setTimeout(function () { msg.textContent = ''; }, 6000);
          });
      } else if (act === 'export') {
        exportToFile();
        msg.textContent = 'downloaded progress.json -> commit on personal/progress';
        setTimeout(function () { msg.textContent = ''; }, 5000);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountUI);
  } else {
    mountUI();
  }

  window.AIFSProgressSync = {
    pull: pullFromFile,
    exportNow: exportToFile,
    merge: mergePreferIncoming,
  };
})();
