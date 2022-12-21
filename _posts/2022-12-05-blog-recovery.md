---
layout: post
comments: true
title:  "I've finally recovered my blog"
date:   2022-12-05 06:40:10 +0900
categories: [general]
---

TLDR; Just as the title states, after forever, I've recovered my blog.

I first started blogging at a site created by [Alan Williamson](https://alan.is/) known as blog-city way back in around 2002. Sadly, Alan decided to shut the site down and with it went all of my earlier postings. At about that time, I took up an offer from Sun Microsystems to blog on a site they had setup for [Java Champions](https://dev.java/community/jcs/) and other community groups. That site was shutdown by Oracle a number of years ago and with it, once again, all of my posts disappears from the web.

I did take a quick look at blogging on [Medium](https://medium.com/) after posting my submissions for [97 Things](https://www.oreilly.com/library/view/97-things-every/9780596809515/?_gl=1*1mly0hl*_ga*MjAwMjcxMDIxNi4xNjcwMjcwMzMz*_ga_092EL089CH*MTY3MDI3MDMzMy4xLjEuMTY3MDI3MDM0Ni40Ny4wLjA.), I decided against. [Here is a submission where I was pretending to by funny](https://medium.com/97-things/hey-fred-can-you-pass-me-the-hashmap-d5e7c72bd448). When it came to setting up a new blog, I was always busy enough that "I'll get to that tomorrow" always one out. Eventually, the idea of setting up a new blog fell off the table. That is until I met up with Henri Trembly (https://github.com/henri-tremblay) in Montreal. He introduced me to Jekyll and I got to work setting up a site and then got distracted by something else and you know the story from here.

Lately the distraction has been digging into generational Z GC. In the middle of running Hyperalloc benchmarks, I got this strong feeling that I wanted blog about this, [GCToolKit](https://github.com/microsoft/gctoolkit) and many other topics that I decided to just get it done. With that, I pulled my initial cut of the website and started hacking away.

My experience with working with Jekyll has been interesting. The first challenge was getting ruby updated on my MacBook Pro. The native Mac OSX version was 2 dot something. My first attempt at pulling down all of the dependencies failed because the current version of Jekyll required 3 dot something else. Updating Ruby turned out to be more challenging than expected. Brew (correctly) refused to overwrite the natively installed version of Ruby instead installing it somewhere else. Once I was able to figure out where somewhere else was, something that wasn’t made obvious during the install, I made a small adjustment to PATH in .profile and it was off to the races. Oddly enough, getting this sorted was the most difficult part of the entire process!

With that done, I could finally run bundle (full instructions are [here](https://jekyllrb.com/tutorials/using-jekyll-with-bundler)) to generate the base directory and install the dependencies. From there it was onto editing the templates to finally create the website that you see here. This type of work is something that I don’t engage in that often so it gave me a wee bit of grief at the beginning. Things got a lot easier once I replaced vi with IntelliJ.

One thing to note is that Jekyll uses a ton of conventions. As long as you follow them, things just work. Getting the site being served via GitHub pages was really a non-task. Just an ordinary commit and push. It’s all so easy I’m now wondering why I it took me so long to simply get on with it.

What’s next, well, at the time of writing I still have about a dozen major modifications that I want to make to the site. For example, I've still not found a satisfactory way to position the footer. As unhappy as I am about it, I've let it go for the moment in favor of releasing and starting to post. I might repost some of my past entries that are still relevant though that's still undecided as I've a bunch of things in the queue. Even though I expect most of the postings will be about all things Java and performance as well as general computing tidbits, I do intend to post on other topics. I might also cross-post certain articles but this is my new home. Unlike my choices in the past, should GitHub Pages suddenly go away or I suddenly decide to host elsewhere, using Jekyll means migrating will be easy-peasy. Looking forward to it.