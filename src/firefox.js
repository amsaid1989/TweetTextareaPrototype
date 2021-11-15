import EditorCommon from "./common.js";
import EditorUtils from "./utils.js";
import { hashtagRegex, nonWordPattern } from "./patterns.js";

const EditorFirefox = {
    removeFormatAfterNonWordCharacter: function (editor, range) {
        /**
         * TODO (Abdelrahman): There is a lot of duplication between this
         * function and the Chrome's version. Clean this duplication up.
         */

        const { startContainer, startOffset, endContainer, endOffset } = range;

        if (startContainer === endContainer || endOffset === 0) {
            if (startContainer.nodeType === 3) {
                if (EditorUtils.textNodeFormatted(startContainer)) {
                    range.deleteContents();

                    const nodeText = startContainer.textContent;

                    if (hashtagRegex.test(nodeText.slice(0, startOffset))) {
                        const offset = startOffset;
                        const updatedOffset = 0;

                        EditorCommon.removeTextFormatting(
                            range,
                            startContainer,
                            offset,
                            updatedOffset
                        );
                    } else {
                        EditorCommon.removeTextFormatting(
                            range,
                            startContainer,
                            0,
                            startOffset
                        );
                    }
                }
            }
        } else {
            range.deleteContents();

            let updatedEndContainer = endContainer;

            if (
                startContainer.nodeType === 3 &&
                EditorUtils.textNodeFormatted(startContainer)
            ) {
                if (!hashtagRegex.test(startContainer.textContent)) {
                    EditorCommon.resetFormatOfTextNode(range, startContainer);
                }
            }

            if (
                endContainer.nodeType === 3 &&
                EditorUtils.textNodeFormatted(endContainer)
            ) {
                if (!hashtagRegex.test(endContainer.textContent)) {
                    updatedEndContainer = EditorCommon.resetFormatOfTextNode(
                        range,
                        endContainer
                    );
                }
            }

            range.setStart(updatedEndContainer, 0);
            range.collapse(true);
        }

        editor.normalize();
    },

    formatAfterSingleCharDeletion: function (editor, range) {
        const { startContainer, startOffset } = range;

        const nodeText = startContainer.textContent;

        if (startContainer.nodeType === 3) {
            if (
                (startOffset === 0 && !nonWordPattern.test(nodeText[0])) ||
                (startOffset === nodeText.length &&
                    !nonWordPattern.test(nodeText[nodeText.length - 1]))
            ) {
                let prevTextNode, nextTextNode;

                if (EditorUtils.textNodeFormatted(startContainer)) {
                    prevTextNode = EditorUtils.getTextNode(
                        startContainer.parentElement.previousSibling ||
                            startContainer.parentElement.previousElementSibling
                    );
                    nextTextNode = EditorUtils.getTextNode(
                        startContainer.parentElement.nextSibling ||
                            startContainer.parentElement.nextElementSibling
                    );
                } else {
                    prevTextNode = EditorUtils.getTextNode(
                        startContainer.previousSibling ||
                            startContainer.previousElementSibling
                    );
                    nextTextNode = EditorUtils.getTextNode(
                        startContainer.nextSibling ||
                            startContainer.nextElementSibling
                    );
                }

                const prevText = prevTextNode?.textContent;

                if (
                    prevTextNode &&
                    !nonWordPattern.test(prevText[prevText.length - 1])
                ) {
                    EditorCommon.joinEndIntoStart(
                        range,
                        prevTextNode,
                        startContainer,
                        prevTextNode.textContent.length
                    );
                }

                if (
                    nextTextNode &&
                    startOffset === startContainer.textContent.length &&
                    !nonWordPattern.test(nextTextNode.textContent[0])
                ) {
                    EditorCommon.joinEndIntoStart(
                        range,
                        startContainer,
                        nextTextNode,
                        startOffset
                    );
                }
            }
        } else {
            /**
             * When the user deletes the space between two hashtag elements
             * the range ends up selecting the parent paragraph rather than
             * one of the two text nodes in those elements.
             */

            const startTextNode =
                startContainer.childNodes[startOffset - 1]?.firstChild;
            const endTextNode =
                startContainer.childNodes[startOffset]?.firstChild;

            if (
                startTextNode &&
                endTextNode &&
                !nonWordPattern.test(endTextNode.textContent[0])
            ) {
                EditorCommon.joinEndIntoStart(
                    range,
                    startTextNode,
                    endTextNode,
                    startTextNode.textContent.length
                );
            } else if (startTextNode) {
                /**
                 * This addresses a unique behavior in Firefox where
                 * if the user enters a hashtag, then adds a space
                 * but end up removing it, going back to the hashtag
                 * node, the range ends up selecting the parent
                 * paragraph of the hashtag element, rather than the
                 * text node inside the hashtag element.
                 */

                range.setStart(startTextNode, startTextNode.textContent.length);
                range.collapse(true);
            }
        }

        editor.normalize();
    },
};

export default EditorFirefox;
