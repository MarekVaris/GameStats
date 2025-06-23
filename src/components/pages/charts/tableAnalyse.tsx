import { DataGrid } from '@mui/x-data-grid';

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


export const TableAnalyse: React.FC<TableProps> = ({ data }) => {
  return (
    <div style={{ height: 600, width: "100%" }}>
      <DataGrid
        rows={data}
        columns={columns}
        getRowId={(row) => row.appid}
      />
    </div>
  );
};
