/**
 * Personal progress sync for ai-engineering-from-scratch (forked).
 *
 * Automatically syncs local progress with progress.json across devices.
 * Features:
 *   - Auto-pulls progress from progress.json on page load.
 *   - Auto-saves changes to progress.json via POST /api/progress when running scripts/serve.py.
 *   - Fallback Export button to download progress.json when using a standard static server.
 */
(function () {
  var STORAGE_KEY = 'aifs:progress:v1';
  var PATH_CANDIDATES = ['/progress.json', '../progress.json', './progress.json', 'progress.json'];
  var API_ENDPOINTS = ['/api/progress', '/site/api/progress'];

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

  function tryFetchFirst(paths, idx) {
    if (idx >= paths.length) return Promise.reject(new Error('progress.json not found'));
    return fetch(paths[idx], { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) return tryFetchFirst(paths, idx + 1);
        return r.json();
      })
      .catch(function () {
        return tryFetchFirst(paths, idx + 1);
      });
  }

  function pullFromFile() {
    return tryFetchFirst(PATH_CANDIDATES, 0)
      .then(function (remote) {
        var local = read();
        var merged = mergePreferIncoming(local, remote);
        write(merged);
        notifyProgressLoaded(merged);
        return merged;
      });
  }

  function trySaveToApi(endpoints, idx, payload) {
    if (idx >= endpoints.length) return Promise.reject(new Error('No API endpoint available'));
    return fetch(endpoints[idx], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) return trySaveToApi(endpoints, idx + 1, payload);
      return r.json();
    }).catch(function () {
      return trySaveToApi(endpoints, idx + 1, payload);
    });
  }

  function saveProgress() {
    var state = read();
    var payload = {
      schema: 'aifs:progress:v1',
      exportedAt: new Date().toISOString(),
      lessons: state.lessons,
      updatedAt: state.updatedAt || Date.now(),
    };
    return trySaveToApi(API_ENDPOINTS, 0, payload);
  }

  function exportToFile() {
    var state = read();
    var payload = {
      schema: 'aifs:progress:v1',
      exportedAt: new Date().toISOString(),
      lessons: state.lessons,
      updatedAt: state.updatedAt || Date.now(),
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

  function notifyProgressLoaded(state) {
    if (window.AIFSProgress && typeof window.AIFSProgress.totalCompleted === 'function') {
      window.AIFSProgress.totalCompleted();
    }
    window.dispatchEvent(new CustomEvent('aifs:progress:loaded', { detail: state }));
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
      '<button data-act="save" style="all:unset;cursor:pointer;padding:4px 8px;border:1px solid #3553ff">Sync/Save</button>' +
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
          })
          .catch(function (err) {
            msg.textContent = 'pull failed: ' + err.message;
            setTimeout(function () { msg.textContent = ''; }, 6000);
          });
      } else if (act === 'save') {
        msg.textContent = 'saving...';
        saveProgress()
          .then(function () {
            msg.textContent = 'saved to progress.json!';
            setTimeout(function () { msg.textContent = ''; }, 3000);
          })
          .catch(function () {
            exportToFile();
            msg.textContent = 'exported progress.json (commit & push)';
            setTimeout(function () { msg.textContent = ''; }, 5000);
          });
      }
    });

    // Auto-pull on load
    pullFromFile().catch(function () {});

    // Listen to local progress changes and auto-save if API is present
    if (window.AIFSProgress && typeof window.AIFSProgress.onChange === 'function') {
      window.AIFSProgress.onChange(function () {
        saveProgress().catch(function () {});
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountUI);
  } else {
    mountUI();
  }

  window.AIFSProgressSync = {
    pull: pullFromFile,
    save: saveProgress,
    exportNow: exportToFile,
    merge: mergePreferIncoming,
  };
})();
