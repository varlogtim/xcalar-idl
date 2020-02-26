class UnionSchema {
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
        var unionColumns = unionSchema.schema.columns
        var newColumns = newSchema.schema.columns
        for (var column of newColumns) {
            if (!this.exists(unionColumns, column)) {
                unionSchema.schema.numColumns += 1
                unionSchema.schema.columns.push(column)
            }
            if (!unionSchema.path.includes(newSchema.path)) {
                unionSchema.path.push(newSchema.path)
            }
        }
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

    getSchema(schemas) {
        try {
            var unionSchema = null
            var errSchemas = []
            for (var schema of schemas) {
                if (!schema.success) {
                    errSchemas.push(schema)
                    continue
                }
                schema.schema.columns = this.normalize(schema.schema.columns)
                if (unionSchema == null) {
                    unionSchema = schema
                    unionSchema.path = [unionSchema.path]
                } else {
                    this.union(unionSchema, schema)
                }
            }
            this.process(unionSchema)
            if (errSchemas.length > 0) {
                unionSchema["error"] = errSchemas
            }
            return {S1 : unionSchema}
        } catch (err) {
            return {"error" : err.message}
        }
    }
}
module.exports = UnionSchema
