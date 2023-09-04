---
layout: post
comments: true
title:  "Code Without Branching?"
excerpt: ""
date:   2023-09-04 11:00:00 +0900
categories: [java]
tags: [Java, benchmarking, JMH, C++]
---

I started writing this just after returning from what started out as an easy paddle on my paddle board. I started out going into the wind as I generally do so that I'd have an easier trip back. But, as we all know, winds do as they please and today, they decided to change direction and stiffen to the point where at times it seemed as if I wasn't making any forward progress. I was following the shoreline which is dotted with many different beaches which would have made it easy to abandon as I could have walked back to my car but I figured, as long as I’m making some forward progress I’ll just keep paddling. With about 200 meters to turn leaving me perpendicular to the wind and waves. Of course I was hit by a series of large waves. The board yawed counter clockwise and rolled down to the right. Just as quickly it yawed clockwise and rolled down to the left. Before I could recover from that the next wave crashed in causing the exact same motion and at that point I was in the water. As I’m coming up I found that I couldn’t reach the surface. It took a moment for me to realize that the wind had blown the board over my head and that was preventing me from surfacing. Once sorted, I climbed back on the board and completed what was supposed to be a 45 minute relaxing tour into a 90 minute adventure. Turns out, my paddle was a premonition of the fun I was about to have benchmarking branchless coding techniques in C and then looking at how well it translated to Java.

<br/>
### Branchless Code
<br/>
The easiest way to answer the question, what is branchless code is by looking at some code. Let's start a branching code example.
<br/>

```
int maxWithBranch(int a, int b) {
  if ( a > b)
    return a;
  else
    return b;
}
```
<br/>
This code really needs to introduction but here it is. This function takes two integer arguments and compares them If a is greater than b, return a else return b. The pseudo-code for this looks something like

```
compare a,b
jump gt #IF
jump #ELSE
#IF
return a
#ELSE
return b
```
<br/> 
The issue here is that the jump, for many reasons, can take an unpredictable amount of time to complete. It used to be that an if would prevent the code from being vectorized. Thus coming up with a way of avoiding the branch would be the difference between running in scalar (slow) or vector (fast) mode. Even now, avoiding the branch can result in decent performance wins. The function below is a branchless refactoring of the code above.


```
int maxWithNoBranch(int a, int b) {
  return (a * (a > b)) + (b * (b >= a));
}
```
<br/>
In this function if (a > b) evaluates to true, then then (b >= a) will be false. C/C++ represents true as 1 and false as 0. Because C/C++ is loosely typed, we can multiply the boolean with an integer and in the code above, either the a or b but not both will survive the calculation. It is the  addition that returns the survivor. Is the branchless version is faster and if so, fast enough to warrant the obfuscation? To answer that I wrote a microbenchmark.

```
clock_t timeWithBranch(int a, int b) {
    int max = 0;
    clock_t start = clock();
    for (int i = 0; i < 2000000; i++) {
       max += maxWithBranch(a,b);
    }
    clock_t end = clock();
    return end - start;
}

clock_t timeWithNoBranch(int a, int b) {
    int max = 0;
    clock_t start = clock();
    for (int i = 0; i < 2000000; i++) {
       max += maxWithNoBranch(a,b);
    }
    clock_t end = clock();
    return end - start;
}

int main(int argc, char **argv) {
    int a, b;

    a = (argc == 2) ? stoi(argv[0]) : 6;
    b = (argc == 2) ? stoi(argv[1]) : 7;

    int trials = 5;
    for (int i = 0; i < trials; i++)
        std::cout << "Time with Branch: " << timeWithBranch(a,b) << "\n";
    for (int i = 0; i < trials; i++)
        std::cout << "Time with no Branch: " << timeWithNoBranch(a,b) << "\n";
    return 0;
}
```

The code takes in two numbers and runs a trial 5 times. The trial calls the max methods 2,000,000 times. These are the results.

<table>
<tr><td>Test</td><td>Min</td><td>Mid</td><td>Max</td></tr>
<tr><td>Time with Branch</td><td>6504</td><td>7023</td><td>7715</td></tr>
<tr><td>Time with no Branch</td><td>5087</td><td>5688</td><td>6192</td></tr>
</table>

As you can see, the branchless code is faster but not by all that much. Why? Modern CPUs have some form of branch prediction. This allows the processor to predict the most likely path thus reducing the time taken to complete a full on if-then-else block. Suddenly, the wind has just shifted as the benchmark now has to do things to minimize the effects of micro-optimizations on our micro-benchmark.

