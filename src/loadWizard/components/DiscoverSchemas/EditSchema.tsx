import * as React from "react";
import { validateSchemaString } from '../../services/SchemaService'
import ColSchemaSection from "./ColSchemaSection";

type EditSchemaState = {
    editAsText: boolean;
    unusedMappings: Set<any>
}
type EditSchemaProps = {
    onSchemaChange: Function,
    errorMessage: string,
    persistError: string,
    schema: string,
    selectedSchema: any,
    classNames: string[],
    isMappingEditable?: boolean,
    showAdd?: boolean
}

class EditSchema extends React.PureComponent<EditSchemaProps, EditSchemaState> {
    constructor(props) {
        super(props);
        const unusedMappings = this._getUnusedMapping(this.props.schema);
        this.state = {
            editAsText: false,
            unusedMappings: unusedMappings
        };
    }
    _schemaChange(newSchema: string) {
        const { onSchemaChange } = this.props;
        let validSchema;
        try {
            validSchema = validateSchemaString(newSchema);
            onSchemaChange({
                schema: newSchema,
                validSchema: validSchema,
                error: null
            });
        } catch(e) {
            validSchema = null;
            onSchemaChange({
                schema: newSchema,
                validSchema: null,
                error: e
            });
        }

        const unusedMappings = this._getUnusedMapping(newSchema);
        this.setState({
            unusedMappings: unusedMappings
        })
    }

    _getUnusedMapping(schemaStr) {
        let newColumns = this._getColsFromSchemaString(schemaStr);
        let mappings = new Set();
        this.props.selectedSchema.columns.forEach((col) => {
            mappings.add(col.mapping);
        });
        newColumns.forEach((col) => {
            mappings.delete(col.mapping);
        });
        return mappings;
    }

    _getColsFromSchemaString(schema) {
        let cols: Array<{
            name: string, type: string, mapping: string
        }>;
        try {
            cols = JSON.parse(schema).columns;
            if (!Array.isArray(cols)) {
                cols = [];
            }
            for (const col of cols) {
                if (col.mapping.indexOf('$.') == 0) {
                    col.mapping = col.mapping.substr(2);
                }
            }
        } catch (e) {
            cols = [];
        }
        return cols;
    }

    _updateSchema(val: Array<any>) {
        let newSchema = {
            rowpath: "$",
            columns: val.map(({name, type, mapping}) => ({
                name: name, type: type,
                mapping: mapping.indexOf('$.') < 0
                    ? '$.' + mapping
                    : mapping
            }))
        };
        this._schemaChange(JSON.stringify(newSchema))
    }

    render() {
        const { errorMessage, schema, classNames = [], showAdd = true, persistError } = this.props;
        let switchClass = "xc-switch switch";

        if (this.state.editAsText) {
            switchClass += " on";
        }
        const cssClass = ['editSchema'].concat(classNames);
        let cols = this._getColsFromSchemaString(this.props.schema);

        return (<div className={cssClass.join(' ')}>
            { persistError != null && <div className="editSchema-error">{persistError}</div> }
            <div className="schemaOptions">
                <div className="numColsArea">
                    <i className="icon xi-info-circle-outline"></i>
                    <span className="numCols">{this.props.selectedSchema.columns.length.toLocaleString()}</span> column(s) detected
                </div>
                <div className="switchWrap" onClick={() => {
                    this.setState({
                        editAsText: !this.state.editAsText
                    });
                }}>
                    <div className={switchClass}>
                        <div className="slider"></div>
                    </div>
                    <label>Edit as text</label>
                </div>
                <div className="xc-action" onClick={() => {
                    this._updateSchema([]);
                }}>
                    Clear All
                </div>
                <div className="xc-action" onClick={() => {
                    this._updateSchema(this.props.selectedSchema.columns);
                }}>
                    Reset
                </div>
            </div>
            { errorMessage != null && <div className="editSchema-error">{errorMessage}</div> }
            {this.state.editAsText ?
                <textarea
                    className="xc-textArea editSchema-textarea"
                    onChange={(e) => { this._schemaChange(e.target.value) }}
                    value={schema}
                    spellCheck={false}
                />
                :
                <ColSchemaSection
                    defaultSchema={this.props.selectedSchema.columns}
                    editedSchema={cols}
                    updateSchema={(val) => {
                        this._updateSchema(val);
                    }}
                    canAdd={showAdd || this.state.unusedMappings.size > 0}
                    isMappingEditable={this.props.isMappingEditable}
                />
            }
            <div id="schemaSelectionModalWrapper"></div>
        </div>);
    }
}

function useScroll() {
    const ref = React.createRef();
    const execute = () => {
        ref.current["scrollIntoView"]({ block: "start"});
    }
    return { ref, execute };
}

type EditSchemaSectionProps = {
    isFocus: boolean,
    onSchemaChange: Function,
    errorMessage: string,
    persistError: string,
    schema: any,
    selectedSchema: any,
    classNames: string[]
    showAdd?: boolean
}

class EditSchemaSection extends React.PureComponent<EditSchemaSectionProps, {}> {
    private scroll;

    constructor(props) {
        super(props);
        this.scroll = useScroll();
    }

    componentDidUpdate() {
        try {
            const { isFocus } = this.props;
            if (isFocus) {
                this.scroll.execute();
            }
        } catch(_) {
            // Ignore errors
        }
    }

    render() {
        return (<div className="editSchemaSection">
            <div ref={this.scroll.ref}></div>
            <EditSchema {...this.props} />
        </div>);
    }
}

export { EditSchemaSection };