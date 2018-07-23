namespace DagDatasetModal {
    let $modal: JQuery;
    let modalHelper: ModalHelper;
    let node: DagNodeDataset;
    let $pathsList: JQuery;
    let $configs: JQuery;

    export function setup(): void {
        $modal = $("#dagDatasetModal");
        $pathsList = $modal.find(".pathsList");
        $configs = $modal.find(".configs");
        modalHelper = new ModalHelper($modal, {

        });
        _addEvents();
    }

    export function show(dagNode: DagNodeDataset): void {
        node = dagNode;
        _displayCurrentConfig();
        _displayPathList();
        modalHelper.setup();
    }

    function _displayCurrentConfig(): void {
        const params: DagNodeDatasetInput = node.getParam();
        $configs.html(JSON.stringify(params, null, 4));
    }

    function _displayPathList(): void {
        const paths: {}[] = DS.listDatasets();
        let html: HTML = "";
        paths.forEach(function(pathInfo) {
            let path = pathInfo.path;
            if (pathInfo.suffix) {
                path += '<span class="suffix">(' + pathInfo.suffix + ')</span>';
            }
            html += '<div class="path" data-id="' + pathInfo.id + '">' + path + '</div>';
        });
        $pathsList.html(html);
    }

    function _closeModal(): void {
        node = null;
        $pathsList.empty();
        $configs.empty();
        modalHelper.clear();
    }

    function _addEvents(): void {
        $modal.on("click", ".close, .cancel", function() {
            _closeModal();
        });
        $modal.find(".pathsSection").on("click",  ".path", function() {
            const dsId: string = $(this).data("id");
            const dsObj = DS.getDSObj(dsId)
            const dsName = dsObj.getFullName();
            const prefix = dsObj.getName();
            node.setParam({
                source: dsName,
                prefix: prefix
            });
            _closeModal();
        });
    }
}