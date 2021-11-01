import EditorCommon from "./common.js";

const editor = document.querySelector("#editor");

const hashtagRegex = /#\w*[a-zA-Z]+\w*/;
const nonWordPattern = /[ \W]/;

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
        (event.data && !nonWordPattern.test(event.data)) ||
        event.data === "#"
    ) {
        EditorCommon.positionCursorForOtherCharInput(range);
    }
});

editor.addEventListener("input", (event) => {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);

    if (
        (event.data && !nonWordPattern.test(event.data)) ||
        event.data === "#" ||
        (event.inputType.includes("delete") &&
            range.startContainer === range.endContainer)
    ) {
        EditorCommon.addOrDeleteInSameContainer(editor, range);
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
