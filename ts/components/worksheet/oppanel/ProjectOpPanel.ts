/**
 * The operation editing panel for Project operator
 */
class ProjectOpPanel extends BaseOpPanel implements IOpPanel {
    private _templateMgr = new OpPanelTemplateManager();
    private _$elemPanel: JQuery = null; // The DOM element of the panel
    private _$elemDeriveSelectAllWrap: JQuery = null;
    private _$elemDeriveSelectAllCheckbox: JQuery = null;
    private _dataModel: ProjectOpPanelModel = new ProjectOpPanelModel() ; // The key data structure
    private _dagNode: DagNodeProject = null;

    // *******************
    // Constants
    // *******************
    private static readonly _templateIdDerivedColumn = 'xdtemp_projop_column_derive';
    private static readonly _templateIdFixedColumn = 'xdtemp_projop_column_nocheck';
    private static readonly _templateIdFlexSpace = 'xdtemp_projop_flexspace';
    private static readonly _templateIdPrefixGroup = 'xdtemp_projop_prefixed';

    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        // HTML elements binding
        this._$elemPanel = $('#projectOpPanel');
        this._$elemDeriveSelectAllWrap =
            ProjectOpPanel.findXCElement(this._$elemPanel, 'selAllDerive');
        this._$elemDeriveSelectAllCheckbox =
            ProjectOpPanel.findXCElement(this._$elemDeriveSelectAllWrap, 'selAllCheck');

        // Load Templates
        this._templateMgr.loadTemplate(
            ProjectOpPanel._templateIdDerivedColumn,
            this._$elemPanel
        );
        this._templateMgr.loadTemplateFromString(
            ProjectOpPanel._templateIdFlexSpace,
            '<div class="flexSpace"></div>'
        )
        this._templateMgr.loadTemplate(
            ProjectOpPanel._templateIdFixedColumn,
            this._$elemPanel
        );
        this._templateMgr.loadTemplate(
            ProjectOpPanel._templateIdPrefixGroup,
            this._$elemPanel
        );

