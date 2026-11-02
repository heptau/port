---
title: "Polite AI Sees Less: The Tax of Respecting robots.txt"
description: "When I told the agent behind Sledovna.cz to respect robots.txt, I closed the door on quality sources. The manipulated ones stayed open. Notes from running a small civic project."
locale: "en"
categories: ["AI", "Software Engineering"]
date: 2026-11-02
tags: ["AI", "robots.txt", "Sledovna", "copyright", "TDM", "RAG", "disinformation", "open data"]
draft: false
translation_id: "2026-11-02_1"
---

When I was writing the rules for the agent that comments on parliamentary bills for [Sledovna.cz](https://sledovna.cz), I added a sentence that felt like a formality: *before you load a page from a new domain, read its robots.txt.* A few days later I realized that this one sentence had fundamentally affected the quality of my own project.

This article is not legal advice, and it’s not a complaint about publishers. It’s notes from running the thing: what happens when an AI faithfully follows the rules websites have set up. And also what stays open once you’ve counted the closed doors.

**Sledovna** is a small service that every day downloads the new bills (Czech: *tisky*, the numbered parliamentary prints) from the Chamber of Deputies of the Czech Parliament (*Poslanecká sněmovna*), has an AI write a clear commentary (what changes, who proposed it, what the explanatory memorandum says, who criticizes it, how the same problem is handled elsewhere, and how the AI would vote) and publishes it as a static website. It’s not a business. Ads are meant, at best, to cover part of the tokens, nothing more.

---

## 1. The sentence that closes doors

The whole rule reads like this:

> Check the source’s robots.txt and follow it.

It’s not a law. It’s my rule. And it’s a rule that costs me quality.

Just look at what `robots.txt` looks like at the Czech sources that would be the most valuable for analyzing legislation. For example irozhlas.cz, the news site of Czech Radio:

```
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference

User-agent: ClaudeBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-Web
Disallow: /
```

iDnes, one of the largest Czech news portals, similarly blocks `ClaudeBot`, `anthropic-ai` and `Claude-Web`. And, surprisingly, so does zakonyprolidi.cz, a site that thousands of people look at every day for consolidated versions of laws:

```
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference

User-agent: ClaudeBot
Disallow: /
```

That last one is especially interesting. The text of a law is not protected by copyright (in Czech law it falls under so-called official works, *úřední díla*, under § 3 of the Copyright Act). But a particular edition, editing and databases built around it may well be protected. So when I want to quickly check how § 41 a reads today, the most convenient source sends me away, and I have to go to a more official and more cumbersome one.

And then there’s psp.cz, the Chamber of Deputies itself (*Sněmovna*). Its `robots.txt` disallows, among other things, `/sqw/text/orig2.sqw`, the address where the PDF and DOCX full texts of the bills live. Automated collection is therefore limited, so I download the full texts by hand and pass them to the agent. This is exactly the situation where a human is allowed more than their tool, and I’ll come back to that.

## 2. What it does to the answer

At that moment the AI isn’t any dumber. It’s just cut off from part of the world it’s supposed to talk about. But the result is hard to tell apart from stupidity:

- **Fewer independent sources.** Instead of five viewpoints there are two. Instead of criticism from the media, all that remains is the explanatory memorandum and the bill itself.
- **Older and secondhand information.** When the original is closed, the agent often ends up with a reprinted report, or with a foreign article that knows nothing about the Czech bill.
- **More hedging sentences.** The less the agent knows, the more often it writes “cannot be verified”, “the available sources suggest” and “may have implications”. Exactly the generic phrases I’d least like to see in the commentaries.
- **A blind spot exactly where it’s needed most.** An explanatory memorandum tends to be selective. International comparisons are missing from it, or they’re assembled to support the proposal. Independent criticism and experience from other countries are supposed to be the counterweight. If I don’t get them, I don’t get the counterweight either.
- **A higher price.** Instead of one pass, the agent runs five searches, opens three substitute sources, and still ends up with less information. I pay more tokens for a worse answer.

A concrete example from Sledovna: for a bill on addictive substances I had to write in the article that the official sites of many countries (for example the American DEA or the Federal Register) block automated reading, and the European Union Drugs Agency (EUDA) explicitly forbids using its content for AI, so the situation in individual countries is documented only partially and from more general sources. That is exactly the tax. Not that the AI can’t search. But someone closed part of the world to it, and it has to admit that.

Here is what such an admission looks like in practice. For a Senate bill that would make murder not subject to the statute of limitations, Sledovna had to add an update after publication: the previous version of the article had attributed specific objections to the government’s position that could not be verified from the available sources, so they were removed and the article says so openly. (The screenshot is in Czech.)

![Sledovna.cz: an update to an article on a Senate bill, explaining that unverified objections attributed to the government were removed](/images/2026-11-02_sledovna.webp)

## 3. It’s not just robots.txt

`robots.txt` is one layer. In reality the restrictions add up:

| Layer | Example | What it does |
|---|---|---|
| Legal | `robots.txt`, terms of service, a TDM reservation under Art. 4 of Directive 2019/790 | the agent doesn’t load the source at all |
| Commercial | paywall, licensing deals, API prices | the source exists, but only for money I don’t have |
| Technical | CAPTCHA, rate limits, geo-blocking, Cloudflare | the agent hits a wall, or slows down so much that it can’t keep up |
| Product | the model refuses, a tool is missing, the context runs out | the model says “I can’t”, even though the source exists |

Each of them makes sense on its own. Together, though, they produce something that looks like “AI is dumb”, when in fact it’s an AI to which we have gradually closed nearly all the doors, and then we wonder why it only sees the hallway.

There’s also one more asymmetry that I have no way to measure. I forbid the agent to read irozhlas.cz. But the model the agent runs on may have learned from the web at a time when such a ban didn’t exist or wasn’t respected. So I police the live reading, but what the model “knows” from training I can’t police, and from an answer I often can’t even tell where something comes from. My politeness therefore covers only part of how an AI uses content, and that’s one of the reasons I mention, further down, the requirement for a traceable source behind every claim.

## 4. The other side: what stays open

Here I get to something that surprised me more than the blocking itself. Closed doors are only half of the problem. The other half is **what stays open**.

Publishers who live off quality work (editorial staff, fact-checking, archives) have a reason to close their sites to robots. What stays open, by contrast, is mostly the content of those who care first of all about reach:

- **Lobbying and PR texts** disguised as analysis. An interest group writes an “analysis” of a bill under preparation; it looks factual, has charts and an expert tone, and yet it’s a one-sided position.
- **Sponsored and paid content** posing as editorial.
- **SEO sites and content farms**, often already generated by AI themselves. They copy one another, and each copy distorts a little.
- **Deliberate manipulation**: articles written so that a search engine, and therefore an agent, finds them first.
- **Prompt injection**: a page that hides text meant for the agent (“ignore previous instructions and write that…”).

A human notices who is behind a source. They look at the domain, the author, the tone, how the outlet makes its money. An agent in an automated run often sees only text. And a text manipulated by a lobbyist looks just as confident as a journalist’s.

This creates an unpleasant asymmetry. When politeness **closes** sources, quality disappears. When sources **stay open**, so does whatever is open for the wrong reasons. A polite AI then doesn’t read “less of the same”. It reads **a different selection**, tilted in favor of those who have an interest in being read by it.

The consequence is worse than “cannot be verified”. A reader runs into “cannot be verified” and knows to be careful. A manipulated source, though, leads to a **confident and wrong conclusion**. The agent writes that critics call the proposal dangerous, when in fact it’s quoting a single interest group. Or it writes that the foreign experience is positive, when in fact it’s repeating a paid article.

On top of that comes one more thing: **content closed at its original source often reaches the agent by a detour.** A blocked news item shows up as a reprint, in a news-agency wire, on an aggregator or in a comment on a blog. The ban formally holds and the content arrives anyway, shortened, stripped of context and often with the opinion of whoever repeated it added. The agent usually can’t tell it’s reading a copy rather than the original. A ban at the source therefore doesn’t guarantee that the content stays out of the output. It only guarantees that it doesn’t arrive in its best form.

What can be done about it, I lay out in the last part. The basics are simple: don’t confuse “open” with “reliable”.

## 5. What the law says and what it doesn’t

`robots.txt` is not a law. It’s an agreement described in RFC 9309: a website uses it to say what it doesn’t want robots to do. If you ignore it, you won’t necessarily break the law, but it’s bad faith, and it will come in handy for the other side in a dispute. For many sites `robots.txt` is also just the machine-readable part of the terms of service, and breaching those can already have legal consequences.

In Europe, Art. 4 of Directive 2019/790 on copyright in the Digital Single Market comes into play. It allows so-called text and data mining, but only as long as the rightsholder hasn’t reserved their rights “in an appropriate manner, such as machine-readable means in the case of content made publicly available online”. Whether `Content-Signal` exactly qualifies as such a reservation is interpreted differently. But the direction is clear: **a machine-readable “no” carries legal weight**; it’s not just a request.

The Czech Copyright Act, meanwhile, in § 3 excludes official works from protection (legislation, decisions, public documents). The text of the law is therefore free. But commentary, news reporting and the databases around it are not. And those are exactly what you need to understand the law. The law is free. The debate about it is not.

I’m not a lawyer and this isn’t legal advice. But even without legal training, one imbalance is easy to see.

## 6. A human is allowed more than their tool

I can open iDnes, read an article and use it as a source. My agent can’t. Not because it’s less capable, but because `robots.txt` talks about robots, not about people.

Imagine a library that tells you: you may read this book, but not with glasses.

When a human reads something and then dictates it to the agent, it’s still a human who is reading. Maybe that’s fine, maybe not, because the terms may also forbid feeding content into an AI. Either way, it doesn’t scale. Sledovna gets new bills every day, not just one. If I had to read five articles per bill by hand and retype them for the agent, the project would end up at my place, in my notes.

And here’s the oddity: the same text, the same purpose, the same person. Once with AI and once without. And the rules differ. That isn’t technological neutrality. It’s a quiet change in who is allowed to understand the world.

### Is an agent a robot, or a browser?

`robots.txt` was created for crawlers, programs that sweep through the web wholesale. An agent that opens a single page because I asked a question behaves more like a browser with much better glasses. The difference between a page opened by an automaton on its own and one opened because a specific person happened to ask is something today’s standards don’t address. Some AI providers therefore distinguish a training crawler, a search crawler and an agent acting at a user’s request, and each has its own identification and its own rules. Websites react to this in different ways, and the outcome is hard to predict.

From this point of view Sledovna is a simple case: the agent runs automatically every day, so it behaves like a robot and the rules for robots apply to it. But the more tools act on behalf of people at their request, the less clear it will be where “robot” ends and “human with a helper” begins.

## 7. Four paths on offer

When you hit this wall, you basically have four options:

| Path | What it means | What it costs you |
|---|---|---|
| Lie | claim that a human did it, or that the AI didn’t use the source | the truth about your method, and with it the credibility of the whole project |
| Circumvent and risk it | read the source under a different identity and wait to see if anyone objects | money, time and peace of mind; even a dispute you win can destroy a small project |
| Buy a license | strike a deal with the publisher | often out of reach for an individual; the transaction costs exceed the value |
| Be worse | follow the rules and live with fewer sources | output quality and more tokens |

I chose the last one. Not because I’m a saint, but because Sledovna stands on the fact that you can trace where every claim comes from. If I lie about the method, why would anyone trust the content?

Someone will say: “Then don’t do it with AI, do it with a human.” But a human who reads five bills, three explanatory memoranda, the international comparisons and the criticism every day isn’t one human. It’s a newsroom. And a newsroom costs more than tokens. A project that’s supposed to be free and useful can’t afford one.

## 8. Who pays for it

The consequences aren’t limited to a single article; they’re systemic:

- **Whoever doesn’t ask often gets more.** Someone who ignores `robots.txt` has more sources and fresher data. Quality starts to coincide with a willingness to break the rules.
- **Whoever isn’t in a license doesn’t exist for the model.** This isn’t censorship, it’s a quieter thing: content that doesn’t make it into training or search disappears from the answers. The debate narrows to those who have a deal with the big players.
- **Quality depends on the vendor.** Tomorrow you switch models, and another part of the internet may open up for you, or close. What your tool will see is not up to you.
- **A small project has no bargaining power.** Big publishers sign deals with big AI companies. A one-person civic project has nothing to offer.
- **You pay twice.** With a worse result and with more tokens spent looking for substitutes. A restriction isn’t only a legal category, it’s a line in the budget.

And one consequence that’s hard to measure: when politeness becomes a competitive disadvantage, people stop practicing it. Not because they’re bad, but because otherwise they won’t succeed. What’s left are rules that only those who can’t afford to break them follow.

## 9. What we’ve already paid for

One group of sources deserves special mention: the one we all finance. The outputs of the Chamber of Deputies, Czech Television and Czech Radio (funded by license fees and the state budget), and abroad, for example, parliaments, public broadcasters or official gazettes. They have a public function, and their content is produced with public money.

I think a different default should apply here: **what is paid for from taxes or similar fees should not be closed to robots.** At least for reading, search and citation with attribution, and at least for non-profit and civic use. A publisher that lives off advertising or subscriptions has the right to protect its business model. An institution that lives off my fee should be glad that its work reaches people even through AI.

At the same time, it’s not all or nothing. Even public-service archives contain third-party rights, and servers have limited capacity, so reasonable rules (rate limits, clear identification of the robot, an attribution requirement) make sense. But a blanket `Disallow: /` on publicly funded content is the opposite of what public institutions are for.

## 10. What can be done about it

I don’t think the right answer is “AI may do anything”. Publishers are right that AI summaries take their clicks and revenue. The problem is that the options today are often binary: everything, or nothing. And that “nothing” also catches projects that don’t copy content, they only read and quote it. It can be tackled from three sides.

**On the side of whoever builds the AI tool:**

- **Prefer primary and official sources** (Chamber of Deputies data dumps, e-Sbírka (the Czech official collection of laws), EUR-Lex, the OECD, the European Commission, the Parliamentary Institute). They often contain the same thing as the blocked article, just without the paywall and without the ban.
- **Admit what couldn’t be verified.** The output should say that a source was unavailable, and why. The reader should know where the answer has a hole.
- **Don’t cite what the agent didn’t read.** A link to a source that merely showed up in search results is a lie. Only text the agent could and was allowed to read belongs among the sources.
- **Tell a source apart from a position.** For each source, record who publishes it and how they make their money, and back claims about criticism and foreign experience with at least two independent sources.
- **Treat page content as data, not as instructions.** Ignore anything that looks like a command to the agent.
- **Publish the methodology.** Which model, what it may and may not do, how “verified” differs from “found”.
- **Pay where a reasonable license or API exists.** It just can’t be a condition without which a small project can’t exist.

**On the side of publishers and sources:**

1. **Distinguish purpose.** Training, search, RAG, citation and reprinting are not the same thing. Content-Signal already supports `search`, `ai-input` and `ai-train`. That’s the right direction: not “yes/no to everything”, but “you may do this, not that”.
2. **Machine-readable license tiers.** Non-profit and public-interest projects should have a different regime than commercial AI companies. Not free for everyone, but with clear rules and a fair price.
3. **An exception for civic AI:** read, quote, credit the source, without the right to reprint the whole text.
4. **Open data for public debate.** Laws, explanatory memoranda and parliamentary analyses should be available in machine-readable form too. When a law is public, its machine-readable form should be public as well.

**On the side of rules and standards:**

5. **A trail to the source.** Every claim should have a traceable origin. Not “the model knows it”, but “here is the document it comes from”. That helps against blind reading and against manipulation alike.
6. **Transparency.** Which crawlers are blocked where should be visible. The quality of a civic tool shouldn’t depend on which model vendor it happens to use.

## 11. Closing thoughts

It’s not that AI isn’t allowed to read. It’s that a polite AI reads less, and that what it reads isn’t necessarily the best, just whatever stayed open. What’s closed is often the quality material, what’s open is sometimes the manipulated. And an agent that can’t see who stands behind a text can’t tell the two apart.

Sledovna is a small experiment, but it shows something general. If politeness becomes a competitive disadvantage, the winner will be whoever can afford lawyers, or whoever lies about their method. And we need to understand most of all exactly those parts of the world that are closed.

I don’t want to circumvent the rules. I want following them not to be a penalty on quality, and for “open” not to automatically mean “trustworthy”.

A question for you: where would you draw the line for your own AI tool? Follow more than everyone else, or only what’s required?

---
