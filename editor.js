const editor = document.querySelector("#editor");

const hashtagRegex = /#\w*[a-zA-Z]+\w*/;
const nonWordPattern = /[ \W]/;

/**
 * TODO (Abdelrahman): Reimplement deleting across paragraphs.
 *
 * There are loads of issues with the implementation I had
 * before and this is why it was scraped.
 *
 * Some of the issues were:
 * 1) When last word of previous paragraph is hashtag,
 * first word of next paragraph is not and the user deletes
 * so the next paragraph is joined with previous one, with
 * the last word and first word is joined with no spaces in
 * between, the first word of the next paragraph is not
 * converted into hashtag.
 * 2) When partially selecting across multiple paragraphs,
 * the last paragraph isn't deleted and its text joined
 * with the first one as it should be. What ends up happening
 * is that part of the paragraph text after the space is
 * left behind, because that is what deleting across
 * different containers currently does.
 */

/**
 * TODO (Abdelrahman): Improve the join into end function.
 * Currently, it can result in two hashtag nodes next to
 * with no space in between and without them being joined
 * together. This usually happens if the user deletes all
 * non-hashtag text in between two hashtags resulting in
 * text that looks like this:
 * #hashtag1#hashtag2
 *
 * Each one of these two hashtags is in its own node, and
 * they are both formatted as hashtags.
 *
 * There are two issues with this outcome:
 * 1) If there are two nodes next to each other with no
 * separating character in between, then they should be
 * joined together.
 * 2) More importantly, this text shouldn't be formatted
 * because the overall text of the two nodes doesn't
 * actually match the pattern that should be formatted.
 */

editor.addEventListener("beforeinput", (event) => {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);

    if (
        editor.childNodes.length === 0 &&
        event.inputType !== "insertParagraph"
    ) {
        insertParagraph(range, false);
    }

    if (event.inputType === "insertParagraph") {
        event.preventDefault();

        insertParagraph(range, true);
    }

    if (
        nonWordPattern.test(event.data) &&
        event.data !== "#" &&
        !chromeBrowser()
    ) {
        /**
         * Handling these characters in the beforeinput event
         * doesn't work as expected on Chromium-based browsers,
         * so they are handled in the input event instead.
         */

        handleNonWordCharKeys(range);
    } else if (
        (event.data && !nonWordPattern.test(event.data)) ||
        event.data === "#"
    ) {
        positionCursorForOthCharInput(range);
    } else if (
        event.inputType.includes("delete") &&
        range.startContainer !== range.endContainer
    ) {
        event.preventDefault();

        deleteAcrossContainers(range);
    }
});

editor.addEventListener("input", (event) => {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);

    if (
        nonWordPattern.test(event.data) &&
        event.data !== "#" &&
        chromeBrowser()
    ) {
        handleNonWordCharKeys(range);
    }

    if (
        (event.data && !nonWordPattern.test(event.data)) ||
        event.data === "#" ||
        (event.inputType.includes("delete") &&
            range.startContainer === range.endContainer)
    ) {
        addOrDeleteInSameContainer(range);
    }

    if (
        event.inputType.includes("delete") &&
        editor.childNodes.length <= 1 &&
        editor.textContent.length === 0
    ) {
        removeAllEditorNodes();
    }
});

/**
 * TODO (Abdelrahman): This doesn't work properly in Chrome yet when
 * selection spans multiple containers and the end container is
 * formatted. Because in Chrome the cursor ends in the start container
 * rather than the end, if adding a space breaks the hashtag pattern
 * in the end container, its format doesn't get reset as it is
 * supposed to do.
 *
 * Seeing how complex things are getting because of the difference
 * in behavior between browsers, I think it might be a better option
 * to separate the functions into simpler ones that work for each
 * platform and then call the appropriate one depending on the user's
 * platform.
 */
