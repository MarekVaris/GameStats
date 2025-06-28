import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

type LineChartAnalyseProps = {
  data: {
    name: string;
    [gameName: string]: number | string;
  }[];
};

export const LineChartAnalyse: React.FC<LineChartAnalyseProps> = ({ data }) => {
  const keys = Object.keys(data[0] || {}).filter((key) => key !== "name");
  const colors = [
    "#8884d8"
  ];

  return (
    <ResponsiveContainer width="100%" height={450}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          angle={-35}
          textAnchor="end"
          height={100}
          tick={{ fontSize: 13 }}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        {keys.map((gameName, index) => (
          <Line
            key={gameName}
            type="monotone"
            dataKey={gameName}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
