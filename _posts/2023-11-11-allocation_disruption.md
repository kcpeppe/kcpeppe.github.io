---
layout: post
comments: true
title:  "Allocation Disruption"
excerpt: ""
date:   2023-11-11 11:00:00 +0900
categories: [java,performance]
tags: [Java, performance, gc]
---

Yesterday I had a long overdue catchup with a good friend. At one point the conversation drifted to the question, do we really learn from our failures? While conventional wisdom tells us that we learn more from our failures than from our successes, science tells us quite the opposite. Science also tells us that we learn just as much from the failures of others as we do from others success. How did we get to this topic in our conversation? It's because we've both reached a point in our careers where we are expected to be spending more time mentoring others. Part of mentoring others is deciding when to offer course corrections and when to let the mentee fail.

I've never been a fan of "let them fail" as I feel it's far better to demonstrate paths to success and have the mentee experience success. You see this in sports all the time when a team "rebuilds". Teams always keep a couple of wily vets to help the newer players see what it takes to win. You hear this all the time in interviews where a young player will be commenting on the work ethic of the successful veteran. If there is learning to be had from failure, it must come with some form of a retrospective. In fact, even in success, the retrospective is a necessary learning tool.

How does this fit in with "Allocation Disruption"? I didn't do most of the work for what I'm about to write about. The heavy lifting was done by 3 eager souls who wanted to dive in head first without even checking the depth of the water. They got the amazing result. I did the easy bit of looking at data an offering advice, IOW, my role here was to mentor.

### Confidential Information

Unfortunately this is a case where I can't go into too many details. Suffice to say I was involved in GC tuning a small portion of a very large distributed application. The customer was obsessed with p99 and p999 (tail) latency performance. It literally drives just about every performance decision made. While this isn't necessarily a bad thing, it is important to look at p10, p50, and p90 latencies as well. You can read about the ***why*** in one of my other posts on latency. My role in this effort was to mentor. As part of the mentoring We'd go over the GC logs and latency/load charts from the test runs to plan the next move.  The first GC log we looked at showed GC overhead to be less than 1%. From this I knew we could not have any impact on p99 latencies by simply tuning GC. The best that could be seen was a lower p999 value. The log also showed that the real issue was the allocation rate. All we had to do is find the hot allocation sites.

### Fun with Allocation Profiling

After several failed attempts to get an allocation profiler into the test environment we decided to go with Java Flight Recorder as it is built into the JVM. At this point I wasn't so confident that we'd find the real culprit as JFR has a huge bias towards large allocations ([discussed in a previous blog entry](https://www.kodewerk.com/general/java/memory/2022/12/11/allocating-profiling-bias.html)). I knew that while reducing the rate at which large objects are allocated would be beneficial, it wouldn't be as nearly beneficial as finding the true allocation hotspot. As expected, the top 4 allocations in the list were there because of their size. To my surprise, java.util.Optional was sitting in the #5 slot. Given that is a 3 word allocation I knew the problem was likely 200x larger than reported whereas the measure of large object allocations was much closer to the truth. JFR also provided the location of the hot site in the code. The next step was obvious, refactor the code with an eye on either removing or reducing the pressure on that site. Unfortunately I cannot publish the code here but what I can say is that it involved how the application was logging.

One of the larger allocations was a buffer to temporarily store incoming data. The team decided to optimize this by creating a large thread local buffer. The result of these two optimizations was a 20% increase in overall server capacity while reducing latency by 50%. The net result was more than a $1.5 million saving over the next year for this service alone.

### The True Cost of an Allocation

On paper the cost of an allocation looks cheap. The reality is somewhat different and it's one that I cover as part of a 4 hour presentation on memory efficiency that a present on Safari. It suffices to say that the real cost of an allocation is that it's almost always a cache miss because the allocation will reference memory that will rarely, if ever, been in the CPUs cache. While most memory stats will brag about how much data you can stream from them, what they rarely talk about is how long does it take to get the first word. This cost includes the time,

<ul>
<li>to discover data is not in CPU cache (cache miss)</li>
<li>to send request for data across the bus to the memory controller.</li>
<li>for the memory controller to fire up the column containing the data (CAS, column address strobe).</li>
<li>to send and then have the CPU to receive the data from the BUS</li>
<li>for the data to make it into the load buffer and then into a CPU register</li>
</ul>

While all of this is happening, that core processing the request will be stalled waiting on the data to arrive. To give us an idea of how much time this all takes, let's look at cache miss discovery and time to extract data from the memory chip as these times will be fairly constant.

To discover the cache miss all of the CPU's caches have to be searched (run to failure). In total this will take about 58 CPU clock cycles. To read data from a memory chip, the controller has to fire up the column of memory and then wait for the signal to stabilize. This process is known as CAS. The CAS cost depends on the memory chip spec but it's generally 14-16ns, 15ns being a common number. Oddly enough, the newer DDR5 memory chips generally has a slower CAS than that seen in the older DDR4 chips. That said, DDR5 uses a few tricks to minimize the number of request that are exposed to CAS latency. Let's now translate the CAS cost to CPU clock times. A clock tick on a 2.4GHz CPU is ~0.416ns. Thus, a 15ns CAS costs 36 CPU clocks.

If an allocation can be completed in say, 100 CPU clock cycles without the stall, then adding in the stall yields an overall run to stall ratio of 25%. Note, this cost for allocating regardless of the size of the allocation.

The lightbulb moment here is the cache miss cost of allocating Optional will be the same as the cache miss cost of allocating a large buffer. Thus is it is the frequency of an allocation that often matters much more than the size of the allocation. So why do many profilers such as JFR report on the MB's allocated and not numbers of allocations? I honestly don't know. Even if JFR reported on the number of samples, it's sampling bias would still not expose most hot allocation site for small allocations. Can JFR be fixed, I think so but it will require an entire new way of thinking about how to sample while minimizing the profiling overhead. We have ideas, now all we need is time.
