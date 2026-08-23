import React from 'react';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  align?: 'left' | 'center';
  /** Nhan hien truoc gia tri khi o che do the tren dien thoai */
  mobileLabel?: string;
  /** Cot phu, an bot tren dien thoai cho do chat */
  hideOnMobile?: boolean;
  /** Dua len dau the tren dien thoai thay vi nam trong danh sach nhan - gia tri */
  primary?: boolean;
  render: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  /** Khoa on dinh cho tung dong; mac dinh dung chi so */
  rowKey?: (row: T, index: number) => string | number;
  emptyTitle?: string;
  emptyHint?: string;
  /** Mau thanh tieu de bang; mac dinh theo accent cua trang */
  headClassName?: string;
}

/**
 * Bang du lieu dung chung cho 2 trang thong tin.
 *
 * Tu md tro len: bang that, cuon ngang trong khung rieng nen than trang
 * khong bao gio bi tran ngang.
 * Duoi md: moi dong thanh mot the - bang 10 cot khong the doc noi tren
 * dien thoai doc, ma do la thiet bi chinh cua nhom trang nay.
 */
function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyTitle = 'Chưa có dữ liệu',
  emptyHint,
  headClassName = 'bg-accent-600',
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-card shadow-card border border-slate-100">
        <EmptyState title={emptyTitle} hint={emptyHint} />
      </div>
    );
  }

  const mobileColumns = columns.filter((c) => !c.hideOnMobile);
  const primaryColumns = mobileColumns.filter((c) => c.primary);
  const detailColumns = mobileColumns.filter((c) => !c.primary);

  return (
    <>
      {/* Laptop / TV */}
      <div className="hidden md:block bg-white rounded-card shadow-card border border-slate-100 overflow-hidden">
        <div className="scroll-x">
          <table className="w-full border-collapse">
            <thead>
              <tr className={`${headClassName} text-white`}>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-4 py-3 text-sm font-semibold whitespace-nowrap
                      ${column.align === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowKey ? rowKey(row, rowIndex) : rowIndex}
                  className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50/60 hover:bg-accent-50/60 transition-colors"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 align-middle ${column.align === 'center' ? 'text-center' : 'text-left'}`}
                    >
                      {column.render(row, rowIndex)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dien thoai doc */}
      <ul className="md:hidden space-y-2 list-none p-0 m-0">
        {rows.map((row, rowIndex) => (
          <li
            key={rowKey ? rowKey(row, rowIndex) : rowIndex}
            className="bg-white rounded-card shadow-card border border-slate-100 p-3"
          >
            {primaryColumns.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                {primaryColumns.map((column) => (
                  <React.Fragment key={column.key}>{column.render(row, rowIndex)}</React.Fragment>
                ))}
              </div>
            )}
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 m-0">
              {detailColumns.map((column) => (
                <div key={column.key} className="min-w-0">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
                    {column.mobileLabel ?? column.key}
                  </dt>
                  <dd className="m-0 text-sm text-slate-700 truncate">{column.render(row, rowIndex)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export default DataTable;