function handleNonWordCharKeys(range) {
    const { startContainer, startOffset, endContainer, endOffset } = range;

    if (startContainer === endContainer) {
        if (startContainer.nodeType === 3) {
            if (textNodeFormatted(startContainer)) {
                if (!chromeBrowser()) {
                    /**
                     * Only delete the contents of the range when on
                     * non-Chrome browsers. This is because on Chrome
                     * browsers, this function is called from the
                     * input event rather that the beforeinput event,
                     * so the contents of the range have already been
                     * deleted.
                     */

                    range.deleteContents();
                }

                const nodeText = startContainer.textContent;

                if (hashtagRegex.test(nodeText.slice(0, startOffset))) {
                    let slice, offset, updatedOffset;

                    if (chromeBrowser()) {
                        /**
                         * Because in Chrome browsers, this function is called
                         * in the input event, so the character handled has
                         * already been added, we need to go back one character
                         * to get the hashtag text and to separate all the text
                         * that comes after it.
                         */

                        slice = nodeText.slice(0, startOffset - 1);
                        offset = startOffset - 1;
                        updatedOffset = 1;
                    } else {
                        slice = nodeText.slice(0, startOffset);
                        offset = startOffset;
                        updatedOffset = 0;
                    }

                    removeTextFormatting(
                        range,
                        startContainer,
                        offset,
                        updatedOffset
                    );
                } else {
                    removeTextFormatting(range, startContainer, 0, startOffset);
                }
            }
        }
    } else {
        if (!chromeBrowser()) {
            /**
             * Only delete the contents of the range when on
             * non-Chrome browsers. This is because on Chrome
             * browsers, this function is called from the
             * input event rather that the beforeinput event,
             * so the contents of the range have already been
             * deleted.
             */

            range.deleteContents();
        }

        let updatedStartContainer = startContainer;
        let updatedEndContainer = endContainer;

        if (
            startContainer.nodeType === 3 &&
            textNodeFormatted(startContainer)
        ) {
            if (!hashtagRegex.test(startContainer.textContent)) {
                updatedStartContainer = resetFormatOfTextNode(
                    range,
                    startContainer
                );
            }
        }

        if (endContainer.nodeType === 3 && textNodeFormatted(endContainer)) {
            if (!hashtagRegex.test(endContainer.textContent)) {
                updatedEndContainer = resetFormatOfTextNode(
                    range,
                    endContainer
                );
            }
        }

        range.setStart(updatedEndContainer, 0);
        range.collapse(true);
    }

    editor.normalize();
}