        super.setup(this._$elemPanel);
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeProject): void {
        this._dagNode = dagNode;
        this._dataModel = ProjectOpPanelModel.fromDag(dagNode);
        this._updateUI();

        super.showPanel();
    }

    /**
     * Hide the panel
     */
    public close(): void {
        super.hidePanel();
    }

    private _updateUI() {
        this._renderDerivedColumns();
        this._renderPrefixedColumns();

        // Setup event listeners
        this._setupEventListener();
    }

    /**
     * Render derived column list
     */
    private _renderDerivedColumns(): void {
        const columnList = this._dataModel.derivedList;

        // Clear the current DOM
        // this._$elemDerivedContainer.empty();

        // Render column list
        const nodeList: NodeDefDOMElement[] = []
        for (let i = 0; i < columnList.length; i ++) {
            const column = columnList[i];
            const colName = column.name;
            const domList = this._templateMgr.createElements(
                ProjectOpPanel._templateIdDerivedColumn,
                {
                    'origTitle': xcHelper.escapeDblQuoteForHTML(
                        xcHelper.escapeHTMLSpecialChar(colName)
                    ),
                    'checkClass': column.isSelected? 'checked': '',
                    'colName': colName,
                    'onColClick': this._onDerivedColumnClick(i)
                }
            );
            for (const dom of domList) {
                nodeList.push(dom);
            }
        }
        for (let i = 0; i < 10; i ++) {
            const spaceDom = this._templateMgr.createElements(ProjectOpPanel._templateIdFlexSpace);
            for (const dom of spaceDom) {
                nodeList.push(dom);
            }
        }
        const elemDerivedContainer = ProjectOpPanel.findXCElement(this._$elemPanel, 'derivedContainer')[0];
        this._templateMgr.updateDOM(elemDerivedContainer, nodeList);

        // SelectAll checkbox for derived columns
        this.toggleCheckbox(this._$elemDeriveSelectAllCheckbox, this._dataModel.isAllDerivedSelected);
        this._$elemDeriveSelectAllWrap.off();
        this._$elemDeriveSelectAllWrap.on(
            'click',
            this._onSelectAllClick()
        );

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
     */
    private _renderPrefixedColumns(): void {
        const prefixList = this._dataModel.prefixedList;

        // Create prefix sections
        const nodeList = [];
        for (let prefixIndex = 0; prefixIndex < prefixList.length; prefixIndex ++) {
            const prefixInfo = prefixList[prefixIndex];

            // Create column group
            const groupDom = this._templateMgr.createElements(
                ProjectOpPanel._templateIdPrefixGroup,
                {
                    'prefixTip': ProjectTStr.prefixTip,
                    'prefix': prefixInfo.prefix,
                    'textSelectAll': CommonTxtTstr.SelectAll,
                    'selAllCss': prefixInfo.isSelected? 'checked': '',
                    'onSelAllClick': this._onPrefixSelectClick(prefixIndex)
                }
            );

            // Create columns DOM
            const $columnContainer = ProjectOpPanel.findXCElement($(groupDom), 'columnContainer');
            for (const column of prefixInfo.columnList) {
                const columnDom = this._templateMgr.createElements(
                    ProjectOpPanel._templateIdFixedColumn,
                    {
                        'origTitle': xcHelper.escapeDblQuoteForHTML(
                            xcHelper.escapeHTMLSpecialChar(column.name)
                        ),
                        'colName': column.name,
                    }
                );
                for (const dom of columnDom) {
                    $columnContainer.append(dom);
                }
            }

            // Append DOM to container
            for (const dom of groupDom) {
                nodeList.push(dom);
            }
        }
        const elemPrefixedContainer = ProjectOpPanel.findXCElement(
           this._$elemPanel,
           'prefixContainer'
        )[0];
        this._templateMgr.updateDOM(elemPrefixedContainer, nodeList);

       // Handle empty case
       const $elemPrefixedSection = this._$elemPanel.find('.prefixedSection');
       if (prefixList.length === 0) {
            $elemPrefixedSection.addClass('empty');
        } else {
            $elemPrefixedSection.removeClass('empty');
        }
    }

    /**
     * Validate form values & save data
     * @param dagNode DagNode object
     * @returns true: success; false: failed validation
     */
    private _submitForm(dagNode: DagNodeProject): boolean {
        let isValid: boolean = true;

        // Validate: At least one column should be selected
        const selectedCounts = this._dataModel.getSelectedCount();
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
        dagNode.setParam(this._dataModel.toDag());
        return true;
    }

    /**
     * Attach event listeners for static elements
     */
    private _setupEventListener(): void {
        // Clear existing event handlers
        this._$elemPanel.off();

        // Close icon & Cancel button
        this._$elemPanel.on(
            'click',
            '.close, .cancel',
            () => { this.close() }
        );

        // Submit button
        this._$elemPanel.on(
            'click',
            '.confirm',
            () => {
                if (this._submitForm(this._dagNode)) {
                    this.close();
                }
            }
        );
    }

    /**
     * Event Handler Factory: onClick for column div
     * @param colIndex The index of the column in data model
     * @returns event handler function
     */
    private _onDerivedColumnClick(
        colIndex: number
    ): () => any {
        return () => {
            // Flip the state
            const isSelected = !this._dataModel.derivedList[colIndex].isSelected;
            // Update the data model
            this._dataModel.derivedList[colIndex].isSelected = isSelected;
            // Update UI
            this._updateUI();
        };
    }

    /**
     * Event Handler Factory: onClick for derived column SelectAll checkbox
     */
    private _onSelectAllClick(): () => any {
        return () => {
            const isAllSelected = !this._dataModel.isAllDerivedSelected;
            this._dataModel.selectAllDerived(isAllSelected);
            this._updateUI();
        };
    }

    /**
     * Event Handler Factory: onClick for prefixed column SelectAll checkbox
     * @param prefixIndex The index of corresponding data in the data model
     */
    private _onPrefixSelectClick(
        prefixIndex: number
    ): () => any {
        return () => {
            const isSelected = !this._dataModel.prefixedList[prefixIndex].isSelected;
            this._dataModel.prefixedList[prefixIndex].isSelected = isSelected;
            this._updateUI();
        }
    }

    public static test() {
        const derivedCount = 8;
        const prefixGroupCount = 2;
        const prefixedCount = 5;

        const projectedCols = [];
        const parentCols = [];
        for (let i = 0; i < derivedCount; i ++) {
            const colName = `DerivedCol${i}`;
            parentCols.push(ColManager.newPullCol(colName, colName, ColumnType.string));
            if (i % 3 === 0) {
                projectedCols.push(colName);
            }
        }
        for (let i = 0; i < prefixGroupCount; i ++) {
            for (let j = 0; j < prefixedCount; j ++) {
                const prefix = `Prefix${i}`;
                const colName = `Col${j}`;
                const fullName = `${prefix}${gPrefixSign}${colName}`;
                parentCols.push(ColManager.newPullCol(colName, fullName, ColumnType.string));
                if (i % 2 === 0) {
                    projectedCols.push(colName);
                }
            }
        }

        const parentNode = DagNodeFactory.create({type: DagNodeType.Dataset});
        parentNode.getLineage().setColumns(parentCols);
        const dagNode = <DagNodeProject>DagNodeFactory.create({type: DagNodeType.Project});
        dagNode.connectToParent(parentNode, 0);
        parentNode.connectToChild(dagNode);
        dagNode.setParam({columns: projectedCols});

        ProjectOpPanel.Instance.setup();
        ProjectOpPanel.Instance.show(dagNode);
    }
}