The way to break predicability is to offer up a randomized set of inputs. Below is the refactored main function.

```
int main(int argc, char **argv) {
    int values[2000001];

    for (int i = 0; i < 2000001; i++)
        values[i] = rand() % 100;

    int trials = 5;
    for (int i = 0; i < trials; i++)
        std::cout << "Time with Branch: " << timeWithBranch(values) << "\n";
    for (int i = 0; i < trials; i++)
        std::cout << "Time with no Branch: " << timeWithNoBranch(values) << "\n";

    return 0;
}
```

While using random values may eliminate branch prediction from the calculation, it adds the cost of iterating through an array. Fortunately there is another CPU optimization known as pre-fetching that predicts what data will be used and loads it before it is needed. Since we are striding through an array in a regular monition, the CPU should be able to preload it hopefully minimizing the "noise" in our benchmarking results.

<table>
<tr><td>Test</td><td>Min</td><td>Mid</td><td>Max</td></tr>
<tr><td>Time with Branch</td><td>12197</td><td>13599</td><td>17708</td></tr>
<tr><td>Time with no Branch</td><td>5143</td><td>5267</td><td>5337</td></tr>
</table>


As can be seen here, using randomized values made a huge difference. While we can assume it’s branch prediction that made the difference I'm not feeling so comfortable with the results and the only way to ease that feeling is to scratch under the surface a wee bit.

In my experience it has always been a useful exercise to look at the system to identify what is being tested vs what is needed to run the test. That is, what is the Unit of Test (UoT) and what is test harness. In this case the UoTs are the max methods and everything else is test harness. The next question is, what is being timed? Let's look at the timeWithNoBranch as an exemplar.

```
clock_t timeWithNoBranch(int *values) {
    int max = 0;
    clock_t start = clock();
    for (int i = 0; i < 2000000; i++) {
       max += maxWithNoBranch(values[i],values[i+1]);
    }
    clock_t end = clock();
    return end - start;
}
```

The clock encompasses a for loop, a method call as well as two array lookups. I’m guessing that the array lookups are all pre-fetched so that cost should be close to 0. However, the method call and the branch back at the end of the loop will not be so cheap. While we can argue as to wither or not the function call is part of the UoT or not, the loop is definitely not part of the UoT. Let's see if we can get an estimate of the cost of the loop by unrolling it by hand.

```
clock_t timeWithNoBranch(int *values) {
    int max = 0;
    clock_t start = clock();
    for (int i = 0; i < 500000; i++) {
       max += maxWithNoBranch(values[i],values[i+1]);
       max += maxWithNoBranch(values[i+1],values[i+2]);
       max += maxWithNoBranch(values[i+2],values[i+3]);
       max += maxWithNoBranch(values[i+3],values[i+4]);
    }
    clock_t end = clock();
    return end - start;
}
```

Unrolling the loop by a factor of 4 yields 500,000 loop back events instead of 2,000,00. The results show that both tests benefit but the head scratcher is the massive improvement with the branch results.

<table>
<tr><td>Test</td><td>Min</td><td>Mid</td><td>Max</td></tr>
<tr><td>Time with Branch</td><td>6852</td><td>7096</td><td>6935</td></tr>
<tr><td>Time with no Branch</td><td>4283</td><td>4567</td><td>4866</td></tr>
</table>

And of course, switching the order of the tests yielded completely different results in this case likely because of changes in alignment.

<table>
<tr><td>Test Reversed</td><td>Min</td><td>Mid</td><td>Max</td></tr>
<tr><td>Time with Branch</td><td>5652</td><td>6205</td><td>6844</td></tr>
<tr><td>Time with no Branch</td><td>5310</td><td>6257</td><td>6935</td></tr>
</table>
Time with no Branch: Min: 5310, Mid: 6257, Max: 6935


Now the headwinds have picked up considerably let's work on stabilizing the numbers by playing with the number and size of the trials. After a bit of playing about, the value of 2x10 trials seems to do the trick as running the test in reverse order no longer affects the results.

<table>
<tr><td>Test</td><td>Min</td><td>Mid</td><td>Max</td></tr>
<tr><td>Time with Branch</td><td>5189</td><td>5258</td><td>5425</td></tr>
<tr><td>Time with no Branch</td><td>3789</td><td>3831</td><td>3952</td></tr>
</table>
<table>
<tr><td>Test Reversed</td><td>Min</td><td>Mid</td><td>Max</td></tr>
<tr><td>Time with no Branch</td><td>3788</td><td>3903</td><td>4007</td></tr>
<tr><td>Time with Branch</td><td>5217</td><td>5302</td><td>5724</td></tr>
</table>


