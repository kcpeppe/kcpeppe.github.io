---
layout: post
comments: true
title:  "Unified Logging In OpenJDK"
excerpt: "What flags should be used to log GC activity"
date:   2023-03-27 09:00:00 +0900
categories: [java,gc,performance]
tags: [Java,GC,Performance]
---
&nbsp;

My primary interest is Unified Logging (UL) is aimed at getting enough data for GCToolKit to perform a reasonable analysis of GC activity in the JVM. Prior to UL, the flags of choice were as follows.
&nbsp;
  
```
-Xloggc:gc.log -XX:+PrintGCDetails -XX:+PrintTenuringDistribution -XX:+PrintReferenceGC -XX:+PrintGCApplicationStoppedTime -XX+PrintGCApplicationConcurrentTime
```
In UL, the configuration needed to get a (mostly) equivalent information in Unified Logging requires the following flag setting.

```
-Xlog:gc*,gc+ref=debug,gc+phases=debug,gc+age=debug,safepoint:file=gc.log
```
This configuration only begins to touch upon the amount of information that UL can produce. As well, UL adds some features that are new or were inconsistently implemented prior JDK 9.0. Let's explore the logging options above to gain an understanding of how UL works as well as explore other interesting features that this newish logging framework brings to the table.
&nbsp;

&nbsp;


## Logging Basics

UL is configured with the following options **-Xlog[:[selections][:[output][:[decorators][:output-options]]]]**. If no options are specified, -Xlog will output **all** log messages at the **info** level to **stdout**. The longer form of this is; **-Xlog:all=info:stdout:,u,l,tg**. Below is an example of the output produced by this configuration. Note the uptime stamp on the last log entry. The significance of this timing will be discussed later on.
<br/>
```
box:$ java -Xlog -version
[0.002s][info][nmt] NMT initialized: off
[0.002s][info][nmt] Preinit state: 
[0.002s][info][nmt] entries: 305 (primary: 305, empties: 7614), sum bytes: 9370, longest chain length: 1
[0.002s][info][nmt] pre-init mallocs: 530, pre-init reallocs: 0, pre-init frees: 225

....

[0.043s][info][safepoint,stats  ] None                                 1
[0.043s][info][safepoint,stats  ] Maximum sync time  0 ns
[0.043s][info][safepoint,stats  ] Maximum vm operation time (except for Exit VM operation)  0 ns
```
&nbsp;

Each log entry contains a set of decorators and a message. The default decorators are; age of the JVM, logging level, and log tag set. For example, the first log entry written at 0.002s at the info level by Native Memory Tracking using the tag set “nmt” tells us that this feature was not initialized. The decorators in UL are time (t), utctime (utc), uptime (u), timemillis (tm), uptimemillis (um), timenanos (tn), uptimenanos (un), hostname (hn), pid (p), tid (ti), level (l), tags (tg). Thus the command line below is equivalent to -Xlog

```
box-6:$ java -Xlog:::u,l,tg -version
[0.002s][info][nmt] NMT initialized: off
[0.002s][info][nmt] Preinit state: 
[0.002s][info][nmt] entries: 305 (primary: 304, empties: 7615), sum bytes: 9387, longest chain length: 2
```
&nbsp;
### Selectors
&nbsp;

Selectors are used to indicate which log messages we're interested in. The selectors consist of tag sets and levels. A tag set consists of one or more tags. For example, gc selects all messages tagged with tag set. The tag set gc* would select all messages with tagsets that start with gc. As we've seen above, the **all** tag indicates that all tag sets should be logged.

The levels in Unified logging are off, trace, debug, info, warning, and error. As the name levels suggests, logging at a higher level will also give you messages at the lower levels. For example, **-Xlog:all=trace** will cause every message to be logged.
<br/>
```
box-6:$ java -Xlog:all=trace -version
[0.002s][info][nmt] NMT initialized: off
[0.002s][info][nmt] Preinit state: 
[0.002s][info][nmt] entries: 305 (primary: 305, empties: 7614), sum bytes: 9381, longest chain length: 1
[0.002s][info][nmt] pre-init mallocs: 530, pre-init reallocs: 0, pre-init frees: 225
[0.002s][info][nmt] 
[0.002s][debug][os ] Initial active processor count set to 8
[0.002s][trace][gc,heap]   Maximum heap size 4294967296
...
[0.146s][debug][perf,datacreation      ] Total = 187, Sampled = 1, Constants = 51
[0.147s][info ][safepoint,stats        ] None                                 1
[0.147s][info ][safepoint,stats        ] Maximum sync time  0 ns
[0.147s][info ][safepoint,stats        ] Maximum vm operation time (except for Exit VM operation)  0 ns
```
<br/>
Running java -Xlog:help prints a lot of useful information that includes all of the available tags. Do know that not all tags can be usefully combined at all levels. The next blog post on UL will include a list of all of the functional tag sets combinations for each log level.
<br/>

