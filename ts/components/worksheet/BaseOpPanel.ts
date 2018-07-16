interface IOpPanel {
    setup(): void;
    show(dagNode: DagNode): void;
    close(): void;
}

class BaseOpPanel {
    private static _instance = null;
    protected _formHelper: FormHelper = null;

    protected constructor() {}

    public static get Instance() {
        return  this._instance || (this._instance = new this());
    }

    protected setup($panel: JQuery): void {
        this._formHelper = new FormHelper($panel);
    }

    protected showPanel(): boolean {
        if (this._formHelper.isOpen()) {
            return false;
        }
        this._formHelper.showView(null);
        return true;
    }

    protected hidePanel(): void {
        if (!this._formHelper.isOpen()) {
            return;
        }
        this._formHelper.hideView();
    }

    protected toggleCheckbox($checkbox: JQuery, isCheck: boolean = true): void {
        if (isCheck) {
            if (!$checkbox.hasClass('checked')) {
                $checkbox.addClass('checked');
            }
        } else {
            $checkbox.removeClass('checked');
        }
    }
}

namespace BaseOpPanel {
    /**
     * Helper class to implement the SelectAll behavior in a group of checkboxes
     */
    export class CheckboxGroup {
        private _checkboxList: { check: Function, uncheck: Function }[] = [];
        private _checkAll: { check?: Function, uncheck?: Function } = {};

        public clear() {
            this._checkboxList = [];
        }

        public setCheckAll(
            {check, uncheck}: {
                check: Function,
                uncheck?: Function
            }
        ): void {
            this._checkAll.check = check;
            this._checkAll.uncheck = uncheck;
        }

        public addCheckbox(
            {check, uncheck}: {
                check: Function,
                uncheck: Function
            }
        ): void {
            this._checkboxList.push({ check: check, uncheck: uncheck });
        }

        /**
         * Select all checkboxes in the list
         */
        public checkList() {
            for (const {check} of this._checkboxList) {
                check();
            }
        }

        /**
         * Unselect all checkboxes in the list
         */
        public unCheckList() {
            for (const {uncheck} of this._checkboxList) {
                uncheck();
            }
        }

        /**
         * Select SelectAll checkbox
         */
        public checkAll() {
            this._checkAll.check();
        }

        /**
         * Unselect SelectAll checkbox
         */
        public unCheckAll() {
            this._checkAll.uncheck();
        }
    }    
}