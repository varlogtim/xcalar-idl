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
    constructor(props) {
        super(props);

        const { schemaString } = props;
        let errorMessage = null;
        try {
            validateSchemaString(schemaString);
        } catch(e) {
            errorMessage = e;
        }

        this.state = {
            errorMessage: errorMessage,
            schema: schemaString
        };
    }

    componentDidUpdate(prevProps, prevState) {
        const { schemaString } = this.props;
        if (prevProps.schemaString !== schemaString) {
            // Properties change
            try {
                validateSchemaString(schemaString);
                this.setState({
                    schema: schemaString,
                    errorMessage: null
                });
            } catch(e) {
                this.setState({
                    schema: schemaString,
                    errorMessage: e
                });
            }
        }
    }

    _schemaChange(newSchema) {
        const { onSchemaChange } = this.props;

        this.setState({
            schema: newSchema
        });
        try {
            const validSchema = validateSchemaString(newSchema);
            this.setState({
                errorMessage: null
            });
            onSchemaChange(validSchema);
        } catch(e) {
            this.setState({
                errorMessage: e
            });
            onSchemaChange(null);
        }
    }

    render() {
        const { classNames = [] } = this.props;
        const { errorMessage, schema } = this.state;

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