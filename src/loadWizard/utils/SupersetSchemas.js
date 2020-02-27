export class SupersetSchemas {
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
        for (var column of schema.schema.columnsList) {
            var defs = column.split("-")
            var col = {name: defs[0], mapping: defs[1], type: defs[2]}
            cols.push(col)
        }
        schema.schema.columnsList = cols
    }

    getSchemas(schemas) {
        const newschemas = JSON.parse(JSON.stringify(schemas))
        try {
            return this._getSchemas(newschemas)
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
            // schema["schema"]["columnsList"] = this.normalize(schema.schema.columnsList)
            // var normalizedSchema = this.normalize(schema.schema.columnsList)
            var found = false
            if (Object.keys(orgSchemas).length == 0) {
                var stag = prefix + ++offset
                orgSchemas[stag] = {path: [schema.path], schema : {numColumns : schema.schema.columnsList.length, columnsList : schema.schema.columnsList}}
                found = true
            } else {
                for (var orgkey in orgSchemas) {
                    var orgSchema = orgSchemas[orgkey]
                    if (schema.schema.columnsList.length <= orgSchema.schema.columnsList.length) {
                        if (this.normalize(schema.schema.columnsList).every(val => this.normalize(orgSchema.schema.columnsList).includes(val))) {
                            orgSchema.path.push(schema.path)
                            found = true
                            break
                        }
                    } else {
                        if (this.normalize(orgSchema.schema.columnsList).every(val => this.normalize(schema.schema.columnsList).includes(val))) {
                            orgSchema.path.push(schema.path)
                            orgSchema.schema.columnsList = schema.schema.columnsList
                            orgSchema.schema.numColumns = schema.schema.columnsList.length
                            found = true
                            break
                        }
                    }
                }
            }
            if (!found) {
                stag = prefix + ++offset
                orgSchemas[stag] = {path: [schema.path], schema : {numColumns : schema.schema.columnsList.length, columnsList : schema.schema.columnsList}}
            }
        }
        // for (var orgkey in orgSchemas) {
        //     this.process(orgSchemas[orgkey])
        // }
        if (errSchemas.length > 0) {
            orgSchemas["error"] = errSchemas
        }
        return orgSchemas
    }
}
/*
if (typeof module !== 'undefined') {
    module.exports = SupersetSchemas
}
*/
