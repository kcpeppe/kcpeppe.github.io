---
layout: post
comments: true
title:  "Code Without Branching?"
excerpt: ""
date:   2023-09-04 11:00:00 +0900
categories: [java]
tags: [Java, benchmarking, JMH, C++]
---

<img src="/images/okgn-park-sup.jpg"
alt="Fire on Rose Valley ridge line"
style="width: 100%; display: block; margin-left: auto; margin-right: auto;" />
<br/>
I started out today on my paddle board session by heading out into the wind. The reason for heading out into the wind is that it makes for an easier trip back. But, as we all know, winds will do as they please and on this day, they decided to change direction and stiffen.

The wind got so strong that at times it seemed as if I wasn't making any forward progress at all. But, I wasn't worried as I was following the shoreline and so I always had an easy exit. I figured, as long as I’m making some forward progress I’ll just keep on paddling.

After 2k of this, I reached the mouth of the bay that I needed to turn into to end my trip. I knew the this 200 meters would be challenging as the turn would have the wind and the waves broadsiding me.
As expected, I was very quickly hit by series of larger waves. The board yawed counter-clockwise and rolled to the right and just as I was about to recover my balance, a wave yawed clockwise and rolled down to the left. The next wave was too much for me to handle and with that, I was tossed into the water.

As I started my swim up to the surface I that I wasn't able to push my head out of the water. It took a moment for me to realize that the wind had blown my board over my head and the tethering was keeping it there. Once that was sorted, I pushed the board aside, came to the surface, climbed back onto the board, and finished the journey kneeling on the board.

Once I got home I turned my attention to branchless coding techniques in C. My ultimate goal was to see how well branchless could be applied to Java code.


### Branchless Code
<br/>
The easiest way to answer the question, what is branchless code is by looking at some code. Let's start a branching code example.

```
int maxWithBranch(int a, int b) {
  if ( a > b)
    return a;
  else
    return b;
}
```
<br/>
As can be seen, this is a very traditional approach to finding the max of two numbers. The function takes two integer arguments and compares them If a is greater than b, return a else return b. The pseudo-assembly-code for this looks something like;

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
Let's convert this to be branchless.
<br/>
```
int maxWithNoBranch(int a, int b) {
  return (a * (a > b)) + (b * (b >= a));
}
```
<br/>
Let's look at maxWithNoBranch(5,4). The function will evaluate (5 * (5 > 4)) + (4 * (4 >= 5)). Recall, C/C++ is loosely typed thus multiplying the boolean by an int is allowed. C/C++ represents true as 1 and false as 0. Evaluating the boolean leaves us with (5 * 1) + (4 * 0) which reduces to 5.
Is this branchless version faster than the more explicit if-else and if so, is it fast enough to warrant the obfuscation? To answer this I wrote the microbenchmark listed below.

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
<tr><td style="width:40%">Test</td><td style="width:20%">Min</td><td style="width:20%">Mid</td><td>Max</td></tr>
<tr><td>Time with Branch</td><td>6504</td><td>7023</td><td>7715</td></tr>
<tr><td>Time with no Branch</td><td>5087</td><td>5688</td><td>6192</td></tr>
</table>

As can be seen, the branchless code is faster but not by all that much. Why? Modern CPUs perform branch prediction thus reducing the time taken to complete a full on if-then-else block. Suddenly, the wind has just shifted and we need the benchmark to do things to minimize the effects of this micro-optimizations that can be applied to this micro-benchmark.

The way to break predictability is to offer up a randomized set of inputs. Below is the refactored main function.

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
</br>
While using random values may eliminate branch prediction from the calculation, it adds the cost of iterating through an array. Fortunately there is another CPU optimization known as pre-fetching that predicts what data will be used and loads it before it is needed. Since we are striding through an array in a regular monition, the CPU should be able to preload and hopefully minimize the "noise" in our benchmarking results.

<table>
<tr><td style="width:40%">Test</td><td style="width:20%">Min</td><td style="width:20%">Mid</td><td>Max</td></tr>
<tr><td>Time with Branch</td><td>12197</td><td>13599</td><td>17708</td></tr>
<tr><td>Time with no Branch</td><td>5143</td><td>5267</td><td>5337</td></tr>
</table>


