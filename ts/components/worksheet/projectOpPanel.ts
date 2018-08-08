/**
 * The operation editing panel for Project operator
 */
class ProjectOpPanel extends BaseOpPanel implements IOpPanel {
    private _$elemPanel: JQuery = null; // The DOM element of the panel
    private _$elemDerivedContainer: JQuery = null;
    private _$elemPrefixedContainer: JQuery = null;
    private _$elemDeriveSelectAllWrap: JQuery = null;
    private _$elemDeriveSelectAllCheckbox: JQuery = null;
    private _templateColumnDerive: string = '';
    private _templateColumnFix: string = '';
    private _templatePrefix: string = '';
    private _dataModel: ProjectOpPanel.Model = new ProjectOpPanel.Model() ; // The key data structure
    private _checkboxGroupColumn = new ProjectOpPanel.CheckboxGroup();

    // *******************
    // Constants
    // *******************
    private static _eventNamespace = 'projectOpPanel';

    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        // HTML elements binding
        this._$elemPanel = $('#projectOpPanel');
        this._$elemDerivedContainer = this._$elemPanel.find('.derivedSection .cols');
        this._$elemPrefixedContainer = this._$elemPanel.find('.prefixContainer');
        this._$elemDeriveSelectAllWrap = this._findXCElement(this._$elemPanel, 'selAllDerive');
        this._$elemDeriveSelectAllCheckbox = this._findXCElement(
            this._$elemDeriveSelectAllWrap,
            'selAllCheck'
        );

        // Load Templates
        this._templateColumnDerive = this._readTemplateContent('#xdtemp_projop_column_derive');
        this._templateColumnFix = this._readTemplateContent('#xdtemp_projop_column_fix');
        this._templatePrefix = this._readTemplateContent('#xdtemp_projop_prefixed');

