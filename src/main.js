import EditorCommon from "./common.js";
import EditorFirefox from "./firefox.js";
import EditorChrome from "./chrome.js";
import EditorUtils from "./utils.js";
import { nonWordPattern } from "./patterns.js";

const editor = document.querySelector("#editor");

editor.addEventListener("beforeinput", (event) => {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);

    if (
        editor.childNodes.length === 0 &&
        event.inputType !== "insertParagraph"
    ) {
        EditorCommon.insertParagraph(editor, range, false);
    }

    if (event.inputType === "insertParagraph") {
        event.preventDefault();

        EditorCommon.insertParagraph(editor, range, true);
    }

    if (
        nonWordPattern.test(event.data) &&
        event.data !== "#" &&
        !EditorUtils.chromeBrowser()
    ) {
        EditorFirefox.removeFormatAfterNonWordCharacter(editor, range);
    } else if (
        event.data &&
        (!nonWordPattern.test(event.data) || event.data === "#")
    ) {
        EditorCommon.positionCursorForOtherCharInput(editor, range);
    } else if (event.inputType.includes("delete") && !range.collapsed) {
        event.preventDefault();

        // Handles how a selection of characters is deleted
        EditorCommon.deleteMultipleCharacters(editor, range);
    }
});

editor.addEventListener("input", (event) => {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);

    if (
        nonWordPattern.test(event.data) &&
        event.data !== "#" &&
        EditorUtils.chromeBrowser()
    ) {
        EditorChrome.removeFormatAfterNonWordCharacter(editor, range);
    }

    if (
        event.data ||
        (event.inputType.includes("delete") &&
            range.startContainer === range.endContainer)
    ) {
        if (nonWordPattern.test(event.data) && event.data !== "#") {
            EditorCommon.addNonWordCharInSameContainer(editor, range);
        } else {
            // This handles formatting or resetting the format of
            // a word when the user adds or deletes characters
            EditorCommon.addOrDeleteInSameContainer(editor, range);
        }

        if (event.inputType.includes("delete")) {
            /**
             * When user deletes the space separating non formatted
             * text node from a formatted hashtag node before it,
             * Chrome by default places the cursor at the end of
             * the hashtag node.
             *
             * Firefox, on the other hand, places the cursor at
             * the start of the text node, so the formatting in
             * this case needs to be handled differently between
             * the two browsers.
             */

            if (EditorUtils.chromeBrowser()) {
                EditorChrome.formatAfterSingleCharDeletion(editor, range);
            } else {
                EditorFirefox.formatAfterSingleCharDeletion(editor, range);
            }
        }
    }

    if (
        event.inputType.includes("delete") &&
        editor.childNodes.length <= 1 &&
        editor.textContent.length === 0
    ) {
        EditorCommon.removeAllEditorNodes(editor);
    }
});

editor.focus();
