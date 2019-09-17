class ProgressBar {
    private _$container: JQuery;
    private _isStarted: boolean = false;
    private _isCompleted: boolean = false;
    private _width: number = 5;
    private _firstTextId: number = 0;
    private _fastCompletionTime;
    private _maxProgressBarWidth = 95;
    private _completionTime = 100;
    private _progressTexts: string[];
    private _progressTextsOpacities: number[];

    constructor(options) {
        this._$container = options.$container;
        this._progressTextsOpacities = options.progressTextsOpacities;
        this._progressTexts = options.progressTexts;
    }

    public start() {
        this._isStarted = true;

        for (var i = 0; i < this._progressTextsOpacities.length; i++) {
            this._$container.find(".progressTexts").append("<div style='opacity:" + this._progressTextsOpacities[i] / 100 + ";'></div>");
        }

        this._animateProgressBar();
        this._animateTexts();
    }

    public end(endText: string) {
        this._isCompleted = true;
        this._$container.find(".title").html(endText);
        this._$container.find(".progressTexts").html("<div>Complete</div>");
    }

    public isStarted() {
        return this._isStarted;
    }

    private _animateProgressBar() {
        if (this._width < this._maxProgressBarWidth) {
            this._width++;
            this._$container.find(".progressBar").width(this._width + '%');
            this._$container.find(".progressPercentage").html(this._width + '%');
            var tickTime = this._completionTime * 1000 / 90;
            if (this._isCompleted) {
                if (!this._fastCompletionTime) {
                    this._fastCompletionTime = 1000 / (95 - this._width);
                    this._maxProgressBarWidth = 100;
                }
                tickTime = this._fastCompletionTime;
            }
            setTimeout(() => {
                this._animateProgressBar();
            }, tickTime);
        }
    }

    private _animateTexts() {
        if (!this._isCompleted && this._firstTextId < this._progressTexts.length) {
            var currentTextId = this._firstTextId;
            for (var i = 0; i < this._progressTextsOpacities.length; i++) {
                if (currentTextId >= 0) {
                    this._$container.find(".progressTexts div:nth-child(" + (i + 1) + ")").html(this._progressTexts[currentTextId] + "...");
                    currentTextId--;
                }
            }
            this._firstTextId++;
            setTimeout(() => {
                this._animateTexts();
            }, this._completionTime * 1000 / this._progressTexts.length);
        }
    }
}