        super.setup(this._$elemPanel);
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNode): void {
        // Show panel
        if (!super.showPanel()) {
            return;
        }

        // Setup data model
        const dagColumInfo = this._getDagColumns(dagNode);
        this._dataModel = ProjectOpPanel.Model.fromDag(dagColumInfo);

        // Update UI
        this._renderDerivedColumns({
            columnList: this._dataModel.columnSet.derivedList,
            templateColumn: this._templateColumnDerive
        });
        this._renderPrefixedColumns({
            prefixList: this._dataModel.columnSet.prefixedList,
            templatePrefix: this._templatePrefix,
            templateColumn: this._templateColumnFix
        });

        // Setup event listeners
        this._setupEventListener(dagNode);
    }

    /**
     * Hide the panel
     */
    public close(): void {
        super.hidePanel();
    }

    /**
     * Validate form values & save data
     * @param dagNode DagNode object
     * @returns true: success; false: failed validation
     */
    private _submitForm(dagNode: DagNode): boolean {
        let isValid: boolean = true;

        // Validate: At least one column should be selected
        const selectedCounts = this._dataModel.columnSet.getSelectedCount();
        isValid = xcHelper.validate([
            {
                "$ele": this._$elemPanel.find(".cols:visible").last(),
                "error": ErrTStr.NoColumns,
                "check": () => (
                    selectedCounts.derived + selectedCounts.prefixed === 0
                )
            }
        ]);
        if (!isValid) {
            return false;
        }

        // save data
        this._saveDagInfo(dagNode);
        return true;
    }

    /**
     * Attach event listeners for static elements
     */
    private _setupEventListener(dagNode: DagNode): void {
        // Clear existing event handlers
        this._clearEventListener();

        // Close icon & Cancel button
        this._$elemPanel.on(
            `click.close.${ProjectOpPanel._eventNamespace}`,
            '.close, .cancel',
            () => { this.close() }
        );

        // Submit button
        this._$elemPanel.on(
            `click.submit.${ProjectOpPanel._eventNamespace}`,
            '.confirm',
            () => {
                if (this._submitForm(dagNode)) {
                    this.close();
                }
            }
        );

        // SelectAll checkbox for derived columns
        this._$elemDeriveSelectAllWrap.on(
            `click.columnall.${ProjectOpPanel._eventNamespace}`,
            this._onSelectAllClick(this._$elemDeriveSelectAllCheckbox)
        );
        this._checkboxGroupColumn.setCheckAll({
            check:this._checkSelectAll.bind(
                this, this._$elemDeriveSelectAllCheckbox, true
            ),
            uncheck: this._checkSelectAll.bind(
                this, this._$elemDeriveSelectAllCheckbox, false
            )
        });
    }

    /**
     * Clear event listeners
     */
    private _clearEventListener(): void {
        this._$elemPanel.off(`.${ProjectOpPanel._eventNamespace}`);
    }

    /**
     * Change the checked/unchecked state of a column checkbox
     * @param checkbox The checkbox element
     * @param colIndex Index of the corresponding data in data model
     * @param isChecked Flag to set the state to checked/unchecked
     * @description
     * 1. Change the data in data model
     * 2. Update the checked/unchecked state of UI element
     */
    private _checkColumn(
        $checkbox: JQuery,
        colIndex: number,
        isChecked: boolean = true
    ): void {
        this._dataModel.columnSet.derivedList[colIndex].isSelected = isChecked;
        this.toggleCheckbox($checkbox, isChecked);
    }

    /**
     * Event Handler Factory: onClick for column div
     * @param colIndex The index of the column in data model
     * @param checkbox The checkbox div element
     * @returns event handler function
     * @description
     * 1. Flip the isSelected flag
     * 2. Call _checkColumn to update data model & UI
     * 3. Call _checkboxGroupColumn to toggle the SelectAll checkbox
     */
    private _onColumnClick(
        colIndex: number,
        $checkbox: JQuery
    ): () => any {
        return () => {
            const isSelected = !this._dataModel.columnSet.derivedList[colIndex].isSelected;
            this._checkColumn($checkbox, colIndex, isSelected);
            if (this._dataModel.columnSet.isAllDerivedSelected) {
                this._checkboxGroupColumn.checkAll();
            } else {
                this._checkboxGroupColumn.unCheckAll();
            }
        }
    }

    /**
     * Toggle the checked/unchecked state of SelectAll checkbox for derived columns
     * @param checkbox The checkbox element
     * @param isChecked Checked/Unchecked state to set
     * @description Update the state of checkbox element, no data model change
     */
    private _checkSelectAll($checkbox: JQuery, isChecked: boolean = true) {
        this.toggleCheckbox($checkbox, isChecked);
    }

    /**
     * Event Handler Factory: onClick for derived column SelectAll checkbox
     * @param checkbox The SelectAll checkbox element
     * @description
     * 1. Flip the checked/unchecked flag
     * 2. Call _checkSelectAll to update UI
     * 3. Call _checkboxGroupColumn to toggle column checkboxes in the group
     */
    private _onSelectAllClick(
        $checkbox: JQuery
    ): () => any {
        return () => {
            const isAllSelected = !this._dataModel.columnSet.isAllDerivedSelected;
            this._checkSelectAll($checkbox, isAllSelected);
            if (isAllSelected) {
                this._checkboxGroupColumn.checkList();
            } else {
                this._checkboxGroupColumn.unCheckList();
            }
        };
    }

    /**
     * Event Handler Factory: onClick for prefixed column SelectAll checkbox
     * @param checkbox The checkbox element
     * @param prefixIndex The index of corresponding data in the data model
     * @description
     * 1. Flip the checked/unchecked flag
     * 2. Update data model
     * 3. Update UI
     */
    private _onPrefixSelectClick(
        $checkbox: JQuery,
        prefixIndex: number
    ): () => any {
        return () => {
            const isSelected = !this._dataModel.columnSet.prefixedList[prefixIndex].isSelected;
            this._dataModel.columnSet.prefixedList[prefixIndex].isSelected = isSelected;
            this.toggleCheckbox($checkbox, isSelected);
        }
    }

    /**
     * Create DOM element from a string
     * @param htmlStr HTML string
     * @returns DOM element
     */
    private _createElement(htmlStr: string): JQuery {
        return $($.trim(htmlStr));
    }

    /**
     * Find a element in DOM by attribute data-xcid
     * @param $container The container element
     * @param xcid Value of data-xcid
     * @description The HTML looks like: <div data-xcid="yourXcID">...</div>
     */
    private _findXCElement($container: JQuery, xcid: string): JQuery {
        return $container.find(`[data-xcid="${xcid}"]`);
    }

    /**
     * Create a column element from template
     * @param column A ColumnInfo object
     * @param template The HTML template string
     * @param colIndex OPTIONAL: The index in the data model
     * @param onColClick OPTIONAL: The column onClick event handler (for the checkbox)
     * @returns A DOM element
     * @description
     * Support two variants:
     * 1. Column with a checkbox (Derived column)
     * 2. Column w/o a checkbox (prefixed column)
     */
    private _createColumnElement(
        {column, template, colIndex, onColClick}: {
            column: ProjectOpPanel.ColumnInfo,
            template: string,
            colIndex?: number
            onColClick?: (...args: any[]) => any
        }
    ): JQuery {
        // Generate HTML from template
        const colName = column.name;
        const replaces = {
            '{{origTitle}}': xcHelper.escapeDblQuoteForHTML(
                xcHelper.escapeHTMLSpecialChar(colName)
            ),
            '{{colName}}': colName
        };
        let html = xcHelper.replaceTemplate(template, replaces, true);

        // Create DOM from HTML
        const $dom = this._createElement(html);

        // Event binding & initialize state
        if (onColClick != null) {
            const $elemCol = $dom;
            const $elemCheckbox = this._findXCElement($elemCol, 'colcheck');
            this.toggleCheckbox($elemCheckbox, column.isSelected);
            $elemCol.on(
                `click.column.${ProjectOpPanel._eventNamespace}`,
                onColClick($elemCheckbox)
            );
            this._checkboxGroupColumn.addCheckbox({
                check: this._checkColumn.bind(this, $elemCheckbox, colIndex, true),
                uncheck: this._checkColumn.bind(this, $elemCheckbox, colIndex, false)
            });
        }

        return $dom;
    }

    /**
     * Render derived column list
     * @param source Source column list
     * @param dest Dest. column list
     * @param columnTemplate Column template string
     */
    private _renderDerivedColumns(
        {columnList, templateColumn}: {
            columnList: ProjectOpPanel.ColumnInfo[],
            templateColumn: string
        }
    ): void {
        // Clear the current DOM
        this._$elemDerivedContainer.empty();
        this._checkboxGroupColumn.clear();

        // Create new DOM
        for (let i = 0; i < columnList.length; i ++) {
            const column = columnList[i];
            const $columnDom = this._createColumnElement({
                column: column,
                template: templateColumn,
                colIndex: i,
                onColClick: this._onColumnClick.bind(this, i)
            });
            this._$elemDerivedContainer.append($columnDom);
        }

        let spaceHtml = ''
        for (let i = 0; i < 10; i ++) {
            spaceHtml += '<div class="flexSpace"></div>';
        }
        this._$elemDerivedContainer.append(this._createElement(spaceHtml));

        // Handle empty case
        const $elemDerivedSection = this._$elemPanel.find('.derivedSection');
        if (columnList.length === 0) {
            $elemDerivedSection.addClass('empty');
        } else {
            $elemDerivedSection.removeClass('empty');
        }
    }

    /**
     * Render the prefixed columns UI
     * @param prefixList Prefixed column List
     * @param templatePrefix Prefixed column section template string
     * @param templateColumn Column template string
     */
    private _renderPrefixedColumns(
        {prefixList, templatePrefix, templateColumn}: {
            prefixList: ProjectOpPanel.PrefixColumn[],
            templatePrefix: string,
            templateColumn: string
        }
    ): void {
        // Clear the current DOM
        this._$elemPrefixedContainer.empty();

        // Create prefix sections
        for (let prefixIndex = 0; prefixIndex < prefixList.length; prefixIndex ++) {
            const prefixInfo = prefixList[prefixIndex];

            // Generate prefix HTML
            const replaces = {
                '{{prefixTip}}': ProjectTStr.prefixTip,
                '{{prefix}}': prefixInfo.prefix,
                '{{textSelectAll}}': CommonTxtTstr.SelectAll,
            };
            const prefixedHtml = xcHelper.replaceTemplate(templatePrefix, replaces);

            // Crate DOM from HTML
            const $prefixDom = this._createElement(prefixedHtml);

            // Create columns DOM
            const $columnContainer = this._findXCElement($prefixDom, 'columnContainer');
            for (const column of prefixInfo.columnList) {
                const $columnDom = this._createColumnElement({
                    column: column,
                    template: templateColumn
                });
                $columnContainer.append($columnDom);
            }

            // Event binding & Initialize state
            const $elemSelectAll = this._findXCElement($prefixDom, 'selAll');
            const $elemSelectAllCheckbox = this._findXCElement($elemSelectAll, 'selAllCheck');
            this.toggleCheckbox($elemSelectAllCheckbox, prefixInfo.isSelected);
            $elemSelectAll.on(
                `click.prefix.${ProjectOpPanel._eventNamespace}`,
                this._onPrefixSelectClick($elemSelectAllCheckbox, prefixIndex)
            );

            // Append DOM to container
            this._$elemPrefixedContainer.append($prefixDom);
       }

       // Handle empty case
       const $elemPrefixedSection = this._$elemPanel.find('.prefixedSection');
       if (prefixList.length === 0) {
            $elemPrefixedSection.addClass('empty');
        } else {
            $elemPrefixedSection.removeClass('empty');
        }
    }

    /**
     * Get a template string from DOM
     * @param cssSelector CSS selector to find the template element
     * @returns content of template
     */
    private _readTemplateContent(cssSelector: string): string {
        return $(cssSelector).html();
    }

    /**
     * Ask DagNode for the column information
     * @param dagNode DagNode object
     * @returns column information, which includes the source columns and
     * dest columns(if this is an existing dag node)
     */
    private _getDagColumns(
        dagNode: DagNode // TODO: replace with actual project DagNode class
    ): { source: ProjectOpPanel.DagReturn, dest: ProjectOpPanel.DagReturn } {
        // Pseudo DagNode return
        const source: ProjectOpPanel.DagReturn = {
            derived: [1,2,3,4].map((n)=>({name: `derived#${n}`})),
            prefixed: [1,2].map((n)=>({
                prefix: `prefix#${n}`,
                columns: [1,2,3,4,5].map((i)=>({name: `prefixCol#${n}_${i}`}))
            }))
        };
        const dest: ProjectOpPanel.DagReturn = {
            derived: [1,2].map((n)=>({name: `derived#${n}`})),
            prefixed: [1].map((n)=>({
                prefix: `prefix#${n}`,
                columns: [1,2,3,4,5].map((i)=>({name: `prefixCol#${n}_${i}`}))
            }))
        };
        return { source: source, dest: dest };
    }

    /**
     * Save DagNode information
     * @param dagNode DagNode object
     */
    private _saveDagInfo(
        dagNode: DagNode // TODO: replace with actual project DagNode class
    ): void {
        const dagInfo = this._dataModel.toDag();
        // dagNode.save(dagInfo);
    }
}

