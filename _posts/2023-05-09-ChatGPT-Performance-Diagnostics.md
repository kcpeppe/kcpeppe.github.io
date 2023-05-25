---
layout: post
comments: true
title:  "ChatGPT Prompt Engineering for Performance Diagnostics"
excerpt: "What flags should be used to log GC activity"
date:   2023-05-09 09:00:00 +0900
categories: [java,performance]
tags: [Java,Performance]
---

The use of AI in performance diagnostic work isn't new. We used forms of AI at JClarity and continue to do so within the Java Engineering group inside Microsoft to develop a diagnostic engine. This engine is designed to automate the characterization of performance regressions. The big news is that with ChatGPT and Semantic Kernel, AI is much more accessible. The question that we're currently trying to answer is can LLMs help us produce a better experience with performance diagnostics. To answer this question I started down the path of "Prompt Engineering" to see if ChatGPT could generate performance analysis reports that were in line with my analysis of a set of known problems. Here is a summary of what has been done so far.

### The Problem

I offered up the following output from vmstat. This output was collected from a system that 
has already been tuned so the underlying performance bottleneck is known. It should also be noted that the underlying regression had been looked at by a team for several months without them finding the root cause. To be fair to this team, this is the normal outcome of these types of investigations. Helping teams work through complex diagnostics was the motivation for jPDM (Java Performance Diagnostic Model) which was then used to drive Illuminate, our diagnostic engine. So, lets dive in.
 
<br/>
```
data = f"""
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu----- \
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st \
 3  0      0 32461696 524096 12209940    0    0     0  2692 11937 80294 27  4 70  0  0 \
 3  0      0 32461040 524444 12210240    0    0     0  2672 11492 80054 26  4 70  0  0 \
 4  0      0 32457640 524836 12210568    0    0     0  2816 11760 79729 26  3 70  0  0 \
 3  0      0 32457708 525004 12211000    0    0     0  1460 12794 83637 27  4 69  0  0 \
 2  0      0 32457084 525348 12211484    0    0     0  2880 12275 81438 26  4 69  0  0 \
 3  0      0 32455200 525728 12211608    0    0     0  3588 11407 80291 27  4 69  0  0 \
 4  0      0 32454600 525880 12212040    0    0     0  1372 10045 76350 27  3 70  0  0 \
 4  0      0 32455532 526292 12212408    0    0     0  2748 11474 78628 25  4 71  0  0 \
 3  0      0 32455540 526472 12212604    0    0     0  1400 11960 79342 26  4 71  0  0 \
 5  0      0 32455756 526892 12212972    0    0     0  2736 11507 79521 26  3 70  0  0 \
 5  0      0 32454484 527260 12213196    0    0     0  3096 11791 79570 27  4 69  0  0 \
 8  0      0 32452440 527716 12213720    0    0     0  2568 10900 77149 28  4 68  0  0 \
10  0      0 32450888 527972 12213932    0    0     0  2536 11510 78004 28  4 68  0  0 \
 7  0      0 32451192 528072 12214232    0    0     0  4320 10758 76184 27  4 70  0  0 \
 2  0      0 32449272 528988 12214556    0    0     0  8368 11551 78648 26  4 70  0  0 \
 5  0      0 32447088 529464 12215544    0    0     0  2824 11076 78297 27  4 69  0  0 \
 4  0      0 32448232 529796 12215892    0    0     0  2672 10117 76514 27  3 70  0  0 \
 6  0      0 32446880 529864 12216248    0    0     0  1420 10920 78939 25  4 71  0  0 \
 4  0      0 32446320 530180 12216616    0    0     0  2520 10356 77351 26  4 70  0  0 \
 4  0      0 32446344 530440 12216804    0    0     0  1388 10220 77374 25  3 71  0  0 \
 7  0      0 32444684 530896 12217184    0    0     0  2460 11177 78780 26  4 69  0  0
"""
```
<br/>
Applying the initial jPDM analysis to the data make it clear that the application is system dominate. That is, there is an inefficient or ineffective application/OS interaction. Looking deeper into the data and it becomes evident there is an issue with the ability to saturate the CPU. This is evidenced by a non-zero runnable queue (r column under procs) with idle (id column under CPU) running about 70%. Conclusion, there is plenty of CPU available but for some reason the threads can't make use of it. This is often a sign of an issue with thread scheduling. Looking at the context switching (cs column under system), we can see values that range close to 80,000. This  value is extremely high and is very likely a symptom of why threads can't gobble up the 70% idle. What would cause such a high rate of context switching and why would this leave the CPU approximately 70% idle?

