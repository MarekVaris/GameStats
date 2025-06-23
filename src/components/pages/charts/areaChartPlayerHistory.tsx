import { AreaChart,XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchGameHistory } from "../../../api/steam_games";

type HistoryPlayerCount = {
    appid: number,
    name: string,
    date_playerscount: string
}
type Date_PlayersCount = {
    date: string,
    playerscount: number
}

export const PlayerHistoryCountAreaChart = ({ appid }: { appid: string }) => {
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    const formatDate = (date: Date) => date.toISOString().slice(0, 10);


    const [fromDate, setFromDate] = useState(formatDate(oneWeekAgo));
    const [toDate, setToDate] = useState(formatDate(today));
    
    const {
        data: history,
        isLoading,
        error
    } = useQuery<HistoryPlayerCount[]>({
        queryKey: [appid],
        queryFn: () => fetchGameHistory(appid),
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: (failureCount, error: any) => {
            if (error.status === 404) {
                return false;
            }
            return failureCount === 0;
        }
    });


    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    const formattedHistory: Date_PlayersCount[] = history? history.flatMap(item =>
            item.date_playerscount.split(", ").map((entry: string) => {
                const [date, playerscount] = entry.split(" ");
                if (playerscount === "0") {
                    return null;
                }
                return {
                    date: new Date(Number(date)).toISOString().slice(0, 10),
                    playerscount: Number(playerscount),
                };
            }).filter((entry): entry is Date_PlayersCount => entry !== null)
        ): [];

    const filteredHistory = formattedHistory.filter(({ date }) => {
        return date >= fromDate && date <= toDate;
    });


    return (
        <>
            <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={filteredHistory}>
                    <defs>
                        <linearGradient id="colorPlayers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="5 5" />
                    <XAxis
                        dataKey="date"
                        angle={-35}
                        textAnchor="end"
                        height={60}
                        minTickGap={110}
                    />
                    <YAxis />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#1e1e2f",
                            borderRadius: "12px",
                        }}
                        labelFormatter={(label) => `${label}`}
                        formatter={(value: number) => [`${value.toLocaleString()} Players`]}
                    />
                    <Area
                        type="monotone"
                        dataKey="playerscount"
                        stroke="#8884d8"
                        fillOpacity={1}
                        fill="url(#colorPlayers)"
                        dot={false}
                    />
                </AreaChart>
            </ResponsiveContainer>

            <div className="date-input-wrapper">
                <div className="date-fields">
                    <div className="date-fields-content">
                        <label>
                            From:
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="date-input"
                        />
                        </label>
                    </div>

                    <div className="date-fields-content">
                        <label>
                            To:
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="date-input"
                        />
                        </label>
                    </div>
                </div>
                {/* Date buttons for quick navigation */}
                <div className="date-buttons-wrapper">
                    <div className="date-back-buttons">
                        {/* Back one moth */}
                        <button
                            onClick={() => {
                                const newDate = new Date(fromDate);
                                newDate.setMonth(newDate.getMonth() - 1);
                                setFromDate(formatDate(newDate));
                            }}
                            className="date-button month-button"
                        >
                            Back Month
                        </button>
                        { /* Back one week */}
                        <button
                            onClick={() => {
                                const newDate = new Date(fromDate);
                                newDate.setDate(newDate.getDate() - 7);
                                setFromDate(formatDate(newDate));
                            }}
                            className="date-button week-button"
                        >
                            Back Week
                        </button>
                    </div>
                    { /* Reset to last week */}
                    <button
                        onClick={() => {
                            setFromDate(formatDate(oneWeekAgo));
                            setToDate(formatDate(today));
                        }}
                        className="date-button reset-button"
                    >
                        Reset
                    </button>
                    <div className="date-forwad-button">
                        { /* Forward one month */}
                        <button
                            onClick={() => {
                                const newDate = new Date(toDate);
                                newDate.setDate(newDate.getDate() + 7);
                                if (formatDate(newDate) > toDate) {
                                    newDate.setDate(newDate.getDate() - 8);
                                    setFromDate(formatDate(newDate));
                                }
                                else{
                                    setFromDate(formatDate(newDate));
                                }
                            }}
                            className="date-button week-button"
                        >
                            Forward Week
                        </button>
                        { /* Forward one month */}
                        <button
                            onClick={() => {
                                const newDate = new Date(toDate);
                                newDate.setMonth(newDate.getMonth() + 1);
                                if (formatDate(newDate) > toDate) {
                                    newDate.setMonth(newDate.getMonth() - 1);
                                    newDate.setDate(newDate.getDate() - 1);
                                    setFromDate(formatDate(newDate));
                                }
                                else{
                                    setFromDate(formatDate(newDate));
                                }
                            }}
                            className="date-button month-button"
                        >
                            Forward Month
                        </button>
                    </div>
                </div>
            </div>

        </>
    );

}