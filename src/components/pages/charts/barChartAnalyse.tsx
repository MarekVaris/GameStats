import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar } from "recharts";

type BarChartAnalyseProps = {
    data: { name: string; value: number }[];
};

export const BarChartAnalyse: React.FC<BarChartAnalyseProps> = ({ data }) => (
    <ResponsiveContainer width="100%" height={450}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
                dataKey="name"
                angle={-35}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 13, fill: "#8884d8" }} 
            />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
    </ResponsiveContainer>
);

