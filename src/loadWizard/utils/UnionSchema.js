export class UnionSchema {
    normalize(columns) {
        var newcol = []
        const regex = /\(\d*\)/
        for (var column of columns) {
            var col = column.name + "-" + column.mapping + "-" + column.type.replace(regex, '')
            newcol.push(col)
        }
        return newcol
    }

    exists(unionCols, newCol) {
        for (var unionCol of unionCols) {
            if (unionCol === newCol) {
                return true
            }
        }
        return false
    }

    union(unionSchema, newSchema) {
        var unionColumns = unionSchema.schema.columnsList
        var newColumns = newSchema.schema.columnsList
        for (var column of newColumns) {
            if (!this.exists(unionColumns, column)) {
                unionSchema.schema.numColumns += 1
                unionSchema.schema.columnsList.push(column)
            }
            if (!unionSchema.path.includes(newSchema.path)) {
                unionSchema.path.push(newSchema.path)
            }
        }
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

    getSchema(schemas) {
        const newschemas = JSON.parse(JSON.stringify(schemas))
        return this._getSchema(newschemas);
    }

    _getSchema(schemas) {
        var unionSchema = null
        var errSchemas = []
        for (var schema of schemas) {
            if (!schema.success) {
                errSchemas.push(schema)
                continue
            }
            schema.schema.columnsList = this.normalize(schema.schema.columnsList)
            if (unionSchema == null) {
                unionSchema = schema
                unionSchema.path = [unionSchema.path]
            } else {
                this.union(unionSchema, schema)
            }
        }
        this.process(unionSchema)
        return [{"Schema 1" : unionSchema}, errSchemas];
    }
}
/*
if (typeof module !== 'undefined') {
    module.exports = UnionSchema
}
*/
