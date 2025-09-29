---
layout: post
comments: true
title:  "A Puzzling Performance Puzzle"
excerpt: ""
date:   2025-09-28 11:00:00 +0900
categories: [java,performance]
tags: [Java, performance]
---

I was recently invited to speak at the Vancouver Java User Group https://www.linkedin.com/groups/14603101/. I proposed an AMA on performance tuning as in my experience, this turns a presentation into a group discussion which allows everyone to be engaged and that makes it more fun for everyone. The discussion in this session was mostly about methodology, or lack of it. I showed a chunk of code from one of the exercises from my performance tuning workshop. This seemingly simple exercise has stumped the vast majority of developers across the world. Before I present it here, let me provide a little background.

### History of checkInteger()
  
This exercise was first presented to a group in Hong Kong by Jack Shirazi and myself. The exercise was suppose to last 30 minutes. At about 30 min, we decided to stop the group and enquire about how everyone was progressing. Short answer, they weren't. All in all it took the group closer to 2 hours to complete the exercise. Jack and I had to handhold the group through the entire process. Conclusion, we'd messed up in explaining how to troubleshoot performance regressions. I reworked the presentation and then we presented in Tokyo only to see the same results and come to the same conclusion.

After the initial presentations in Hong Kong and Tokyo, I presented the materials in several different countries tweaking the materials between each presentation only to witness the same result. About the only thing that improved was my ability to pace the exercise so that it was completed in 90 minutes. I estimate that close to 300 developers had attempted this exercise before one person in Paris finished it in about 20 minutes. I think I went through another 300 before yet another person finished it up in under 30 minutes. The revelation came when I presented to a group of developers mixed with operations. A developer was paired with an operations person for the exercises. This combo resulted about half of the pairings being able to solve the problem in under 30 minutes. The resulted was repeated a few months later while presenting to a group in Poland.

My take-away is, diagnostics skills are very different from development skills yet developers are expected to automatically have them with little to no training. With that in mind, lets take a look at checkInteger().

### The challenge

The goal of this exercise is to improve the performance of checkInteger by a factor of 3 from a baseline measurement over three different test data sets. The class GenerateData will generate the three  test data sets. The checkInteger method has been included in the same class as the test harness. The functional requirements are;
<ol>
<li>Input will be a java.lang.String</li>
<li>The String should represent a valid integer</li>
<li>The value of the integer must be greater than 10</li>
<li>The range shall be be between 2 and 100000 inclusive</li>
<li>The first digit is 3.</li>
</ol>

```
package com.kodewerk.profile;

import java.util.*;
import java.io.*;

public class CheckIntegerTestHarness {
    public static void main(String[] args) throws IOException {
        testDataset("dataset1.dat");
        testDataset("dataset2.dat");
        testDataset("dataset3.dat");
    }

    public static void testDataset(String dataset) throws IOException {
        long starttime = System.currentTimeMillis();
        DataInputStream rdr = new DataInputStream(new FileInputStream(dataset));
        int truecount = 0;
        String s;
        try {
            while ((s = rdr.readUTF()) != null) {
                if (checkInteger(s))
                    truecount++;
            }
        } catch (EOFException e) {}
        rdr.close();

        System.out.println(truecount + " (count); time " + (System.currentTimeMillis() - starttime));
    }

    public static boolean checkInteger(String testInteger) {
        try {
            Integer theInteger = new Integer(testInteger);//fails if not  a number
            return
                    (theInteger.toString() != "") && //not empty
                    (theInteger.intValue() > 10) && //greater than ten
                    ((theInteger.intValue() >= 2) &&
                    (theInteger.intValue() <= 100000)) && //2>=X<=100000
                    (theInteger.toString().charAt(0) == '3'); //first digit is 3
        } catch (NumberFormatException err) {
            return false;
        }
    }
}
```

Below is the code that generates the desired amount of test data. I'd recommend generating about 25000000 data points.

