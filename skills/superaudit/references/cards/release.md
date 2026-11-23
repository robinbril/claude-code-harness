when: duty:release
What does merging set in motion, and does the first deploy survive it? Env vars and secrets that must exist first; order of migration, backend, worker, frontend; flag defaults; health check; rollback; new dependency (real, pinned, needed, install script); workflow permissions, untrusted input in `run:`, unpinned action; shell `set -e`, quoting, partial failure.
Where do tests and production differ here: debug, auth, migrations, flags, receivers, providers, proxy prefixes?
