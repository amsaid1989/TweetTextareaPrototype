import EditorCommon from "./common.js";
import EditorUtils from "./utils.js";

const hashtagRegex = /#\w*[a-zA-Z]+\w*/;
const nonWordPattern = /[ \W]/;

const EditorFirefox = {
    addNonWordCharacter: function (editor, range) {
        /**
         * TODO (Abdelrahman): There is a lot of duplication between this
         * function and the Chrome's version. Clean this duplication up.
         */

        const { startContainer, startOffset, endContainer } = range;

        if (startContainer === endContainer) {
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

        const prevNode = startContainer.previousElementSibling;

        if (
            startContainer.nodeType === 3 &&
            prevNode &&
            EditorUtils.elementNodeFormatted(prevNode)
        ) {
            const prevTextNode = prevNode.firstChild;

            if (
                startOffset === 0 &&
                (!nonWordPattern.test(startContainer.textContent[0]) ||
                    startContainer.textContent[0] === "#")
            ) {
                EditorCommon.joinEndIntoStart(
                    range,
                    prevTextNode,
                    startContainer,
                    prevTextNode.textContent.length
                );
            }
        }

        editor.normalize();
    },
};

export default EditorFirefox;
