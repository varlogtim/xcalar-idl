import * as React from "react";
import { validateSchemaString } from '../../services/SchemaService'
import ColSchemaSection from "./ColSchemaSection";

class EditSchema extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            editAsText: false
        };
    }
    _schemaChange(newSchema) {
        const { onSchemaChange } = this.props;

        try {
            const validSchema = validateSchemaString(newSchema);
            onSchemaChange({
                schema: newSchema,
                validSchema: validSchema,
                error: null
            });
        } catch(e) {
            onSchemaChange({
                schema: newSchema,
                validSchema: null,
                error: e
            });
        }
    }

    render() {
        const { errorMessage, schema, classNames = [], showAdd = true } = this.props;
        let switchClass = "xc-switch switch";
        if (this.state.editAsText) {
            switchClass += " on";
        }
        const cssClass = ['editSchema'].concat(classNames);
        let cols;
        try {
            cols = JSON.parse(schema).columns;
        } catch (e) {
            cols = [];
        }
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
                    spellCheck="false"
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
                    canAdd={showAdd}
                />
            }
            <div id="schemaSelectionModalWrapper"></div>
        </div>);
    }
}

function useScroll() {
    const ref = React.createRef();
    const execute = () => {
            ref.current.scrollIntoView({ block: "start"});
    }
    return { ref, execute };
}

class EditSchemaSection extends React.PureComponent {
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