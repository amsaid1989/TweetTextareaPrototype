import EditorUtils from "./utils.js";
import { hashtagRegex, nonWordPattern } from "./patterns.js";

const EditorCommon = {
    positionCursorForOtherCharInput: function (editor, range) {
        if (
            !range.collapsed &&
            range.toString().length === editor.textContent.length
        ) {
            /**
             * When the user selects all the text in the editor and
             * starts typing, all nodes of the editor needs to be
             * cleared before adding a new paragraph that will
             * contain the text.
             *
             * This is needed here because in this case, the
             * insertParagraph function won't be called in the
             * 'beforeinput' event as it would be if the user starts
             * typing in an empty editor, so we need to ensure that
             * it gets called.
             */

            this.insertParagraph(editor, range, false);
        }

        const {
            startContainer,
            startOffset,
            endContainer,
            endOffset,
            collapsed,
        } = range;

        range.deleteContents();

        if (startContainer === endContainer) {
            if (startContainer.nodeType === 3) {
                if (collapsed) {
                    const prevNode = startContainer.previousElementSibling;
                    const nextNode = startContainer.nextElementSibling;

                    if (
                        !EditorUtils.textNodeFormatted(startContainer) &&
                        startOffset === 0 &&
                        prevNode &&
                        EditorUtils.elementNodeFormatted(prevNode)
                    ) {
                        range.setStart(
                            prevNode.firstChild,
                            prevNode.textContent.length
                        );
                    }

                    if (
                        !EditorUtils.textNodeFormatted(startContainer) &&
                        startOffset === startContainer.textContent.length &&
                        nextNode &&
                        EditorUtils.elementNodeFormatted(nextNode)
                    ) {
                        range.setStart(nextNode.firstChild, 0);
                    }
                } else {
                    const prevNode = startContainer.previousElementSibling;

                    if (
                        startOffset === 0 &&
                        prevNode &&
                        EditorUtils.elementNodeFormatted(prevNode)
                    ) {
                        this.joinEndIntoStart(
                            range,
                            prevNode.firstChild,
                            startContainer,
                            prevNode.textContent.length
                        );
                    }
                }
            }
        } else {
            this.formatAndMergeAcrossContainers(
                range,
                startContainer,
                startOffset,
                endContainer,
                endOffset
            );
        }
    },

    addOrDeleteInSameContainer: function (editor, range) {
        if (!EditorUtils.chromeBrowser()) {
            /**
             * This addresses a behaviour in Firefox where two
             * adjacent but separate text nodes won't be joined
             * together automatically in some cases, like when
             * the user deletes at the start of a paragraph to
             * join it with the paragraph before it.
             *
             * In this case, if the last node in the previous
             * paragraph is a text node and the first node in
             * the current paragraph is a text node, the two
             * text nodes won't be joined automatically by
             * Firefox.
             *
             * This causes issues with handling the formatting
             * of the text by this function, since it relies
             * on checking the current word to see whether it
             * needs to be formatted or unformatted. If the
             * two separate text nodes constitute one word and
             * that word needs to be formatted, it won't get
             * formatted because it is broken across two nodes.
             */

            editor.normalize();
        }

        if (EditorUtils.chromeBrowser()) {
            const { startContainer, startOffset } = range;

            if (
                startContainer.nodeType === 3 &&
                startOffset === startContainer.textContent.length
            ) {
                const nextTextNode =
                    startContainer.nextElementSibling?.firstChild;

                if (nextTextNode) {
                    this.joinEndIntoStart(
                        range,
                        startContainer,
                        nextTextNode,
                        startOffset
                    );
                }
            }
        }

        this.checkCurrentWord(range);
    },

    addNonWordCharInSameContainer: function (editor, range) {
        const { startContainer, startOffset } = range;

        let updatedStartContainer, updatedStartOffset;

        const { prevWord, nextWord } =
            EditorUtils.getWordsBeforeAndAfterCurrentIndex(
                startContainer.textContent,
                startOffset
            );

        if (EditorUtils.wordMatchesPattern(prevWord)) {
            const wordEnd = startOffset - 1;
            const wordStart = wordEnd - prevWord.length;

            this.formatWord(range, startContainer, wordEnd, wordStart, wordEnd);

            updatedStartContainer =
                range.startContainer.parentElement.nextSibling;
            updatedStartOffset = 1;
        }

        if (EditorUtils.wordMatchesPattern(nextWord)) {
            const container = updatedStartContainer || startContainer;
            const offset = updatedStartOffset || startOffset;

            const word = nextWord.match(hashtagRegex)[0];
            const wordStart = offset;
            const wordEnd = wordStart + word.length;

            this.formatWord(range, container, offset, wordStart, wordEnd);

            updatedStartContainer = range.startContainer;
            updatedStartOffset = range.startOffset;
        }

        const rangeStartContainer =
            updatedStartContainer !== undefined
                ? updatedStartContainer
                : startContainer;
        const rangeStartOffset =
            updatedStartOffset !== undefined ? updatedStartOffset : startOffset;

        range.setStart(rangeStartContainer, rangeStartOffset);
        range.collapse(true);

        editor.normalize();
    },

    deleteMultipleCharacters: function (editor, range) {
        const { startContainer, startOffset, endContainer, endOffset } = range;

        const selectedText = range.toString();

        if (selectedText === editor.textContent) {
            this.removeAllEditorNodes(editor);
        } else {
            range.deleteContents();

            if (startContainer === endContainer) {
                if (
                    EditorUtils.textNodeFormatted(startContainer) &&
                    !hashtagRegex.test(startContainer.textContent)
                ) {
                    const updatedStart = this.resetFormatOfTextNode(
                        range,
                        startContainer
                    );

                    range.setStart(updatedStart, startOffset);
                    range.collapse(true);
                } else {
                    const prevNode = startContainer.previousElementSibling;
                    const nextNode = startContainer.nextElementSibling;

                    if (
                        startOffset === 0 &&
                        prevNode &&
                        EditorUtils.elementNodeFormatted(prevNode)
                    ) {
                        this.joinEndIntoStart(
                            range,
                            prevNode.firstChild,
                            startContainer,
                            prevNode.textContent.length
                        );
                    }

                    if (
                        startOffset === startContainer.textContent.length &&
                        nextNode &&
                        EditorUtils.elementNodeFormatted(nextNode)
                    ) {
                        this.joinEndIntoStart(
                            range,
                            startContainer,
                            nextNode.firstChild,
                            startOffset
                        );
                    }
                }
            } else {
                this.formatAndMergeAcrossContainers(
                    range,
                    startContainer,
                    startOffset,
                    endContainer,
                    endOffset
                );
            }
        }

        editor.normalize();
    },

    insertParagraph: function (editor, range, extraParagraphIfEmpty = false) {
        const selectedText = range.toString();

        if (
            editor.childNodes.length === 0 ||
            (!range.collapsed &&
                selectedText.length === editor.textContent.length)
        ) {
            // Remove all the editor nodes if it isn't empty but
            // all of its text content is selected
            this.removeAllEditorNodes(editor);

            const pNode1 = EditorUtils.createParagraphNode();

            editor.appendChild(pNode1);

            range.setStart(pNode1, 0);
            range.collapse(true);

            if (extraParagraphIfEmpty) {
                const pNode2 = EditorUtils.createParagraphNode();

                editor.appendChild(pNode2);

                range.setStart(pNode2, 0);
                range.collapse(true);
            }
        } else {
            const { startContainer, startOffset, endContainer } = range;

            const parentParagraph =
                EditorUtils.findParentParagraph(startContainer);

            if (
                (startContainer.nodeType === 3 &&
                    endContainer.nodeType === 3) ||
                parentParagraph.textContent.length === 0
            ) {
                range.deleteContents();

                range.selectNodeContents(parentParagraph);

                if (parentParagraph.lastChild.tagName === "BR") {
                    // Make sure to exclude the <br> element at the end of
                    // each paragraph from the selection
                    range.setEnd(
                        parentParagraph,
                        parentParagraph.childNodes.length - 1
                    );
                }
                range.setStart(startContainer, startOffset);

                const fragment = range.extractContents();

                const parent = parentParagraph.parentElement;

                const offset = EditorUtils.findNodeInParent(
                    parentParagraph,
                    parent
                );

                range.setStart(parent, offset);
                range.collapse(true);

                const pNode = EditorUtils.createParagraphNode();

                pNode.insertBefore(fragment, pNode.firstChild);

                range.insertNode(pNode);

                if (!EditorUtils.chromeBrowser()) {
                    // Addresses a behavior in Firefox where if the user
                    // presses Enter while at the start of a hashtag node
                    // the hashtag node will be moved to a new paragraph
                    // but there will be an empty hashtag node left in
                    // the previous paragraph
                    for (const node of parentParagraph.childNodes) {
                        if (
                            node.nodeType !== 3 &&
                            EditorUtils.elementNodeFormatted(node) &&
                            node.textContent.length === 0
                        ) {
                            parentParagraph.removeChild(node);
                        }
                    }
                }

                // This is added to fix an issue where there are sometimes
                // empty text nodes left in the paragraphs, which end up
                // causing issues for the formatAfterNewParagraph function
                editor.normalize();

                this.formatAfterNewParagraph(range, parentParagraph, pNode);

                const start =
                    pNode.firstChild && pNode.textContent.length > 0
                        ? pNode.firstChild
                        : pNode;

                range.setStart(start, 0);
                range.collapse(true);
            }
        }

        editor.normalize();
    },

    formatAndMergeAcrossContainers: function (
        range,
        startContainer,
        startOffset,
        endContainer,
        endOffset
    ) {
        let startTextNode = startContainer;
        let endTextNode = endContainer;
        let offset = startOffset;

        if (
            startOffset === 0 &&
            !EditorUtils.textNodeFormatted(startContainer)
        ) {
            const prevNode = startContainer.previousElementSibling;

            if (prevNode && EditorUtils.elementNodeFormatted(prevNode)) {
                startTextNode = prevNode.firstChild;
                offset = prevNode.textContent.length;
            }
        }

        if (endOffset === 0 && !EditorUtils.textNodeFormatted(endContainer)) {
            const nextNode = endContainer.nextElementSibling;

            if (nextNode && EditorUtils.elementNodeFormatted(nextNode)) {
                endTextNode = nextNode.firstChild;
            }
        }

        this.joinEndIntoStart(range, startTextNode, endTextNode, offset);
    },

    joinEndIntoStart: function (
        range,
        startContainer,
        endContainer,
        startOffset
    ) {
        /**
         * This function checks the end container and adds the text
         * inside it, up to the first space character, to the start
         * container. If the start container is formatted, then it
         * will check to ensure that the text still should be formatted.
         * If not, it will reset the format of the start container.
         *
         * If the end container was a formatted node, then it will
         * remove the span element.
         *
         * If the end container was empty, then this means there will
         * be two formatted elements next to each other. If they
         * should be joined then the function will join them and
         * make sure that the text should still be formatted and
         * reset the formatting if not.
         */

        if (startContainer.nodeType === 3 && endContainer.nodeType === 3) {
            const endContainerText = endContainer.textContent;

            // If the endContainer is empty, get the next element.
            // Otherwise, use the endContainer
            const endNode =
                endContainerText.length > 0
                    ? endContainer
                    : endContainer.nextElementSibling;

            if (endNode) {
                const endText = endNode.textContent;

                const offset = EditorUtils.findFirstNonwordInText(endText);

                // If endNode is a span element, get its first child, otherwise
                // use the endContainer
                const textNode = endNode.firstChild
                    ? endNode.firstChild
                    : endNode;

                range.setStart(textNode, 0);
                range.setEnd(textNode, offset);

                const textToAdd = range.toString();

                if (!nonWordPattern.test(textToAdd[0])) {
                    range.deleteContents();

                    startContainer.textContent += textToAdd;

                    if (
                        EditorUtils.textNodeFormatted(textNode) &&
                        offset === endText.length
                    ) {
                        const parent = textNode.parentElement.parentElement;

                        parent.removeChild(textNode.parentElement);
                    }

                    range.setStart(startContainer, startOffset);
                    range.collapse(true);

                    // Ensure that the text in the startContainer still
                    // matches the pattern of hashtag
                    if (
                        !EditorUtils.allTextMatchesPattern(startContainer) &&
                        EditorUtils.textNodeFormatted(startContainer)
                    ) {
                        const updatedTextNode = this.resetFormatOfTextNode(
                            range,
                            startContainer
                        );

                        range.setStart(updatedTextNode, startOffset);
                        range.collapse(true);
                    }
                }
            } else {
                // Reset the text selection if no changes were
                // applied. This is because the last step performed
                // before the if statement selects a range of
                // characters. If we don't reset the selection,
                // these characters will be removed by the input
                // event.
                range.setStart(startContainer, startOffset);
                range.collapse(true);
            }
        }
    },

    formatAfterNewParagraph: function (range, prevParagraph, currentParagraph) {
        const lastChild =
            prevParagraph.lastChild.tagName !== "BR"
                ? prevParagraph.lastChild
                : prevParagraph.lastChild.previousSibling ||
                  prevParagraph.lastChild.previousElementSibling;

        const lastTextNodeInPrev = EditorUtils.getTextNode(lastChild);

        if (lastTextNodeInPrev) {
            if (
                EditorUtils.textNodeFormatted(lastTextNodeInPrev) &&
                !hashtagRegex.test(lastTextNodeInPrev.textContent)
            ) {
                this.resetFormatOfTextNode(range, lastTextNodeInPrev);
            } else {
                const nodeText = lastTextNodeInPrev.textContent;
                const lastWord = EditorUtils.getCurrentWord(
                    nodeText,
                    nodeText.length
                );

                if (
                    !EditorUtils.textNodeFormatted(lastTextNodeInPrev) &&
                    EditorUtils.wordMatchesPattern(lastWord)
                ) {
                    const wordStart = nodeText.length - lastWord.length;
                    const wordEnd = nodeText.length;

                    this.formatWord(
                        range,
                        lastTextNodeInPrev,
                        nodeText.length,
                        wordStart,
                        wordEnd
                    );
                }
            }
        }

        const firstTextNodeInCurrent = EditorUtils.getTextNode(
            currentParagraph.firstChild
        );

        if (firstTextNodeInCurrent) {
            if (
                EditorUtils.textNodeFormatted(firstTextNodeInCurrent) &&
                !hashtagRegex.test(firstTextNodeInCurrent.textContent)
            ) {
                this.resetFormatOfTextNode(range, firstTextNodeInCurrent);
            } else {
                const currentWord = EditorUtils.getCurrentWord(
                    firstTextNodeInCurrent.textContent,
                    0
                );

                if (
                    !EditorUtils.textNodeFormatted(firstTextNodeInCurrent) &&
                    EditorUtils.wordMatchesPattern(currentWord)
                ) {
                    const word = currentWord.match(hashtagRegex)[0];
                    const wordStart = 0;
                    const wordEnd = wordStart + word.length;

                    this.formatWord(
                        range,
                        firstTextNodeInCurrent,
                        0,
                        wordStart,
                        wordEnd
                    );
                }
            }
        }
    },

    checkCurrentWord: function (range) {
        const { startContainer, startOffset } = range;

        let textNode;

        if (startContainer.nodeType === 3) {
            textNode = startContainer;
        } else {
            textNode = EditorUtils.getTextNode(startContainer);
        }

        if (textNode) {
            const currentWord = EditorUtils.getCurrentWord(
                textNode.textContent,
                startOffset
            ).trim();

            this.formatOrResetWord(range, textNode, startOffset, currentWord);
        }
    },

    formatOrResetWord: function (range, startContainer, startOffset, word) {
        if (
            EditorUtils.wordMatchesPattern(word) &&
            !EditorUtils.textNodeFormatted(startContainer)
        ) {
            const { wordStart, wordEnd } = EditorUtils.getWordBoundaries(
                startContainer.textContent,
                startOffset
            );

            this.formatWord(
                range,
                startContainer,
                startOffset,
                wordStart,
                wordEnd
            );
        } else if (
            !EditorUtils.wordMatchesPattern(word) &&
            EditorUtils.textNodeFormatted(startContainer)
        ) {
            this.removeTextFormatting(range, startContainer, 0, startOffset);
        }

        editor.normalize();
    },

    formatWord: function (
        range,
        startContainer,
        startOffset,
        wordStart,
        wordEnd
    ) {
        const span = document.createElement("span");
        span.className = "hashtag";

        range.setStart(startContainer, wordStart);
        range.setEnd(startContainer, wordEnd);

        range.surroundContents(span);

        range.setStart(span.firstChild, startOffset - wordStart);
        range.collapse(true);
    },

    removeTextFormatting: function (
        range,
        startContainer,
        startOffset,
        updatedOffset
    ) {
        range.selectNodeContents(startContainer);
        range.setStart(startContainer, startOffset);

        const text = range.toString();

        range.deleteContents();

        const parent = startContainer.parentElement.parentElement;

        const offset = EditorUtils.findNodeInParent(
            startContainer.parentElement,
            parent
        );

        range.setStart(parent, offset);
        range.collapse(true);

        const textNode = document.createTextNode(text);

        range.insertNode(textNode);

        if (startOffset === 0) {
            parent.removeChild(startContainer.parentElement);
        }

        range.setStart(textNode, updatedOffset);
        range.collapse(true);
    },

    resetFormatOfTextNode: function (range, node) {
        const nodeText = node.textContent;

        const parent = node.parentElement.parentElement;

        const offset = EditorUtils.findNodeInParent(node.parentElement, parent);

        range.setStart(parent, offset);
        range.collapse(true);

        const textNode = document.createTextNode(nodeText);

        range.insertNode(textNode);

        parent.removeChild(node.parentElement);

        return textNode;
    },

    removeAllEditorNodes: function (editor) {
        EditorUtils.removeAllChildNodes(editor);
    },
};

export default EditorCommon;
