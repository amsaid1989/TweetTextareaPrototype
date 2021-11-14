import EditorCommon from "./common.js";
import EditorUtils from "./utils.js";
import { hashtagRegex, nonWordPattern } from "./patterns.js";

const EditorChrome = {
    removeFormatAfterNonWordCharacter: function (editor, range) {
        /**
         * TODO (Abdelrahman): There is a lot of duplication between this
         * function and the Firefox's version, so it needs to be cleaned up.
         */

        const { startContainer, startOffset, endContainer } = range;

        if (startContainer === endContainer) {
            if (startContainer.nodeType === 3) {
                if (EditorUtils.textNodeFormatted(startContainer)) {
                    const nodeText = startContainer.textContent;

                    if (hashtagRegex.test(nodeText.slice(0, startOffset))) {
                        let offset, updatedOffset;

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
                } else {
                    const parent =
                        startContainer.parentElement?.parentElement
                            ?.parentElement;

                    if (
                        parent &&
                        EditorUtils.elementNodeFormatted(parent) &&
                        !hashtagRegex.test(startContainer.textContent)
                    ) {
                        /**
                         * This handles a very specific behavior in Chrome
                         * where, if the user selects all the text between
                         * two hashtags then adds a non-word character, the
                         * browser would take that non-word character,
                         * append it into the first hashtag element and wrap
                         * it with some auto-generated HTML tags making it
                         * an extra element within the hashtag element.
                         *
                         * This extra element is not going to be detectable
                         * as a formatted element despite the fact that it
                         * is.
                         *
                         * The following code basically handles that case,
                         * by going three levels up to get the parent
                         * hashtag element, removing the extra non-word
                         * character and adding it into its own non-formatted
                         * text node.
                         *
                         * NOTE (Abdelrahman): This could break if Chrome
                         * changes the way it handles Range objects, so it
                         * might need to be updated in the future.
                         */

                        const hashtagText = parent.firstChild.textContent;
                        const containerText = startContainer.textContent;

                        EditorUtils.removeAllChildNodes(parent);

                        parent.textContent = hashtagText;

                        const textNode = document.createTextNode(containerText);

                        const paragraphNode = parent.parentElement;

                        const offset = EditorUtils.findNodeInParent(
                            parent,
                            paragraphNode
                        );

                        range.setStart(paragraphNode, offset);
                        range.collapse(true);

                        range.insertNode(textNode);

                        // The insert node method of the Range object sets
                        // the startOffset at the beginning of the node, but
                        // it needs to be at the end so the cursor is
                        // positioned after the recently added character.
                        range.setStart(
                            range.startContainer,
                            range.startOffset + 1
                        );
                        range.collapse(true);
                    }
                }
            }
        }

        if (range.startOffset === range.startContainer.textContent.length) {
            const nextNode =
                range.startContainer.nextElementSibling ||
                range.startContainer.parentElement.nextElementSibling;

            if (
                nextNode &&
                EditorUtils.elementNodeFormatted(nextNode) &&
                !hashtagRegex.test(nextNode.textContent)
            ) {
                EditorCommon.resetFormatOfTextNode(range, nextNode.firstChild);
            }
        }

        editor.normalize();
    },

    formatAfterSingleCharDeletion: function (editor, range) {
        const { startContainer, startOffset } = range;

        if (startContainer.nodeType === 3) {
            let nextTextNode;

            if (EditorUtils.textNodeFormatted(startContainer)) {
                nextTextNode = EditorUtils.getTextNode(
                    startContainer.parentElement.nextSibling ||
                        startContainer.parentElement.nextElementSibling
                );
            } else {
                nextTextNode = EditorUtils.getTextNode(
                    startContainer.nextSibling ||
                        startContainer.nextElementSibling
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

        editor.normalize();
    },
};

export default EditorChrome;
