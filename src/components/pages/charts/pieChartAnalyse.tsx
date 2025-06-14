import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import React from 'react';

interface PieChartAnalyseProps {
  data: { name: string; value: number }[];
}

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#FF6347',
  '#6A5ACD',
  '#20B2AA',
  '#FFD700',
];

const renderLabel = ({ name, percent }: { name: string; percent: number }) =>
  `${name} ${(percent * 100).toFixed(0)}%`;

export const PieChartAnalyse: React.FC<PieChartAnalyseProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={450}>
      <PieChart>
        <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={renderLabel}
        >
        {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
        ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