function addOrDeleteInSameContainer(range) {
    const { startContainer, startOffset } = range;

    const currentWord = getCurrentWord(
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
        !textNodeFormatted(startContainer)
    ) {
        const { wordStart, wordEnd } = getWordBoundaries(
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
        textNodeFormatted(startContainer)
    ) {
        removeTextFormatting(range, startContainer, 0, startOffset);
    }

    editor.normalize();
}

function deleteAcrossContainers(range) {
    const { startContainer, startOffset, endContainer, endOffset } = range;

    const selectedText = range.toString();

    if (selectedText === editor.textContent) {
        removeAllEditorNodes();
    } else {
        range.deleteContents();

        joinEndIntoStart(range, startContainer, endContainer, startOffset);
    }

    editor.normalize();
}

function positionCursorForOthCharInput(range) {
    const { startContainer, startOffset, endContainer, endOffset } = range;

    range.deleteContents();

    if (startContainer === endContainer) {
        if (startContainer.nodeType === 3) {
            const prevNode = startContainer.previousElementSibling;
            const nextNode = startContainer.nextElementSibling;

            if (
                !textNodeFormatted(startContainer) &&
                startOffset === 0 &&
                prevNode &&
                elementNodeFormatted(prevNode)
            ) {
                range.setStart(
                    prevNode.firstChild,
                    prevNode.textContent.length
                );
            }

            if (
                !textNodeFormatted(startContainer) &&
                startOffset === startContainer.textContent.length &&
                nextNode &&
                elementNodeFormatted(nextNode)
            ) {
                range.setStart(nextNode.firstChild, 0);
            }
        }
    } else {
        joinEndIntoStart(range, startContainer, endContainer, startOffset);
    }
}

function insertParagraph(range, enterKeyOnEmptyEditor = false) {
    if (editor.childNodes.length === 0) {
        const pNode1 = createParagraphNode();

        editor.appendChild(pNode1);

        range.setStart(pNode1, 0);
        range.collapse(true);

        if (enterKeyOnEmptyEditor) {
            const pNode2 = createParagraphNode();

            editor.appendChild(pNode2);

            range.setStart(pNode2, 0);
            range.collapse(true);
        }
    } else {
        const { startContainer, startOffset, endContainer, endOffset } = range;

        const parentParagraph = findParentParagraph(startContainer);

        if (
            (startContainer.nodeType === 3 && endContainer.nodeType === 3) ||
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

            const offset = findNodeInParent(parentParagraph, parent);

            range.setStart(parent, offset);
            range.collapse(true);

            const pNode = createParagraphNode();

            pNode.insertBefore(fragment, pNode.firstChild);

            range.insertNode(pNode);

            formatAfterNewParagraph(range, parentParagraph, pNode);

            const start = pNode.firstChild || pNode;

            range.setStart(start, 0);
            range.collapse(true);
        }
    }
}

function joinEndIntoStart(range, startContainer, endContainer, startOffset) {
    if (startContainer.nodeType === 3 && endContainer.nodeType === 3) {
        const endText = endContainer.textContent;
        const firstSpaceInEnd = endText.indexOf(" ");

        const offset = firstSpaceInEnd >= 0 ? firstSpaceInEnd : endText.length;

        range.setStart(endContainer, 0);
        range.setEnd(endContainer, offset);

        const textToAdd = range.toString();

        range.deleteContents();

        startContainer.textContent += textToAdd;

        if (textNodeFormatted(endContainer) && offset === endText.length) {
            const parent = endContainer.parentElement.parentElement;

            parent.removeChild(endContainer.parentElement);
        }

        range.setStart(startContainer, startOffset);
        range.collapse(true);

        // Ensure that the text in the startContainer still
        // matches the pattern of hashtag
        if (!allTextMatchesPattern(startContainer)) {
            const updatedTextNode = resetFormatOfTextNode(startContainer);

            range.setStart(updatedTextNode, startOffset);
            range.collapse(true);
        }
    }
}

function removeTextFormatting(
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

    const offset = findNodeInParent(startContainer.parentElement, parent);

    range.setStart(parent, offset);
    range.collapse(true);

    const textNode = document.createTextNode(text);

    range.insertNode(textNode);

    if (startOffset === 0) {
        parent.removeChild(startContainer.parentElement);
    }

    range.setStart(textNode, updatedOffset);
    range.collapse(true);
}

function resetFormatOfTextNode(range, node) {
    const nodeText = node.textContent;

    const parent = node.parentElement.parentElement;

    const offset = findNodeInParent(node.parentElement, parent);

    range.setStart(parent, offset);
    range.collapse(true);

    const textNode = document.createTextNode(nodeText);

    range.insertNode(textNode);

    parent.removeChild(node.parentElement);

    return textNode;
}

function formatAfterNewParagraph(range, prevParagraph, currentParagraph) {
    const lastChild =
        prevParagraph.lastChild.tagName !== "BR"
            ? prevParagraph.lastChild
            : prevParagraph.lastChild.previousSibling ||
              prevParagraph.lastChild.previousElementSibling;

    const lastTextNodeInPrev = getTextNode(lastChild);

    if (
        lastTextNodeInPrev &&
        textNodeFormatted(lastTextNodeInPrev) &&
        !hashtagRegex.test(lastTextNodeInPrev.textContent)
    ) {
        resetFormatOfTextNode(range, lastTextNodeInPrev);
    }

    const firstTextNodeInCurrent = getTextNode(currentParagraph.firstChild);

    if (
        firstTextNodeInCurrent &&
        textNodeFormatted(firstTextNodeInCurrent) &&
        !hashtagRegex.test(firstTextNodeInCurrent.textContent)
    ) {
        resetFormatOfTextNode(range, firstTextNodeInCurrent);
    }
}

function createParagraphNode() {
    const para = document.createElement("p");
    const breakNode = document.createElement("br");

    para.appendChild(breakNode);

    return para;
}

function removeAllEditorNodes() {
    while (editor.firstChild) {
        editor.removeChild(editor.firstChild);
    }
}

function findParentParagraph(node) {
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
}

function findNodeInParent(node, parent) {
    let offset = 0;

    for (const child of parent.childNodes) {
        ++offset;

        if (child === node) {
            break;
        }
    }

    return offset;
}

function getTextNode(node) {
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
}

function textNodeFormatted(node) {
    if (!node) {
        return false;
    }

    return node.parentElement.className === "hashtag";
}

function elementNodeFormatted(node) {
    if (!node) {
        return false;
    }

    return node.className === "hashtag";
}

function allTextMatchesPattern(node) {
    const text = node.textContent;

    const match = text.match(hashtagRegex);

    return match && match.index === 0 && match[0].length === text.length;
}

function getCurrentWord(text, currentIndex) {
    const { wordStart, wordEnd } = getWordBoundaries(text, currentIndex);

    return text.slice(wordStart, wordEnd);
}

function getWordBoundaries(text, currentIndex) {
    const before = text.slice(0, currentIndex);
    const after = text.slice(currentIndex);

    const wordStart = before.lastIndexOf(" ") + 1;

    const firstSpaceAfter = after.indexOf(" ");

    const wordEnd =
        firstSpaceAfter >= 0 ? currentIndex + firstSpaceAfter : text.length;

    return { wordStart, wordEnd };
}

function chromeBrowser() {
    return navigator.userAgent.includes("Chrome");
}
