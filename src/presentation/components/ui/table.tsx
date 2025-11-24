'use client'

import * as React from 'react'
import {
  Table as MuiTable,
  TableBody as MuiTableBody,
  TableCell as MuiTableCell,
  TableHead as MuiTableHead,
  TableRow as MuiTableRow,
  TableContainer,
  Paper,
  TableProps as MuiTableProps,
} from '@mui/material'

export interface TableProps extends MuiTableProps {}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(({ children, ...props }, ref) => {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <MuiTable ref={ref} {...props}>
        {children}
      </MuiTable>
    </TableContainer>
  )
})

Table.displayName = 'Table'

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  (props, ref) => {
    return <MuiTableHead ref={ref} {...(props as any)} />
  }
)

TableHeader.displayName = 'TableHeader'

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  (props, ref) => {
    return <MuiTableBody ref={ref} {...props} />
  }
)

TableBody.displayName = 'TableBody'

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  (props, ref) => {
    return <MuiTableRow ref={ref} {...props} />
  }
)

TableRow.displayName = 'TableRow'

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  (props, ref) => {
    const { align, ...rest } = props
    return <MuiTableCell ref={ref} component="th" align={align === 'char' ? 'left' : (align as any)} {...rest} />
  }
)

TableHead.displayName = 'TableHead'

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  (props, ref) => {
    const { align, ...rest } = props
    return <MuiTableCell ref={ref} align={align === 'char' ? 'left' : (align as any)} {...rest} />
  }
)

TableCell.displayName = 'TableCell'
