import React from "react";
import MUIDataTable from "mui-datatables";
import SchemaCell from './SchemaCell'

export default function DiscoverTable({
  selectedData,
  schemaCellGeneralProps,
  bucket,
  path
}) {
  // const [searchText, setSearchText] = React.useState('')

    const displayData = selectedData.map((file) => {
        file.schema = {
          fileId: file.fileId,
          sizeInBytes: file.sizeInBytes,
          fullPath: bucket + path + file.path
        }
        return file
    })
    const columns = [
        {
         name: "fileId",
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
          sort: true,
         }
        },
        {
         name: "schema",
         label: "Schema",
         options: {
          filter: false,
          sort: true,
          customBodyRender: (file, tableMeta, updateValue) => {
              return <SchemaCell schemaCellGeneralProps={schemaCellGeneralProps} file={file}/>
          }
         },
        },
       ];

    const options = {
      responsive: "stacked",
      selectableRows: "none",
      download: false,
      print: false,
      disableToolbarSelect: true,
      searchOpen: true,
      setTableProps: () => {
        return {
          padding: "none",
          size: "small",
        };
      },
      // todo - fix regex search slowness
      // customSearch: (searchQuery, currentRow, columns) => {
      //   let regex = ""
      //   const query = searchQuery || searchText
      //   try {
      //     regex = new RegExp(query)
      //     setSearchText(query)
      //   } catch (e) {
      //   }
      //   return currentRow[1].search(regex) !== -1 //harcoded column
      // },
      // onSearchClose: () => {
      //   setSearchText("")
      // },
      // searchText: searchText,
    };

    return (
      <MUIDataTable
        title={"Data List"}
        data={displayData}
        columns={columns}
        options={options}
      />
    );
}