As can be seen here, using randomized values made a huge difference. While we might assume that branch prediction has made the difference, I'm not feeling so comfortable with the results and the only way to ease that feeling is to scratch under the surface a wee bit.

In my experience it has always been a useful exercise to look at the system to identify what is being tested vs what is needed to run the test. That is, what is the "Unit of Test (UoT)" and what is test harness. In this case the UoTs are the max methods while everything else is test harness. The next question is, what is being timed? Let's look at the timeWithNoBranch as an exemplar to sort out an answer.

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

The clock encompasses a for loop, a method call as well as two array lookups. I’m guessing that the array lookups are all pre-fetched so that cost should be close to 1 clock. However, the method call and the branch back at the end of the loop will not be so cheap. While we can argue as to wither or not the function call is part of the UoT or not, the loop definitely should not be counted. Let's see if we can get an estimate of the cost of the loop by unrolling it by hand.

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

Unrolling the loop by a factor of 4 yields 500,000 loop back events instead of 2,000,00. The results show that both tests benefit but the head scratcher is why the massive improvement with the branch results.

<table>
<tr><td style="width:40%">Test</td><td style="width:20%">Min</td><td style="width:20%">Mid</td><td>Max</td></tr>
<tr><td>Time with Branch</td><td>6852</td><td>7096</td><td>6935</td></tr>
<tr><td>Time with no Branch</td><td>4283</td><td>4567</td><td>4866</td></tr>
</table>

As is often seen, switching the order of the tests yielded completely different results. In this case I'm guessing it is likely because of changes in memory alignment.

<table>
<tr><td style="width:40%">Test Reversed</td><td style="width:20%">Min</td><td style="width:20%">Mid</td><td>Max</td></tr>
<tr><td>Time with Branch</td><td>5652</td><td>6205</td><td>6844</td></tr>
<tr><td>Time with no Branch</td><td>5310</td><td>6257</td><td>6935</td></tr>
</table>

Now that the headwinds have picked up considerably let's work on stabilizing the numbers by experimenting with the number and size of the trials. After a bit of playing about, the value of 2x10 trials seems to do the trick as running the test in reverse order no longer affects the results.

<table>
<tr><td style="width:40%">Test</td><td style="width:20%">Min</td><td style="width:20%">Mid</td><td>Max</td></tr>
<tr><td>Time with Branch</td><td>5189</td><td>5258</td><td>5425</td></tr>
<tr><td>Time with no Branch</td><td>3789</td><td>3831</td><td>3952</td></tr>
</table>
<table>
<tr><td style="width:40%">Test Reversed</td><td style="width:20%">Min</td><td style="width:20%">Mid</td><td>Max</td></tr>
<tr><td>Time with no Branch</td><td>3788</td><td>3903</td><td>4007</td></tr>
<tr><td>Time with Branch</td><td>5217</td><td>5302</td><td>5724</td></tr>
</table>

Since unrolling the loop to a level of 4 provided some relief, let see how far we can push it.

<table>
<tr><td style="width:40%">Unrolled to 8</td><td style="width:20%">Min</td><td style="width:20%">Mid</td><td>Max</td></tr>
<tr><td>Time with Branch</td><td>3188</td><td>3267</td><td>3378</td></tr>
<tr><td>Time with no Branch</td><td>3752</td><td>3826</td><td>3902</td></tr>
</table>
<table>
<tr><td style="width:40%">Unrolled to 16</td><td style="width:20%">Min</td><td style="width:20%">Mid</td><td>Max</td></tr>
<tr><td>Time with no Branch</td><td>3606</td><td>3669</td><td>3717</td></tr>
<tr><td>Time with Branch</td><td>9629</td><td>9703</td><td>10029</td></tr>
</table>

The results show a win with 8 but a regression when using 16. What happened when the loop was unrolled from 8 to 16? Very likely the branch back resulted in a code cache miss causing the processor to stall while the evicted code cache was being re-fetched.

Finally, the C++ compiler comes with a number of optimization levels. The tests for far have been using the default level. Let’s compile with optimization level O3 and to see what effect that might have on the results.

<table>
<tr><td style="width:40%">Compiled with -O3</td><td style="width:20%">Min</td><td style="width:20%">Mid</td><td>Max</td></tr>
<tr><td>Time with no Branch</td><td>0</td><td>0</td><td>2</td></tr>
<tr><td>Time with Branch</td><td>0</td><td>0</td><td>2</td></tr>
</table>

