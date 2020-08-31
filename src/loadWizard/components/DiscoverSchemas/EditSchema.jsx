import * as React from "react";
import { validateSchemaString } from '../../services/SchemaService'
// import ColSchemaRow from "./ColSchemaRow";

class EditSchema extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            editAsText: true
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

    showSchemaWizard(showAdd) {
        let callback = (newSchema) => {
            const schema = {
                rowpath: "$",
                columns: newSchema
            };
            this._schemaChange(JSON.stringify(schema));
        };
        let selectedSchema;
        let editedSchema;
        try {
            editedSchema = JSON.parse(this.props.schema).columns;
        } catch (e) {
            editedSchema = [];
        }
        try {
            selectedSchema = this.props.selectedSchema.columns;
        } catch (e) {
            selectedSchema = [];
        }

        SchemaSelectionModal2.Instance.show(selectedSchema, editedSchema, callback, {
            hasMapping: true,
            canAdd: showAdd
        });
    }

    render() {
        const { errorMessage, schema, classNames = [], showAdd = true } = this.props;
        let switchClass = "xc-switch switch";
        if (this.state.editAsText) {
            switchClass += " on";
        }
        const cssClass = ['editSchema'].concat(classNames);
        return (<div className={cssClass.join(' ')}>
            {/* <ColSchemaRow /> */}
            <div className="switchWrap" onClick={() => {
                if (this.state.editAsText) {
                    this.showSchemaWizard(showAdd);
                } else {
                    SchemaSelectionModal2.Instance.submit();
                }
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
            <textarea
                className="xc-textArea editSchema-textarea"
                onChange={(e) => { this._schemaChange(e.target.value) }}
                value={schema}
                spellCheck="false"
            />
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