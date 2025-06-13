import { AreaChart,XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { fetchGameHistory } from '../../api/steam_games';


export const PlayerHistoryCountAreaChart = ({ appid }: { appid: string }) => {
    type HistoryPlayerCount = {
        appid: number,
        name: string,
        date_playerscount: string
    }
    type Date_PlayersCount = {
        date: string,
        playerscount: number
    }
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
    });

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    const formattedHistory: Date_PlayersCount[] = history? history.flatMap(item =>
            item.date_playerscount.split(', ').map((entry: string) => {
                const [date, playerscount] = entry.split(' ');
                if (playerscount === '0') {
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
                        tickFormatter={(tick) => tick}
                    />
                    <YAxis />
                    <Tooltip
                    labelFormatter={(label) => {
                        const date = new Date(Number(label));
                        return date.toLocaleDateString();
                    }}
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
                    <label>
                    From:
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="date-input"
                    />
                    </label>
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
                <div className="date-buttons-wrapper">
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

                    <button
                        onClick={() => {
                            setFromDate(formatDate(oneWeekAgo));
                            setToDate(formatDate(today));
                        }}
                        className="date-button reset-button"
                    >
                        Reset
                    </button>

                    <button
                        onClick={() => {
                            const newDate = new Date(toDate);
                            newDate.setDate(newDate.getDate() + 7);
                            if (newDate > today) {
                                newDate.setDate(today.getDate());
                                newDate.setMonth(today.getMonth());
                            }
                            setFromDate(formatDate(newDate));
                        }}
                        className="date-button week-button"
                    >
                        Forward Week
                    </button>

                    <button
                        onClick={() => {
                            const newDate = new Date(toDate);
                            newDate.setMonth(newDate.getMonth() + 1);
                            if (newDate > today) {
                                newDate.setMonth(today.getMonth());
                                newDate.setDate(today.getDate());
                            }
                            setFromDate(formatDate(newDate));
                        }}
                        className="date-button month-button"
                    >
                        Forward Month
                    </button>

                </div>
            </div>

        </>
    );

}