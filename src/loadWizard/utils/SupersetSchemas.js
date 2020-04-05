import { getColumnsSignature } from './SchemaCommon'

export class SupersetSchemas {
    process(schema) {
        var cols = []
        for (var column of schema.schema.columnsList) {
            var defs = column.split("-")
            var col = {name: defs[0], mapping: defs[1], type: defs[2]}
            cols.push(col)
        }
        schema.schema.columnsList = cols
    }

    getSchemas(schemas) {
        const newschemas = JSON.parse(JSON.stringify(schemas))
        return this._getSchemas(newschemas)
    }

    _getSchemas(schemas) {
        const orgSchemas = {};
        const prefix = "Schema ";
        let offset = 0;
        const errSchemas = [];
        for (const schema of schemas) {
            if (!schema.success) {
                errSchemas.push(schema);
                continue;
            }
            // schema["schema"]["columnsList"] = this.normalize(schema.schema.columnsList)
            // var normalizedSchema = this.normalize(schema.schema.columnsList)
            let found = false;
            if (Object.keys(orgSchemas).length == 0) {
                const stag = prefix + ++offset;
                orgSchemas[stag] = {
                    path: [schema.path],
                    schema: {
                        numColumns: schema.schema.columnsList.length,
                        columnsList: schema.schema.columnsList
                    }
                };
                found = true;
            } else {
                for (const orgSchema of Object.values(orgSchemas)) {
                    if (schema.schema.columnsList.length <= orgSchema.schema.columnsList.length) {
                        const superset = new Set(getColumnsSignature(orgSchema.schema.columnsList));
                        if (getColumnsSignature(schema.schema.columnsList).every(val => superset.has(val))) {
                            orgSchema.path.push(schema.path);
                            found = true;
                            break;
                        }
                    } else {
                        const superset = new Set(getColumnsSignature(schema.schema.columnsList));
                        if (getColumnsSignature(orgSchema.schema.columnsList).every(val => superset.has(val))) {
                            orgSchema.path.push(schema.path);
                            orgSchema.schema.columnsList = schema.schema.columnsList;
                            orgSchema.schema.numColumns = schema.schema.columnsList.length;
                            found = true;
                            break;
                        }
                    }
                }
            }
            if (!found) {
                const stag = prefix + ++offset;
                orgSchemas[stag] = {
                    path: [schema.path],
                    schema : {
                        numColumns: schema.schema.columnsList.length,
                        columnsList: schema.schema.columnsList
                    }
                };
            }
        }
        // for (var orgkey in orgSchemas) {
        //     this.process(orgSchemas[orgkey])
        // }
        // if (errSchemas.length > 0) {
        //     orgSchemas["error"] = errSchemas
        // }
        return [orgSchemas, errSchemas];
    }
}
