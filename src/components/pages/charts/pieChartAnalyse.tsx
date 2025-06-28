import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell} from 'recharts';
import React from 'react';

interface PieChartAnalyseProps {
  data: { name: string; value: number }[];
}

const COLORS = ['#0088FE','#00C49F','#FFBB28','#FF8042','#FF6347','#6A5ACD','#20B2AA','#FFD700'];

const COLORS2 = [ "#FF5733", "#33B5FF", "#9B59B6", "#2ECC71", "#F1C40F", "#E67E22", "#1ABC9C", "#A9403C", "#34495E", "#7F8C8D", "#00546b" ];

const renderLabel = ({ name, percent }: { name: string; percent: number }) =>
  `${name} ${(percent * 100).toFixed(0)}%`;

export const PieChartAnalyse: React.FC<PieChartAnalyseProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={450} >
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
          <Legend/>
        </PieChart>
    </ResponsiveContainer>
  );
};

export const PieChartGameStats: React.FC<PieChartAnalyseProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
          <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="60%"
          label
          >
          {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS2[index % COLORS2.length]} />
          ))}
          </Pie>
          <Tooltip />
          <Legend
              verticalAlign="bottom"
              layout="vertical"
              align="center"
              iconType="circle"
              wrapperStyle={{ paddingTop: '20px' }}
              content={({ payload }) => (
                  <ul className="custom-legend">
                      {payload?.map((entry, index) => (
                          <li key={`item-${index}`} style={{ color: entry.color }}>
                          {entry.value}
                          </li>
                      ))}
                  </ul>
              )}
          />
      </PieChart>
    </ResponsiveContainer>
  )
}
