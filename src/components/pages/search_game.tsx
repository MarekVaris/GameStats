import { searchForGames } from "../../api/steam_games";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import "../../styles/search_game.css";


type GameSearch = {
    appid: number;
    name: string;
    header_image: string;
}

const SearchGame = () => {
    const { query } = useParams<{ query: string }>();

    const {
        data: games
    } = useQuery<GameSearch[]>({
        queryKey: ["searchForGames", query],
        queryFn: () => searchForGames(query),
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });
    
    return (
        <>
            {games && games.length > 0 ? (
                <div className="search-results">
                    <h2>Search Results for "{query}"</h2>
                    <ul>
                        {games.map((game) => (
                            <Link to={`/game/${game.appid}`} key={game.appid} className="game-links">
                                <li className="game-item">
                                    <img src={game.header_image} alt={game.name} />
                                    <p>{game.name}</p>
                                </li>
                            </Link>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="search-results">
                    <h2>No results found for "{query}"</h2>
                </div>
            )}
        </>
    );
}

export default SearchGame;