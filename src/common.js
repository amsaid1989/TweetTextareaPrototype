import EditorUtils from "./utils.js";

const hashtagRegex = /#\w*[a-zA-Z]+\w*/;
const nonWordPattern = /[ \W]/;

const EditorCommon = {
    positionCursorForOtherCharInput: function (range) {
        const { startContainer, startOffset, endContainer } = range;

        range.deleteContents();

        if (startContainer === endContainer) {
            if (startContainer.nodeType === 3) {
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

    joinEndIntoStart: function (
        range,
        startContainer,
        endContainer,
        startOffset
    ) {
        if (startContainer.nodeType === 3 && endContainer.nodeType === 3) {
            const endText = endContainer.textContent;
            const firstSpaceInEnd = endText.indexOf(" ");

            const offset =
                firstSpaceInEnd >= 0 ? firstSpaceInEnd : endText.length;

            range.setStart(endContainer, 0);
            range.setEnd(endContainer, offset);

            const textToAdd = range.toString();

            range.deleteContents();

            startContainer.textContent += textToAdd;

            if (
                EditorUtils.textNodeFormatted(endContainer) &&
                offset === endText.length
            ) {
                const parent = endContainer.parentElement.parentElement;

                parent.removeChild(endContainer.parentElement);
            }

            range.setStart(startContainer, startOffset);
            range.collapse(true);

            // Ensure that the text in the startContainer still
            // matches the pattern of hashtag
            if (!EditorUtils.allTextMatchesPattern(startContainer)) {
                const updatedTextNode = this.resetFormatOfTextNode(
                    range,
                    startContainer
                );

                range.setStart(updatedTextNode, startOffset);
                range.collapse(true);
            }
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

    insertParagraph: function (editor, range, enterKeyOnEmptyEditor = false) {
        if (editor.childNodes.length === 0) {
            const pNode1 = EditorUtils.createParagraphNode();

            editor.appendChild(pNode1);

            range.setStart(pNode1, 0);
            range.collapse(true);

            if (enterKeyOnEmptyEditor) {
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
