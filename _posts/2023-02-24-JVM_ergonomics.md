---
layout: post
comments: true
title:  "JVM Ergononics"
excerpt: "I needed a definition for JVM Ergonomics but didn't find one. This is what I proposed."
date:   2023-02-24 09:30:00 +0900
categories: [java]
tags: [Java]
---

<br/>
The word Ergonomics is derived from the Greek word ergon which literally translates to "works". The "-nomics" ending adds the idea of management resulting in a word that literally translates to "the management of work". In practical terms, ergonomics is the applied science of fitting a workplace so that it is both functional and supportive to a workers needs.

Applying these ideas to the JVM and we get; ergonomics is the fitting of the compute environment so that is both functional and supportive of the applications needs. To achieve this, the JVM makes use of a number of heuristics. These heuristics are all based on sets of assumptions. If these assumptions work for your use case, great, it not, there is likely a command line option to override the heuristic. Let's explore this by looking at a few bits of how heap sizing is calculated. The source for the entire method is in the [OpenJDK](https://github.com/openjdk/jdk/blob/master/src/hotspot/share/runtime/arguments.cpp) project on GitHub.

```
void Arguments::set_heap_size() {
  julong phys_mem;

  // If the user specified one of these options, they
  // want specific memory sizing so do not limit memory
  // based on compressed oops addressability.
  // Also, memory limits will be calculated based on
  // available os physical memory, not our MaxRAM limit,
  // unless MaxRAM is also specified.
  bool override_coop_limit = (!FLAG_IS_DEFAULT(MaxRAMPercentage) ||
                           !FLAG_IS_DEFAULT(MaxRAMFraction) ||
                           !FLAG_IS_DEFAULT(MinRAMPercentage) ||
                           !FLAG_IS_DEFAULT(MinRAMFraction) ||
                           !FLAG_IS_DEFAULT(InitialRAMPercentage) ||
                           !FLAG_IS_DEFAULT(InitialRAMFraction) ||
                           !FLAG_IS_DEFAULT(MaxRAM));
  if (override_coop_limit) {
    if (FLAG_IS_DEFAULT(MaxRAM)) {
      phys_mem = os::physical_memory();
      FLAG_SET_ERGO(MaxRAM, (uint64_t)phys_mem);
    } else {
      phys_mem = (julong)MaxRAM;
    }
  } else {
    phys_mem = FLAG_IS_DEFAULT(MaxRAM) ? MIN2(os::physical_memory(), (julong)MaxRAM)
                                       : (julong)MaxRAM;
  }
  
```
<br/>

The overview here is that the min, initial and max Java heap size is by default using the amount of physical RAM available. The purpose of this first chunk of code is to determine if the value has been set on the command line and if not, obtain the amount of physical memory on the machine. This is the information that will be fed to the heuristic portion of this method.
<br/>
```
  // If the maximum heap size has not been set with -Xmx,
  // then set it as fraction of the size of physical memory,
  // respecting the maximum and minimum sizes of the heap.
  if (FLAG_IS_DEFAULT(MaxHeapSize)) {
    julong reasonable_max = (julong)((phys_mem * MaxRAMPercentage) / 100);
    const julong reasonable_min = (julong)((phys_mem * MinRAMPercentage) / 100);
    if (reasonable_min < MaxHeapSize) {
      // Small physical memory, so use a minimum fraction of it for the heap
      reasonable_max = reasonable_min;
    } else {
      // Not-small physical memory, so require a heap at least
      // as large as MaxHeapSize
      reasonable_max = MAX2(reasonable_max, (julong)MaxHeapSize);
    }
```
<br/>

Note the use of the word "reasonable" in the variable names. The definition of reasonable is vague which means someone had to decide what does reasonable mean? The same goes for small. The net result is that if you do not set a max heap size, then someone, somewhere, maybe a long time ago has made the decision as to how much memory your application needs based on the size of the machine that the application is running on.

### Static vs Dynamic Ergonomics
<br/>
Calculating max Java heap is sized is but one of the man configurations that is calculated at startup time. There is also the choice of garbage collector, number of threads in the common thread pool, and so on. These are what I call static ergonomics. Once set, they remain unchanged for the life time of the JVM. As is described in the diagram below, the heuristics behind static ergonomics feed off of the configuration of the hardware. In particular, the amount of physical memory and CPU core counts.

<br/>
<br/>
<img src="/images/ergonomics.png"
     alt="Ergonomics"
     style="width: 80%; display: block; margin-left: auto; margin-right: auto;" />
     
<p style="text-align: center;">Static and Dynamic JVM Ergonomics</p>

<br/>
In contrast, the heuristics behind dynamic ergonomics feed off of information obtained by the runtime. The purpose of these heuristics is to allow the JVM to adapt to changes in the workload. For example, the sizing of the memory pools internal to Java heap is sensitive to the current allocation rate. Also, there are heuristics in concurrent garbage collectors to manage pacing. Of course there are command line flags that can be used override default values in cases where the heuristics are not creating an ergonomic runtime.

### Performance Implications of Ergonomics
<br/>

The thinking that is commonly seen in documentation is that having an appropriately configured JVM should yield better performance. Unfortunately this is quite opposite to what is actually happening. If the ergonomically chosen configurations are not a fit for your application then this implies that either your JVM has been misconfigured or there is an external issue (or both) that is leaving your application starved for some critical resource. In this case, hand tuning the JVM may yield a better results if the conditions isn't due to an external condition. This external condition could be as simple as having too small a machine or having too many process running on the same machine (another form of too small).

### Ergonomics and Containers
<br/>
One of the issues that is still being resolved is how the JVM is obtaining memory limits and core counts when deployed in containers. In JDK 10 the flag UseContainerSupport was introduced. This tells the JVM ergonomics, in Linux, to detect and gather values from the cgroup subsystem instead instead of from the bare metal.
At issue is that the heuristics for configuring Java heap may leave your container's memory allocation mostly unused. Thus, implementing better container aware heuristics is still a work in progress.

###
All in all, JVM ergonomics are your friend. They provide a reasonable set of default values. This translates that you shouldn't be setting many, if any, flags on the command line. About the only exception to this would be max heap size. In this case your application needs what it needs and getting to understand what it needs and configuring that value with the -mx setting should be part of the deployment process.
