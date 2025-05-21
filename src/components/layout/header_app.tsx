import { Link } from "react-router-dom";
import "../../styles/header.css";


const Header = () => {
    return (
        <header className="app-header">
            <div className="container">
                <h2>Steam Game Stats</h2>

                {/*Search bar has to be changed (currently refreshes the whole side) */}
                <form className="search-form">
                    <input type="text" placeholder="Search for a game..." />
                    <button type="submit">Search</button>
                </form>
                <nav>
                    <Link to="/">Home</Link>
                    <Link to="/TopSteamGames">Top Steam Games</Link>
                </nav>
            </div>
        </header>
    );
}

export default Header;