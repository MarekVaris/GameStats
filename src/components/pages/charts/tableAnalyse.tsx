import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Box } from '@mui/material';

interface TableProps {
  data: {
    appid: number;
    name: string;
    developers: string;
    publishers: string;
    release_date: string;
    platforms: string;
    categories: string;
    genres: string;
  }[];
}

const columns = [
  { field: 'appid', headerName: 'App ID', width: 100 },
  { field: 'name', headerName: 'Name', width: 200 },
  { field: 'developers', headerName: 'Developers', width: 200 },
  { field: 'publishers', headerName: 'Publishers', width: 200 },
  { field: 'release_date', headerName: 'Release Date', width: 150 },
  { field: 'platforms', headerName: 'Platforms', width: 150 },
  { field: 'categories', headerName: 'Categories', width: 200 },
  { field: 'genres', headerName: 'Genres', width: 200 },
];

const downloadCSV = (data: TableProps['data']) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table_data.csv';
    a.click();
    URL.revokeObjectURL(url);
};

export const TableAnalyse: React.FC<TableProps> = ({ data }) => {
  return (
    <Box sx={{ height: 650, width: '100%' }}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => downloadCSV(data)}
      >
        Download CSV
      </Button>

      <DataGrid
        rows={data}
        columns={columns}
        getRowId={(row) => row.appid}
      />
    </Box>
  );
};