Since unrolling the loop to a level of 4 provided some relief, let see how far we can push it.


<table>
<tr><td>Unrolled to 8</td><td>Min</td><td>Mid</td><td>Max</td></tr>
<tr><td>Time with Branch</td><td>3188</td><td>3267</td><td>3378</td></tr>
<tr><td>Time with no Branch</td><td>3752</td><td>3826</td><td>3902</td></tr>
</table>
<table>
<tr><td>Unrolled to 16</td><td>Min</td><td>Mid</td><td>Max</td></tr>
<tr><td>Time with no Branch</td><td>3606</td><td>3669</td><td>3717</td></tr>
<tr><td>Time with Branch</td><td>9629</td><td>9703</td><td>10029</td></tr>
</table>

The results show a win with 8 but a regression when using 16. What happened when the loop was unrolled from 8 to 16? Very likely the branch back resulted in a code cache miss causing the processor to stall while the code cache was being refreshed.

Finally, the C++ compiler comes with a number of optimization levels. The tests for far have been using the default level. Let’s compile with O3 and to see what effect that might have on the results.

<tr><td>Compiled with -O3</td><td>Min</td><td>Mid</td><td>Max</td></tr>
<tr><td>Time with no Branch</td><td>0</td><td>o</td><td>2</td></tr>
<tr><td>Time with Branch</td><td>0</td><td>0</td><td>2</td></tr>
</table>

These results were obtained using the version of the code where the loops had not been unrolled.

### What just happened? 

While the no-branch code did run 17% faster on the unoptimized version once all of the effects of microbenchmarking were minimized, the optimizing compiler yielded much much better results. In fact so much better it feels as the compiler just might have optimized away the entire UoT. To ensure this hasn’t happened it’s time to look at the assembly produced by running g++ on my MacBook Pro with an M1 CPU.

```
	.globl	__Z13maxWithBranchii            ; -- Begin function _Z13maxWithBranchii
	.p2align	2
__Z13maxWithBranchii:                   ; @_Z13maxWithBranchii
	.cfi_startproc
; %bb.0:
	cmp	w0, w1
	csel	w0, w0, w1, gt
	ret
	.cfi_endproc
                                        ; -- End function
	.globl	__Z15maxWithNoBranchii          ; -- Begin function _Z15maxWithNoBranchii
	.p2align	2
__Z15maxWithNoBranchii:                 ; @_Z15maxWithNoBranchii
	.cfi_startproc
; %bb.0:
	cmp	w0, w1
	csel	w0, w0, w1, gt
	ret
	.cfi_endproc
                                        ; -- End function
```                                        

This confirms that the functions haven’t been compiled out of the code. A quick scan of the timing code (not shown here) confirms that these functions are called. While that didn't come as a surprise, the shock was that the optimized code for both methods is identical.

If you talk to a compiler developer they will tell you that they will optimize away this type of if-else block whenever they recognize that they can. That explains how the branching version of the method has been optimized to a branchless version. What is doesn't explain is how the branchless version was reduced to <b>the exact same code</b>. It made me curious to see if g++ on Intel would produce a similar result.

```

        .globl  _Z13maxWithBranchii
        .type   _Z13maxWithBranchii, @function
_Z13maxWithBranchii:
.LFB1617:
        .cfi_startproc
        endbr64
        cmpl    %esi, %edi
        movl    %esi, %eax
        cmovge  %edi, %eax
        ret
        .cfi_endproc
.LFE1617:
        .size   _Z13maxWithBranchii, .-_Z13maxWithBranchii
        .p2align 4
        .globl  _Z15maxWithNoBranchii
        .type   _Z15maxWithNoBranchii, @function
_Z15maxWithNoBranchii:
.LFB1618:
        .cfi_startproc
        endbr64
        xorl    %edx, %edx
        cmpl    %esi, %edi
        movl    %edx, %eax
        cmovg   %edx, %esi
        cmovg   %edi, %eax
        addl    %esi, %eax
        ret
        .cfi_endproc
.LFE1618:
        .size   _Z15maxWithNoBranchii, .-_Z15maxWithNoBranchii
        .p2align 4
```

The answer appears to be no. While the branch has been removed from the branching function, the branchless version has not been reduced. I was guessing that the no-branch version of the function would be slower given the extra instructions. But, the benchmark showed no appreciable difference in performance.

