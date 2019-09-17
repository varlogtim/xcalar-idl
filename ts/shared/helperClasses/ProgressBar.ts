interface ProgressBarOptions {
    $container: JQuery, // the element that .xc-progressBar resides in
    progressTexts: string[], // status text to loop through
    numVisibleProgressTexts: number, // number of status texts that should be visible
    completionTime: number, // estimated time the operation should take to complete
    startText?: string // optional string to display at start
}

class ProgressBar {
    private _$container: JQuery;
    private _isStarted: boolean = false;
    private _isCompleted: boolean = false;
    private _startWidth: number = 5;
    private _maxProgressBarWidth = 95;
    private _numVisibleProgressTexts = 5;
    private _firstTextId: number = 0;
    private _width: number;
    private _completionTime: number;
    private _fastCompletionTime: number;
    private _progressTexts: string[];
    private _tickTime: number;
    private _progressTimeout: NodeJS.Timeout;
    private _startText: string;

    constructor(options: ProgressBarOptions) {
        this._$container = options.$container;
        this._progressTexts = options.progressTexts;
        this._numVisibleProgressTexts = options.numVisibleProgressTexts;
        this._completionTime = options.completionTime * 1000;
        this._tickTime = this._completionTime / (this._maxProgressBarWidth - this._startWidth);
        this._startText = options.startText || "";
    }

    public start() {
        if (this._isStarted) {
            return;
        }
        this._isStarted = true;
        let highOpacity = 100;
        let lowOpacity = 10;
        let step = (highOpacity - lowOpacity) / (this._numVisibleProgressTexts - 1);
        for (var i = 0; i < this._numVisibleProgressTexts; i++) {
            let opacity = Math.floor(highOpacity - (i * step)) / 100;
            this._$container.find(".progressTexts").append("<div style='opacity:" + opacity + ";'></div>");
        }
        this._width = this._startWidth;
        this._animateProgressBar();
        this._animateTexts();
    }

    public end(endText: string) {
        if (this._isCompleted) {
            return;
        }
        this._isCompleted = true;
        this._$container.find(".title").html(endText || "");
        this._$container.find(".progressTexts").html("<div>Complete</div>");
        clearTimeout(this._progressTimeout);

        this._fastCompletionTime = 1000 / (95 - this._width);
        this._maxProgressBarWidth = 100;
        this._tickTime = this._fastCompletionTime;
        this._animateProgressBar();
    }

    public reset() {
        this._isCompleted = false;
        this._isStarted = false;
        this._maxProgressBarWidth = 95;
        this._firstTextId = 0;
        this._tickTime = this._completionTime / (this._maxProgressBarWidth - this._startWidth);
        this._fastCompletionTime = null;

        clearTimeout(this._progressTimeout);
        this._width = this._startWidth;
        this._$container.find(".title").html(this._startText);
        this._$container.find(".progressPercentage").text(this._startWidth + "%");
        this._$container.find(".progressTexts").empty();
        this._$container.find(".progressBar").width(this._width + '%');
        this._$container.find(".progressPercentage").html(this._width + '%');
    }

    public isStarted() {
        return this._isStarted;
    }

    private _animateProgressBar() {
        if (this._width < this._maxProgressBarWidth) {
            this._width++;
            this._$container.find(".progressBar").width(this._width + '%');
            this._$container.find(".progressPercentage").html(this._width + '%');

            this._progressTimeout = setTimeout(() => {
                this._animateProgressBar();
            }, this._tickTime);
        }
    }

    private _animateTexts() {
        if (!this._isCompleted && this._firstTextId < this._progressTexts.length) {
            var currentTextId = this._firstTextId;
            for (var i = 0; i < this._numVisibleProgressTexts; i++) {
                if (currentTextId >= 0) {
                    this._$container.find(".progressTexts > div:nth-child(" + (i + 1) + ")").html(this._progressTexts[currentTextId] + "...");
                    currentTextId--;
                }
            }
            this._firstTextId++;
            setTimeout(() => {
                this._animateTexts();
            }, this._completionTime / this._progressTexts.length);
        }
    }
}