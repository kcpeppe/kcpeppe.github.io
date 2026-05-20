---
layout: page
title: GC Tuning
permalink: /gc/
---

GC log analysis and collector tuning across G1, ZGC, Shenandoah, Parallel, and Azul C4. Reducing pause times, allocation pressure, and the latency tax that garbage collection puts on your workload.

## What's in scope

- GC log analysis and collector selection
- Pause time and throughput tuning across G1, ZGC, Shenandoah, Parallel, and Azul C4
- Allocation pressure diagnosis and reduction
- Heap sizing and ergonomics across deployment environments
- Investigating GC-driven latency outliers in production

## When this work helps

- Pause times are missing your SLA
- A collector change (e.g. moving from G1 to ZGC) hasn't behaved as expected
- p99 or p99.9 latencies are dominated by GC pauses
- Allocation rates are pushing the collector past its working point

## GCSee-JMA

GCSee-JMA is a Java Memory Analyzer built on GCSee. It can be used three ways:

**Self-service / on-prem.** Install GCSee-JMA on your own infrastructure, point it at your GC logs, and use it for ongoing in-house GC analysis. Free for non-commercial use.

**Included with engagements.** Engagements typically include installation of GCSee-JMA on your infrastructure so the GC visibility persists after the consulting work ends. The team keeps the diagnostic capability built up during the engagement.

**Commercial licensing.** GCSee-JMA is available for licensing in commercial settings where continuous, in-house GC visibility is the goal — with or without a consulting engagement attached. Contact for licensing terms.

## Background

Author and maintainer of GCSee and GCSee-JMA, both derived from GCToolKit. Twenty years of GC tuning across the OpenJDK collectors and Azul's pauseless collectors. Contributor to OpenJDK GC performance work, including the [Automatic Heap Sizing JEP](https://bugs.openjdk.org/browse/JDK-8350152).

[Get in touch →](/contact/)
