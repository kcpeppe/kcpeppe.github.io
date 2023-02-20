---
layout: post
comments: true
title:  "GCToolKit End-to-End Module/Classpath Integration Testing"
excerpt: "This is a solution to support both module and classpath testing in the same maven module."
date:   2023-02-20 11:00:00 +0900
categories: [java]
tags: [Java, JUnit, Maven]
---

<br/>
Up until release 3.0.1, GCToolKit needed to be on the module path. This is because the assembly of the pipeline from GCLog to Aggregation made use of the module SPI to find implementations of the interfaces defined in the gctoolkit-api module. One of the more interesting aspects of adding this capability had to do with testing. This is a short description of the hows and whys of testing was setup for GCToolKit.

<br/>
### End-to-End Integration Testing with Modules
<br/>
One of the difficulties that needed to be solved as part of the original modularization work was how to execute the end to end integration tests. These tests needed to be run with GCToolKit on the module path. At time that this was being looked at, there wasn't a ton of guidance. The first thing I did was pull out my copy of Sander Mak and Paul Bakker's excellent book, [Java 9 Modularity](https://https://javamodularity.com/). While I found the book extremely useful for tips useful for development, there isn't so much in there on testing. However there was enough to suggest that the test should reside in their own module. Configuring surefire to run these tests was as follows.

```
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <useModulePath>true</useModulePath>
        <!-- todo: Hack to deal with surefire deficiency -->
        <argLine>--add-modules=ALL-MODULE-PATH</argLine>
    </configuration>
</plugin>
```
<br/>

### Testing with classpath or modulepath
<br/>
The introduction of the api to allow GCToolKit to run on the classpath came the need to run end-to-end integration tests that only made use of the classpath. The complication to achieve this is with surefire. As you can see, the above configuration of surefire puts everything on the module-path in lieu of the classpath. The question now becomes, how can the classpath testing be configured. The first thought was to add a new integration module where the surefire plugin is configured to use the classpath. What didn't sit well with this solution was the noise to signal. In other words, a large number of artifacts were about to be added to the project for a few tests. Surely there was a way to keep all of the integration tests in the IT module.

The next obvious solution was to use profiles. Again, this didn't feel like the right solution as it shifted the responsibility to ensure all tests were run from maven to the maintainers. What ever solution was implemented, it felt necessary to be able to run all this tests using <code>./mvnw test</code>. With this idea in the bin it was back to the drawing board.

### Enter Maven executions and JUnit @TAG annotations
<br/>
One of the features of the Surefire plugin is the ability to filter JUnit tests that have been annotated with @TAG. The code below is an example of the annotation.

```
@Tag("modulePath")
public class EndToEndIntegrationTest {

    @Test
    public void testMain() {
        Path path = new TestLogFile("cms/defnew/details/defnew.log").getFile().toPath();
        analyze(path.toString());
        Assertions.assertEquals(26, getInitialMarkCount());
        Assertions.assertEquals(26, getRemarkCount());
        Assertions.assertEquals(19114, getDefNewCount());
    }
```
<br/>
The annotation can be applied to a method or to the entire class. In this case the tag is annotated with modulePath. The tests requiring the classpath were annotated with <code>@Tag("classPath")</code>. The next step was to configure SureFire to execute the tests in separate execution clauses filtered by these annotations. This configuration below shows this configuration.

```
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <executions>
        <execution>
            <id>modulePath</id>
            <goals>
                <goal>test</goal>
            </goals>
            <configuration>
                <useModulePath>true</useModulePath>
                <groups>modulePath</groups>
            </configuration>
        </execution>
        <execution>
            <id>classPath</id>
            <goals>
                <goal>test</goal>
            </goals>
            <configuration>
                <useModulePath>false</useModulePath>
                <groups>classPath</groups>
            </configuration>
        </execution>
    </executions>
</plugin>
```
<br/> 
The configuration above defines the two needed execution blocks each will be run when with the test lifecycle goal. The groups tag is a regex that will be used to find tests that should be run with each execution.

### Tests Fail to Run
<br/>
With all of the configuration "done", it was time to build. The first run of the script failed to run any of the tests. After some more research it was discovered that maven executes an implicit <code>default-test</code> execution. In the case of the initial surefire configuration, the <code>default-test</code> makes up the body of the clause. This doesn't change if execution clauses are defined within the body of the surefire plugin. Thus in the configuration above, the <code>default-test</code> executes nothing. Furthermore, the defined execution blocks are not executed. To solve this, one needs to override the <code>default-test</code> block with the skip clause set to true. Note, this has to be the first definition in the <code>executions</code> clause.

```
<execution>
   <id>default-test</id>
   <configuration>
      <skip>true</skip>
   </configuration>
</execution>
```
<br/>
And with this final configuration in place, <code>./mvnw test</code> successfully runs all of the tests.


### Conclusion
What is important here is that the complications of having to test using two different modes is almost completely hidden in the details of the surefire configuration. As simple as that pom looks, the trickiness was that it never just sort of worked. Instead, the build went on as if the pom had not been edited at all! This complicated the debugging process. To make matters worse, there isn't a lot of documentation on how to set this up. The simple pom shown above is the result of piecing together several tidbits of information gathered from several different sources followed by a cleanup. It also made it clear what while the documentation and tooling support for the Java Platform Module System (JPMS) is getting better, it's still not quite there. Also, we need better test coverage in GCToolKit so if you want to add a test, please add and an issue and send us a PR. In the meantime, gen-Z parsing is on deck.