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
    schema: any,
    selectedSchema: any,
    classNames: string[],
    isMappingEditable?: boolean,
    showAdd?: boolean
}

class EditSchema extends React.PureComponent<EditSchemaProps, EditSchemaState> {
    constructor(props) {
        super(props);
        let cols = this._getColsFromSchemaString();
        const unusedMappings = this._getUnusedMapping(cols);
        this.state = {
            editAsText: false,
            unusedMappings: unusedMappings
        };
    }
    _schemaChange(newSchema) {
        const { onSchemaChange } = this.props;
        let validSchema;
        try {
            validSchema = validateSchemaString(newSchema);
            console.log(newSchema, validSchema);
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
        let cols;
        if (!validSchema) {
            cols = [];
        } else {
            cols = validSchema.columns;
        }
        const unusedMappings = this._getUnusedMapping(cols);
        this.setState({
            unusedMappings: unusedMappings
        })
    }

    _getUnusedMapping(newColumns) {
        let mappings = new Set();
        this.props.selectedSchema.columns.forEach((col) => {
            mappings.add(col.mapping);
        });
        newColumns.forEach((col) => {
            mappings.delete(col.mapping);
        });
        return mappings;
    }

    _getColsFromSchemaString() {
        let cols;
        try {
            cols = JSON.parse(this.props.schema).columns;
            if (!Array.isArray(cols)) {
                cols = [];
            }
        } catch (e) {
            cols = [];
        }
        return cols;
    }

    render() {
        const { errorMessage, schema, classNames = [], showAdd = true } = this.props;
        let switchClass = "xc-switch switch";

        if (this.state.editAsText) {
            switchClass += " on";
        }
        const cssClass = ['editSchema'].concat(classNames);
        let cols = this._getColsFromSchemaString();

        return (<div className={cssClass.join(' ')}>
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
                        let newSchema = {
                            rowpath: "$",
                            columns: val
                        };
                        this._schemaChange(JSON.stringify(newSchema))
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
            <div ref={this.scroll.ref} className="header">Edit Schema</div>
            <EditSchema {...this.props} />
        </div>);
    }
}

export { EditSchemaSection };