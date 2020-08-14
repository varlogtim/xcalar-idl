import * as React from "react";

const SchemaError = {
    INVALID_JSON: () => 'Invalid JSON format',
    NOT_ARRAY: () => 'Columns should be an array',
    EMPTY_ARRAY: () => 'Please define at least 1 column',
    NULL_COLUMN: () => 'Invalid column, column definition cannot be null',
    NO_ATTRIBUTE: (attrName) => `Missing attribute: "${attrName}"`,
    INVALID_VALUE: (attrName, value) => `Invalid value "${value}" for attribute "${attrName}"`
}

function validateSchemaString(strSchema) {
    let schema = null;

    // Check valid JSON
    try {
        schema = JSON.parse(strSchema);
    } catch(_) {
        throw SchemaError.INVALID_JSON();
    }

    const { rowpath, columns } = schema;

    // Need rowpath
    assert(rowpath != null, () => SchemaError.NO_ATTRIBUTE('rowpath'));
    // Should be an array
    assert(Array.isArray(columns), SchemaError.NOT_ARRAY);
    // Array cannot be empty
    assert(columns.length > 0, SchemaError.EMPTY_ARRAY);

    for (const column of columns) {
        // Null check
        assert(column != null, SchemaError.NULL_COLUMN);

        const { name, type, mapping } = column;
        // Attribute check
        assert(name != null, () => SchemaError.NO_ATTRIBUTE('name'));
        assert(type != null, () => SchemaError.NO_ATTRIBUTE('type'));
        assert(mapping != null, () => SchemaError.NO_ATTRIBUTE('mapping'));
        // Value check
        assert(typeof name === 'string', () => SchemaError.INVALID_VALUE('name', name));
        assert(typeof type === 'string', () => SchemaError.INVALID_VALUE('type', type));
        assert(typeof mapping === 'string', () => SchemaError.INVALID_VALUE('mapping', mapping));
    }

    return schema;

    function assert(boolVal, genEx) {
        if (!boolVal) {
            throw genEx();
        }
    }
}

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

    showSchemaWizard() {
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
        SchemaSelectionModal.Instance.show(selectedSchema, editedSchema, callback, true);
    }

    render() {
        const { errorMessage, schema, classNames = [] } = this.props;

        const cssClass = ['editSchema'].concat(classNames);
        return (<div className={cssClass.join(' ')}>
            <div className="rowContent schemaDesc">
                Use the <span className="schemaWizard xc-wizard" onClick={this.showSchemaWizard.bind(this)}>Schema Wizard</span>
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

class EditSchemaSection extends React.PureComponent {


    render() {
        return (<div>
            <div className="header">Edit Schema</div>
            <EditSchema {...this.props} />
        </div>);
    }
}

export { EditSchemaSection };