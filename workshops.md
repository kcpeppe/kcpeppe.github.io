---
layout: page
title: Java Performance Tuning Workshops
permalink: /workshops/
---

* [Memory Effecient Java](#mej)
* [Java Memory Leaks](#jml)
* [Garbage Collection Tuning](#gct)
* [Java Performance Tuning Workshop](#jptw)


<h3 id="mej">Memory Effecient Java (4hrs)</h3>

* **Objective:** Learn how to quickly diagnose and solve memory leaks in Java heap
* **Topics:**
  * Introduction
  * Memory to CPU and back
  * Allocations in Java Heap
  * High Memory Churn
    * Introduction
    * Monitoring
    * Tooling
    * Resolving high allocations by example
    * Problems with profilers
  * Live Set Size Reduction
    * Introduction
    * Tour of tooling
    
<a href="#top">&#8593;</a>
	
<h3 id="jml">Solving Java Memory Leaks (4hrs)</h3>

* **Objective:** Learn how to quickly diagnose, characterize and solve memory inefficiency in Java applications.
* **Topics:**
  * Introduction
  * Managed and Unmanaged Memory
  * Java Heap
  * Monitoring Java Heap
  * Allocations in Java Heap
  * Garbage Collection Overview
  * Diagnostic - Generational counts
  * Diagnostic - Dominators
  * Other Leaks (Classloaders/Metaspace)
  
<a href="#top">&#8593;</a>

	
<h3 id="gct">Garbage Collection Tuning (8hrs)</h3>

  * **Objective:** Learn the basics of Garbage Collection and how to tune GC in Java
  * **Topics:**
    * Introduction
    * OpenJDK Collectors
    * Java Heap Structure
      * Allocations in Java Heap
    * Basic GC Cycle
    * Garbage Collectors Phases
      * Serial/Parallel/CMS
      * G1GC
      * ZGC
      * Shenandoah
      * DGC
    * Metaspace
    * Reference Processing
    * Choosing a collector
    * Tuning Goals
    * Container Support
    * GC tooling for observability
    * GC Log Analysis
    * OutOfMemoryError

<a href="#top">&#8593;</a>
	
<h3 id="jptw">Java Performance Tuning Workshop (3 days)</h3>

  * **Objective:** Hands on dive into performance tuning Java applications.  
  * **Topics:**
    * Introduction into Java Performance Diagnostic Methodology (JPDM)
    * Latency and Throughput
    * Measurements, accuracy, precision, resolution and bias
    * Benchmarking for Performance
    * Inside the JVM
      * Garbage Collection
      * HotSpot Optimizations
    * Profiling Fundamentals
    * Java Management Extensions
    * IPC

<a href="#top">&#8593;</a>
       