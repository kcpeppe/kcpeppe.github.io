---
layout: page
title: Application Tuning
permalink: /application-tuning/
---

Finding and fixing performance bottlenecks in Java applications — in the code, the architecture, the JVM, the garbage collector, or elsewhere in the system. Can result in reduced EC2 costs and improved p99 latencies.

## What's in scope

- **Application code** — allocation profiling, hot path analysis, lock contention, inefficient algorithms
- **Architecture** — service boundaries, data flow, concurrency patterns, caching strategies
- **JVM configuration** — collector selection, sizing, ergonomics, JIT compiler effects
- **JVM crash analysis** — hs_err logs, core dumps, native and JIT-level failures
- **Beyond the JVM** — OS, networking, container limits, database, and infrastructure issues that surface as JVM symptoms

## When this work helps

- Latency or throughput targets are missing
- Prior efforts to resolve a regression haven't held
- Cloud costs feel high for the work being done
- The team can reproduce a problem but can't explain it

## Approach

Engagements are structured around jPDM — the Java Performance Diagnostic Model — which I authored in 2008 and have refined across two decades of client work. Structure shortens the time to diagnosis and makes the result reliable rather than reliant on the right tip surfacing at the right moment.

[Get in touch →](/contact/)
