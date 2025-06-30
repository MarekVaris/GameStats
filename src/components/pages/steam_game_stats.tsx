import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import "../../styles/game_stats.css";

import { fetchTopSteamGames } from "../../api/steam_games";
import { PieChartGameStats } from "./charts/pieChartAnalyse";


type Game = {
    appid: number;
    rank: number;
    name: string;
    concurrent_in_game: number;
    header_image: string;
};

const GameStats = () => {
    // Fetch top Steam games when the component mounts
    const { 
        data: games,
        isLoading,
        isError 
    } = useQuery<Game[]>({
        queryKey: ["topSteamGames"],
        queryFn: fetchTopSteamGames,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });
    
    // Calculate top 10 games and prepare data for the pie chart
    const top10Games = (games ?? []).slice(0, 10);
    const [showAll, setShowAll] = useState(false);

    const totalPlayersAllGames = (games ?? []).reduce((sum, g) => sum + g.concurrent_in_game, 0);
    const totalPlayersTop10 = top10Games.reduce((sum, g) => sum + g.concurrent_in_game, 0);
    const visibleGames : Game[] = showAll ? top10Games : top10Games.slice(0, 5);

    // Prepare data for the pie chart
    const chartData = [
        ...top10Games.map((game) => ({
            name: game.name,
            value: game.concurrent_in_game,
        })),
        {
            name: "Other Games",
            value: Math.max(totalPlayersAllGames - totalPlayersTop10, 0),
        },
    ];


    return (

        isLoading ? (
            <div className="loading-container">
                <h1>Loading...</h1>
            </div>
        ) : isError ? (
            <div className="error-container">
                <h1>Error loading game stats</h1>
            </div>
        ) : (
        <>
            <div className="top-games-container">
                <h1>Hall of Glory</h1>
                <div className="crown">♕</div>
                
                {/* Displaying the top 10 games */}
                <div className="game-grid">
                    { visibleGames.map((game, index) => {
                        const isDimmed = !showAll && index === 4;
                        
                        return (
                            <Link
                                to={`/game/${game.appid}`}
                                key={game.appid}
                                className={`game-card ${isDimmed ? "dimmed" : ""}`}
                            >
                                <img src={game.header_image} alt={game.name} />
                                <div className="game-rank">#{game.rank}</div>
                                <div className="game-info-gamestats">
                                    <p className="game-name">{game.name}</p>
                                    <p className="player-count">Players: {game.concurrent_in_game.toLocaleString()}</p>
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
                
                {/* Displaying the pie chart with game stats */}
                <div className="chart-container-gamestats">
                    <PieChartGameStats data={chartData} />
                </div>
                
                {/* Displaying live game stats */}
                <div className="top-stats-container">
                    <h3>Live Game Stats</h3>
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
        </>
        )
    );
};

export default GameStats;
