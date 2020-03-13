import Path from 'path';
import React from "react";
import BucketChart from './BucketChart';
import FileListTable from './FileListTable'
import NavButtons from '../NavButtons'
import SelectedFilesArea from "./SelectedFilesArea"

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
                    data-toggle="tooltip"
                    data-placement="top"
                    data-container="body"
                    data-original-title="Go to parent directory"
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
            <div className="fileListTableArea">
                <div className="fileListTableWrap">
                {
                    isLoading
                        ? <span className="loadingText">Loading ...</span>
                        : <FileListTable
                            fileMap={fileMapViewing}
                            selectedIds={getSelectedIdsForCurrentView(fileMapViewing, selectedFileDir)}
                            onPathChange={(newFullPath) => { onPathChange(newFullPath); }}
                            onSelect={(fileIds) => { onSelectFiles(fileIds); }}
                            onDeselect={(fileIds) => { onDeselectFiles(fileIds); }}
                        />
                }
                </div>
                <SelectedFilesArea
                    fileMap={fileMapViewing}
                    selectedFileDir={selectedFileDir}
                    onSelect={(fileIds) => { onSelectFiles(fileIds); }}
                    onDeselect={(fileIds) => { onDeselectFiles(fileIds); }}
                />
            </div>
            <NavButtons
                left={{ label: Texts.navButtonLeft, onClick: () => { onPrevScreen() } }}
                right={{
                    label: Texts.navButtonRight,
                    disabled: selectedFileDir.length === 0,
                    onClick: () => { onNextScreen() }
                }}
            />
            {selectedFileDir.length > 0 ? <BucketChart fileList={selectedFileDir}/> : null}
        </div>
      );
}

export default BrowseDataSource;