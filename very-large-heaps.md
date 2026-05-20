---
layout: page
title: Very Large Heap Analysis
permalink: /very-large-heaps/
---

Analyzing Java heaps in the hundreds of gigabytes and into the terabyte range — using tooling specifically built to scale beyond standard approaches.

## What's in scope

- Heap dump analysis for heaps too large for conventional tooling
- Identifying retention paths and dominator-tree structure at scale
- Memory leak diagnosis on long-running applications with large working sets
- Triage of out-of-memory incidents on heap-intensive systems

## When this work helps

- The heap dump won't open in mainstream analyzers
- You suspect a leak but the analysis tools time out, run out of memory, or take days
- The application runs in-memory grids, large caches, or other heap-intensive workloads
- A specific production OOM needs root-cause analysis and the heap is too large to inspect with standard means

## Background

I'm building purpose-built tooling for heap analysis at this scale — a streaming, disk-backed analyzer designed for heaps the standard tools can't open. Available now for analysis engagements at these scales.

[Get in touch →](/contact/)
