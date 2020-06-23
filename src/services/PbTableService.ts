class PbTableService {
    /**
     * list published tables
     */
    public list(): Promise<{
        name: string, size: number, createTime: number | null
    }[]> {
        const PTblManager = window["PTblManager"];
        return new Promise((resolve, reject) => {
            PTblManager.Instance.getTablesAsync(true)
            .then((pbTables) => {
                resolve(pbTables);
            })
            .fail((error) => {
                reject(error);
            });
        });
    }

    /**
     * Delete published tables
     * @param pbTableNames
     */
    public delete(pbTableNames: string[]): Promise<void> {
        // XXX TODO: remove window hack
        const PTblManager = window["PTblManager"];
        return PTblManager.Instance.deleteTablesOnConfirm(pbTableNames, true, false);
    }
}

export default new PbTableService();