// *******************
// Internal data structures
// *******************
namespace ProjectOpPanel {
    /**
     * The column structure of DagNode.
     * Not finalized yet, just a placeholder!!!
     */
    export interface DagReturn {
        derived: {name: string}[],
        prefixed: { prefix: string, columns: {name: string}[] }[]
    }

    export interface ColumnInfo {
        name: string;
        isSelected: boolean;
    }

    export interface PrefixColumn {
        prefix: string;
        isSelected: boolean;
        columnList: ColumnInfo[];
    }

    export class ColumnSet {
        public derivedList: ColumnInfo[] = [];
        public prefixedList: PrefixColumn[] = [];

        public get isAllDerivedSelected(): boolean {
            for (const column of this.derivedList) {
                if (!column.isSelected) {
                    return false;
                }
            }
            return true;
        }

        public selectAllDerived(isSelected: boolean) {
            for (const column of this.derivedList) {
                column.isSelected = isSelected;
            }
        }

        public getSelectedCount(): {derived: number, prefixed: number} {
            const derivedCount = this.derivedList.reduce( (res, column) => (
                res + (column.isSelected ? 1 : 0)
            ), 0);
            const prefixedCount = this.prefixedList.reduce( (res, prefix) => (
                res + (prefix.isSelected ? 1 : 0)
            ), 0);
            return { derived: derivedCount, prefixed: prefixedCount };
        }
    }

