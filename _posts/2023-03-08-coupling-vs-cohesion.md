---
layout: post
comments: true
title:  "Cohesive or Coupled, I'm confused"
excerpt: "Coupling in software is consistently one of the most mis-understood concepts that I can think of and here is why."
date:   2023-02-26 08:00:00 +0900
categories: [java]
tags: [Java,microservices]
---

In a [previous](http://www.kodewerk.com/general/java/performance/2022/12/21/gctoolkit_intro.html) posting I spoke about how GCToolKit had been extracted from Censum, a tool that I had developed and carried with me through JClarity and into Microsoft. We had made the plans to open source Censum but we had to shelve them as we started acquisition talks with Microsoft. Once in Microsoft I was very happy to learn that we could continue our path to open source the internal components. The first step was to, of course, extract the components out of Censum. Having been involved with extracting components out of a larger body of work several times, I knew this was going to be a long and tricky process.

The reasons for this are several fold. First, as careful as we were in componentizing Censum, our mission was to tune garbage collectors for our customers, not create reusable components. This is generally true of almost all projects. Reusability only tends to become a priority when it is recognized that a particular piece of needed functionality for a new application is buried in that application that was just released. Thus there is a perception that extracting that functionality into a reusable component will be beneficial (on many different dimensions). In many case, this perception is correct but in many others, the cost of extraction maybe so high that it's simply not with the effort.

What drives the costs? The answer is couplings.

### What is Coupling?


Coupling is the degree to which the various elements of software in our application depend upon one another. In essence, it is a count of the number of dependencies that the various part of our application have on one another. It is a concept that is currently fashionable to write about because of the rise in popularity of microservice architectures. Applications constructed from microservices require that each of the service contains minimal dependencies on the other services. In other words, they are loosely coupled. The reasoning is, we want to be able to make changes in one component that do not force changes in other components.

While it is indisputable that loose coupling in our code is a desirable feature, what is often glossed over is how incredibly difficult it is to achieve this. This is due to a number of factors including the vague interpretation of how many dependencies separate loosely coupled from tightly coupled. Is my system loosely coupled if it only contains 50 dependencies, how about 20, 100, maybe it should be less than 5. As you can see, the idea of loosely coupled is up to interpretation and while I might call my app loosely coupled, someone else might regard it as tightly coupled. To confuse things even further, not all dependencies are bad.

### Coupling vs Cohesion?
<br/>
Dependencies in system are essential because in order to get work done, systems need to be functionally related, or in other words, cohesive. The definition of cohesion is the degree to which the various elements of software in our applications depend on one another. Great! We now have to completely different concept for the exact same feature in our code. How does that work? Fortunately the situation isn't as dire as it seems as adding context can help us sort "the good" from "the bad".

The most common context that is applied is size. Generally speaking, dependencies between large chunks of code, such as components, would tightly couple whereas dependencies in small chunks of code, for example a class ,are considered to be cohesive. Unsurprisingly, this level of cohesion is in line with the Single Responsibility Principle (SRP). SRP states that a class should do one thing. This implies that all of the fields and methods should be dependent on each other. A Lack Of Cohesion Of Methods (LOCOM) implies that a class is violating SRP.

### Lack of Cohesion of Methods

LOCOM was introduced by Chidamber and Kemerer. The calculation takes pairs of methods to determine if they share methods variables. If there are no shared fields, the score is incremented by one. A score of 0 is considered to be perfectly cohesive.

### Cohesive to Coupled

The act of creating software requires the developer to make a myriad of decisions including those that would make a dependency either be cohesive or coupled. Switching context from development to extraction typically turns a cohesive decision into a coupling. At that point the entire implementation may have been destabilized to the point where is may be more cost effective to either abandon or rewrite.

### Coupling in Censum

Clearly, Censum was not going to be immune to this effect. This is why I expected the effort to be more difficult than expected and it was. To further complicate things we decided to use Java modules. This pretty much eliminated the possibility of "cheating" by not breaking all dependencies. Fortunately I had early on decided to not go from data to charts but instead use an event driven design. This decision naturally lead to a reasonable level of componentization and that enabled this refactoring. Making use of Vert.x's verticles also helped a ton in defining discrete components that eased the effort.

Even with these decision working for us, the initial refactoring took time and GCToolKit 2.0.0 with a circular reference between the api and vertx modules. This circular reference was broken with the introduction of a messaging API in the api module. The api module provides an api as well as the ability to wire up provided implementations and then orchestrate the flow of data through them.

### Data Couplings

That data can couple components together shouldn't come as a surprise but that said, it's surprising the number of developers I've worked with that failed to realize that data is necessarily a part of the API. The common thought is that communicating with YAML or JSON or some form of XML will keep components loosely coupled. Some applications accidentally use the database as a means to distribute data between components and in doing so, create a dependency. The truth is, any change in the YAML or JSON or data base schema that forces a change in other components is a dependency that couples. It is just not one that your compiler will find and thus it is considered to be a hidden dependency or hidden coupling. 


### Data Couplings in GCToolKit

GCToolKit contains a JVMEvent hierarchy that is composed of all of the JVM events of interest that are found in a garbage collection log. Each of these events contain relevant attributes of the event such as, type of event, when the event occurred and how long did it last. Quite a bit of thought behind the api work went into defining these classes because it was understood that once released, these classes could never be changes as any change would likely break every piece of client code ever written. While this sounds like a horrible dependency that could "easily" be removed with the use of JSON, the truth is, the same dependency would exist in the JSON version.

<br/>
```
// Licensed under the MIT License.
package com.microsoft.gctoolkit.event.jvm;

import com.microsoft.gctoolkit.time.DateTimeStamp;

/**
 * This is the base class for all JVM events created by the parser.
 */
public abstract class JVMEvent {

    private final DateTimeStamp timeStamp;
    private final double duration;

    /**
     * All events have a date/time stamp of when the event occurred, and a duration.
     * @param timeStamp The date/time stamp of when the event occurred.
     * @param duration The duration of the event in decimal seconds.
     */
    public JVMEvent(DateTimeStamp timeStamp, double duration) {
        this.timeStamp = timeStamp;
        this.duration = duration;
    }

    /**
     * Get the date/time stamp of when the event occurred.
     * @return The date/time stamp of when the event occurred.
     */
    public DateTimeStamp getDateTimeStamp() { return timeStamp; }

    /**
     * Get the duration of the event.
     * @return The duration of the event in decimal seconds.
     */
    public double getDuration() { return duration;}

    @Override
    public String toString() {
        return (new StringBuilder( 
            getClass().getSimpleName())
            .append("@")
            .timeStamp.toString())
            .toString();
    }
}
```
<br/>
Where the decision to use POJOs really paid off is when Unified Logging was implemented in JDK 9. The JVMEvent hierarchy was extended with new events as to accommodate data that wasn't present in the old logs. Yes, we could have versioned the JSON. However, that leaves one with a very messy parsing problem that likely would have broken a lot of client code. To highlight this I would suggest you look at the spec for [Financial Product Markup Language (FPML)](https://www.fpml.org/). FPML is used in the financial world as a standard format for data transfer between institutions.

<br/>
```
├── GCEvent.java
├── g1gc
│   ├── ConcurrentCleanupForNextMark.java
│   ├── ConcurrentClearClaimedMarks.java
│   ├── ConcurrentCompleteCleanup.java
│   ├── ConcurrentCreateLiveData.java
│   ├── ConcurrentScanRootRegion.java
│   ├── G1Cleanup.java
│   ├── G1ConcurrentCleanup.java
│   ├── G1ConcurrentMark.java
│   ├── G1ConcurrentMarkResetForOverflow.java
│   ├── G1ConcurrentRebuildRememberedSets.java
│   ├── G1ConcurrentStringDeduplication.java
│   ├── G1ConcurrentUndoCycle.java
│   ├── G1FullGC.java
│   ├── G1GCConcurrentEvent.java
│   ├── G1GCEvent.java
│   ├── G1GCPauseEvent.java
│   ├── G1Mixed.java
│   ├── G1RealPause.java
│   ├── G1Remark.java
│   ├── G1SystemGC.java
│   ├── G1Young.java
│   ├── G1YoungInitialMark.java
│   └── RSetConcurrentRefinement.java
├── generational
│   ├── AbortablePreClean.java
│   ├── CMSConcurrentEvent.java
│   ├── CMSPauseEvent.java
│   ├── CMSPhase.java
│   ├── CMSRemark.java
│   ├── ConcurrentMark.java
│   ├── ConcurrentModeFailure.java
│   ├── ConcurrentModeInterrupted.java
│   ├── ConcurrentPreClean.java
│   ├── ConcurrentReset.java
│   ├── ConcurrentSweep.java
│   ├── DefNew.java
│   ├── FullGC.java
│   ├── GenerationalGCEvent.java
│   ├── GenerationalGCPauseEvent.java
│   ├── InitialMark.java
│   ├── PSFullGC.java
│   ├── PSYoungGen.java
│   ├── ParNew.java
│   ├── ParNewPromotionFailed.java
│   ├── SystemGC.java
│   └── YoungGC.java
├── jvm
│   ├── ApplicationConcurrentTime.java
│   ├── ApplicationRunTime.java
│   ├── ApplicationStoppedTime.java
│   ├── JVMEvent.java
│   ├── JVMTermination.java
│   ├── Safepoint.java
├── shenandoah
│   └── ShenandoahCycle.java
└── zgc
    └── ZGCCycle.java
```


### Wrapping Up

There is no real way to avoid couplings. These are necessary to get work done. That said, we should still work to avoid them as they will complicate our efforts to maintain or extract components from larger bodies of code. That said, given the dual role of dependencies, changing the context from development to extraction will cause some cohesive dependencies to become couplings. Given that couplings tend to increase the difficulty of working with code, we should expect that any efforts to extract components will come with hidden costs. Finally, all of these attributes of software can be measured. I recently went to GitHub in search of metrics tooling and was happy to find a couple of active projects. I plan on reviewing them and will post any findings here.
