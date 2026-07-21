# Personal Progress Tracking (fork only)

The live site at `aiengineeringfromscratch.com` runs upstream's
`site/progress.js`, which stores your progress in browser `localStorage`.
That data is per-browser-per-device and does not sync. This fork adds a
local-only sync layer so you can take the curriculum on multiple devices
while keeping one source of truth.

## Branch model

| Branch | Purpose | Push to? |
|---|---|---|
| `main` | Clean mirror of `rohitg00/ai-engineering-from-scratch`. Synced with `upstream/main` periodically. | `origin/main` (your fork) |
| `personal/progress` | Your `progress.json` and the `site/progress-sync.js` patch. **Never merged into `main`.** | `origin/personal/progress` only |

> The sync UI is served by `personal/progress`'s `site/progress-sync.js`.
> It only works when you run the site from this branch locally.

## One-time setup on a new device

```bash
git clone https://github.com/arz03/ai-engineering-from-scratch.git
cd ai-engineering-from-scratch
git remote add upstream https://github.com/rohitg00/ai-engineering-from-scratch.git
git fetch upstream
git checkout personal/progress
```

## Daily use (Recommended Workflow)

```bash
# 1. Run the local dev server (auto-pulls & auto-saves progress.json in real time)
python scripts/serve.py
# -> http://localhost:8000/site/catalog.html
# -> http://localhost:8000/site/prereqs.html

# 2. Open catalog or roadmap. Your progress automatically hydrates on load.

# 3. Take lessons and complete quizzes in lesson.html.
#    Progress automatically auto-saves directly to progress.json!

# 4. Before switching devices, commit & push progress.json:
git add progress.json
git commit -m "chore(progress): update lesson progress"
git push origin personal/progress

# 5. On the next device: git pull, run python scripts/serve.py, repeat.
```

### Static Server Fallback (Optional)

If running a generic static server without `scripts/serve.py` (e.g. `python -m http.server 8000`):
- Click **Pull** in the bottom-right sync bar to hydrate from `progress.json`.
- Click **Sync/Save** to download an updated `progress.json` to your Downloads folder, then move it to the project root and commit.

## Syncing with upstream (Main Repo Updates)

Keep your fork up-to-date with new upstream lessons from `rohitg00/ai-engineering-from-scratch`:

```bash
# 1. Update main branch from upstream
git checkout main
git fetch upstream
git pull upstream main
git push origin main

# 2. Merge main updates into your personal progress branch
git checkout personal/progress
git merge main
git push origin personal/progress
```

## Updating ROADMAP.md on this branch

`ROADMAP.md` on `personal/progress` is your own scoreboard. The glyphs
mirror what you marked complete in the UI.

### Manual flip (recommended — small, explicit commits)

Open `ROADMAP.md`, find the lesson row, and replace the status cell
glyph in the **third** column:

| Meaning | Glyph |
|---|---|
| Not started | `⬚` |
| In progress | `🚧` |
| Complete | `✅` |

```bash
git add ROADMAP.md
git commit -m "chore(progress): mark phase 0 lesson 09 complete"
git push origin personal/progress
```

### Bulk flip (when starting from a clean fork)

If you want to start with everything unchecked, run this once:

```bash
python -c "
import pathlib
p = pathlib.Path('ROADMAP.md')
src = p.read_text(encoding='utf-8')
new_lines = []
for line in src.splitlines(keepends=True):
    s = line.lstrip()
    if s.startswith('|') and s.count('|') >= 4:
        cells = [c.strip() for c in s.split('|')[1:-1]]
        if len(cells) == 4 and cells[2] == '\u2705':
            lead = line[:len(line)-len(s)]
            new_lines.append(lead + '| ' + ' | '.join([cells[0], cells[1], '\u2b1a', cells[3]]) + ' |\n')
            continue
    new_lines.append(line)
p.write_text(''.join(new_lines), encoding='utf-8')
"
```

## Conflict policy

`progress.json` is a personal file. If two devices edit it offline and
both push, last-write-wins on the file, and the per-lesson merge in
`site/progress-sync.js` reconciles on the next load anyway. Keep
changes small and commit often to avoid divergence.
