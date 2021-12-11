# Tweet Textarea Prototype

This is a prototype for a Twitter-like text input area built in vanilla Javascript. It is intended as an exploration of what is required to implement a textarea that supports highlighting/unhighlighting parts of a text as the user inputs it. The goal is to use this exploration as a learning opportunity to, eventually, build a React component that behaves the same way as Twitter's input area does.

There is a live [demo](https://amsaid1989.github.io/TweetTextareaPrototype) available for this prototype.

## Disclaimer

This prototype isn't intended for production. As mentioned above, it is just for learning purposes. It is, by no means, a feature-complete implementation. It is also not extensively tested to ensure that the features it implements are working entirely as intended.

Additionally, the code isn't the cleanest and it isn't properly documented. It is also not going to be maintained against future updates of the browsers.

Last but not least this prototype doesn't work well at all on mobile browsers. Due to differences between how browsers work on desktop and mobile, the prototype behaves very strangely on mobile phones. This isn't something that is going to be addressed in this prototype.

If you still would like to use this code in production, then do that at your own risk.

## Cloning and running the prototype locally

All you need to do to start using this prototype in your local environment is to clone the repository and run a server in its root directory.

To clone, run the following command:

```bash
git clone https://github.com/amsaid1989/TweetTextareaPrototype.git
```

Then navigate to the directory and run a server there. The easiest way to run a server is to use Python's `http.server` module. To do so, run the following commands:

```bash
cd TweetTextareaPrototype

python -m http.server
```

This normally runs a server on port `8000`, so if you go to your browser and navigate to `localhost:8000`, you should see the prototype running as it does in the live [demo](https://amsaid1989.github.io/TweetTextareaPrototype).

## Playing with the code

All the Javascript code that is used by this prototype is included in the `src` sub-directory. It is split into 6 modules:

1) `main.js` - This is the main module that is loaded by the `index.html`. It mainly sets up the event listener on the textarea.
2) `common.js` - This module includes functions that handle the user input in the same way across both Firefox and Chromium-based browsers.
3) `firefox.js` - This modules includes functions that are specific to Firefox.
4) `chrome.js` - This modules includes functions that are specific to Chromium-based browsers.
5) `utils.js` - This modules includes utility functions that don't handle user input directly, but are used by the other modules for specific tasks.
6) `patterns.js` - This module include the `Regex` patterns that are used by the other modules to test the user input for what should be highlighted.

## Final notes

As mentioned above, this prototype isn't at feature parity with Twitter's input area. To begin with, highlighting URLs isn't implemented at all. The prototype only handles hashtags and user mentions. Additionally, since it isn't extensively tested, the prototype might fail at some edge cases, even when handling hashtags and user mentions.

Despite the fact that this code isn't going to be maintained, I am still happy to answer any questions about it. Feel free to reach out to me with any thoughts or questions.