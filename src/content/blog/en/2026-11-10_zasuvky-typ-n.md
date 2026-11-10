---
title: "Europe Unified the Voltage, but Not the Sockets. It Could Be Fixed Without Anyone Replacing a Single One"
description: "Type N (IEC 60906-1) is safer, smaller and internationally standardized. Europe doesn’t have to mandate it. It would be enough to allow it and let the market converge gradually on its own."
locale: "en"
categories: ["Software Engineering"]
date: 2026-11-10
tags: ["sockets", "type N", "IEC 60906-1", "230 V", "EU", "safety", "standardization", "single market"]
draft: false
translation_id: "2026-11-10_1"
---

Since the turn of the millennium, the voltage at the wall has been the same across Europe: 230 V, 50 Hz. Yet as soon as you cross a border, you often need an adapter. The Union can unify mobile phone chargers, but the sockets those chargers plug into stayed the way each country invented them separately a hundred years ago.

![Overview of sockets and plugs used in Europe and around the world, pins at the same scale; dashed outlines are unverified dimensions](/images/2026-11-10_zasuvky-prehled.svg)

I tried to find out why. And I found two things. First, there is an international standard that was designed precisely as a common socket for regions with 230 V. Second: Europe has seriously considered unifying sockets several times, and each time it foundered on a single thing — **the cost of forced replacement**. Today I think there is a path that needs no replacement at all.

## The socket that was meant to be common

The standard **IEC 60,906–1** (first edition 1986, current one from 2009) describes a three-pole socket-outlet and plug rated 16 A / 250 V, known as **type N**. Its properties are clear: the plug cannot be inserted the wrong way round, so polarity is set by the shape; the socket has shutters on the live openings; the line and neutral pins are insulated at the base; the earth pin makes contact first. The pins have a diameter of 4.5 mm, a spacing of 19 mm, and the earth pin is offset by 3 mm.

It is also a small socket. A type N plug has an area of about 4.6 cm², whereas Schuko has about 10 cm². Two N sockets are said to fit in the space of one Schuko or British BS 1363.

Type N is very similar to the Swiss type J, which has been used in Switzerland since the 1950 s. The difference is in the details: J has pins of Ø 4.0 mm, the earth offset by 5 mm and the opposite polarity. That is no coincidence; type N came about as a refinement of the same idea.

![Type N (solid pins) and Swiss type J (red, dashed) overlaid: the same 19 mm spacing, a different pin diameter and earth pin offset](/images/2026-11-10_zasuvky-n-vs-j.svg)

Backward compatibility matters too. According to available sources, the two-pin **Europlug** (Ø 4.0 mm, 19 mm spacing) fits into an N socket: in South Africa, where type N is established, it is reported that the local socket accepts the Europlug and that this is even explicitly intended (standard SANS 164–5 for the Europlug and SANS 164–2 for the socket). The 19 mm spacing is the same as in most European sockets. I couldn’t find out exactly why the authors of the standard designed it this way; but it is exactly the property that would make a transition easier in Europe, because chargers, routers and many other devices would fit into the new socket unchanged.

And one more detail, for which I found no definitive answer in the available sources: **where the earth pin of the socket should be, at the top or at the bottom.** One piece of available information says only that with the earth contact at the top, the line is on the right and the neutral on the left, which would suggest that the mounting orientation itself isn’t prescribed, only the polarity relative to the earth. Whether the standard specifies it, I don’t know. From a safety standpoint I would prefer **earth at the bottom**: when a heavier cable pulls the plug out of the socket, it pivots around the lower edge and the upper contacts disconnect first. Earth would therefore stay connected the longest. That is my technical judgement, not a verified fact, and since the earth pin offset in type N is only 3 mm, the difference will probably be small. More important are the length of the pins, the contact pressure, the insulated pins and the shutters.

## What happens with polarity today

With the most widespread European sockets, a CEE 7/7 plug can be inserted into a Schuko socket in two ways. Line and neutral can therefore be connected the opposite way round. An appliance with a single-pole switch can then remain live after being switched off. Installation habits also differ: in Czechia the line is wired on the left with the earth pin at the top, whereas in France, according to a number of sources, the practice of line on the right became established. None of these conventions can be guaranteed at the appliance.

I don’t want to exaggerate. In 2017 the REFIT Platform at the European Commission concluded that all systems in use can be considered safe. But “does not pose a risk under normal conditions” is not the same as “is designed so that the risk cannot arise”. Type N belongs to the second category.

## And in Czechia?

Here, type N would not pass in a home electrical installation. Under the standard ČSN 33 2130 (internal electrical wiring; ČSN being the Czech national standards), sockets up to 16 A must conform to the relevant national standards, which in practice means ČSN 35 4516, and must have a protective contact connected to the protective conductor. Type N is not among the national standards, and so an inspection technician checking an installation’s conformity with ČSN would most likely not approve it. The same rule means that here you cannot install even a socket only for two-pole plugs, even though in a household most devices (chargers, lamps, a router) are plugged in exactly that way. Every socket thus takes up space for a pin that often goes unused.

