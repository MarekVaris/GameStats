import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../../styles/header.css";
import { useQuery } from "@tanstack/react-query";
import { searchForGamesAllList } from "../../api/steam_games";

type GameSearch = {
    appid: number;
    name: string;
}


const Header = () => {
    const [query, setQuery] = useState("");
    const [filteredGames, setFilteredGames] = useState<GameSearch[]>([]);
    const navigate = useNavigate();

    const { 
        data: games,
    } = useQuery<GameSearch[]>({
        queryKey: ["searchForGamesAllList"],
        queryFn: searchForGamesAllList,
    });
    
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search/${encodeURIComponent(query.trim())}`);
        }
    };
    
    useEffect(() => {
        if (!query.trim() || !games) {
            setFilteredGames([]);
            return;
        }
        
        const startsWith = query.trim().toLowerCase();
        const filtered = games.filter(game =>
            game.name.toLowerCase().startsWith(startsWith)
        );
        setFilteredGames(filtered);
    }, [query, games]);
    

    return (
        <header className="app-header">
            <div className="container">
                <h2>Steam Game Stats</h2>

                <form className="search-form" onSubmit={handleSearch}>
                    <input 
                        type="text" 
                        placeholder="Search for a game..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="submit">Search</button>
                </form>

                {filteredGames.length > 0 && (
                    <ul className="search-suggestions">
                        {filteredGames.slice(0, 5).map(game => (
                            <li key={game.appid}>
                                <Link to={`/game/${game.appid}`} onClick={() => setQuery("")}>
                                    {game.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                <nav>
                    <Link to="/GameStats">Home</Link>
                    <Link to="/SteamAnalyse">Steam Analyse</Link>
                    <Link to="/TopSteamGames">Top Steam Games</Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;
