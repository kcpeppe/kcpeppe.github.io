---
layout: post
title:  "Demo Failures"
date:   2022-12-16 12:25:00 +0900
categories: [general,java,performance]
---

I just watched sometime trying to demo a pretty cool framework that his group had developed and... the let's just say, the demo gods were not kind. This person, quite understandably, look quite flustered. I decided to share one of my demo failures just to say, hey, don't worry, it happens to all of us. And with that, here is one of my more interesting demo failures.

I was presenting at [JFokus](https://www.jfokus.se/) several years ago on how to tune garbage collection in the JVM. The final demo was to show how GC could adapt to current load conditions provided you didn't configure it to the point where it wasn't able to. Not that the size of the audience makes that big a difference but there were about 400 people in the room. I started the webapp, started up Apache JMeter and clicked on the run button. As the load ramped up, the CPU very quickly hit 100%, all was good so far. Next, we wait as in about 90 seconds, the garbage collector ergonomics would kick in and apply an adaptive resizing on heap after which the CPU would quickly drop to about 20% saturation. The 90 seconds came and went, no adaptation, CPU still at 100%, 2 minutes, same, 3 minutes same. I had started the Q&A while firing off JMeter so it wasn't complete silence but obviously my attention was, why is this JVM not adapting. After about 5 minutes I shutdown the demo as it had failed.

<img src="/images/failure.png"
     alt="Markdown Monster icon"
     style="width: 50%; display: block; margin-left: auto; margin-right: auto;" />
     
<p style="text-align: center;">Demo Failure</p>

To say I was unhappy would be an understatement. The only thing I wanted to do was to figure out *why* the demo had failed. But I had to finish answering questions talking the spillage out into the hallway. I've watched some of my friends demo's fail and I see the same reaction. They just want to get to a space where they focus on sorting out what just happened.

Finally I get the time to dig in. I run the demo again and it works, perfectly, just as planned, just as practiced. Now I'm thinking, what was different between now and when I was on stage. The only meaningful thing I could think of was that the presentation had open on stage was now closed. Restart presentation, re-run demo, fails. Shutdown presentation, re-run demo, success. Repeat a few times thinking what is going on here. The presentation software was idle so the only resource it was consuming was memory. This has to have something to do with memory. I tried starting another app and again, the demo failed. Tried again with a different app, worked. Loaded up another app, failure. Yet another trial with another app loaded and the demo fails. The pattern of success and failure seemed to suggest that this had something to do with the memory alignment of the demo.

My conclusion, not supported by any direct evidence, is by loading my presentation, the alignment of the demo in memory adversely affected memory efficiency. This can happen when data structures in the app that used to be in the same memory page or bank, may now be disbursed across cache lines or end up in multiple banks or on multiple pages. This change in timing is likely responsible for ergonomics not applying the much needed adjustment to Java heap memory pool sizes that results in the dramatic reduction in CPU utilization.

More to the point, what I've learned from my demo failures is everyone experiences them. The other thing to consider is that everyone is interested in seeing the demo work. In many cases, someone in the audience will point out something silly I missed or offer helpful suggestions. Realizing this has helped me remain calm during demo failures and that often allows me to quickly discover the issue and either fix or apply a work-around to get the demo to work. Most of all, I want to express my gratitude for the kindness and understanding of those that have witnessed any of my demo failures.