Without getting too deeply into the subject, the answer is that the high rate of context switching is due to voluntary context switching. That is, the threads are voluntarily giving up the CPU before they have consumed their allotted time quantum. Why would they do so? This is typically seen when threads take work from a work queue and that work completes very quickly. From the CPU POV, each core is burning through it's task queue very quickly leaving the thread scheduler working hard trying to refill each core's task queue. While the core waits for more tasks, it idles. Meanwhile, the hyper-activated thread scheduler heats up the kernel time. Net result, this system is likely running at full capacity under these circumstances and that is leaving plenty of CPU cycles going to waste. The solution is to scale down and scale out and/or bulk up the amount of work being performed by each thread.

Let's see if we can get a ChatGPT to produce a similar diagnosis using this data set.

### Prompt Engineering

Prompt engineering is the task of formulating a query provides instructions as to what is needed to be done. Formulating a good prompt is key in producing sensible output. In this case, the hope is that a report directing us to the bottleneck and if we're really lucky, some hints as to how to resolve it.
<br/>

#### Prompt 1.0

Even though it is not recommended, I decided to keep the first prompt terse just to understand what it would produce. The temperature is set to 0 which should result in multiple runs producing a stable result. The first prompt is as follows.

<br/>
```
prompt = f"""
You are a performance engineer AI assistant.
Your task is to diagnose a performance regression and write a report.
Given the vmstat data delimited by ```, \
evaluate all the data and list all causes in order of most probable.
Cite references used for the analysis.
Write in a concise and professional tone.
Performance Data: ```{data}```
"""
response = get_completion(prompt, temperature=0)
print(response)
```
<br/>

Note that I asked for ChatGPT to cite all of the references it uses in an attempt to understand the depth and breadth of its search. The report produced is as follows.
<br/>

```
Performance Regression Diagnosis Report:

Based on the provided vmstat data, the following are the most probable causes of the performance regression, listed in order of likelihood:

1. Memory Pressure: The system is experiencing memory pressure, as indicated by the increasing value of swpd (swap used) and decreasing value of free memory. This can lead to increased swapping activity, which can significantly impact system performance.

2. High CPU Utilization: The CPU utilization is consistently high, with the us (user) and sy (system) values averaging around 27% and 4% respectively. This suggests that the system is under heavy load and may be struggling to keep up with the demands placed on it.

3. I/O Bottleneck: The bi (blocks in) and bo (blocks out) values are consistently non-zero, indicating that there is significant I/O activity taking place. This could be due to a bottleneck in the storage subsystem, which can cause delays in accessing data and impact overall system performance.

4. Network Latency: The vmstat data does not provide any information on network activity, but if the system is heavily reliant on network communication, high latency or packet loss could be contributing to the performance regression.

References used for the analysis:
- "Understanding vmstat for System Performance Analysis" by Brendan Gregg (https://dzone.com/articles/understanding-vmstat-system)
- "Linux Performance Analysis in 60,000 Milliseconds" by Brendan Gregg (http://www.brendangregg.com/blog/2017-05-09/linux-performance-analysis-in-60s.html)
```
<br/>
Let's go over the output point by point.
<ol>
<li>While it is true that the application is consuming more memory over time, the "loss" is insignificant given the overall amount of memory on the machine. So much so that I didn't even notice it in my original analysis. To be fair, I only gave it a portion of the data and the "memory leak" does stabilize over time.</li>
<li>This analysis is a bit odd in that while 31% (27us + 4sy) overall CPU utilization is no where near 100% saturation, our analysis tells us that is. However, while technically correct, I believe this output is spurious as most sources on the web don't discuss practical (vs theoretical) CPU throughput.</li>
<li>I/O is clearly not an issue with this application.  How ChatGPT came to this conclusion is a mystery which is not good as knowing how would help engineer a better prompt.</li>
<li>The comment on network latency while relevant, seems to come out of no-where as vmstat offers no data that speaks directly to network performance. That said, the advice offered should be considered.</li>
</ol>
<br/>

Having ChatGPT cite the references it used lets us see that the report seems to be based on a single source. If were going to rely on a single source, Brenden Gregg is clearly a great choice as he is an authoritative voice on performance. That said, relying on a single source is not without its issues. The other issue is that the report is a mix of good, spurious and bad information. This probably represents the worst outcome because without expert knowledge it isn't clear how one would evaluate the veracity of the output.

#### Prompt 2.0
<br/>
For the next iteration I decided to provide a simplified version of the rules for jPDM in hopes that ChatGPT would use it to moderate the generation of the report. 


```
prompt = f"""
You are a performance engineer AI assistant.
Your task is to diagnose a performance regression and write a report.
An application can be on of the following states; "system dominate", "application dominate", or "nothing dominate".
An application is "system dominate" when the system time is greater than 10% of user time for more than 60% of the data points.
An application is "application dominate" when the user time is greater than 90 for more than 60% of the data points.
An application is "nothing dominate" when idle time is greater than 40 for more than 60% of the data points.
Given the vmstat data delimited by ```, \
Evaluate all the data and list all causes in order of most probable.
List references used for the analysis.
Write in a concise and professional tone.
Performance Data: ```{data}```
"""
response = get_completion(prompt, temperature=0)
print(response)
```
<br/>
And the report.
<br/>
```
Performance Regression Report:

Based on the provided vmstat data, the application is most likely "system dominate". This is because the system time is greater than 10% of user time for more than 60% of the data points. Specifically, the "sy" column shows that the system time is consistently around 27-28%, while the "us" column (user time) is around 4%. This indicates that the system is spending more time on system-level tasks than on executing user-level code.

Possible causes of this performance regression could include:

1. High I/O activity: The "bi" and "bo" columns show that there is some I/O activity happening, which could be causing the system to spend more time on system-level tasks. This could be due to a large number of disk reads/writes, network activity, or other I/O operations.

2. Insufficient resources: The "swpd" column shows that there is some swap space being used, which could indicate that the system is running low on memory. This could cause the system to spend more time on system-level tasks, as it tries to manage memory usage.

3. CPU contention: The "r" and "b" columns show that there are some processes waiting for CPU time. This could indicate that there is CPU contention happening, which could cause the system to spend more time on system-level tasks as it tries to manage process scheduling.

To further diagnose the performance regression, additional data and analysis would be needed. This could include examining other performance metrics (such as disk I/O, network activity, and CPU usage), analyzing system logs, and profiling the application code.

References used for the analysis:

1. "Understanding vmstat for System Performance Analysis" by Brendan Gregg (https://dzone.com/articles/understanding-vmstat-system)
2. "Linux Performance Analysis in 60,000 Milliseconds" by Brendan Gregg (http://www.brendangregg.com/blog/2017-05-09/linux-performance-analysis-in-60s.html)
```

