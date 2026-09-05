# Demo sandbox

## Entry

- Production: `https://one-screen-sprint.sociobot.in/demo`
- Local: `http://localhost:4173/demo` after `npm run build && npm run preview`
- Query fallback: `/?demo=1`

The Demo navigation link and “Try it with sample data” action use `/demo`.

## Sample

The sample is a “Weekend rematch” on deterministic course `CLUB-7`. It begins
at one round each, with round three ready to play. Both players start on the
left. The course contains six platforms, four grapple rings, floor hazards,
and a finish gate.

The persistent banner reads “Demo — sample data, nothing is saved”. Reset demo
removes only sample state and recreates the 1–1 starting point. Leaving demo
with Start for real, browser history, or a direct in-site route discards the
sample namespace. Reloading `/demo` keeps the current sample only in its own
history entry.

## Isolation

Demo storage keys begin with `demo:one-screen-sprint:`. Real storage keys begin
with `one-screen-sprint:`. Demo mode never reads, writes, or removes the real
namespace. The claim test starts with real settings, changes and resets the
demo, leaves it with Browser Back, confirms the real value is unchanged, and
checks that Forward starts a clean sample.
