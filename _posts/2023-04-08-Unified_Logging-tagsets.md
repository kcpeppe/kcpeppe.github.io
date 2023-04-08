---
layout: post
comments: true
title:  "Unified Logging Tag Sets in OpenJDK"
excerpt: "Publishing all OpenJDK tag sets as a follow up to my blog on UL"
date:   2023-04-08 09:00:00 +0900
categories: [java,gc,performance]
tags: [Java,GC,Performange,Unified Logging]
---

As mentioned in my previous posting on Unified Logging (UL), messages will be associated with both a level and a tag set. The levels are **trace, debug, info, warning**, and **error**. Tags can be listed by running **java -Xlog:help**. The output from JDK 17 is listed here.
<br/>
<br/>

**add, age, alloc, annotation, arguments, attach, barrier, biasedlocking, blocks, bot, breakpoint, bytecode, cds, census, class, classhisto, cleanup, codecache, compaction, compilation, condy, constantpool, constraints, container, coops, cpu, cset, data, datacreation, dcmd, decoder, defaultmethods, director, dump, dynamic, ergo, event, exceptions, exit, fingerprint, free, freelist, gc, handshake, hashtables, heap, humongous, ihop, iklass, indy, init, inlining, install, interpreter, itables, jfr, jit, jni, jvmci, jvmti, lambda, library, liveness, load, loader, logging, malloc, map, mark, marking, membername, memops, metadata, metaspace, methodcomparator, methodhandles, mirror, mmu, module, monitorinflation, monitormismatch, nestmates, nmethod, nmt, normalize, numa, objecttagging, obsolete, oldobject, oom, oopmap, oops, oopstorage, os, owner, pagesize, parser, patch, path, perf, periodic, phases, plab, placeholders, preorder, preview, promotion, protectiondomain, ptrqueue, purge, record, redefine, ref, refine, region, reloc, remset, resolve, safepoint, sampling, scavenge, sealed, setting, smr, stackbarrier, stackmap, stacktrace, stackwalk, start, startup, startuptime, state, stats, streaming, stringdedup, stringtable, subclass, survivor, suspend, sweep, symboltable, system, table, task, thread, throttle, time, timer, tlab, tracking, unload, unshareable, update, valuebasedclasses, verification, verify, vmmutex, vmoperation, vmthread, vtables, vtablestubs, workgang**

<br/>
### Tags Sets
<br/>
The following table lists tag sets at each logging level available in the product build.
<br/>

