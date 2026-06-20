---
title: "Product Brief: travel-map"
status: final
created: 2026-06-16
updated: 2026-06-16
---

# Product Brief: travel-map

## Executive Summary

travel-map is a private, web-first travel memory keeper. It gives you one continuous, zoomable world map that you fill in after your trips — color in the countries and regions you've been, attach the photos and notes that matter, and keep them somewhere that's yours. Unlike the apps that chase live GPS tracking or social bragging rights, travel-map is built for the way people actually remember travel: from the couch, weeks later, with a camera roll and a few fond memories.

The product's real job isn't logging — it's bringing you back. A gentle notification surfaces a memory ("two years ago today, you were in Kyoto"), you tap, and you find yourself wandering your own map again. That loop — remember, re-live, occasionally add — is the heart of the product and the thing the entire category gets wrong.

It starts as a personal tool, built by someone who wants exactly this and can't find it, with a clear path to opening up once it earns its first user's return visits. So even in v1, accounts, privacy, and durability are built for real.

## The Problem

People want a single, lasting home for their travel memories, and they don't have one. The options all fail in the same few ways:

- **The "color your countries" apps** (Been, Visited, Skratch) are mobile-only, treat photos as an afterthought, hide basic features behind stacked paywalls, and, worst of all, have a track record of losing your data on logout or reinstall.
- **The GPS trip-journalers** (Polarsteps, FindPenguins) capture rich memories but force you into live background tracking: battery drain, privacy creep, and route bugs. They assume you tracked the trip *as it happened* — useless for the trip you took last year and never logged.
- **The incumbents** (Google Maps Timeline) aren't memory keepers at all, and in 2025 permanently deleted many users' location histories.

So the person who wants to sit down weeks after a trip and lovingly record where they went has nowhere good to do it. And even if they start, nothing pulls them back — they log one trip, feel a flicker of satisfaction, and never return. The memories sit untouched until the app is forgotten.

## Who This Serves

**The primary user is someone who travels and treasures it** — who wants their trips gathered in one place they can return to, again and again, to re-live where they've been and what they did. They're not trying to broadcast (they already posted on Instagram); they want a quiet, personal record for themselves. They log from memory, on their own schedule, with no pressure to document everything at once.

The first such user is the builder. This is a personal tool first, public second. The immediate bar: *I* open it on a random Tuesday and happily wander my own map. Clear that bar, then open it to others who feel the same — the trajectory is private prototype to shared product, not personal forever.

## What Makes This Different

Four deliberate bets, each one a turn away from what the category does:

1. **Private over social.** No leaderboards, no compare-with-friends, no public feed. The quiet place you return to for yourself.
2. **Remembering over tracking.** Built for logging past trips from the couch, not live GPS capture. The trip you took years ago is a first-class citizen.
3. **Manual and intentional over auto-magic.** You choose a place and add to it deliberately — full control, no mystery auto-tagging that drops your Osaka photo in Tokyo.
4. **Trustworthy and durable.** A safe, permanent home for memories — answering the category's #1 complaint: lost data.

The honest moat here is not technology — it's point of view and execution. Doing the simple thing well, for the user everyone else is ignoring.

## Success Criteria

Because this is personal-first then public, success comes in two stages.

**Stage 1 — the personal bar (does the loop work?):**

- The builder voluntarily returns to the app on days with nothing new to log — opening it to re-live, not to record.
- Resurfacing notifications get *opened*, not muted — if they're muted, the core thesis is wrong, and better to learn that early.
- Within a few weeks, the builder has back-filled real travel history — because he wanted to, not out of obligation.

**Stage 2 — the public bar (does it work for strangers?):**

- New users come back in week two and beyond — clearing the exact retention cliff the whole category falls off.
- Users log more than one trip. A second trip means the first visit earned trust.
- Nobody loses data. Durability holds under real use.

## Scope

**In, for v1 (web):**

- Accounts with durable, reliable persistence and cross-device sync (data loss is the cardinal sin).
- One continuous zoomable map: world → country → sub-region, shared data, no mode toggle.
- Mark a place visited (binary), at country or region level.
- Per-place memories: upload photos and write notes, attached to the place you explicitly selected.
- Optional date (date picker, never required).
- Onboarding: quickly tap the countries you've visited, and choose your default home view (world or home country). Changeable in settings.
- "Add details later" everywhere — a bare entry is complete; nothing is ever flagged as unfinished.
- **The retention loop:** "on this day" memory resurfacing plus notifications that deliver a real memory (never an engagement nag), and a per-place memory view to wander into.

**Explicitly out of v1:**

- Native mobile app (web-first; but the stack stays mobile-ready — see addendum).
- Social features: sharing, public maps, friends, comparison, leaderboards (private by design).
- The fast-follow ideas (memory-reel videos, wishlist state, year-in-review, printable maps, EXIF date pre-fill, fuzzy time, trip clustering) — parked, detailed in the addendum.
- Live GPS tracking — out by design, not by timeline. It is the opposite of this product.

## Vision

If it works, travel-map becomes the trusted, lasting home for a person's travel memories — the place you've kept your trips for a decade, that still feels good to open. Web grows to mobile, so the map is in your pocket. The fast-follows compound the core feeling — a memory reel you can keep, a wishlist that turns the map into a dream board, and more. The line it never crosses: it stays a quiet, personal place, the antidote to performing your travels, the place you keep them for yourself.
