import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import "../../styles/header.css";

const Header = () => {
    const [query, setQuery] = useState("");
    const navigate = useNavigate();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

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

                <nav>
                    <Link to="/">Home</Link>
                    <Link to="/TopSteamGames">Top Steam Games</Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;
