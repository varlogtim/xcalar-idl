class SupersetSchemas {
    normalize(columns) {
        var newcol = []
        const regex = /\(\d*\)/
        for (var column of columns) {
            var col = column.name + "-" + column.mapping + "-" + column.type.replace(regex, '')
            newcol.push(col)
        }
        return newcol
    }

    process(schema) {
        var cols = []
        for (var column of schema.schema.columns) {
            var defs = column.split("-")
            var col = {name: defs[0], mapping: defs[1], type: defs[2]}
            cols.push(col)
        }
        schema.schema.columns = cols
    }

    getSchemas(schemas) {
        try {
            return this._getSchemas(schemas)
        } catch(err) {
            return {error : err.message}
        }
    }

    _getSchemas(schemas) {
        var orgSchemas = {}
        var prefix = "S"
        var offset = 0
        var errSchemas = []
        for (var schema of schemas) {
            if (!schema.success) {
                errSchemas.push(schema)
                continue
            }
            schema["schema"]["columns"] = this.normalize(schema.schema.columns)
            var found = false
            if (Object.keys(orgSchemas).length == 0) {
                var stag = prefix + ++offset
                orgSchemas[stag] = {path: [schema.path], schema : {numColumns : schema.schema.columns.length, columns : schema.schema.columns}}
                found = true
            } else {
                for (var orgkey in orgSchemas) {
                    var orgSchema = orgSchemas[orgkey]
                    if (schema.schema.columns.length <= orgSchema.schema.columns.length) {
                        if (schema.schema.columns.every(val => orgSchema.schema.columns.includes(val))) {
                            orgSchema.path.push(schema.path)
                            found = true
                            break
                        }
                    } else {
                        if (orgSchema.schema.columns.every(val => schema.schema.columns.includes(val))) {
                            orgSchema.path.push(schema.path)
                            orgSchema.schema.columns = schema.schema.columns
                            orgSchema.schema.numColumns = schema.schema.columns.length
                            found = true
                            break
                        }
                    }
                }
            }
            if (!found) {
                stag = prefix + ++offset
                orgSchemas[stag] = {path: [schema.path], schema : {numColumns : schema.schema.columns.length, columns : schema.schema.columns}}
            }
        }
        for (var orgkey in orgSchemas) {
            this.process(orgSchemas[orgkey])
        }
        if (errSchemas.length > 0) {
            orgSchemas["error"] = errSchemas
        }
        return orgSchemas
    }
}
module.exports = SupersetSchemas
