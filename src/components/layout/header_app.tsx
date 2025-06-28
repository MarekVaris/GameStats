import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../../styles/header.css";
import { useQuery } from "@tanstack/react-query";
import { searchForGamesAllList } from "../../api/steam_games";
import { resetSteamGameFilters } from "../../components/pages/top_steam_games"

type GameSearch = {
    appid: number;
    name: string;
}


const Header = () => {
    const [query, setQuery] = useState("");
    const [filteredGames, setFilteredGames] = useState<GameSearch[]>([]);
    const navigate = useNavigate();

    // Fetch all games for search suggestions
    const { 
        data: games,
        refetch,
        isLoading
    } = useQuery<GameSearch[]>({
        queryKey: ["searchForGamesAllList"],
        queryFn: searchForGamesAllList,
        enabled: false
    });
    
    // Handle search submission
    const handleSearch = () => { 
        if (query.trim()) {
            navigate(`/search/${encodeURIComponent(query.trim())}`);
        }
    };

    // Handle fetching games when the input changes
    const handleFetch = () => {
        if (!games){
            refetch()
        }
    }
    
    // Filter games based on the query
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
                <h2><Link to="/">Steam Game Stats</Link></h2>

                {/* Search form with suggestions */}
                <form className="search-form" onSubmit={handleSearch}>
                    <input 
                        type="text" 
                        placeholder="Search for a game..." 
                        value={query}
                        onChange={(e) => (handleFetch(), setQuery(e.target.value))}
                        onBlur={(e) => {
                            if (!e.relatedTarget || !e.relatedTarget.contains(e.relatedTarget)){
                                setFilteredGames([]);
                            }
                        }}
                        onFocus={() => {
                            if (query.trim()) {
                                const startsWith = query.trim().toLowerCase();
                                const filtered = games?.filter(game =>
                                    game.name.toLowerCase().startsWith(startsWith)
                                ) || [];
                                setFilteredGames(filtered);
                            }
                        }}
                    />
                    <button type="submit">Search</button>
                </form>
                
                {/* Display search suggestions */}
                { isLoading && ( <li className="search-suggestions">Loading...</li> ) } 
                {filteredGames.length > 0 && (
                    <ul className="search-suggestions">
                        {filteredGames.slice(0, 5).map(game => (
                            <li key={game.appid}>
                                <Link to={`/game/${game.appid}`} onClick={() => (setQuery(""))}>
                                    {game.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Navigation links */}
                <nav>
                    <Link to="/">Home</Link>
                    <Link to="/SteamAnalyse">Steam Analyse</Link>
                    <Link to="/TopSteamGames" onClick={resetSteamGameFilters}>Top Steam Games</Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;
