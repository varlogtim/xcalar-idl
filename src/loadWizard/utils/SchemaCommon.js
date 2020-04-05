const typeReplacePattern = /\([0-9,]*\)/;

/**
 * Get columns' signature
 * @param {Array<{name: string, mapping: string, type: string}>} columns
 * @returns {Array<string>} column signatures
 */
function getColumnsSignature(columns) {
    if (columns == null) {
        return [];
    }

    return columns.map(
        ({ name, mapping, type }) => `${name}-${mapping}-${type.replace(typeReplacePattern, '')}`
    );
}

export { getColumnsSignature }
