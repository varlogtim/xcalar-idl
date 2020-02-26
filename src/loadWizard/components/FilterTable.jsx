import React from "react";
import MUIDataTable from "mui-datatables";
import { Folder, FileCopy, InsertDriveFileOutlined } from '@material-ui/icons';
import * as S3Service from "../services/S3Service";

export default function Filter({
  data,
  setSelectedData,
  bucket,
  path,
  setPath,
  setData,
  fileIdToFile,
  setFileIdToFile
}) {

    const [selectedRows, setSelectedRows] = React.useState([])
    const [selectedFilterList, setSelectedFilterList] = React.useState([])
    const [searchText, setSearchText] = React.useState('')

    const columns = [
        {
         name: "directory",
         label: <FileCopy/>,
         options: {
          filter: false,
          sort: true,
          customBodyRender: isDirectory => isDirectory ? <Folder/> : <InsertDriveFileOutlined/>
         }
        },
        {
         name: "path",
         label: "Path",
         options: {
          filter: false,
          sort: true,
         }
        },
        {
         name: "size",
         label: "Size",
         options: {
          filter: false,
          sort: true,
         },
        },
        {
         name: "type",
         label: "Type",
         options: {
          filter: true,
          filterList: selectedFilterList[3], //hardcoded
          sort: true,
         }
        },
       ];

    React.useEffect(() => {
        setSearchText("")
    }, [])

    const options = {
      filterType: "multiselect",
      responsive: "stacked",
      download: false,
      print: false,
      onRowsSelect: (currentRowsSelected, allRowsSelected) => {
        const selectedIndexes = allRowsSelected.map(row => row.dataIndex)
        setSelectedRows(selectedIndexes)
        setSelectedData(data.filter((value, index) => selectedIndexes.includes(index)))
      },
      onRowClick: (rowData, rowMeta) => {
        if (rowData[3] === 'directory') { // remove hardcode 3
          setData([])
          const newPath = path + rowData[1] + '/'
          setPath(newPath)
          S3Service.listFiles(bucket + newPath).then((fileInfos) => {
            S3Service.populateFiles(fileInfos, setData, fileIdToFile, setFileIdToFile);
          })
          // getS3Data(bucket + newPath, setData, fileIdToFile, setFileIdToFile)
        }

      },
      rowsSelected: selectedRows,
      disableToolbarSelect: true,
      searchOpen: true,
      customSearch: (searchQuery, currentRow, columns) => {
        let regex = ""
        const query = searchQuery || searchText
        try {
          regex = new RegExp(query)
          setSearchText(query)
        } catch (e) {
        }
        return currentRow[1].search(regex) !== -1 //harcoded column
      },
      onSearchClose: () => {
        setSearchText("")
      },
      searchText: searchText,
      setTableProps: () => {
        return {
          padding: "none",
          size: "small",
        };
      },
      onFilterChange: (changedColumn, filterList) => {
        setSelectedFilterList(filterList)
      },
      textLabels: {
        body: {
          noMatch: "",
        },
      },
      responsive: false,
      // setRowProps: (row) => {
      //   return {
      //     className: classnames(
      //       {
      //         [this.props.classes.BusinessAnalystRow]: row[1] === "Business Analyst"
      //       }),
      //     style: {height: '10px',}
      //   };
      // },
    };

    return (
      <MUIDataTable
        title={"Data List"}
        data={data}
        columns={columns}
        options={options}
      />
    );
}

