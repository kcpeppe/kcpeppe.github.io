---
layout: post
comments: true
title:  "Where is the Race Condition"
date:   2023-01-16 21:00:00 +0900
categories: [general,java]
---

<br/>
TLDR; this post is about a bit of threading/concurrency silliness combined with ignoring the obvious that I think we can all get caught up in at times. The story starts as I push what I believed to be the final commit of a substantial refactoring of [GCToolKit](https://github.com/microsoft/gctoolkit/tree/message). All of my test were passing on my laptop. They were passing on the laptops of the other poor souls that had the mis-fortune of being involved. All I needed to complete was some tidying up and release documentation. I quickly navigated over to the actions/run/jobs view to watch the GitHub build action progress when to my chagrin, the test ends abruptly with a failure.
<br/>
<br/>

```
[INFO] 
[INFO] Results:
[INFO] 
Error:  Failures: 
Error:    GarbageCollectionEventSourceTest.testGZipTarFileLineCount:50->assertExpectedLineCountInLog:101 expected: <410055> but was: <407299>
[INFO] 
Error:  Tests run: 27, Failures: 1, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] Reactor Summary for GCToolKit 2.0.13-SNAPSHOT:
[INFO] 
[INFO] GCToolKit .......................................... SUCCESS [  0.159 s]
[INFO] GCToolKit GCLogs ................................... SUCCESS [ 26.323 s]
[INFO] GCToolKit API ...................................... SUCCESS [  4.404 s]
[INFO] GCToolKit Parser ................................... SUCCESS [02:50 min]
[INFO] GCToolKit Vertx .................................... FAILURE [ 19.516 s]
[INFO] GCToolKit Sample ................................... SKIPPED
[INFO] GCToolKit Integration .............................. SKIPPED
[INFO] ------------------------------------------------------------------------
[INFO] BUILD FAILURE
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  03:41 min
[INFO] Finished at: 2023-01-16T16:46:23Z
[INFO] ------------------------------------------------------------------------
Error:  Failed to execute goal org.apache.maven.plugins:maven-surefire-plugin:3.0.0-M7:test (default-test) on project gctoolkit-vertx: There are test failures.
```
<br/>
I somehow just knew the root cause of this failure was a race condition. Why? When it comes to race conditions core count matters. My laptop is a 6 core hyper-threaded MacBook Pro whereas the VMs running the GitHub actions are 2 core 7GB virtual machine. That GitHub gives us 2 cores was a pleasant surprise as I completely expected to find a single core VM. But I digress. The oddity is that while fewer cores will hide some concurrency issues, more cores will hide others. In this case, my laptop's over abundance of cores hid the bug whereas GitHub's 2 core VM happily put the release party on ice. Mind shifted and was thinking; interesting, how to debug a test failure that was only showing up on GitHub.

<br/>
### Debugging Failures in GitHub Actions

Of all the good things I can say about GitHub actions, it's not a great environment to debug concurrency woes in. The sensible thing to do would have been, recreate a local VM that is resourced similarly to the GitHub VM and use it locally (more on this later). Instead, I decided to pepper the code with print statements in the hope that the additional code wouldn't "fix" the race. I then would test the code locally, push it and then let GitHub actions do its thing. Yes, the local VM would be better but I'd still likely need the print statements and git push is easy and I'll find the problem in a couple of runs anyway so let's take the lazy route.
<br/>

### But Where is the Race?

At the core of GCToolKit is [Vert.x](https://vertx.io/). If you're familiar with Vert.x then you know it is a great famework for event driven systems. The thought to hold onto is that Vert.x is async. Even the things would wouldn't imagine as being async are backed by async calls. Knowing this I did load up the code with some notes pointing out possible trouble spots. Remember that point also as it only adds to the amusement.


The initial release of GCToolKit had several direct dependencies on Vert.x. One of the goals of the refactoring was to break these dependencies by introducing messaging API into the gctoolkit-api module. The code to orchestrate the use of this new API can be found in [AbstractJavaVirtualMachine::analyze](https://github.com/microsoft/gctoolkit/blob/message/api/src/main/java/com/microsoft/gctoolkit/jvm/AbstractJavaVirtualMachine.java) and [GCToolKit::analyize](https://github.com/microsoft/gctoolkit/blob/message/api/src/main/java/com/microsoft/gctoolkit/GCToolKit.java). Note that the call to <code>analyze()</code> is synchronous. It should not return until the analysis is complete. For this to happen, the process needs to make use of an asynchronous Vert.x without knowing directly about it. Here is the code for AbstractJavaVirtualMachine::analyze.
<br/>

```
    public void analyze(List<Aggregation> registeredAggregations, JVMEventChannel eventBus, DataSourceChannel dataSourceBus) {
    
        Phaser finishLine = new Phaser();
        
        try {
            Set<EventSource> generatedEvents = diary.generatesEvents();
            for (Aggregation aggregation : registeredAggregations) {
                Constructor<? extends Aggregator<?>> constructor =
                        constructor(aggregation);
                        
                if ( constructor == null) continue;
                
                Aggregator<? extends Aggregation> aggregator =
                        constructor.newInstance(aggregation);
                        
                aggregatedData.put(aggregation.getClass(), aggregation);
                
                Optional<EventSource> source = 
                        generatedEvents.stream()
                                       .filter(aggregator::aggregates)
                                       .findFirst();
                if (source.isPresent()) {
                    finishLine.register();
                    aggregator.onCompletion(finishLine::arriveAndDeregister);
                    JVMEventChannelAggregator eventChannelAggregator = 
                        new JVMEventChannelAggregator(source.get().toChannel(),
                                                      aggregator);
                    eventBus.registerListener(eventChannelAggregator);
                }
            }
            
            dataSource.stream().
            forEach(message -> dataSourceBus.publish(Channels.DATA_SOURCE, message));
            finishLine.awaitAdvance(0);
            dataSourceBus.close();
            eventBus.close();

            // Fill in termination info.
            Optional<Aggregation> aggregation =
                    aggregatedData.values().stream().findFirst();
            aggregation.ifPresent(terminationRecord -> {
                setJVMTerminationTime(terminationRecord.timeOfTerminationEvent());
                setRuntimeDuration(terminationRecord.estimatedRuntime());
                setEstimatedJVMStartTime(terminationRecord.estimatedStartTime());
            });
        } catch (IOException | ClassCastException | 
                 InstantiationException | IllegalAccessException | 
                 InvocationTargetException e) {
            LOGGER.log(Level.WARNING, e.getMessage(), e);
        }
    }
```

<br/>
The first step is to create an Aggregator for all of the instances of Aggregation that have been loaded and registered by GCToolKit::analyze. Next, each Aggregator is tested to see if it will aggregates the events that will be generated by parsers. It is this type of metadata that is retained in the diary. If the Aggregator passes the test, then it is wrapped into a JVMEventChannelAggregator and registered as a listener on the event bus. Prior to registration, on onCompletion lambda is passed to the listener, This callback is to be executed when the JVMTerminatioin sentinal has been received by the Aggregator. This sets up the conditions to allow the main thread to wait until all of the messages have been processed.

After the setup has completed, the contents of the dataSource are streamed into a publish method. The main thread then blocks waiting for the phaser to reach the 0 state before being allowed to continue. The main thread finishes up with a little bit of book keeping before retuning control to GCToolKit and finally to the client code.

### How Does it Fail?
The GitHub log output shows us that the failure is in [GarbageCollectionEventSourceTest::testGZipTarFileLineCount](https://github.com/microsoft/gctoolkit/blob/message/vertx/src/test/java/com/microsoft/gctoolkit/vertx/io/GarbageCollectionEventSourceTest.java) where the receiver only managed to receive 407299 out of the expected 41055 messages. Let's run through the code to see if we can spot the problem.

The test in question streams the datasource through Vert.x to a listener that counts the number of lines it receives. There are several different tests each covering the different types of supported data sources. Strangely, all of the tests pass except for testGZipTarFileLineCount and testZipFileLineCount. As you can imagine, streaming data from a compressed file is a little more CPU intensive than streaming from a flat file. So maybe in this CPU constrained VM lines where not making it to the listener prior to the listener releasing the main thread so that it could inspect the results. But how, the logic to wait for the message queue to clear seemed bullet proof and Vert.x doesn't drop messages, especially in this configuration. Yet, messages were being missed. Lets look deeper into the code.

```
    private void assertExpectedLineCountInLog(int expectedNumberOfLines, GCLogFile logFile) {
        disableCaching();
        GCLogConsumer consumer = new GCLogConsumer();
        VertxDataSourceChannel channel = new VertxDataSourceChannel();
        channel.registerListener(consumer);
        try {
            logFile.stream().forEach(message -> 
                channel.publish(Channels.DATA_SOURCE, message));
        } catch (IOException e) {
            fail(e.getMessage());
        }
        consumer.awaitEOF();
        assertEquals(expectedNumberOfLines, observedNumberOfLines[0]);
        assertEquals(expectedNumberOfLines, consumer.getEventCount());
    }
```
<br/>
This test doesn't make use of of AbstractJavaVirtualMachine so it must manage Vert.x async calls on its own. The first step is to construct a VertxDataSourceChannel and register our GCLogConsumer listener. Next, the datasource is streamed, each line is counted and then published. Upon completion, the thread waits until the consumer has processed the JVMTermination event after which line number counts are asserted. Note that it is the last assertion that fails.
<br/>

```
    private final CountDownLatch eof = new CountDownLatch(1);
    private int eventCount = 0;

    @Override
    public void receive(String payload) {
        eventCount++;
        if ( END_OF_DATA_SENTINEL.equals(payload)) {
            eof.countDown();
        }
    }
    
    public void awaitEOF() {
        try {
            eof.await();
        } catch (InterruptedException e) {
            Thread.interrupted();
            fail(e);
        }
    }
```
<br/>
The receive() method counts the line and if a line signals JVMTermination, then the latch is decremented which releases the main thread that should be blocked on the await() call. What can be reasoned is that this test should be deadlocked if the listener never receives the JVMTermination signal. This is a huge clue to what is going on that I completely overlooked. This clue implies that all of the lines are coming from the file and are being published. Thus the listener is receiving the JVMTermination sentinel. It also tells us that all of the lines at the end of the file were being counted. The logical conclusion is that the the listener is not receiving the lines at the beginning of the file. This implies that the data is being streamed before the listener is ready to receive them. Looking at this code this doesn't seem possible. Yet here we are.

Now recall, Vert.x is async, the message sends are async, shutdown is async and, startup is async. The async startup in the 2 core environment was slow enough that it was missing the initial set of published messages. Ouch! The kicker in all of this is that in the middle of AbstractVirtualMachine::analyze I had written in a comment, wait for Vert.x verticles to start and I was sure that I'd put code into the verticles to make sure they had started before I started streaming messages to them. Let's take a look to see what went wrong.

### Starting Vert.x
<br/>

```
public class VertxDataSourceChannel extends VertxChannel implements DataSourceChannel {

    @Override
    public void registerListener(DataSourceParser listener) {
        final DataSourceVerticle processor = 
            new DataSourceVerticle(vertx(), listener.channel().getName(), listener);
        vertx().deployVerticle(processor, 
                state -> processor.setID((state.succeeded()) ? state.result() : ""));
    }
```
</br>
In the registerListener method, the callback handler passed to deployVerticle sets the state ID once the verticle has been deployed. Do note that this Handler is a lambda and that implies that it may or may not be executed sometime in the future. Meanwhile, the calling thread is free to progress. We don't want the calling thread to progress because in this case that translates to "start publishing messages now".
<br/>

```
public class DataSourceVerticle extends AbstractVerticle {

    private static final Logger LOGGER = Logger.getLogger(DataSourceVerticle.class.getName());

    final private Vertx vertx;
    final private String inbox;
    private String id;
    final private DataSourceChannelListener processor;


    public DataSourceVerticle(Vertx vertx, String channelName, DataSourceChannelListener listener) {
        this.vertx = vertx;
        this.inbox = channelName;
        this.processor = listener;
    }

    public void setID(String id) {
        this.id = id;
    }

    @Override
    public void start(Promise<Void> promise) {
        try {
            vertx.eventBus().<String>consumer(inbox, message -> {
                processor.receive(message.body());
                if (GCLogFile.END_OF_DATA_SENTINEL.equals(message.body())) {
                    vertx.undeploy(id);
                }
            });
            promise.complete();
        } catch(Throwable t) {
            LOGGER.log(Level.WARNING,"Vertx: processing DataSource failed",t);
        }
    }
```
<br/>
In this piece of code, the Vert.x message handler is registered with the call to the consumer method. The promise is completed after the registration. On the surface, this looks ok but remember, Vert.x is async and the registration of the consumer may not be complete when the promise is completed. Thus we end up breaking the promise. To fix this we need to wait until the registration process is complete prior to completing the promise and that is what happens in the code below with the addition of the completionHandler lambda.
<br/>

```
    @Override
    public void start(Promise<Void> promise) {
        try {
            vertx.eventBus().<String>consumer(inbox, message -> {
                processor.receive(message.body());
                if (GCLogFile.END_OF_DATA_SENTINEL.equals(message.body())) {
                    vertx.undeploy(id);
                }
            }).completionHandler(result -> {promise.complete();});
        } catch(Throwable t) {
            LOGGER.log(Level.WARNING,"Vertx: processing DataSource failed",t);
        }
    }
```
<br/>
Fixing registerListener() was a little more involved as a CountDownLatch was added along with the logic to ensure that countDown is called after the verticle has deployed.
<br/>
```
    public void registerListener(DataSourceParser listener) {
        final DataSourceVerticle processor = 
            new DataSourceVerticle(vertx(), listener.channel().getName(), listener);
        CountDownLatch latch = new CountDownLatch(1);
        vertx().deployVerticle(processor, state -> {
            processor.setID((state.succeeded()) ? state.result() : "");
            latch.countDown();
        });
        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.interrupted();
        }
    }
```
<br/>
The same code fixes were applied to [JVMEventVerticle](https://github.com/microsoft/gctoolkit/blob/message/vertx/src/main/java/com/microsoft/gctoolkit/vertx/JVMEventVerticle.java) and [VertxJVMEventSourceChannel](https://github.com/microsoft/gctoolkit/blob/message/vertx/src/main/java/com/microsoft/gctoolkit/vertx/VertxJVMEventChannel.java).

<br/>
Code is committed, pushed and now the release party is a go! Ok, the explanation is easy, debugging required a shift in how I was thinking about the problem. If one is tunneled on a problem making that shift in thinking isn't easy but it's often the only way to get to the root of the problem.
<br/>

### A Nice Find Along the Way

As an aside, one of the tools that I was pointed while trying to debug the problem was [act](https://github.com/nektos/act). Act enables you to run GitHub actions in docker on your local machine. Unfortunately, I didn't manage to get it to work as it failed on a failure to setup cache. Other then the cache issue, which I'm sure I'll sort out with a wee bit more digging, the tool looked very promising as it was easy to install, easy to configure and easy to run. If anyone has an idea for the cache issue, I'm all ears. Otherwise I'll post a solution once it's sorted.

### Conclusion
While the cause of the failure was rooted in the handling of the async nature of Vert.x, the more interesting aspect of this saga was that having more cores hid the problem. The tests passed because more cores allowed the async registrations to occur before the main thread started publishing. This was not the case in the limited core VM where the main thread managed to start publishing well before the registration of the handlers completed. Also, it's been a while since I had written async code and this was a harsh reminder that debugging it can take a surprising amount of time. And, why should I expect anyone to read my comments if I don't read them myself. ;-)