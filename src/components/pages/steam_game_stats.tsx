import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import "../../styles/game_stats.css";
import { fetchTopSteamGames } from "../../api/steam_games";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";

type Game = {
    appid: number;
    rank: number;
    name: string;
    concurrent_in_game: number;
    header_image: string;
};

const COLORS = [
    "#FF5733", "#33B5FF", "#9B59B6", "#2ECC71", "#F1C40F",
    "#E67E22", "#1ABC9C", "#A9403C", "#34495E", "#7F8C8D",
    "#00546b"
];

const GameStats = () => {
    const { data: games } = useQuery<Game[]>({
        queryKey: ["topSteamGames"],
        queryFn: fetchTopSteamGames,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });
    
    
    const top10Games = (games ?? []).slice(0, 10);
    const [showAll, setShowAll] = useState(false);

    const totalPlayersAllGames = (games ?? []).reduce((sum, g) => sum + g.concurrent_in_game, 0);
    const totalPlayersTop10 = top10Games.reduce((sum, g) => sum + g.concurrent_in_game, 0);

    const chartData = [
        ...top10Games.map((game) => ({
            name: game.name,
            value: game.concurrent_in_game,
        })),
        {
            name: "Pozostałe gry",
            value: Math.max(totalPlayersAllGames - totalPlayersTop10, 0),
        },
    ];

    const visibleGames = showAll ? top10Games : top10Games.slice(0, 5);

    return (
        <div className="top-games-container">
            <h1>Hall of Glory</h1>

            <div className="crown">♕</div>

            <div className="game-grid">
                {visibleGames.map((game, index) => {
                    const isDimmed = !showAll && index === 4;
                        return (
                            <Link
                            to={`/game/${game.appid}`}
                            key={game.appid}
                            className={`game-card ${isDimmed ? "dimmed" : ""}`}
                        >
                            <img src={game.header_image} alt={game.name} className="game-image" />
                            <div className="game-rank">#{game.rank}</div>
                            <div className="game-info">
                            <p className="game-name">{game.name}</p>
                            <p className="player-count">
                        Players: {game.concurrent_in_game.toLocaleString()}
                        </p>
                    </div>
                </Link>
                );
                })}
            </div> 

            <div className="toggle-button-container">
                <button className="toggle-button" onClick={() => setShowAll(!showAll)}>
                    {showAll ? "▲" : "▼"}
                </button>
            </div>
        
            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="60%"
                        label
                        >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
            </div>

            <div className="top-stats-container">
            <div className="top-stats-card">
                <h3 className="top-stats-title">Live Game Stats</h3>
                <div className="top-stats-grid">
                <div className="stat-item">
                    <strong>Players in Top 10 Games: </strong>
                    <span className="highlighted">{top10Games.reduce((sum, g) => sum + g.concurrent_in_game, 0).toLocaleString()}</span>
                </div>
                <div className="stat-item">
                    <strong>All Players in All Games: </strong>
                    <span className="highlighted">{totalPlayersAllGames.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                    <strong>Top 10 Compared to All: </strong>
                    <span className="highlighted">{((totalPlayersTop10 / totalPlayersAllGames) * 100).toFixed(2)}%</span>
                </div>
                <div className="stat-item">
                    <strong>Rest of the Games: </strong>
                    <span className="highlighted">{((1 - totalPlayersTop10 / totalPlayersAllGames) * 100).toFixed(2)}%</span>
                </div>
                </div>
            </div>
            </div>

        </div>
    );
};

export default GameStats;
