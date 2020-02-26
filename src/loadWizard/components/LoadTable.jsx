import React from 'react'
import styled from 'styled-components'
import { useTable, useSortBy, usePagination } from 'react-table'
import LoadCell from './LoadCell'
import prettyBytes from 'pretty-bytes'

const Styles = styled.div`
  table {
    width: 100%;
    border-spacing: 0;
    border: 1px solid #aaa;

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }

    th,
    td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid #aaa;
      border-right: 1px solid #eee;

      :last-child {
        border-right: 0;
        text-align: center;
      }
    }
  }
`;


function Table({ columns, data }) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
    },
    useSortBy,
    usePagination
  )


  return (
    <React.Fragment>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                // Add the sorting props to control sorting. For this example
                // we can add them into the header props
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                  {column.render('Header')}
                  {/* Add a sort direction indicator */}
                  <span>
                    {column.isSorted
                      ? column.isSortedDesc
                        ? ' 🔽'
                        : ' 🔼'
                      : ''}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map((row, i) => {
            prepareRow(row)
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => {
                  return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="pagination">
        <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
          {'<<'}
        </button>{' '}
        <button onClick={() => previousPage()} disabled={!canPreviousPage}>
          {'<'}
        </button>{' '}
        <button onClick={() => nextPage()} disabled={!canNextPage}>
          {'>'}
        </button>{' '}
        <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
          {'>>'}
        </button>{' '}
        <span>
          Page{' '}
          <strong>
            {pageIndex + 1} of {pageOptions.length}
          </strong>{' '}
        </span>
        <span>
          | Go to page:{' '}
          <input
            type="number"
            defaultValue={pageIndex + 1}
            onChange={e => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0
              gotoPage(page)
            }}
            style={{ width: '100px' }}
          />
        </span>{' '}
        <select
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value))
          }}
        >
          {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
      <br />
      {/* <div>Showing the first 20 results of {rows.length} rows</div> */}
    </React.Fragment>
  )
}

function LoadTable({props}) {
  const {
    setSchemaLoadTableInfo,
    schemasObject,
    setSchemasObject,
    fileIdToStatus,
    setFileIdToStatus,
    setAllTablesTotalCost,
    setAllTablesTotalEta,
  } = props
  
    const columns = React.useMemo(
        () => [
            {
                Header: 'Schema',
                accessor: 'schema',
            },
            {
                Header: 'Size',
                accessor: 'size',
            },
            {
                Header: 'Count',
                accessor: 'count',
            },
            {
                Header: 'Cost',
                accessor: 'cost',
            },
            {
                Header: 'Time',
                accessor: 'time',
            },
            {
                Header: 'Create',
                accessor: 'load',
            },
        ],
        []
      )
    const loadTableData = []
    let totalCost = 0
    let totalEta = 0

    for (let schemaName in schemasObject) {
      if (schemaName !== 'No Schema Detected') {
        const schema = schemasObject[schemaName]
        totalCost += schema.totalCost
        totalEta += schema.totalEta

        loadTableData.push({
            "schema": <button onClick={() => setSchemaLoadTableInfo(JSON.stringify(schemasObject[schemaName].schema))}>{schemaName}</button>,
            "count": schema.count,
            "size": prettyBytes(schema.size),
            "cost": '$' + schema.totalCost.toFixed(8),
            "time": schema.totalEta.toFixed(8) + ' seconds',
            "load": <LoadCell
              schemasObject={schemasObject}
              setSchemasObject={setSchemasObject}
              schemaName={schemaName}
              fileIdToStatus={fileIdToStatus}
              setFileIdToStatus={setFileIdToStatus}
            />,
        })
      }
    }

    setAllTablesTotalCost(totalCost)
    setAllTablesTotalEta(totalEta)

  return (
      <Styles>
          <Table columns={columns} data={loadTableData} />
      </Styles>
  )
}

export default LoadTable