import * as React from "react";

const SchemaError = {
    INVALID_JSON: () => 'Invalid JSON format',
    NOT_ARRAY: () => 'Schema should be an array',
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
    // Should be an array
    assert(Array.isArray(schema), SchemaError.NOT_ARRAY);
    // Array cannot be empty
    assert(schema.length > 0, SchemaError.EMPTY_ARRAY);

    for (const column of schema) {
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

    render() {
        const { errorMessage, schema, classNames = [] } = this.props;

        const cssClass = ['editSchema'].concat(classNames);
        return (<div className={cssClass.join(' ')}>
            { errorMessage != null && <div className="editSchema-error">{errorMessage}</div> }
            <textarea
                className="xc-textArea editSchema-textarea"
                onChange={(e) => { this._schemaChange(e.target.value) }}
                value={schema}
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