### Decorators 

Available log decorators: **time (t), utctime (utc), uptime (u), timemillis (tm), uptimemillis (um), timenanos (tn), uptimenanos (un), hostname (hn), pid (p), tid (ti), level (l), tags (tg),** and **none**. As indicated above, the default decorators are **uptime, level,** and **tags**.

It’s often useful to add time (t) to the log as this adds an ISO-8601 formatted date stamp. The recommended way to add this decorator is to prepend it to the defaults as follows; **-Xlog;gc*,gc+ref=debug::t,u,l,tg**. This produces the output below. Note that configuration is a colon separated list that indicates what to logged, where to log, what decorators are in play, and finally, some options about how to collect the data. In the configuration below, the “::” leaves the output field blank (meaning use defaults) and puts the decorations to the 3rd field
<br/>
```
box-6:$  java -Xlog:gc*,gc+ref::t,u,l,tg
[2023-03-22T10:49:54.707-0700][0.001s][info][nmt] NMT initialized: off
[2023-03-22T10:49:54.707-0700][0.001s][info][nmt] Preinit state: 
```
&nbsp;
### Output and Output-options
<br/>
Currently, the default is to log **info** level messages to **stdout** and **warning** and **error** to **stderr**. Output can be redirected to a file as follows **java -Xlog:gc*,gc+ref:file=gc-%p_%t.log**. The **%p** and **%t** parameters add the process id and a time stamp to the log file name.

UL uses file rotation by default. The defaults are; size threshold is *20M** for up to **5** files. For example, if the output is to gc.log, that file will be rolled over once it reaches 20M in size. The file will be renamed as gc.log.0 and a new gc.log will be started. This processes repeats creating gc.log.1, followed by gc.log.2, gc.log.3, and gc.log.4. On the next rollover, gc.log will overwrite gc.log.0 and the cycle will continue. Under this scheme, the base log, gc.log will always contain the most recent log entries. The defaults can be overridden using filesize (K,M,G) and filecount. For example, **java -Xlog:gc*,gc+ref:file=gc.log::filesize=50M,filecount=10** rolls over at **50M** into **10** files.


### Configuring UL From the Command Line
<br/>
The regular behaviour for JVM configurations is that if one is duplicated, the last duplication will override the initial setting. However, -Xlog is irregular is that subsequent calls to -Xlog on the command line will add the new settings to the existing configuration. If we use our GC logging settings as an example, **-Xlog:gc*,gc+ref=debug,gc+phases=debug,gc+age=debug,safepoint:file=gc.log** could also be expressed as **-Xlog:gc*:file=gc.log -Xlog:gc+ref=debug,gc+phases=debug,gc+age=debug,safepoint**
<br/>

### Managed Flags
<br/>
**-Xlog** is a managed flag meaning that is can configured after the JVM has started. Any tool that can interact with the HotSpotDiagnosticMXBean can change the configuration of a managed flag. The difference between regular managed flags and -Xlog is that the logging flag remains additive. For example, say our JVM was started with **-Xlog:gc*,safepoint:file=gc.log** and afterwards we wanted to add the debug level logging. Specifying **gc+ref=debug,gc+phases=debug,gc+age=debug** in the tool of choice will add these configurations to the existing ones. The **disable** tag level can be used to completely reset logging back to it's defaults.

As for tooling, jcmd can be used to set a logging configuration in a running JVM. For example, if the JVM was started with -Xlog:gc* and later on there was a need to log reference processing, this could be turned on using jcmd as follows;

```
jcmd <pid> VM.log what=gc*,gc+ref</code>
```
The keywords for the other settings are “output", “what”, and “decorators”.
&nbsp;

### Other Considerations
&nbsp;

The drawback with UL (and pretty much all logging for that matter) is the overhead that it imposes on the runtime. Logging everything can significantly impact the performance of your application. It is not an accident that the last message was printed at 43 ms in the first log where only defaults were applied and at 146ms in the following log that printed everything.

The other issue with logging is that it can take up a lot of storage space.  The defaults log outputted 793 messages while the trace level produced 13365 (JDK 17). Using the right combination of levels and tags will help reduce both impact on performance and storage requirements.

The benefit is that JVM logging is more uniform and stable making it a lot easier to extract information.

Send me a message upcoming workshops if you'd like to learn more about how to use GC log to tune garbage collection in Java