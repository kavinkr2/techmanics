import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable, } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
export default function DataTable({ columns, data, className, }) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    });
    return (_jsxs("div", { className: cn("table-container", className), children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "table", children: [_jsx("thead", { children: table.getHeaderGroups().map((headerGroup) => (_jsx("tr", { children: headerGroup.headers.map((header) => (_jsx("th", { children: header.isPlaceholder
                                        ? null
                                        : flexRender(header.column.columnDef.header, header.getContext()) }, header.id))) }, headerGroup.id))) }), _jsx("tbody", { children: table.getRowModel().rows?.length ? (table.getRowModel().rows.map((row) => (_jsx("tr", { children: row.getVisibleCells().map((cell) => (_jsx("td", { children: flexRender(cell.column.columnDef.cell, cell.getContext()) }, cell.id))) }, row.id)))) : (_jsx("tr", { children: _jsx("td", { colSpan: columns.length, className: "h-24 text-center text-text-muted", children: "No results." }) })) })] }) }), table.getPageCount() > 1 && (_jsxs("div", { className: "pagination", children: [_jsxs("div", { className: "text-text-muted", children: ["Page ", table.getState().pagination.pageIndex + 1, " of", " ", table.getPageCount()] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { disabled: !table.previousPage, onClick: () => table.previousPage(), className: "btn btn-ghost btn-sm", children: "Prev" }), _jsx("button", { disabled: !table.nextPage, onClick: () => table.nextPage(), className: "btn btn-ghost btn-sm", children: "Next" })] })] }))] }));
}