These results were obtained using the version of the code where the loops had not been unrolled.

### What just happened? 

While the no-branch code did run 17% faster on the unoptimized version once all of the effects of microbenchmarking were minimized, the optimizing compiler yielded much better results. In fact so much better it feels as the compiler just might have optimized away the entire UoT. To ensure this isn’t the case, it is time to look at the assembly produced by running g++ on my MacBook Pro with an M1 CPU.

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

The Java compiler does very little in the way of optimizing the code. Instead, the optimization effort has been relegated to the Just In Time (JIT) HotSpot compilers. The JIT compilers in the JVM will use profiling data obtained from the runtime to produce highly optimized native code from the Java bytecode. I suspected that these optimizations would wipe out any benefits we might have seen in the C/C++ code. Let's put that hypothesis to the test.

The first problem is how to translate the code. Unlike C/C++ which is loosely typed, Java's type system is enforced thus prevents all kinds of crazy assignments that may or may not make sense in C/C++ code. In Java, will this even work if we cannot multiply a boolean and an integer. Let's work through some logic to see what can be done.

#### Deriving Java Compatible Logic

One trick could be to subtract b from a and then multiply it by the sign. That is, if a is bigger than b then the sign will be +. This seems to work until you get to MIN_INTEGER - any positive value. In this case, int, being a 32 bit value, will wrap and the answer will be + instead of -. One solution to this could be to cast the int to a long and then perform the calculation. Of course, that will only work for int and if we’re working with long we’ll have to come up with a different solution. Maybe constructing a logic table might help sort things out.

<table>
<tr>
<tr><td style="width:40%">a</td><td style="width:20%">b</td><td style="width:20%">a - b</td><td>result</td></tr>
<td>+</td><td>+</td><td>+</td><td>a</td></tr>
<td>+</td><td>+</td><td>-</td><td>b</td></tr>
<td>-</td><td>-</td><td>-</td><td>a</td></tr>
<td>-</td><td>-</td><td>+</td><td>b</td></tr>
<td>+</td><td>-</td><td>n/a</td><td>a</td></tr>
<td>-</td><td>+</td><td>n/a</td><td>b</td></tr>
</table>


This can be reduced to the following observations. If the signs are the same, then the result of the subtraction can be trusted. The signs are different, the positive value should always be taken. Let’s see if we can translate this to code.

This description suggest that the problem should be separated into two parts, one where the signs are the same and one where they are different. Let's calculate 0 for when a should be selected and 1 when b is the answer.

```

        int signa = a >>> 31;
        int signb = b >>> 31;
        int differentSign = signa ^ signb;
```        

The value for differentSign will be 1 for when the signs are different and 0 for when they are the same. Next let’s calculate the value to return if the signs are the same. As we deduced from the table above, is the signs are the same then all we need to do is determine the sign of the result of subtracting the two values.

```
        int sameSignAnswer = (1 - differentSign) * ((a-b) >>> 31);
```

Now let us calculate the value for when the signs are different. In this case we always want to take the positive value after the subtraction. If 'b' is positive, then 'a' will be negative and the value of the subtraction will be 1. If 'a' is positive, then 'b' will be negative and the sign of the subtraction will be 0.


```
        int differentSignAnswer = ((signb - signa) >>> 31) * differentSign;
```

The final answer is the sum of the two parts.

```
        int answer = differentSignAnswer + sameSignAnswer;
```

The final step is to translate the 0 to the 'a' value and the 1 to the 'b' value.

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
I could do more work to refine the if-less code but to do so would further obfuscate the code and as it’s been said time and time again, code is for humans to read and it is up to the compilers to convert the code into an efficient runtime representation. I did dump the assembler to understand what the JIT is producing. Unfortunately only the C1 “static” compiler did anything with the code. One could turn on compiler logging and run it though JITWatch to perhaps get an idea as to why C2 didn’t kick in. But, it’s late in the day, late in the summer, and I’m about to head out to the lake for another paddle so, I’ll leave the answer to those questions as an exercise to the reader……

Please do reach out if you’re looking to learn more about performance tuning and JVM configuration optimization.


