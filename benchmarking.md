---
layout: page
title: Benchmarking
permalink: /benchmarking/
---

A benchmark is only useful if it measures what you think it's measuring. Coordinated omission, harness effects, timing artifacts, environmental noise — there are many ways for that to go wrong. I design and review benchmarks less prone to those failures.

## What's in scope

- Load test and regression suite design
- Review of existing benchmarks for correctness and representativeness
- Microbenchmark construction (JMH) for narrow questions
- Closing the gap between benchmark behavior and production behavior
- Workload modeling — making the test reflect what the system actually does

## When this work helps

- Production sees problems that don't reproduce in test
- Benchmark numbers look fine, but the team doesn't trust them
- A regression-test suite needs to gate releases without producing noise
- A vendor or internal claim about performance needs independent verification

## Background

Designed and reviewed benchmarks across more than two decades of performance work, including the measurement disciplines that drive the original Java Performance Tuning workshop curriculum.

[Get in touch →](/contact/)
