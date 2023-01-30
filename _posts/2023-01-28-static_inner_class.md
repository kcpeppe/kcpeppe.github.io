---
layout: post
comments: true
title:  "Static inner class"
excerpt: "How my smoke tests failed because of inner class visibility"
date:   2023-01-21 13:30:00 +0900
categories: [java]
tags: [Java]
---

An inner class in Java is a class that is declared within the context of another class, otherwise known as an outer class. One of the nice things that inner classes is that they tend to improve the organization and readability of the code. It is for this reason I decided to use an inner class for the integration smoke testing found in [PreunifiedJavaVirtualMachineConfigurationTest](https://github.com/microsoft/gctoolkit/blob/main/IT/src/test/java/com/microsoft/gctoolkit/integration/core/PreunifiedJavaVirtualMachineConfigurationTest.java). Here is the relevant code fragments from my first implementation of that class.

```
public class PreunifiedJavaVirtualMachineConfigurationTest {

    private String logFile = "preunified/g1gc/details/tenuring/180/g1gc.log";
    private int[] times = { 0, 1028, 945481, 945481};

    @Test
    public void testSingle() {
        TestLogFile log = new TestLogFile(logFile);
        smokeTest(new SingleGCLogFile(log.getFile().toPath()), times);
    }

    private void smokeTest(GCLogFile log, int[] endStartTimes ) {
        GCToolKit gcToolKit = new GCToolKit();
        gcToolKit.loadAggregationsFromServiceLoader();
        TestTimeAggregation aggregation = new TestTimeAggregation();
        gcToolKit.registerAggregation(aggregation);
        JavaVirtualMachine machine = null;
        try {
            machine = gcToolKit.analyze(log);
            aggregation = machine.getAggregation(
                             PreunifiedJavaVirtualMachineConfigurationTest.TestTimeAggregation.class).get();
        } catch (IOException e) {
            fail(e.getMessage());
        }

        try {
            machine.getEstimatedJVMStartTime();
            machine.getTimeOfFirstEvent().getTimeStamp();
            aggregation.timeOfTerminationEvent().getTimeStamp();
            aggregation.estimatedRuntime();
        } catch(Throwable t) {
            fail("Failed to extract runtime timing information",t);
        }

        Assertions.assertEquals( endStartTimes[0], (int)(machine.getEstimatedJVMStartTime().getTimeStamp()*1000.0d));
        Assertions.assertEquals( endStartTimes[1], (int)(machine.getTimeOfFirstEvent().getTimeStamp()*1000.0d));
        Assertions.assertEquals( endStartTimes[2], (int)(aggregation.timeOfTerminationEvent().getTimeStamp()*1000.0d));
        Assertions.assertEquals( endStartTimes[3], (int)(aggregation.estimatedRuntime() * 1000.0d));
    }

    @Aggregates({EventSource.G1GC,EventSource.GENERATIONAL,EventSource.ZGC,EventSource.SHENANDOAH})
    public class TestTimeAggregator extends Aggregator<TestTimeAggregation> {

        /**
         * Subclass only.
         *
         * @param aggregation The Aggregation that {@literal @}Collates this Aggregator
         * @see Collates
         * @see Aggregation
         */
        public TestTimeAggregator(TestTimeAggregation aggregation) {
            super(aggregation);
        }
    }

    @Collates(TestTimeAggregator.class)
    public class TestTimeAggregation extends Aggregation {

        public TestTimeAggregation() {}

        @Override
        public boolean hasWarning() {
            return false;
        }

        @Override
        public boolean isEmpty() {
            return false;
        }

    }
}
```
<br/>
The flow of the test is to create an instance of GCToolKit, , load all the aggregations using the module API,
register an instance of the inner class, PreunifiedJavaVirtualMachineConfigurationTest.TestTimeAggregation, and analyze
the supplied GC log before running our supplied aggregation through a set of tests. It goes without saying that the first run of the test
failed. Lets use a minimal prototype to understand why.

```
public class A {

    public static void main(String[] args) {
        C c = new C();
        c.register(A.B.class);
        c.analyze();
    }

    class B implements I {
        public String toString() {
            return "This is an instance of A$B";
        }
    }
}


```

As you may have noticed, the definition for TestTimeAggregation private. The reason for this is that using private for this inner class limits
its visibility to the outer class. This expresses the intent that this inner-class is specifically intended to only
work with this outer class. The test fail on the call to the method getAggregation(PreunifiedJavaVirtualMachineConfigurationTest.TestTimeAggregation.class).get().
This is unexpected because the aggregation has been explicitly registered only four lines above.

Checking the registration code doesn't yield any clues as to what might have happened. The next step was to look at the analyze method
in AbstractJavaVirtualMachine

```
    public interface I {}
    
    public void analyze(List<Aggregation> registeredAggregations,
                JVMEventChannel eventBus,
                DataSourceChannel dataSourceBus) {
        Phaser finishLine = new Phaser();
        try {
            Set<EventSource> generatedEvents = diary.generatesEvents();
            for (Aggregation aggregation : registeredAggregations) {
                Constructor<? extends Aggregator<?>> constructor = constructor(aggregation);
                if ( constructor == null) continue;
                Aggregator<? extends Aggregation> aggregator = constructor.newInstance(aggregation);
                aggregatedData.put(aggregation.getClass(), aggregation);
                Optional<EventSource> source = generatedEvents.stream()
                    .filter(aggregator::aggregates).findFirst();
                if (source.isPresent()) {
                    finishLine.register();
                    aggregator.onCompletion(finishLine::arriveAndDeregister);
                    JVMEventChannelAggregator eventChannelAggregator = new JVMEventChannelAggregator(
                    source.get().toChannel(), aggregator);
                    eventBus.registerListener(eventChannelAggregator);
                }
            }
            dataSource.stream().forEach(message -> dataSourceBus.publish(ChannelName.DATA_SOURCE, message));
            finishLine.awaitAdvance(0);
            dataSourceBus.close();
            eventBus.close();

            // Fill in termination info.
            Optional<Aggregation> aggregation = aggregatedData.values().stream().findFirst();
            aggregation.ifPresent(terminationRecord -> {
                setJVMTerminationTime(terminationRecord.timeOfTerminationEvent());
                setRuntimeDuration(terminationRecord.estimatedRuntime());
                setEstimatedJVMStartTime(terminationRecord.estimatedStartTime());
            });
        } catch (IOException | ClassCastException | 
                 InstantiationException | IllegalAccessException | InvocationTargetException e) {
            LOGGER.log(Level.WARNING, e.getMessage(), e);
        }
    }
```
<br/>
In this method the first step is to filter out the aggregations that do not collate the events produced by the data source 
(as reported on by the diary). To do this, we need to create an instance of the aggregator and that is the step that fails
in this case. The constructor() was not able to find the zero argument constructor for PreunifiedJavaVirtualMachineConfigurationTest.TestAggregator.
To understand why, lets create a much smaller exemplar of the code above.

```
public class A {

    public static void main(String[] args) {
        C c = new C();
        c.register(A.B.class);
        c.analyze();
    }

    class B implements I {
        public String toString() {
            return "This is an instance of A$B";
        }
    }
}

public class C {

    Class<? extends I> targetClazz;

    public void register(Class<? extends I> clazz) {
        this.targetClazz = clazz;
    }

    private Constructor<? extends I> constructor(Class<? extends I> targetClazz) {
        Constructor<?>[] constructors = targetClazz.getConstructors();
        if ( constructors.length == 0)
            System.out.println("Unable to find a constructor to check");
        for ( Constructor<?> constructor : constructors) {
            Parameter[] parameters = constructor.getParameters();
            if ( parameters.length == 0)
                return (Constructor<? extends I>)constructor;
        }
        System.out.println("unable to find a matching constructor");
        return null;
    }

    public void analyze() {
        try {
            Constructor<? extends I> constructor = constructor(targetClazz);
            if ( constructor == null)
                System.out.println("This didn't work");
            else {
                I anInstance = constructor.newInstance();
                System.out.println(anInstance.toString());
            }
        } catch (InstantiationException | IllegalAccessException | InvocationTargetException  e) {
            e.printStackTrace();
        }
    }
}

```
<br/>
Running the test fails with the message "Unable to find a constructor to check". As expected, adding B(){} to class B
fails to fix the problem. At issue is the visibility of the constructor. Running the test after making B() public fails on the next
problem in that the code is "unable to find a matching constructor". This message is also produced in the case there the inner-class
declaration is changed to public class B. In this case the constructor can be removed.


### What are the visibility rules?
<br/>
Here is some code to expose the visibility of the inner class and the constructor in A.B.

```
    public static void main(String[] args) {
        int modifiers = B.class.getModifiers();
        System.out.println("Class visibility: " + Modifier.toString(modifiers));
        Constructor[] constructors = B.class.getConstructors();
        for ( Constructor constructor : constructors) {
            System.out.println("Constructor Visibility: " + Modifier.toString(constructor.getModifiers()));
        }
    }
```
If we run this code with public class B without a constructor, the output is "Class visibility: public" and
"Constructor visibility: public". When the code is run wth B declared with package visibility, the output is "Class visibility:".
The constructor visibility message is absent. All classes come with a default constructor so why isn't it being found? The answer
is, the getConstructor method only returns public constructors. The rule at work is that the default constructor will take on the
visibility of the class. To see this, lets add a public default constructor. Now the output is "Class visibility:" and 
"Constructor Visibility: public".

The call that should be used to get to non-public constructors is getDeclaredConstructors. Let's remove the declared
constructor in B and change the test code to use the getDeclaredConstructor method. The output is now as expected, "Class visibility:"
and "Constructor Visibility:". This result confirms our understanding of the visibility rules for the default constructor.

Since GCToolKit is using the getConstructor() methods, the visibility of the constructor needs to be public. It is very likely
the case that the visibility of the aggregator/aggregation also needs to be public for the analyze method to see your implementations.

### On to the next problem
<br/>
Now that the visibility has been sorted, time to sort out why a matching constructor cannot be found. To do so, let's add some
debug code to class C.

```
        for ( Constructor<?> constructor : constructors) {
            Parameter[] parameters = constructor.getParameters();
            if ( parameters.length == 0)
                return (Constructor<? extends I>)constructor;
            else {
                for( Parameter parameter : parameters)
                    System.out.println(parameter.toString());
            }
```
<br/>
Running the code produces the output, "com.kodewerk.inner.A arg0". It appears as if the only constructor in B accepts A an
argument. The explanation as to why is that in order to give B visibility to A, the corresponding instance of the outer class must be passed
into B. To do this, the constructor generated by the compiler injects a parameter into the constructors list of arguments.
This form of code manipulation by the Java compiler is quite common and in this case it either has to be accounted for in
the code searching for the constructor or, we have to get the compiler to generate code that isn't passed in the outer context.
One of the differences between a static and non-static inner class is that the static inner class does not have access to its enclosing outer class.
Consequently, there is no requirement for the compiler to inject the outer-context into the inner one. The answer to our second problem
is to make B a static inner class. Running the fixed code yields the expected message, "This is an instance of A$B".

### Back to GCToolKit
<br/>
It pretty clear now that the fix to the PreunifiedJavaVirtualMachineConfigurationTest test is to declare both 
the supporting inner classes to be static. If the visibility is limited to protected or package, then a public constructor
will need to be declared. That said, the only practical option is to make the inner class public.