```
package com.kodewerk.profile;


import java.io.BufferedOutputStream;
import java.io.DataOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Random;

public class GenerateData {

    public static void main(String[] args) throws IOException {
        int numberOfDataPoints;
        if ( args.length == 0)
            numberOfDataPoints = 10000000;
        else 
            numberOfDataPoints = Integer.parseInt( args[ 0]);
        System.out.println( numberOfDataPoints + " data points generated.");
        generateDataset1( numberOfDataPoints);
        generateDataset2( numberOfDataPoints);
        generateDataset3( numberOfDataPoints);
    }

    //dataset 1, all true, integers 2 to 5 characters long starting with '3'
    public static void generateDataset1( int numberOfDataPoints)
            throws IOException {
        DataOutputStream wrtr = new DataOutputStream(new BufferedOutputStream(new FileOutputStream("dataset1.dat")));
        Random rand = new Random(12346);
        for (int i = 0; i < numberOfDataPoints; i++) {
            wrtr.writeUTF("3" + Math.abs(rand.nextInt(10000)));
        }
        wrtr.close();
    }

    //dataset 2, about half true
    public static void generateDataset2( int numberOfDataPoints)            throws IOException {
        DataOutputStream wrtr = new DataOutputStream(new BufferedOutputStream(new FileOutputStream("dataset2.dat")));
        Random rand = new Random(12347);
        for (int j = 0; j < numberOfDataPoints / 10; j++) {
            wrtr.writeUTF("3" + Math.abs(rand.nextInt(10000)));
            wrtr.writeUTF("-" + Math.abs(rand.nextInt(10000)));
            wrtr.writeUTF("3" + Math.abs(rand.nextInt(10000)));
            int i = Math.abs(rand.nextInt(100000));
            while (Integer.toString(i).charAt(0) == '3') {
                i = Math.abs(rand.nextInt(100000));
            }
            wrtr.writeUTF("" + i);
            wrtr.writeUTF("3" + Math.abs(rand.nextInt(10000)));
            wrtr.writeUTF("-" + Math.abs(rand.nextInt(10000)));
            wrtr.writeUTF("3" + Math.abs(rand.nextInt(10000)));
            i = Math.abs(rand.nextInt(100000));
            while (Integer.toString(i).charAt(0) == '3') {
                i = Math.abs(rand.nextInt(100000));
            }
            wrtr.writeUTF("" + i);
            wrtr.writeUTF("3" + Math.abs(rand.nextInt(10000)));
            wrtr.writeUTF("-" + Math.abs(rand.nextInt(10000)));
        }
        wrtr.close();
    }

    //dataset 2, about 1/3 true, 1/3 false, over 1/3 not a number
    public static void generateDataset3( int numberOfDataPoints)
            throws IOException {
        DataOutputStream wrtr = new DataOutputStream(new BufferedOutputStream(new FileOutputStream("dataset3.dat")));
        Random rand = new Random(12348);
        StringBuffer sb = new StringBuffer();
        for (int j = 0; j < numberOfDataPoints / 10; j++) {
            wrtr.writeUTF("3" + Math.abs(rand.nextInt(10000)));
            wrtr.writeUTF("-" + Math.abs(rand.nextInt(10000)));
            sb.setLength(0);
            sb.append(rand.nextInt(1000));
            sb.insert(0, 'w');
            wrtr.writeUTF(sb.toString());
            wrtr.writeUTF("3" + Math.abs(rand.nextInt(10000)));
            int i = Math.abs(rand.nextInt(100000));
            while (Integer.toString(i).charAt(0) == '3') {
                i = Math.abs(rand.nextInt(100000));
            }
            wrtr.writeUTF("" + i);
            sb.setLength(0);
            sb.append(rand.nextInt(1000));
            sb.insert(1, 'q');
            wrtr.writeUTF(sb.toString());
            wrtr.writeUTF("3" + Math.abs(rand.nextInt(10000)));
            wrtr.writeUTF("-" + Math.abs(rand.nextInt(10000)));
            sb.setLength(0);
            sb.append(rand.nextInt(1000));
            sb.append('s');
            wrtr.writeUTF(sb.toString());
            wrtr.writeUTF("NOTNUM");
        }
        wrtr.close();
    }
}
```

### Conclusion

Please email with answers/comments. I'll likely not post solutions as to avoid spoiling the experience for others. We'll see.