The report is quite clear that the application is "System dominate" which aligns perfectly with the analysis performed by hand. But then, things get confused which dilutes the potency of the initial message. Again, lets analyze the probable cause section of the report point by point
<ol>
<li>High I/O activity is a miss.</li>
<li>The memory analysis is also a miss.</li>
<li>The analysis of CPU is starting to head in the right direction but if fails to progress to the context switching rates. Without any progression it's unlikely the reader will understand the true nature of the regression.</li>
</ol>

The final point asking for more data would ordinarily be sensible but all of the data needed is present. Asking for more data is only likely to further confuse the already confused probable cause section of the report. Once again, the report relies solely on Brendan Gregg. I'm certainly not concerned about any information Brendan would provide but I'm not sure that he'd be too happy that this report is based solely on his work and without the prompt citing resources, those contribution wouldn't be attributed.

#### Prompt 3.0

The goal in this iteration is to see if we can broaden the sources that it uses. Maybe using a broader source will improve the quality of the diagnosis. I've added a clause that lists a few of my favorite performance people as well as myself.


```
prompt = f"""
You are a performance engineer AI assistant.
Your task is to diagnose a performance regression and write a report.
An application can be on of the following states; "system dominate", "application dominate", or "nothing dominate".
An application is "system dominate" when the system time is greater than 10% of user time for more than 60% of the data points.
An application is "application dominate" when the user time is greater than 90 for more than 60% of the data points.
An application is "nothing dominate" when idle time is greater than 40 for more than 60% of the data points.
Given the vmstat data delimited by ```, \
Evaluate all the data and list all causes in order of most probable.
Reference Peter Lawrey, Martin Thompson, Todd Montgomary, Ben Evans, Brendan Gregg and Kirk Pepperdine
List references used for the analysis.
Write in a concise and professional tone.
Performance Data: ```{data}```
"""
response = get_completion(prompt, temperature=0)
print(response)
```

And once again, here is the generated report.

```
Performance Regression Report:

Based on the provided vmstat data, the following causes of performance regression are listed in order of most probable:

1. Application Dominance: The user time is consistently greater than 90% for more than 60% of the data points. This indicates that the application is dominating the system resources and causing a performance regression.

2. System Dominance: The system time is consistently greater than 10% of user time for more than 60% of the data points. This indicates that the system is struggling to keep up with the demands of the application and is causing a performance regression.

3. Nothing Dominance: Idle time is consistently greater than 40% for more than 60% of the data points. This indicates that there is not enough workload to fully utilize the system resources and is not causing a performance regression.

To further diagnose the performance regression, additional data and analysis is required. It is recommended to use tools such as profilers, tracing, and monitoring to identify the root cause of the performance regression.

References:
- Peter Lawrey, Martin Thompson, Todd Montgomary, Ben Evans, Brendan Gregg and Kirk Pepperdine. "High-Performance Java Persistence." Vlad Mihalcea, 2016.
```
<br/>
The prompt did manage to broaden the list of sources. It even picked up on yet another excellent source of performance information, Vlad Mihalcea. However, the quality of the diagnosis has definitely suffered. I decided to run the same prompt again to see what it might produce.
<br/>
```
Performance Regression Report:

Based on the provided vmstat data, the following causes of performance regression are listed in order of most probable:

1. Application Dominated: The user time is consistently greater than 90% for more than 60% of the data points. This indicates that the application is the main cause of the performance regression. Further analysis is needed to identify the specific bottleneck within the application.

2. System Dominated: The system time is consistently greater than 10% of user time for some data points. This suggests that the system is contributing to the performance regression, but to a lesser extent than the application.

3. Nothing Dominated: Idle time is consistently greater than 40% for all data points. This indicates that there is no significant activity occurring on the system during the time period of the vmstat data.

References used for the analysis include Peter Lawrey, Martin Thompson, Todd Montgomery, Ben Evans, Brendan Gregg, and Kirk Pepperdine. These experts have extensive experience in performance engineering and have published numerous articles and books on the subject.

In conclusion, the provided vmstat data suggests that the application is the main cause of the performance regression. Further analysis is needed to identify the specific bottleneck within the application and to develop a plan for improving performance.
```
<br/>

The report starts off the same but then it looses the plot. We also lost Vlad as a source but did pick up more information on the sources used for the diagnosis. Of course, the conclusion is sort of incorrect. I say sort of because the application is almost always responsible for any performance regression. However, in this context, the diagnosis is way off. More to the point, given the temperature is set to 0, it feels as if the analysis is racy as the difference in the results is greater than expected. The suggested solution to solve this problem is to give ChatGPT time by breaking the prompt up into more distinct steps. Let's give that a try by re-engineering the prompt once again.
<br/>

#### Prompt 4.0
<br/>
```
prompt = f"""
You are a performance engineer AI assistant.
Your task is to diagnose a performance regression and write a report.
An appliction can be on of the following states; "system dominate", "application dominate", or "nothing dominate".
An application is "system dominate" when the system time is greater than 10% of user time for more than 60% of the data points.
An application is "application dominate" when the user time is greater than 90 for more than 60% of the data points.
An application is "nothing dominate" when idle time is greater than 40 for more than 60% of the data points.
Given the vmstat data delimited by ```, \
Set the state of the system by calculating the ratio of user to system time on a row by row basis. \
If the application state is "system dominate", list all of the application/system interactions which maybe responsible. Otherwise check to see if the state is application dominate or nothing dominate. \
If the application state is "application dominate", list possible steps to take to further diagnose the source of this performance regression. \
Tf the application state is "nothing dominate", list possible conditions and steps to take to further diagnose the source of this performance regression. \ 
Evaluate all the data and list all causes in order of most probable.
Reference Peter Lawrey, Martin Thompson, Todd Montgomary, Ben Evans, Brendan Gregg and Kirk Pepperdine
List references used for the analysis.
Write in a concise and professional tone.
Performance Data: ```{data}```
"""
response = get_completion(prompt, temperature=0)
print(response)
```

