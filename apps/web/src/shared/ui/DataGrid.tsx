import { ReactNode } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import s from './DataGrid.module.css';

interface DataGridProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  loading?: boolean;
  emptyMessage?: ReactNode;
  getRowStyle?: (row: TData) => React.CSSProperties;
}

export function DataGrid<TData>({ data, columns, loading, emptyMessage = 'No data available', getRowStyle }: DataGridProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={s.container}>
      <table className={s.table}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className={s.tr}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className={s.th}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading ? (
            <tr className={s.tr}>
              <td colSpan={columns.length} className={s.td} style={{ textAlign: 'center', padding: '32px' }}>
                <span style={{ color: 'var(--rd-color-text-subtle)' }}>Loading...</span>
              </td>
            </tr>
          ) : table.getRowModel().rows.length === 0 ? (
            <tr className={s.tr}>
              <td colSpan={columns.length} className={s.td} style={{ textAlign: 'center', padding: '32px' }}>
                <span style={{ color: 'var(--rd-color-text-subtle)' }}>{emptyMessage}</span>
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={s.tr} style={getRowStyle ? getRowStyle(row.original) : {}}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={s.td}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
