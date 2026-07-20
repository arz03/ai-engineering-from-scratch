# Personal Progress Tracking (fork only)

The live site at `aiengineeringfromscratch.com` runs upstream's
`site/progress.js`, which stores your progress in browser `localStorage`.
That data is per-browser-per-device and does not sync. This fork adds a
local-only sync layer so you can take the curriculum on multiple devices
while keeping one source of truth.

## Branch model

| Branch | Purpose | Push to? |
|---|---|---|
| `main` | Clean mirror of `rohitg00/ai-engineering-from-scratch`. Rebased from `upstream/main` periodically. | `origin/main` (your fork) |
| `personal/progress` | Your `progress.json` and the small `site/progress-sync.js` patch. **Never merged into `main`.** | `origin/personal/progress` only |

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

## Daily use

```bash
# 1. Always serve the repo root, not the site/ directory, so /progress.json resolves.
python -m http.server 8000
# -> http://localhost:8000/site/catalog.html
# -> http://localhost:8000/site/lesson.html?path=phases/00-setup-and-tooling/01-dev-environment

# 2. On a fresh device, click the floating "Pull" button in the bottom-right.
#    This merges ../progress.json into localStorage.

# 3. Take a lesson. The site marks it complete in localStorage as normal.

# 4. Click "Export" to download an updated progress.json. Overwrite the one
#    in the repo and commit + push:
mv ~/Downloads/progress.json ./progress.json
git add progress.json
git commit -m "chore(progress): update after phase 0 lessons"
git push origin personal/progress

# 5. On the next device: git pull, repeat.
```

## Syncing with upstream

Do this on `main`, never on `personal/progress`:

```bash
git checkout main
git fetch upstream
git rebase upstream/main          # or: git merge upstream/main
# If site/data.js or README.md conflict (per AGENTS.md):
git checkout --theirs site/data.js
node site/build.js
git add site/data.js
python3 scripts/build_catalog.py
python3 scripts/check_readme_counts.py --fix
git add README.md
git commit --no-edit
git push origin main
```

`personal/progress` does not need to rebase — it is just a 1-file branch
plus the sync module. After an upstream sync you can rebase it onto the
new `main` if you want, but it is not required because `main` does not
read `progress.json`.

## Conflict policy

`progress.json` is a personal file. If two devices edit it offline and
both push, last-write-wins on the file, and the per-lesson merge in
`site/progress-sync.js` reconciles on the next "Pull" anyway. Keep
changes small and commit often to avoid divergence.

## Removing this from your fork

If you want to stop syncing, just delete the branch:

```bash
git push origin --delete personal/progress
git branch -D personal/progress
```

The `main` branch is unaffected.
