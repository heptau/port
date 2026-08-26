---
title: "The End of the Python Era? How AI Helped Me Rewrite a 10-Year-Old Tool in Go"
description: "Rewriting OmniDB from Python to Go as a case study — why in the AI era it no longer makes sense to sacrifice runtime performance for the sake of convenient coding."
locale: "en"
categories: ["AI", "PostgreSQL"]
date: 2026-08-26
tags: ["OmniDB", "Python", "Go", "AI", "PostgreSQL", "Rust", "software rewrite"]
draft: false
translation_id: "2026-08-26_1"
---

Is it just me, or has it recently started paying off to reach for a compiled language even in places where, a few years ago, Python would have been the automatic choice?

OmniDB was once a popular PostgreSQL GUI tool — built on Python/Django, with a desktop frontend that started out on Electron and was later swapped for the lighter NW.js. The project gradually stalled. Not because the idea was flawed, but because maintaining a monolithic Python stack became unsustainable. This article isn’t a rewrite tutorial. It’s a reflection on why projects like this die — and how a modern stack, combined with AI, is changing the rules of the game.

**Thesis:** Rewriting old software used to be considered close to suicide (“never rewrite from scratch”). Today, thanks to shifts in technology and AI, a rewrite is increasingly becoming a rational choice — and I’m not alone in that observation, as a few well-known examples from large companies will show.

---

## 1. The Old Dogma: Developer Time Costs More Than CPU

> “Hardware is cheap, developer time is expensive.”

This principle won the language wars of the last fifteen years. Development in Python was fast, the syntax friendly, the library ecosystem enormous. So what if the app eats 150 MB of RAM and takes a few seconds to start? No big deal — we’ll wait, or buy a beefier machine. Practically every popular language of that era (Python, JavaScript/TypeScript, Java) is either interpreted or runs on a virtual machine. Nobody cared much about runtime efficiency, because “the hardware will catch up.”

## 2. AI Changes the Equation

AI now handles boilerplate, refactoring, and even converting logic between languages. Time spent writing typed, compiled code is no longer automatically several times longer than writing Python — AI can generate it in a matter of seconds today.

The consequence: as the cost of writing code goes down, **runtime efficiency, response speed, and memory footprint** move back into focus — exactly the things that got happily sacrificed for developer convenience over the last fifteen years.

Something worth thinking about: does it still make sense to pay for “convenient coding” with an application’s performance, when an LLM is already writing most of that code for you anyway?

## 3. The Illusion of Convenience, a.k.a. Python Deployment Hell

Python is comfortable to **write** — but getting it into a user’s hands is a different story:

- virtual environments and dependency conflicts,
- different interpreter versions across Linux/macOS/Windows,
- C libraries that need to be compiled separately for every platform,
- PyInstaller/cx_Freeze as the “solution” — resulting in a giant folder full of `.so`/`.dll` files,
- a custom CI setup needed for every target platform.

Go solves all of this differently:

- **a single static binary** — no runtime, no dependencies,
- **cross-compilation with one command** (`GOOS=linux`, `GOOS=darwin`, `GOOS=windows`) straight from one machine,
- **long-term sustainability** — ten years from now, you just download the binary and run it. No `pip install` dance, no broken dependency chains.

The paradox: Go development ends up simpler and more sustainable, because it strips away the operational baggage around deployment. What Python’s convenience seems to save you at the start comes back as a debt you pay on every single release.

## 4. I’m Not the Only One — Big Companies Do the Same Kind of Rewrites

This isn’t just the feeling of one developer reviving a ten-year-old side project. Plenty of large companies have moved in the same direction in recent years — away from comfortable-but-slower runtimes, toward faster and more predictable ones:

- **Discord** rewrote its Read States service (tracking which messages you’ve read) from Go to Rust. The reason wasn’t “Go is bad,” but a specific pain point: Go’s garbage collector was causing latency spikes under load. Rust, with no GC, fixed it — and even with just basic optimization, outperformed the hand-tuned Go version ([Discord Blog](https://discord.com/blog/why-discord-is-switching-from-go-to-rust)).
- **Dropbox** rewrote the core of its sync engine (internally codenamed Nucleus) from Python to Rust. The old data model lacked stable file identifiers across moves, and memory-footprint limits couldn’t be fixed with incremental patches — they needed a new, deterministic, single-threaded core that could be fuzz-tested at massive scale. In the team’s own words, Rust was a “force multiplier” and one of the best decisions they made ([Dropbox Tech](https://dropbox.tech/infrastructure/rewriting-the-heart-of-our-sync-engine)).
- **Uber** rewrote the worker nodes of its Schemaless datastore layer from Python (Flask/uWSGI, one request per process) to Go, to take advantage of lightweight concurrency instead of scaling purely by spinning up more processes. Much of their broader platform later moved the same direction — Python and Node.js stopped keeping up with their latency budgets at their scale of traffic ([Uber Blog](https://www.uber.com/en-IT/blog/schemaless-rewrite/)).
- **Cloudflare** published a post in February 2026 describing how one engineer, with AI’s help, built **vinext** from scratch in a single week — a complete reimplementation of Next.js on Vite instead of Turbopack, deployable straight to Cloudflare Workers. It covers 94 % of the Next.js 16 API surface, builds 4.4 x faster (1.67 s vs. 7.38 s), and ships a client bundle 57 % smaller (72.9 KB vs. 168.9 KB gzipped). Cost: roughly $ 1,100 in API tokens across ~800 OpenCode sessions. In Cloudflare’s own words, “almost every line of code in vinext was written by AI” — the human handled architecture decisions, prioritization, and course-correcting the AI out of dead ends ([Cloudflare Blog](https://blog.cloudflare.com/vinext/)).

The common thread across the first three cases: this was never about fashion or “let’s rewrite it because Go/Rust is trendy.” It was always about a concrete, measurable ceiling — latency, memory, predictability — that couldn’t be removed in the original language without a fundamental architecture change. Cloudflare then takes it a step further and puts this very article’s thesis on display: what used to take a team months, one person pulled off in a week, at a cost far below a single developer’s monthly salary.

## 5. Case Study: OmniDB by the Numbers

A direct comparison of old OmniDB 3.2 (Python/Django + NW.js) and new OmniDB 4.2 (Go/Wails), measured on the same machine:

| Metric | Old OmniDB 3.2 (Python/NW.js) | New OmniDB 4.2 (Go/Wails) | Difference |
|---|---|---|---|
| `.app` size | 478 MB | 73 MB | −405 MB (−85 %) |
| Download archive | 201 MB | 28 MB | −173 MB (−86 %) |
| Backend server start (to “listening” state) | 0.32 s | 0.05 s | ~6 x faster |
| Backend RSS at idle | 104 MB | 19 MB | ~5 x less |

A methodology note, for honesty’s sake: I’m not including a number for full GUI application startup (NW.js/Chromium vs. Wails/system webview) — the difference is likely even bigger, but without a clean measurement I’d just be guessing. Total application RAM can’t be fairly compared either: NW.js carries its entire Chromium instance inside itself, while Wails uses the system’s WebKit, whose memory gets accounted separately under `com.apple. WebKit.*` processes on macOS. So the numbers above cover the backend server only — a smaller claim, but a verifiable one.

What got lost in the rewrite: the plugin system (Python plugins) and the step-by-step PL/pgSQL debugger, which needed its own C extension in `shared_preload_libraries` — something no managed Postgres would let you load today anyway. Along with them went three plugin integrations for long-dead upstream projects (pglogical, Postgres-BDR, Postgres-XL). Not every rewrite is lossless, and there’s no point pretending otherwise.

## 6. Python in the AI Era — Real Performance vs. Apparent Performance

Python is having a boom right now thanks to AI/ML, but there’s a catch: in model training and inference it mostly works as “glue” — the actual computation runs in C++/CUDA/PyTorch underneath. For desktop tools, CLI utilities, and database clients, though, Python brings the full weight of its runtime — slow startup, higher memory footprint — without the user actually benefiting from its flexibility. They just pay for it.

There’s also a second role Python increasingly plays in the AI era, and it’s worth distinguishing from the first: as the **execution language for AI agents themselves**. Code interpreters, sandboxed file-processing environments, and agent frameworks almost always reach for Python — it has a rich data-handling library ecosystem (pandas, openpyxl, Pillow), it’s the language LLMs have the most training data on, and, crucially, a script an agent generates and runs once isn’t distributed anywhere. It lives for a few seconds inside an isolated sandbox and then disappears.

That’s a fundamentally different situation from an application that hundreds of people install on their own machine and open every day. Nobody cares how fast a one-off sandboxed script starts up; how fast a desktop app starts when you open it ten times a day, they very much do. Python as glue for agents and Python as the runtime for a distributed desktop application are two different jobs with different requirements — and it’s a mistake to lump them together just because it’s the same language.

## 7. Conclusion: Lessons for Future Projects

1. Rewriting a project into a more efficient language is no longer an elitist indulgence — AI has significantly cut the cost of both conversion and ongoing maintenance, and big companies like Discord, Dropbox, Uber, and Cloudflare do it too, whenever they hit a concrete performance ceiling or want to take advantage of AI-assisted development.
2. Python still earns its place where it dominates — data science, AI prototyping, one-off agentic scripting.
3. For distributed tools and client applications, though, it now makes sense to go back to compiled, self-contained languages — Go, Rust, Zig.
4. Don’t be afraid to revive good old tools — a modern stack plus AI can breathe a second life into them at a fraction of the maintenance cost.

The new OmniDB 4.2 is free to download at 🔗 [www.omnidb.net](https://www.omnidb.net).

---

*Have a similar story about rewriting an old tool into a different language? I’d love to hear about it.*
