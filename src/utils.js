const hashtagRegex = /#\w*[a-zA-Z]+\w*/;
const nonWordPattern = /[ \W]/;

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
        if (!node) {
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

        const match = text.match(hashtagRegex);

        return match && match.index === 0 && match[0].length === text.length;
    },

    getWordBoundaries: function (text, currentIndex) {
        const before = text.slice(0, currentIndex);
        const after = text.slice(currentIndex);

        const wordStart = before.lastIndexOf(" ") + 1;

        const firstSpaceAfter = after.indexOf(" ");

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

    findFirstSpaceInText: function (text) {
        const firstSpaceInEnd = text.indexOf(" ");

        return firstSpaceInEnd >= 0 ? firstSpaceInEnd : text.length;
    },

    chromeBrowser: function () {
        return navigator.userAgent.includes("Chrome");
    },
};

export default EditorUtils;
