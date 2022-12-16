---
layout: page
title: Java Performance Tuning Workshops
permalink: /workshops/
---


<h3> Memory Effecient Java   (4hrs)</h3>

* **Objective:** Learn how to quickly diagnose and solve memory leaks in Java heap
* **Topics:**
  * Introduction
  * Memory to CPU and back
  * Allocations in Java Heap
  * High Memory Churn
    * Introduction
    * Monitoring
    * Estimating allocation rates
    * Tooling
    * Resolving high allocations by example
    * Problems with profilers
    * JIT Optimizations
  * Live Set Size Reduction
    * Introduction
    * JVM Optimizations
    * Tour of tooling
  
	
<h3> Solving Java Memory Leaks  (4hrs)</h3>

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
		I
	
<h3> Garbage Collection Tuning.  (8hrs)</h3>

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
	
<h3>Java Performance Tuning Workshop   (3 days)</h3>

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
       