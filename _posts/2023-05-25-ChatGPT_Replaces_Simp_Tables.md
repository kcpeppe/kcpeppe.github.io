---
layout: post
comments: true
title:  "Pre ChatGPT(?) using SMIP Tables"
excerpt: "What flags should be used to log GC activity"
date:   2023-05-25 08:00:00 +0900
categories: [general]
---

I recently was cleaning out a filing cabinet when I ran across an article on SIMP tables dated June of 1975. The funny part of this article is that it was written as part of a series called "Department of Golden Oldies". SMIP tables, also known as semantic tables, can be used to generate random sentences. These sentences look like they should have some meaning but are complete nonsense.

I remember that when I first ran into this article several years ago, I wrote a program that used the Simp tables to generate random sentences. My supervisor seeing this decided to have some fun with it by dropping one of the generated sentences into a project proposal. He sent the proposal to his supervisor who but a question mark over the generated sentence and then, unexpectedly, sent the proposal off for final approval.

Where do SIMP tables come from? The article states that although they were able to determine that the topic showed up in around 1971, no one knew where it came from. I decided to see what ChatGPT could come up with on such an obscure topic. It took me several tweaks of a ChatGPT query to finally generate this. 

```
Simp tables, also known as semantic tables, were first introduced by the linguist Zellig Harris in the 1950s. Harris developed the concept of distributional analysis, which involves analyzing the distribution of words in a language to determine their meaning and syntactic function.

Simp tables are a tool used in distributional analysis to represent the distribution of words in a sentence. They consist of a table with rows representing the words in the sentence and columns representing the contexts in which those words appear. The cells in the table contain information about the frequency and type of context in which each word appears.

Simp tables have been used in various fields, including computational linguistics, natural language processing, and corpus linguistics. They are particularly useful for analyzing large corpora of text and for identifying patterns in language use.

In summary, simp tables were developed by Zellig Harris in the 1950s as a tool for distributional analysis in linguistics. They have since been used in various fields to analyze language use and identify patterns in large corpora of text.
```
<br/>

My initial Google searches yielded nothing of interest but having the ChatGPT output allowed me to  find a newer reference to Charles J. Fillmore engaging in similar work. The surprise was that even with all this information in hand, I wasn't able to come up with even a passing mention of "simp tables". That said, the work that Harris and Fillmore were engaged in felt very much like how ChatGPT operates.

At this point, I decided to re-implement the app in Java and then see if I could get ChatGPT to do the same.

### The Code


```
import java.util.Random;

public class SimpTable {

    private static String[] tableA = {
            "In particular, ",
            "On the other hand, ",
            "However, ",
            "Similarly, ",
            "As a resultant implication, ",
            "In this regard,",
            "Based no integral subsystem considerations, ",
            "For example, ",
            "Thus, ",
            "In respect to specific goals, "
    };
    private static String[] tableB = {
            "a large potion of the interface coordination communications ",
            "a constant flow of effective information ",
            "the characterization of specific criteria ",
            "initiation of critical sybsystem development ",
            "the fully integrated test program ",
            "the product configuration baseline ",
            "any associated supporting element ",
            "the incorporation of additional mission constraints ",
            "the independent functional principle ",
            "a primary interrelationship between system and/or system technologies "
    };
    private static String[] tableC = {
            "must utilize and be functionally interwoven with ",
            "maximizes the probability of project success and minimizes the cost and time required for ",
            "add explicit performance limits to ",
            "necessitates that urgent consideration be applied to ",
            "requires considerable systems analysis and trade-off studies to arrive at ",
            "is further compounded, when taking into account ",
            "presents extremely interesting challenges to ",
            "recognizes the importance of other systems and the necessity for ",
            "effets a significant implementation of ",
            "add overriding performance constraints to "
    };
    private static String[] tableD = {
            "the sophisticated hardware.",
            "the anticipated fourth-generation equipment.",
            "the subsystem compatability testing.",
            "the structural design, based on system engineering concepts.",
            "the preliminary qualification limit.",
            "the evolution of specifications over a given time period.",
            "the philosophy of commonality and standardization.",
            "the greater flight-worthiness concept.",
            "any discrete configuration mode.",
            "the total system rationale."
    };

    public static void main(String[] args) {
        Random indexGenerator = new Random();
        // Pick a clause from each table.
        System.out.print(tableA[indexGenerator.nextInt(10)]);
        System.out.print(tableB[indexGenerator.nextInt(10)]);
        System.out.print(tableC[indexGenerator.nextInt(10)]);
        System.out.println(tableD[indexGenerator.nextInt(10)]);
    }
}
```

### The Output

Now for the fun part, the output.

```
In particular, the fully integrated test program add explicit performance limits to any discrete configuration mode.
```

