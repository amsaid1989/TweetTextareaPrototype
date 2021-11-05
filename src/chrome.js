import EditorCommon from "./common.js";
import EditorUtils from "./utils.js";
import { hashtagRegex, nonWordPattern } from "./patterns.js";

const EditorChrome = {
    addNonWordCharacter: function (editor, range) {
        /**
         * TODO (Abdelrahman): There is a lot of duplication between this
         * function and the Firefox's version, so it needs to be cleaned up.
         */

        const { startContainer, startOffset, endContainer, endOffset } = range;

        if (startContainer === endContainer) {
            if (startContainer.nodeType === 3) {
                if (EditorUtils.textNodeFormatted(startContainer)) {
                    const nodeText = startContainer.textContent;

                    if (hashtagRegex.test(nodeText.slice(0, startOffset))) {
                        let slice, offset, updatedOffset;

                        offset = startOffset - 1;
                        updatedOffset = 1;

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

        if (startContainer.nodeType === 3) {
            let nextTextNode;

            if (EditorUtils.textNodeFormatted(startContainer)) {
                nextTextNode =
                    startContainer.parentElement.nextElementSibling
                        ?.firstChild ||
                    startContainer.parentElement.nextSibling;
            } else {
                nextTextNode =
                    startContainer.nextElementSibling?.firstChild ||
                    startContainer.nextSibling;
            }

            if (
                nextTextNode &&
                startOffset === startContainer.textContent.length &&
                (!nonWordPattern.test(nextTextNode.textContent[0]) ||
                    nextTextNode.textContent[0] === "#")
            ) {
                EditorCommon.joinEndIntoStart(
                    range,
                    startContainer,
                    nextTextNode,
                    startOffset
                );
            }
        }

        editor.normalize();
    },
};

export default EditorChrome;