### What about Java?

The Java compiler does very little in the way of optimizing the code. Instead the effort has been directed at the Just In Time (JIT) HotSpot compilers. The JIT compilers will optimize the code while being directed by profiling data obtained from the runtime. I suspected that these optimization would wipe out any benefits we might have seen in the C/C++ code. Lets put that hypothesis to the test.

The first problem is how to translate the code. Unlike Java, C/C++ is loosely typed in that it allows for all kinds of crazy assignments that may or may not make sense. In Java we cannot multiply a boolean and an integer thus we need to do something else. Let's work through the logic to see what can be done.

#### Deriving Java Compatible Logic

The obvious trick would be to subtract b from a and then multiply by the sign. That is, if a is bigger than b then the sign will be +. This seems to work until you get to MIN_INTEGER - any positive value. In this case, the integer being a 32 bit value will wrap and the answer will be + instead of -. One solution would be to cast the int to a long and then perform the calculation. Of course that will only work for int and if we’re working with long we’ll have to come up with a different solution. Let’s try to setup a logic table to see what we can work out.

<table>
<tr>
<td>a</td><td>b</td><td>a - b</td><td>result</td></tr>
<td>+</td><td>+</td><td>+</td><td>a</td></tr>
<td>+</td><td>+</td><td>-</td><td>b</td></tr>
<td>-</td><td>-</td><td>-</td><td>a</td></tr>
<td>-</td><td>-</td><td>+</td><td>b</td></tr>
<td>+</td><td>-</td><td>n/a</td><td>a</td></tr>
<td>-</td><td>+</td><td>n/a</td><td>b</td></tr>
</table>


This can be reduced to the following observations. If the signs are the same, then the result of the subtraction can be trusted. The signs are different, the positive value should always be taken. Let’s see if we can translate this to code.

From the description above the obvious step is to separate the problem into two parts, one where the signs are the same and one where they are different. Lets calculate a 0 for when a should be selected and a 1 when b is the answer.

```

        int signa = a >>> 31;
        int signb = b >>> 31;
        int differentSign = signa ^ signb;
```        

The value for differentSign will be 1 for when the signs are different and 0 for when they are the same. Next let’s calculate the value to return if the signs are the same. As we deduced from the table above, is the signs are the same then all we need to do is determine the sign of the subtraction of the two values.

```
        int sameSignAnswer = (1 - differentSign) * ((a-b) >>> 31);
```

The next step is to calculate the value for when the signs are different. In this case we always want to take the positive value. Again, subtracting the signs will give us this information. If b is positive than a will be negative and the value of the subtraction will be 1. If a is positive than b will be negative and the sign of the subtraction will be 0.


```
        int differentSignAnswer = ((signb - signa) >>> 31) * differentSign;
```

The final answer is the sum of the two parts.

```
        int answer = differentSignAnswer + sameSignAnswer;
```

The final step is to translate the 0 to the a value and the 1 to the b value.

         int  c = a * (1 - answer) + (b * answer);

Here is the complete method.

```
public int largerIntWithoutIf(int a, int b) {
    int signa = a >>> 31, signb = b >>> 31;
    int selector = (((signb - signa) >>> 31) * (signa ^ signb)) + ((1 - (signa ^ signb)) * ((a-b) >>> 31));
    return (a * (1 - selector)) + (b * selector);
}
```

With this final step we have a solution that we can now test. The JMH results are as follows.

```
Benchmark                        (listSize)   Mode  Cnt           Score          Error  Units
NoBranch.testLargerIntWithoutIf     1048576  thrpt   25   358885079.042 ±  5478313.134  ops/s
NoBranch.testLargerWithIf           1048576  thrpt   25   452203907.497 ±  2067513.191  ops/s
```


<br/>
I could do more work to better optimize the if-less code but to do so would further obfuscate the code and as it’s been said time and time again, code is for humans to read and it’s up to the compilers to convert that into an efficient runtime representation. I did dump the assembler to understand what the JIT is producing. Unfortunately only the C1 “static” compiler did anything with the code. The next step would be to turn on compiler logging and run it though JITWatch to perhaps get an idea as to why C2 didn’t kick in. But, it’s late in the day, late in the summer and I’m about to head out to the lake for another paddle so, I’ll leave the answer to those questions as an exercise to the reader……

Please do reach out if you’re looking to learn more about performance tuning and JVM configuration optimization.