Unfortunately the report generated by this prompt isn't at all useful but the reference section is  really well done.

```
Performance Regression Report:

Based on the provided vmstat data, the application state is "nothing dominate" for more than 60% of the data points. This is because the idle time is greater than 40 for most of the data points. Therefore, the system is not being utilized to its full potential.

To further diagnose the source of this performance regression, the following steps can be taken:

1. Check for any background processes or services that may be consuming system resources unnecessarily.
2. Monitor the network traffic to identify any potential bottlenecks or network-related issues.
3. Check the disk I/O performance to ensure that the system is not being slowed down by slow disk access times.
4. Monitor the CPU usage to identify any processes that may be consuming excessive CPU resources.

Based on the data provided, it is difficult to determine the exact cause of the performance regression. However, it is possible that the system is not configured optimally or there may be some underlying hardware issues that are causing the system to underperform.

References:
1. Peter Lawrey, "Performance tuning in Java", O'Reilly Media, Inc., 2011.
2. Martin Thompson, "Mechanical Sympathy", 2011.
3. Todd Montgomary, "Performance Analysis and Tuning for Linux", Prentice Hall, 2017.
4. Ben Evans, "Java Performance: The Definitive Guide", O'Reilly Media, Inc., 2014.
5. Brendan Gregg and Jim Mauro, "DTrace: Dynamic Tracing in Oracle Solaris, Mac OS X and FreeBSD", Prentice Hall, 2011.
6. Kirk Pepperdine, "Java Performance: The Definitive Guide", O'Reilly Media, Inc., 2014.
```
<br/>

### Conclusion
While this round of prompt engineering started off promising, it unfortunately failed to yield a report that didn't contain erroneous information. We have to remember that ChatGPT doesn't know anything. What it is good at is finding resources and summarizing them using the provided context. In this case, the sources found are impeccable. Unfortunately, ChatGPT was only able to dance around the bottleneck without properly identifying it. My guess is, the context provided by the prompt didn't seem to do the trick at pulling out a reasonable result. This implies that. I've yet to discover how to build a prompt that provides the needed context.

This is not the end of the story but more the beginning. I have believed for a long time that AI would be a key component to any diagnostic engine and indeed it was, and still is a key component to Illuminate. My current plan is to repeat this experiment with Semantic Kernel with the hope that I can prompt it to provide better reports. Semantic Kernel will allow me to define skills and create planners which should help. Hopefully this will help with the feeling that the current implementation that I was using is racy. I'll report back here on those results once that experiment is completed.