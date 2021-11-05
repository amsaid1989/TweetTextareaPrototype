import EditorUtils from "./utils.js";
import { hashtagRegex, nonWordPattern } from "./patterns.js";

const EditorCommon = {
    positionCursorForOtherCharInput: function (range) {
        const { startContainer, startOffset, endContainer, collapsed } = range;

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
            this.joinEndIntoStart(
                range,
                startContainer,
                endContainer,
                startOffset
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

        const { startContainer, startOffset } = range;

        const currentWord = EditorUtils.getCurrentWord(
            startContainer.textContent,
            startOffset
        ).trim();

        /**
         * In this function, the matching against the regex pattern
         * is done using the String.match method rather than the
         * RegExp.test method.
         * This is because here were are matching the current word,
         * so we need the entire word to match the pattern. This
         * could be achieved by using the '^' and '$' tokens in
         * the pattern itself, but that makes it harder to use the
         * pattern in other cases, where we just want to test if
         * a string contains a word that matches the pattern,
         * even if the entire string doesn't match.
         * Therefore, I resorted to using the String.match method
         * and testing the index of the match to make sure it starts
         * at the beginning of the word
         */

        const match = currentWord.match(hashtagRegex);

        if (
            match &&
            match.index === 0 &&
            match[0].trim().length === currentWord.length &&
            !EditorUtils.textNodeFormatted(startContainer)
        ) {
            const { wordStart, wordEnd } = EditorUtils.getWordBoundaries(
                startContainer.textContent,
                startOffset
            );

            const span = document.createElement("span");
            span.className = "hashtag";

            range.setStart(startContainer, wordStart);
            range.setEnd(startContainer, wordEnd);

            range.surroundContents(span);

            range.setStart(span.firstChild, startOffset - wordStart);
            range.collapse(true);
        } else if (
            (!hashtagRegex.test(currentWord) ||
                match.index !== 0 ||
                match[0].trim().length !== currentWord.length) &&
            EditorUtils.textNodeFormatted(startContainer)
        ) {
            this.removeTextFormatting(range, startContainer, 0, startOffset);
        }

        editor.normalize();
    },

    deleteAcrossContainers: function (editor, range) {
        const { startContainer, startOffset, endContainer } = range;

        const selectedText = range.toString();

        if (selectedText === editor.textContent) {
            this.removeAllEditorNodes(editor);
        } else {
            range.deleteContents();

            if (startContainer !== endContainer) {
                this.joinEndIntoStart(
                    range,
                    startContainer,
                    endContainer,
                    startOffset
                );
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

        editor.normalize();
    },

    insertParagraph: function (editor, range, extraParagraphIfEmpty = false) {
        if (editor.childNodes.length === 0) {
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

            const endText = endNode.textContent;

            const offset = EditorUtils.findFirstSpaceInText(endText);

            if (endNode) {
                // If endNode is a span element, get its first child, otherwise
                // use the endContainer
                const textNode = endNode.firstChild
                    ? endNode.firstChild
                    : endNode;

                range.setStart(textNode, 0);
                range.setEnd(textNode, offset);

                const textToAdd = range.toString();

                if (
                    !nonWordPattern.test(textToAdd[0]) ||
                    textToAdd[0] === "#"
                ) {
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

        if (
            lastTextNodeInPrev &&
            EditorUtils.textNodeFormatted(lastTextNodeInPrev) &&
            !hashtagRegex.test(lastTextNodeInPrev.textContent)
        ) {
            this.resetFormatOfTextNode(range, lastTextNodeInPrev);
        }

        const firstTextNodeInCurrent = EditorUtils.getTextNode(
            currentParagraph.firstChild
        );

        if (
            firstTextNodeInCurrent &&
            EditorUtils.textNodeFormatted(firstTextNodeInCurrent) &&
            !hashtagRegex.test(firstTextNodeInCurrent.textContent)
        ) {
            this.resetFormatOfTextNode(range, firstTextNodeInCurrent);
        }
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
        while (editor.firstChild) {
            editor.removeChild(editor.firstChild);
        }
    },
};

export default EditorCommon;
