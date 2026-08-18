# LCCE Manager — shareable prototype

A single-page app for working through local-crop-cost-of-experiment contracts: nominating
fields, recording scale tickets, calculating yield, running it through QC and approval, and
averaging selected fields into a location LCCE.

**Live site:** https://bmholl.github.io/lcce-manager/

## What this copy is

This repository holds only the files a browser needs to run the app — the compiled bundle,
React, the stylesheet-bearing `index.html`, and two images. It is a published copy for
showing the prototype around, not the development repository, so there is no source,
no build script, and no backend here.

All grower, field, and ticket data is **synthetic seed data**. Nothing here comes from a
production system.

## How the data behaves

There is no server behind this copy, so nothing is shared between visitors. On first load
the app starts from the seed dataset, and every change auto-saves to your own browser's
`localStorage`. That means:

- Your edits are visible only to you, in only that browser.
- Two people opening the link cannot collaborate on one dataset.
- Clearing the browser's site data resets everything to the seed.

It is the right shape for a demo, and deliberately not a way to keep real records.
