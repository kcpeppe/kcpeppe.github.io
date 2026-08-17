---
layout: post
comments: true
title:  "Scrubbing Java Heap Dumps"
excerpt: "In a Java heap dump, *every byte[]* could include sensitive data that you can't hand over to a third party."
date:   2026-08-10 08:30:00 +0900
categories: [java,jvm,gc]
tags: [Java, JVM, heap-dump, tooling, jscrub, jheapo]
---

<img src="/images/duke-mopping.png"
     alt="Duke mopping 1s and 0s off the floor"
     style="width: 25%; float: left; margin: 0 1.5em 1em 0;" />	

A couple of months ago I was asked about tooling that could analyze large heap dumps. The question prompted me to write jheapo, a tool that not only was built to analyze large heap dumps but also to support a more modern set of queries that are absent from the usual suspects. It also lead me to one of the biggest obstacles to being able to perform an analysis, privacy. A heap dump can contain a ton of private data.

*Every byte[]* could include sensitive data that you can't hand over to a third party. This could include customer names, email addresses, credit-card numbers, session tokens, the odd password that ended up in a `char[]` or even worse, private medical information. A lot of this data sits in `byte[]` or `char[]`. Even more obscure, your class and method names which are also in the heap dump, may reveal how the application is structured creating concerns about potential company secrets. In short, the privacy concerns, once realized, are the biggest reason why I end up performing heap dump analysis on site instead of in my home office. JScrub solves this problem by creating a copy of your heap dump with all of the sensitive data anonymized.

<br>

## Introducing JScrub

JScrub rewrites a heap dump, replacing the contents of primitive arrays with random
data of **exactly the same length**. Data that is repeated is replaced with the same random data. Because nothing changes, the scrubbed heap dump is structurally identical to the input: same object graph, same instance counts, same retained sizes, same everything — only the *contents* of the primitives and primitive arrays are replaced. An analyzer (I use [jheapo](https://github.com/jheapo/jheapo)) sees an identical heap without the secrets.

A few properties I cared about:

- **Cardinality is preserved.** If a value appears 10,000 times, its scrubbed
  replacement appears 10,000 times. "Why do I have a million copies of the same
  string?" is still answerable after scrubbing.
- **It's reversible.** Every substitution goes into a *key file* that the dump's owner
  keeps. Find something interesting in the scrubbed dump, and the key maps it back to
  the real value. The scrubbed dump goes where it needs to be whereas the key never leaves home.
- **Names stay readable — unless you say otherwise.** JDK, Jakarta/JEE, and framework
  class/field/method names aren't secrets and they make analysis readable. If your *own* class and field names are sensitive, you can obfuscate those too (more below).

## Getting it

Grab the jar from the [releases page](https://github.com/jheapo/jscrub/releases). It's
self-contained; you just need a Java 25+ runtime. One jar drives everything:

```bash
java -jar jscrub-0.1.0.jar --help
```

(There are also `-dist` archives with `jscrub`/`jdescrub`/`jresolve` launcher scripts,
and native bundles that ship their own runtime if you'd rather not install Java.)

## Scrubbing a dump

`-C` scrubs `char[]`, `-B` scrubs `byte[]`. On a modern JDK you almost always want
both, since strings live in `byte[]`:

```bash
java -jar jscrub-0.1.0.jar scrub -C -B myapp.hprof
```

You get two files:

- `myapp_scrub.hprof` — same size as the original, safe to share.
- `myapp_scrub.hprof.scrubkey` — the reversal key. **Keep this private.**

Open the scrubbed dump in your analyzer of choice and everything looks normal — the
histogram, the dominator tree, the duplicate-string report — except the actual string
values are gibberish.

## Getting your data back

Two ways to undo it, both using the key.

Reconstruct the whole original dump, byte-for-byte:

```bash
java -jar jscrub-0.1.0.jar descrub myapp_scrub.hprof myapp_scrub.hprof.scrubkey
```

Or — more useful in practice — take a *finding* from your analysis (say, the top
duplicated string) and map it back to the real value:

```bash
java -jar jscrub-0.1.0.jar resolve --min-len 8 myapp_scrub.hprof.scrubkey findings.txt
```

Though the plan is to have JScrub decode any report this feature is currently restricted to JHeapo output.

## Hiding class names too

Sometimes the class names themselves are the sensitive part — they leak your internal
architecture, product names, unreleased features. Put a `jscrub.conf` together and
point `-f` at it:

```
// jscrub.conf — obfuscate my proprietary classes, leave the rest readable
com.acme.billing.**
com.acme.model.*
```

```bash
java -jar jscrub-0.1.0.jar scrub -C -B -f jscrub.conf myapp.hprof
```

`com.acme.billing.CreditCard` becomes something like `xyz.abcdef.Ghijklmno` — same
length, same shape, package structure intact so your analyzer still groups things
sensibly, and it's in the key so you can reverse it. The rules are just wildcards, no
regex: `*` for one segment, `**` to recurse into sub-packages.

## Where it's going

The current release scrubs `char[]`/`byte[]` and obfuscates class names. Still on the
list: obfuscating field and method names, and a few of the other primitive types.
It's [source-available](https://github.com/jheapo/jscrub) — have a look, and let me
know what breaks.