```
Thus, the characterization of specific criteria is further compounded, when taking into account the philosophy of commonality and standardization.
```

```
For example, the characterization of specific criteria add overriding performance constraints to the philosophy of commonality and standardization.
```

What nonsense... what fun!!!

### ChatGPT

The following is the prompt I used for ChatGPT.

```
listA = f"""
In particular,
On the other hand,
However,
Similarly,
As a resultant implication,
In this regard,
Based no integral subsystem considerations,
For example,
Thus,
In respect to specific goals
"""

listB = f"""
a large potion of the interface coordination communications
a constant flow of effective information
the characterization of specific criteria
initiation of critical sybsystem development
the fully integrated test program
the product configuration baseline
any associated supporting element
the incorporation of additional mission constraints
the independent functional principle
a primary interrelationship between system and/or system technologies
"""
listC = f"""
must utilize and be functionally interwoven with
maximizes the probability of project success and minimizes the cost and time required for
add explicit performance limits to
necessitates that urgent consideration be applied to
requires considerable systems analysis and trade-off studies to arrive at
is further compounded, when taking into account
presents extremely interesting challenges to
recognizes the importance of other systems and the necessity for
effects a significant implementation of
add overriding performance constraints to
"""

listD = f"""
the sophisticated hardware.
the anticipated fourth-generation equipment.
the subsystem compatability testing.",
the structural design, based on system engineering concepts.
the preliminary qualification limit.
the evolution of specifications over a given time period.
the philosophy of commonality and standardization.
the greater flight-worthiness concept.
any discrete configuration mode.
the total system rationale.
"""


prompt = f"""
Generate a sentence by randomly selecting 1 entry from each of the four lists. Each list is delimited by ```.
List A: ```{listA}```
List B: ```{listB}```
List C: ```{listC}```
List D: ```{listD}```
"""
response = get_completion(prompt)
print(response)
```

I ran the prompt several times.

```
1. In this regard, the incorporation of additional mission constraints necessitates that urgent consideration be applied to the greater flight-worthiness concept.


2. In this regard, the incorporation of additional mission constraints necessitates that urgent consideration be applied to the greater flight-worthiness concept.

3. In this regard, the incorporation of additional mission constraints necessitates that urgent consideration be applied to the greater flight-worthiness concept.
```

Unfortunately, the results don't appear to be very random. One of the things that does control randomness in how output is constructed is the temperature parameter. I've been running with a temperature of 0 where 0.3 is recommended. Lets rerun with temperature set to 0.3.


```
In this regard, the incorporation of additional mission constraints necessitates that urgent consideration be applied to the greater flight-worthiness concept.
```

I didn't expect this to produce anything different as it's very likely that ChatGPT simply doesn't know how to generate a truly random number or at the very least, is seeding a random number generator with a constant. But just in cases, let's set the temperature to the max value of 1.0.

```
Based on integral subsystem considerations, any associated supporting element must utilize and be functionally interwoven with the greater flight-worthiness concept.

Similarly, the product configuration baseline must utilize and be functionally interwoven with the fully integrated test program and the greater flight-worthiness concept.
```

This is starting to look at wee bit better but it still ends with the exact same ending phrase.


### Conclusion

It appears as though the search to uncover the patterns in language that would allow for machines to communicate using natural languages started much farther back in history than I would have initially imagined. My guess is that Simp tables were created by someone or a group of people who decided to have fun with the research. Similar to when a small group of us decided to take a poke at the methodology wars by coming up with "Defect Driven Design" (D^3, pronounced D-cubed). As I've always said, original ideas are exceptionally rare and because of this I'm never surprised to learn that any at task we're engaged in today is on the backs of others. In this case, researchers, likely driven by cryptography, didn't have the machines to work at scale needed to have more than an academic impact at best. Even so, the work they engaged in was pretty sophisticated and are an essential to the work being done today. I'll let ChatGPT have the final word here. If you can judge the veracity please let me know how well it stands up.

```
Large language models, which are computer programs capable of generating human-like language, have a rich history dating back to the 1940s. Early work in natural language processing (NLP) focused on rule-based systems, which relied on manually created grammars and dictionaries to analyze and generate language. However, with the advent of machine learning and the availability of large datasets, researchers began exploring statistical approaches to NLP. In the 1980s and 1990s, researchers developed probabilistic models such as Hidden Markov Models and n-gram models, which could predict the likelihood of a given sequence of words. In recent years, the development of deep learning techniques and the availability of massive amounts of data have led to the creation of large language models such as GPT-3, which can generate highly coherent and sophisticated language. These models are now being used in a wide range of applications, from language translation to chatbots and virtual assistants.
```