    export class Model {
        public columnSet: ColumnSet = new ColumnSet();

        public static fromDag(
            {source, dest}: {
                source: DagReturn,
                dest: DagReturn
            }
        ): Model {
            const derivedList = source.derived.map( (sourceDerived) => ({
                name: sourceDerived.name,
                isSelected: this._isExistDerivedColumn(
                    dest.derived,
                    sourceDerived
                )
            }));
            const prefixedList = source.prefixed.map( (sourcePrefixed) => {
                const prefixed = <PrefixColumn> {};
                prefixed.prefix = sourcePrefixed.prefix;
                prefixed.columnList = sourcePrefixed.columns.map( (dagCol) => ({
                    name: dagCol.name,
                    isSelected: false
                }));
                prefixed.isSelected = this._isExistPrefix(
                    dest.prefixed,
                    sourcePrefixed);
                return prefixed;
            });

            const model = new Model();
            model.columnSet = new ColumnSet();
            model.columnSet.derivedList = derivedList;
            model.columnSet.prefixedList = prefixedList;
            return model;
        }

        public toDag(): any {
            console.log(this.columnSet);
        }

        private static _isExistPrefix(
            prefixList: {prefix: string}[],
            target: {prefix: string}
        ): boolean {
            for (const prefixed of prefixList) {
                if (prefixed.prefix === target.prefix) {
                    return true;
                }
            }
            return false;
        }

        private static _isExistDerivedColumn(
            columnList: {name: string}[],
            target: {name: string}
        ): boolean {
            for (const column of columnList) {
                if (column.name === target.name) {
                    return true;
                }
            }
            return false;
        }
    }
}