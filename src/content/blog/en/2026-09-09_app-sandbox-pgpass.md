---
title: "Sandboxed Apps: When Isolation Cuts the Database Off From .pgpass"
description: "How I moved OmniDB into the macOS Sandbox and hit an unreachable .pgpass file — and what a safe, on-demand permission UX looks like on macOS, Linux and Windows."
locale: "en"
categories: ["PostgreSQL"]
date: 2026-09-09
tags: ["sandbox", "macOS", "Linux", "Windows", "security", "PostgreSQL", "OmniDB", "Flatpak", "MSIX"]
draft: false
translation_id: "2026-09-09_1"
---

As developers, we want to build secure applications. One of the best steps toward protecting the user is to put the app inside a sandbox (an isolated environment). A sandbox guarantees that even if a vulnerability is found in the app, an attacker cannot freely walk the user’s disk or read sensitive data belonging to other programs.

But security comes at a price, paid in obstacles for both developers and users. I recently moved OmniDB into the sandbox on macOS and very quickly ran into a classic problem: out of nowhere, the app could no longer read the passwords for my PostgreSQL databases.

---

## 1. A story from the trenches: Where is my `.pgpass`, and why is it right that it’s hidden?

PostgreSQL commonly uses the file `~/.pgpass` stored in the user’s home directory. That file contains credentials in plain text — hosts, ports, databases, usernames and passwords.

