import {
    hashtagRegex,
    mentionRegex,
    hashtagOrMentionRegex,
    nonWordPattern,
} from "./patterns.js";

const EditorUtils = {
    createParagraphNode: function () {
        const para = document.createElement("p");
        const breakNode = document.createElement("br");

        para.appendChild(breakNode);

        return para;
    },

    findParentParagraph: function (node) {
        if (node.tagName === "P") {
            return node;
        }

        let current = node;

        while (current.parentElement) {
            current = current.parentElement;

            if (current.tagName === "P") {
                break;
            }
        }

        return current;
    },

    findNodeInParent: function (node, parent) {
        let offset = 0;

        for (const child of parent.childNodes) {
            ++offset;

            if (child === node) {
                break;
            }
        }

        return offset;
    },

    getTextNode: function (node) {
        if (!node) {
            return null;
        }

        if (node.nodeType === 3) {
            return node;
        }

        let textNode = null;
        let currentNode = node;

        while (currentNode.firstChild) {
            currentNode = currentNode.firstChild;

            if (currentNode.nodeType === 3) {
                textNode = currentNode;

                break;
            }
        }

        return textNode;
    },

    textNodeFormatted: function (node) {
        if (!node || !node.parentElement) {
            return false;
        }

        return node.parentElement.className === "hashtag";
    },

    elementNodeFormatted: function (node) {
        if (!node) {
            return false;
        }

        return node.className === "hashtag";
    },

    allTextMatchesPattern: function (node) {
        const text = node.textContent;

        const match = text.match(hashtagOrMentionRegex);

        return match && match.index === 0 && match[0].length === text.length;
    },

    textMatchesPattern: function (text) {
        const globalHashtagRegex = new RegExp(hashtagRegex.source, "g");
        const globalMentionRegex = new RegExp(mentionRegex.source, "g");

        const hashtagMatches = Array.from(text.matchAll(globalHashtagRegex));
        const hashtagCharMatches = Array.from(text.matchAll(/#/g));
        const mentionMatches = Array.from(text.matchAll(globalMentionRegex));
        const mentionCharMatches = Array.from(text.matchAll(/@/g));

        if (hashtagMatches.length === 0 && mentionMatches.length === 0) {
            return false;
        }

        if (hashtagCharMatches.length > 1) {
            if (
                (hashtagMatches[0].index > 0 &&
                    (mentionMatches.length === 0 ||
                        mentionMatches[0].index > 0)) ||
                (hashtagMatches[0].index === 0 &&
                    hashtagMatches[0][0].length === hashtagCharMatches[1].index)
            ) {
                return false;
            }
        }

        if (mentionCharMatches.length > 1) {
            if (
                (mentionMatches[0].index > 0 &&
                    (hashtagMatches.length === 0 ||
                        hashtagMatches[0].index > 1)) ||
                (mentionMatches[0].index === 0 &&
                    mentionMatches[0][0].length === mentionCharMatches[1].index)
            ) {
                return false;
            }
        }

        if (text.startsWith("#@")) {
            return false;
        }

        return true;
    },

    getWordBoundaries: function (text, currentIndex) {
        const before = text.slice(0, currentIndex);
        const after = text.slice(currentIndex);

        const wordStart = this.findLastNonwordInText(before) + 1;

        const firstSpaceAfter = this.findFirstNonwordInText(after);

        const wordEnd =
            firstSpaceAfter >= 0 ? currentIndex + firstSpaceAfter : text.length;

        return { wordStart, wordEnd };
    },

    getCurrentWord: function (text, currentIndex) {
        const { wordStart, wordEnd } = this.getWordBoundaries(
            text,
            currentIndex
        );

        return text.slice(wordStart, wordEnd);
    },

    getWordsBeforeAndAfterCurrentIndex: function (text, currentIndex) {
        /**
         * REVIEW (Abdelrahman): Because this function was switched
         * from splitting words only at space characters to splitting
         * them at any non-word characters (except the # character),
         * it needs to be tested extensively to ensure it still works
         * as expected in both Firefox and Chrome.
         */

        const before = text.slice(0, currentIndex - 1);
        const after = text.slice(currentIndex);

        const lastNonwordInBefore = this.findLastNonwordInText(before);
        const firstNonwordInAfter = this.findFirstNonwordInText(after);

        const prevWord = before.slice(lastNonwordInBefore + 1);
        const nextWord =
            firstNonwordInAfter >= 0
                ? after.slice(0, firstNonwordInAfter)
                : after.slice(0);

        return { prevWord, nextWord };
    },

    findFirstNonwordInText: function (text) {
        /**
         * This uses the match method rather than the indexOf
         * method because Chrome replaces some of the space
         * characters with the HTML entity &nbsp; which isn't
         * matched against " " using the indexOf method.
         *
         * So, when using indexOf(" "), if the entity is
         * encountered, it will be skipped and the method will
         * return the index of the following space character.
         *
         * The match(/\s/) solves this problem as it matches
         * both a normal whitespace and the HTML entity &nbsp;
         *
         * REVIEW (Abdelrahman): However, it might introduce
         * another issue because the \s token matches true for
         * all whitespace characters including tabs and newlines.
         * It is not clear, at the moment, how this might
         * affect how this function works, so it needs to be
         * checked.
         */

        const firstNonwordInText = text.match(nonWordPattern);

        return firstNonwordInText ? firstNonwordInText.index : text.length;
    },

    findLastNonwordInText: function (text) {
        const reversed = text.split("").reverse().join("");

        const lastNonwordInText = reversed.match(nonWordPattern);

        return lastNonwordInText
            ? text.length - lastNonwordInText.index - 1
            : -1;
    },

    removeAllChildNodes: function (node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    },

    chromeBrowser: function () {
        return navigator.userAgent.includes("Chrome");
    },
};

export default EditorUtils;