|  Trace  |  Debug  |  Info   | Warning |  Error |
|:----------|:--------|:--------|:--------|:-------|
| arguments | attach | arguments | arguments | arguments | 
| attach                                   | cds                                      | cds                                      | cds                                      | attach                                   | 
| cds                                      | cds, class                               | cds, dynamic                             | cds, dynamic                             | cds                                      | 
| cds, heap, mirror                        | cds, dynamic                             | cds, hashtables                          | cds, heap                                | cds, heap                                | 
| cds, mirror                              | cds, heap                                | cds, heap                                | codecache                                | class                                    | 
| cds, unshareable                         | cds, jvmti                               | cds, lambda                              | exceptions                               | gc                                       | 
| cds, verification                        | cds, lambda                              | cds, map                                 | gc                                       | gc, marking                              | 
| cds, hashtables                          | cds, map                                 | cds, module                              | gc, alloc                                | gc, task                                 | 
| class, init                              | cds, mirror                              | cds, dynamic                             | gc, cpu                                  | gc, verify                               | 
| class, nestmates                         | cds, reloc                               | class, init                              | gc, ergo                                 | handshake                                | 
| class, sealed                            | cds, resolve                             | class, load                              | gc, init                                 | jfr                                      | 
| class, unload                            | cds, vtables                             | class, loader, data                      | gc, jvmci                                | jfr, system                              | 
| continuations                            | class, loader, data                      | class, nestmates                         | gc, verify                               | jfr, system                              | 
| ergo                                     | class, nestmates                         | class, path                              | if                                       | jfr, startup                             | 
| evt,out                                  | class, path                              | class, preview                           | jfr                                      | jvmti                                    | 
| gc                                       | class, resolve                           | class, unload                            | jfr, startup                             | logging                                  | 
| gc, age                                  | codecache                                | codecache                                | jfr, system                              | monitorinflation                         | 
| gc, alloc                                | defaultmethods                           | compilation                              | jfr, startup                             | os                                       | 
| gc, barrier                              | exceptions                               | exceptions                               | jni, resolve                             |                                          | 
| gc, bot                                  | gc                                       | finalizer                                | jvmti                                    |                                          | 
| gc, breakpoint                           | gc, age                                  | gc                                       | logging                                  |                                          | 
| gc, ergo                                 | gc, alloc                                | gc, classhisto                           | logging, thread                          |                                          | 
| gc, ergo, cset                           | gc, alloc, region                        | gc, cpu                                  | malloc, free                             |                                          | 
| gc, ergo, heap                           | gc, alloc, stats                         | gc, ergo                                 | metaspace                                |                                          | 
| gc, freelist                             | gc, breakpoint                           | gc, heap                                 | nmt                                      |                                          | 
| gc, heap                                 | gc, director                             | gc, init                                 | os                                       |                                          | 
| gc, heap, coops                          | gc, ergo                                 | gc, load                                 | os, thread                               |                                          | 
| gc, heap, numa                           | gc, ergo, cset                           | gc, marking                              | pagesize                                 |                                          | 
| gc, liveness                             | gc, ergo, heap                           | gc, metaspace                            | perf, memops                             |                                          | 
| gc, marking                              | gc, ergo, ihop                           | gc, mmu                                  | safepoint                                |                                          | 
| gc, metaspace                            | gc, ergo, refine                         | gc, nmethod                              | stringdedup                              |                                          | 
| gc, metaspace, freelist                  | gc, heap                                 | gc, phases                               | stringtable                              |                                          | 
| gc, nmethod                              | gc, heap, coops                          | gc, phases                               | symboltable                              |                                          | 
| gc, phases                               | gc, heap, exit                           | gc, promotion                            |                                          |                                          | 
| gc, plab                                 | gc, heap, region                         | gc, ref                                  |                                          |                                          | 
| gc, ref                                  | gc, humongous                            | gc, region, cds                          |                                          |                                          | 
| gc, refine                               | gc, ihop                                 | gc, reloc                                |                                          |                                          | 
| gc, region                               | gc, init                                 | gc, start                                |                                          |                                          | 
| gc, reloc                                | gc, jni                                  | gc, task                                 |                                          |                                          | 
| gc, remset, tracking                     | gc, marking                              | gc, heap                                 |                                          |                                          | 
| gc, task                                 | gc, mmu                                  | gc, ref                                  |                                          |                                          | 
| gc, tlab                                 | gc, nmethod                              | gc, start                                |                                          |                                          | 
| gc, ref                                  | gc, periodic                             | gc, task                                 |                                          |                                          | 
| handshake                                | gc, phases                               | handshake                                |                                          |                                          | 
| interpreter, oopmap                      | gc, plab                                 | jfr                                      |                                          |                                          | 
| jfr                                      | gc, promotion                            | jfr, startup                             |                                          |                                          | 
| jfr, oldobject, sampling                 | gc, ref                                  | jvmti, table                             |                                          |                                          | 
| jfr, system                              | gc, refine                               | library                                  |                                          |                                          | 
| jvmti                                    | gc, refine, stats                        | logging                                  |                                          |                                          | 
| logging                                  | gc, remset                               | membername, table                        |                                          |                                          | 
| membername, table                        | gc, remset, tracking                     | metaspace                                |                                          |                                          | 
| membername, table                        | gc, stats                                | methodhandles                            |                                          |                                          | 
| metaspace                                | gc, task                                 | module, load                             |                                          |                                          | 
| module                                   | gc, task, start                          | module, unload                           |                                          |                                          | 
| module, patch                            | gc, tlab                                 | monitorinflation                         |                                          |                                          | 
| monitorinflation                         | gc, verify                               | monitormismatch                          |                                          |                                          | 
| monitorinflation, owner                  | gc, ergo                                 | oopstorage, blocks                       |                                          |                                          | 
| nmethod, barrier                         | handshake, task                          | oopstorage, blocks, stats                |                                          |                                          | 
| oopstorage, blocks                       | interpreter, oopmap                      | os                                       |                                          |                                          | 
| oopstorage, ref                          | interpreter, safepoint                   | os, cpu                                  |                                          |                                          | 
| os                                       | jfr, startup                             | os, thread                               |                                          |                                          | 
| os, container                            | jfr, system                              | pagesize                                 |                                          |                                          | 
| os, thread                               | jfr, system, throttle                    | perf, memops                             |                                          |                                          | 
| pagesize                                 | jit, inlining                            | redefine, class                          |                                          |                                          | 
| protectiondomain                         | jni                                      | redefine, class, constantpool            |                                          |                                          | 
| redefine, class                          | jni, resolve                             | redefine, class, load                    |                                          |                                          | 
| redefine, class, constantpool            | logging                                  | redefine, class, load, exceptions        |                                          |                                          | 
| redefine, class, dump                    | logging, thread                          | redefine, class, nestmates               |                                          |                                          | 
| redefine, class, iklass, add             | membername, table                        | redefine, class, normalize               |                                          |                                          | 
| redefine, class, iklass, add             | metaspace                                | redefine, class, record                  |                                          |                                          | 
| redefine, class, iklass, purge           | methodhandles, indy                      | redefine, class, timer                   |                                          |                                          | 
| redefine, class, normalize               | module                                   | redefine, class, update                  |                                          |                                          | 
| redefine, class, obsolete                | nmt                                      | safepoint                                |                                          |                                          | 
| redefine, class, obsolete, mark          | oopstorage, blocks                       | safepoint, stats                         |                                          |                                          | 
| redefine, class, obsolete, metadata      | os                                       | stackbarrier                             |                                          |                                          | 
| redefine, class, update, constantpool    | os, container                            | stacktrace                               |                                          |                                          | 
| redefine, class, update, itables         | os, thread                               | stringdedup                              |                                          |                                          | 
| redefine, class, update, vtables         | os, thread, timer                        | stringdedup, init                        |                                          |                                          | 
| safepoint                                | pagesize                                 | stringtable                              |                                          |                                          | 
| stringdedup                              | perf, datacreation                       | symboltable                              |                                          |                                          | 
| stringtable                              | perf, memops                             | thread, table                            |                                          |                                          | 
| symboltable                              | redefine, class, annotation              | valuebasedclasses                        |                                          |                                          | 
| thread, suspend                          | redefine, class, breakpoint              | verification                             |                                          |                                          | 
| thread, table                            | redefine, class, constantpool            |                                          |                                          |                                          | 
| thread, table                            | redefine, class, interpreter, oopmap     |                                          |                                          |                                          | 
| vmmutex                                  | redefine, class, load                    |                                          |                                          |                                          | 
| vmthread                                 | redefine, class, methodcomparator        |                                          |                                          |                                          | 
| vtablestubs                              | redefine, class, nmethod                 |                                          |                                          |                                          | 
|                                          | redefine, class, stackmap                |                                          |                                          |                                          | 
|                                          | redefine, class, subclass                |                                          |                                          |                                          | 
|                                          | redefine, class, update, constantpool    |                                          |                                          |                                          | 
|                                          | redefine, class, update, vtables         |                                          |                                          |                                          | 
|                                          | safepoint                                |                                          |                                          |                                          | 
|                                          | stackbarrier                             |                                          |                                          |                                          | 
|                                          | stackwalk                                |                                          |                                          |                                          | 
|                                          | stringdedup                              |                                          |                                          |                                          | 
|                                          | stringdedup, phases                      |                                          |                                          |                                          | 
|                                          | stringdedup, phases, start               |                                          |                                          |                                          | 
|                                          | stringtable                              |                                          |                                          |                                          | 
|                                          | stringtable, perf                        |                                          |                                          |                                          | 
|                                          | symboltable                              |                                          |                                          |                                          | 
|                                          | symboltable, perf                        |                                          |                                          |                                          | 
|                                          | thread                                   |                                          |                                          |                                          | 
|                                          | thread, smr                              |                                          |                                          |                                          | 
|                                          | thread, table                            |                                          |                                          |                                          | 
|                                          | verification                             |                                          |                                          |                                          | 
|                                          | vmthread                                 |                                          |                                          |    

<br/>
If there are any missing, please shout out in the comments below.
<br/>
