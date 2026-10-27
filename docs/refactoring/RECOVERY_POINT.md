# Recovery point — before ETAPA B / B0

**Created:** 2026-10-27  
**Repository:** TableFlow (`/Users/javierruizherrera/Documents/Repositorios/TableFlow`)

## Safe restore references

| Ref | Value |
|-----|--------|
| Pre-B0 tip (audit branch) | `e546e9736bda3801879dbe831a33d34992ad1e47` (`bbdd`) |
| `main` / `origin/main` at start | `77a5052001a6d6e9f9cb1c3695981f6de86f118d` (`Initial commit`) |
| Branch that held WIP | `audit/local-supabase-validation` |

## How to restore if working tree is damaged

```bash
# Option A — return to the exact pre-B0 commit on the audit branch
git switch audit/local-supabase-validation
git reset --hard e546e9736bda3801879dbe831a33d34992ad1e47
# Then re-apply any stash named tableflow-B0-recovery-WIP if present:
git stash list
git stash pop stash^{/tableflow-B0-recovery-WIP}

# Option B — inspect only
git show e546e9736bda3801879dbe831a33d34992ad1e47 --stat
```

**Do not** `git reset --hard` on `main` without authorization.

## Note

ETAPA B continues on **`main`** with uncommitted working-tree changes (no commits unless authorized).
