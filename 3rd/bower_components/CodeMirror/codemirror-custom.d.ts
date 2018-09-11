import * as CodeMirror from "codemirror";

declare module "codemirror" {
    function pythonHint(cm: CodeMirror.Editor): any;

    interface Editor {
        getCursor(start?: string): {line: number, ch: number};
        removeLineWidget(widget: CodeMirror.LineWidget): void;
        clearHistory(): void;
    }

    interface ShowHintOptions {
        alignWithWord: boolean;
        completeOnSingleClick: boolean;
        hint?: HintFunction | AsyncHintFunction;
    }

    interface EditorConfiguration {
        matchBrackets: boolean;
        autoCloseBrackets: boolean;
        search: boolean;
    }
}
