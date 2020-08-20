import * as React from "react";
import { validateSchemaString } from '../../services/SchemaService'


class EditSchema extends React.PureComponent {
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
        SchemaSelectionModal.Instance.show(selectedSchema, editedSchema, callback, {
            hasMapping: true,
            canAdd: showAdd
        });
    }

    render() {
        const { errorMessage, schema, classNames = [], showAdd = true } = this.props;

        const cssClass = ['editSchema'].concat(classNames);
        return (<div className={cssClass.join(' ')}>
            <div className="rowContent schemaDesc">
                Use the <span className="schemaWizard xc-wizard" onClick={this.showSchemaWizard.bind(this, showAdd)}>Schema Wizard</span>
                &nbsp;to generate the table schema or edit the auto-detected schema in the text box below.
            </div>
            { errorMessage != null && <div className="editSchema-error">{errorMessage}</div> }
            <textarea
                className="xc-textArea editSchema-textarea"
                onChange={(e) => { this._schemaChange(e.target.value) }}
                value={schema}
                spellCheck="false"
            />
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
        return (<div>
            <div ref={this.scroll.ref} className="header">Edit Schema</div>
            <EditSchema {...this.props} />
        </div>);
    }
}

export { EditSchemaSection };