For completeness: ČSN 33 2130 has had a fourth edition since 1 January 2025, so the exact wording should be taken from it; what I state here is based on the older edition and on the fact that ČSN 35 4516 defines the Czech socket. Czech standards are also not generally binding: according to case law they become binding only where a legal regulation refers to them, and ČSN 33 1500 (inspection) itself says that safety requirements are considered met if the equipment conforms to the standards. An inspection technician therefore assesses conformity with ČSN, not with IEC, and a socket that conforms to no Czech standard would apparently not pass inspection. I haven’t found that any legal regulation explicitly prohibits it anywhere, though. So this is an interpretation, not a quotation.

## Why nobody unified them

In the mid-1990 s a common European socket was seriously discussed in CENELEC. According to available sources, the experts agreed on the technical parameters, but the vote on the standard ended in failure and CENELEC declared that there would be no harmonized European system in the foreseeable future.

In 2017 the matter was taken up by the REFIT Platform, which assesses how to simplify EU regulations. It was responding to a citizen’s submission asking for one socket for the whole EU. It recommended **not unifying**, and its reasons are worth reading. The option it assessed assumed **unification enforced by legislation**: replacing sockets and appliance plugs across all of Europe. The estimate was **100 billion euros**, **a transition longer than 75 years** and about **700 thousand tonnes of electronic waste**. At such a price, “no” makes sense.

But something else can be read from the document as well. Sixteen Member States supported the recommendation not to unify by legislation, but two states suggested that the Commission investigate unification within existing systems through standardization. One state suggested considering whether to bring sockets under the Low Voltage Directive. The LVD AdCo expert group already had a proposal for unifying the French and German systems. Another state noted that products with multiple plug types are not freely tradable on the single market and that unification would reduce the use of adapters, which are only a temporary solution. Nobody said they liked the status quo; they said that replacement is too expensive.

## What if nobody has to replace anything

This is exactly what changes the picture. I’m not proposing that the EU mandate type N and everyone replace their sockets. I’m proposing something much more modest: that **type N be permitted across the whole Union alongside existing sockets**. No obligation, no deadline, no costs for households that don’t want to bother with it.

The difference from the REFIT option is fundamental:

| | Forced replacement (REFIT, option B) | Permitting type N |
|---|---|---|
| What is mandated | replacement of sockets and plugs | nothing |
| Costs for households | estimated €100 bn | none |
| Transition | more than 75 years | up to the market |
| Electronic waste | about 700 thousand tonnes | none extra |

What would it bring? New buildings and renovations could gradually move to one safer socket. Manufacturers could eventually afford one plug instead of several. Just one long-term danger: the temporary parallel use of adapters. That is the price of every transition, and South Africa is already paying it today.

## Examples that it can be done

**South Africa** adopted IEC 60,906–1 as the standard SANS 164–2, which, according to reports, SABS made **mandatory** for new installations. A transition period of 10–20 years is envisaged, during which the new plug can be connected to an old socket via an adapter. The new socket is said to accept the Europlug as well. Nothing is thrown away; the new socket simply appears in new buildings.

**Brazil** introduced its own, IEC-like standard NBR 14,136 (10 A and 20 A, without shutters) with a final deadline of 1 July 2011, when the sale of old plugs ended. Brazil used to have a mix of different plugs and two voltages. It managed the transition.

**Paraguay** adopted IEC 60,906–1 in 2022, so far voluntarily.

And in Europe itself: **USB-C**. After years of voluntary promises from manufacturers, directive (EU) 2022/2380 set one charger for phones, tablets and other devices from 28 December 2024 and for laptops from 28 April 2026. Nobody doubts that it helped both users and manufacturers. With sockets, less is enough: not to order a standard, only not to forbid it.

## What Europe could do

Household sockets are currently **excluded** from the Low Voltage Directive 2014/35/EU and fall under national regulations. That is why nothing is happening at EU level: there is no instrument to start with. But instruments exist. The Commission can ask CENELEC for a standard that would recognize IEC 60,906–1 as a permissible system. It can consider whether to bring sockets under the Low Voltage Directive, as one of the Member States proposed within REFIT. And it can build on the work the LVD AdCo group has already done on unifying the French and German systems.

We don’t need a revolution. We need one decision: that a better standard won’t be forbidden just because an old one exists.

## Summary

| | Today | After permitting type N |
|---|---|---|
| Socket types in the EU | several, inconsistent | the same, plus one recognized alternative |
| Polarity | depends on installation and habits | set by the shape |
| Size | ≈ 10 cm² (Schuko) | ≈ 4.6 cm² |
| Cost for households | — | none |
| Transition | none | gradual, up to the market |

*I worked mainly with the REFIT Platform document of 21 September 2017, the text of IEC 60,906–1 and public reports; where sources may be inaccurate, I point that out in the text. Feel free to write to me with errors or additions.*