The moment I locked [OmniDB](https://www.omnidb.net) into the macOS Sandbox, the system strictly cut the app off from the home directory. OmniDB could not connect to the database, because it simply could not see `.pgpass`.

## 2. Why is “on demand only” access actually a security win?

At first glance it was an inconvenience, but in hindsight it is an excellent security feature. A `.pgpass` file often holds dozens of passwords to production and development databases. Do you really want any downloaded application to have automatic access to that kind of treasure chest? Absolutely not. If an unvetted app got full access to that file, it could ship all your passwords off without you ever knowing.

## 3. How did I solve it on macOS?

Instead of asking for a broad full-disk permission (which defeats the whole point of a sandbox), I chose a solution driven by the user and by the principle of least privilege:

1. If OmniDB tries to connect to a database and fails because it lacks permission to read `.pgpass`, the UI shows a clear error message.
2. That message includes a button to grant access.
3. Clicking it opens a system dialog (`NSOpenPanel`) where the user manually picks the `.pgpass` file (or confirms access to it).
4. macOS hands the app a so-called Security Scoped Bookmark — an exception that gives the app permanent, legitimate access to that one specific file.

The user knows what they are exposing and why, while the rest of the disk and all other files stay hermetically protected.

## 4. The macOS Sandbox from a UX and developer perspective: great idea, odd logic

What is great about the sandbox on macOS is that it can be part of any application, regardless of how it got onto the machine — from the App Store, from GitHub, or as a `.dmg` package off the developer’s website. While working with it, though, a few inconsistencies struck me:

### 4.1 You find out about the sandbox only when it may already be too late

As a security-conscious user, before launching an unknown application I would like to know whether it will run in an isolated sandbox or have full access to my system.

Where would you expect to find that? Logically, in the file info window (Cmd + I in Finder). Except there is not a single mention of the sandbox there. The macOS graphical interface offers exactly one place to find out — Activity Monitor, where you have to enable the Sandbox column and look at an already running process. Which is absurd: by the time you see it in Activity Monitor, the dangerous app is already running and may have done damage.

The only way to check up front is the command line:

```bash
codesign -d --entitlements - /Applications/OmniDB.app
```

In the output you look for `com.apple.security.app-sandbox`. It works, but an ordinary user — precisely the person the sandbox is meant to protect — is not going to open Terminal.

### 4.2 Apple should be more lenient toward sandboxed apps

Apple blocks running apps from unknown sources very aggressively today (Gatekeeper, the need for an expensive developer account, notarization). But if a developer voluntarily decides to lock their app into a strict sandbox and tie their own hands, the system should be more lenient when that app is downloaded from an unknown place. If an app running in isolation has access to neither files nor the system, the risk to the user drops dramatically.

### 4.3 Pointless obstacles with ad-hoc signing

If a developer signs the app only locally/ad-hoc (`codesign -s -`), macOS will not let them set certain sandbox entitlements. The developer is forced to create their own self-signed certificate just to be able to test the sandbox with entitlements locally. In practice this adds no real security whatsoever — it is just a pointless bureaucratic step during development.

## 5. How do you carry the same concept over to Linux and Windows?

So far I have this on-demand permission system fully working on macOS. But OmniDB is a cross-platform tool, so I am now working out how to move exactly the same concept (button in the app → system dialog → granted exception) to the other systems.

- **Linux (Flatpak and XDG Portals):** For Linux I plan to use Flatpak. To talk to the system outside the sandbox it uses so-called XDG Desktop Portals. Architecturally, portals work very much like macOS — when an app requests a file through a portal, the dialog is rendered by the system itself, not by the app. Once the user picks `.pgpass` in the dialog, the portal hands the app permission to read that specific file.
- **Windows (MSIX and AppContainer):** On Windows the goal is packaging into MSIX, where the app runs inside an AppContainer. Here the system `FileOpenPicker` interface comes into play. If the user picks a file through this native Windows dialog, the AppContainer grants the app an access token for that file.

So the principle stays identical on every platform: by default the app sees nothing, but with a single click in an error dialog the user can safely expose exactly the one file it needs.

## 6. An overview of sandboxing options: how does it look across operating systems in general?

Beyond what I plan to use for OmniDB, each platform offers a whole range of other approaches. They split into system (native) solutions and third-party tools or containers.

### 6.1 macOS

- **Native solution:** Apple App Sandbox (via entitlements, built right into the system).
- **Alternatives:** Running inside Docker or a lightweight virtual machine (e.g. via Virtualization.framework, UTM, Parallels).

### 6.2 Linux

- **Native/packaging solutions:**
  - **Flatpak:** Uses `bubblewrap` under the hood (namespaces, seccomp). The standard for isolated GUI applications.
  - **Snap:** Canonical’s solution, based on AppArmor profiles.
- **Alternatives for regular packages (DEB, RPM, AppImage):**
  - **Firejail:** An excellent tool that lets the user wrap any existing application themselves and stop it from reading, say, `~/.ssh` or `~/.pgpass`.
  - **systemd/cgroups/bubblewrap:** Custom scripts for isolating processes at the system level.
  - **Docker/Podman:** Great for CLI tools and servers, but with GUI apps they run into the messy business of passing X11/Wayland sockets through.

### 6.3 Windows

- **Native solution:**
  - **MSIX (AppContainer):** Microsoft’s official isolated container, with a virtual registry and file system.
- **Alternatives:**
  - **Sandboxie-Plus:** A popular open-source tool. It lets you run any classic `.exe` in an isolated sandbox without modifying the application.
  - **Windows Sandbox:** A fast, disposable virtual environment built on Hyper-V. Good for testing a suspicious file from the internet (everything is wiped when you close it).

## 7. Why is the native system solution always the best choice?

Even though Linux and Windows offer various third-party tools (Firejail, Sandboxie) or containers (Docker), a desktop application developer is always best served by choosing the native system solution (App Sandbox, Flatpak, MSIX).

The reasons are simple:

1. **User comfort (UX):** A native sandbox can show the user a system dialog at the moment the app needs a file. The user does not even notice the app is running in isolation.
2. **Performance:** Native isolation uses the operating system kernel directly (namespaces, AppArmor, AppContainer). There is no cumbersome virtualization layer underneath.
3. **Sustainability:** You rely on a standard maintained by the OS vendor (Apple, Microsoft, the Flatpak community), not on third-party tools that may break with the next system update.

## 8. Conclusion: security has to make sense to users and developers alike

The OmniDB and `.pgpass` case shows two things:

1. **On-demand security works:** Denying an app automatic access to sensitive password files and requiring an explicit user action in the UI instead is the right path to protecting privacy.
2. **Systems have gaps in sandbox UX:** It is a shame that macOS does not clearly tell the user (in `Cmd+I`, for example) that they are launching an app in safe isolation, and that it puts pointless obstacles in developers’ way, such as needing self-signed certificates just for local testing.

A sandbox should not be a “black box” for users and a “necessary evil” for developers, but a transparent standard that benefits both sides.

---

*Are you dealing with a similar sandbox problem in your own app? Write to me about how you solved it.*
