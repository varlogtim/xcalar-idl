import Path from 'path';
import React from "react";
import BucketChart from './BucketChart';
import FileListTable from './FileListTable'
import NavButtons from '../NavButtons'

const Texts = {
    navButtonLeft: 'Select Data Source',
    navButtonRight: 'Discover Schema'
};

function getSelectedIdsForCurrentView(fileMapViewing, selectedFiles) {
    const validIds = new Set(fileMapViewing.keys());
    if (validIds.size === 0) {
        return new Set();
    }

    const selectedIds = new Set();
    for (const { fileId } of selectedFiles) {
        if (validIds.has(fileId)) {
            selectedIds.add(fileId);
            if (validIds.size <= selectedIds.size) {
                break;
            }
        }
    }
    return selectedIds;
}

function BrowseDataSource({
    bucket,
    homePath,
    path,
    isLoading,
    fileMapViewing,
    selectedFileDir,
    onNextScreen,
    onPrevScreen,
    onPathChange,
    onSelectFiles,
    onDeselectFiles
}) {
    const rootFullPath = Path.join(bucket, homePath);
    const currentFullPath = path;

    return (
        <div className="browseDataSourceScreen fileBrowser">
            <div className="fileBrowserPath">
                <i className="icon xi-upload-folder xc-icon-action upFolderIcon"
                    onClick={() => {
                        if (rootFullPath === currentFullPath) {
                            return;
                        }
                        const parentPath = Path.dirname(currentFullPath);
                        onPathChange(parentPath);
                    }}>
                </i>
                <input value={currentFullPath} readOnly></input>
            </div>
            {
                isLoading
                    ? <span>Loading ...</span>
                    : <FileListTable
                        fileMap={fileMapViewing}
                        selectedIds={getSelectedIdsForCurrentView(fileMapViewing, selectedFileDir)}
                        onPathChange={(newFullPath) => { onPathChange(newFullPath); }}
                        onSelect={(fileIds) => { onSelectFiles(fileIds); }}
                        onDeselect={(fileIds) => { onDeselectFiles(fileIds); }}
                    />
            }
            <NavButtons
                left={{ label: Texts.navButtonLeft, onClick: () => { onPrevScreen() } }}
                right={selectedFileDir.length > 0 ? { label: Texts.navButtonRight, onClick: () => { onNextScreen() } } : null}
            />
            {selectedFileDir.length > 0 ? <BucketChart fileList={selectedFileDir}/> : null}
        </div>
      );
}

export default BrowseDataSource;