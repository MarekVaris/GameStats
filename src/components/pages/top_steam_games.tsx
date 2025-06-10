import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import '../../styles/top_current_games.css'

import { fetchTopSteamGames } from '../../api/steam_games';

const SHOW_PAGES = 1

// Define the structure of a Game object
type Game = {
    appid: number
    rank: number
    name: string
    concurrent_in_game: number
    header_image: string
}

const GameStats = () => {


    // Fetch top Steam games when the component mounts
    const {
        data: games,
        isLoading,
        error
    } = useQuery<Game[]>({
        queryKey: ['topSteamGames'],
        queryFn: fetchTopSteamGames,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });

    // Calculate total pages and current games to display based on the current page and items per page
    const [itemsPerPage, setItemsPerPage] = useState(25)
    const totalPages = Math.ceil((games?.length ?? 0) / itemsPerPage)

    // Save the current page in session storage
    const [currentPage, setCurrentPage] = useState(() => {
        const saved = sessionStorage.getItem('currentPage');
        if (saved) {
            if (parseInt(saved) > totalPages) {
                return 1;
            }
            return parseInt(saved);
        }
        return 1;
    });

    const startIndex = (currentPage - 1) * itemsPerPage
    const currentGames = (games ?? []).slice(startIndex, startIndex + itemsPerPage)

    // Function to handle page change
    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        sessionStorage.setItem('currentPage', page.toString());
    }

    // Generating the page numbers to display
    const pageCount = () => {
        let start = Math.max(2, currentPage - SHOW_PAGES)
        let end = Math.min(totalPages - 1, currentPage + SHOW_PAGES)
        const pages = []

        pages.push(1)
        if (start > 2) { pages.push('...') }
        
        if (end - start < 2 * SHOW_PAGES) {
            end = Math.min(start + 2 * SHOW_PAGES, totalPages - 1)
            start = Math.max(end - 2 * SHOW_PAGES, 2)
        }

        for (let i = start; i <= end; i++) {
            pages.push(i)
        }

        if (end < totalPages - 1) { pages.push('...') }
        pages.push(totalPages)
        
        return pages
    }

    return (
        <div>
            <h1>Top Steam Games</h1>
            <ul>
                {/* How many rows of games per page */}
                <div className="num-games-selector">
                    <p>Number of games per page:</p>
                    <select value={itemsPerPage} onChange={(e) => {setItemsPerPage(Number(e.target.value)), handlePageChange(1)}}>
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                    </select>

                </div>
                    {/* Displaying games (rows) */}
                    {/* Each game is a link to its own page */}
                    {currentGames.map((game) => (
                        <Link to={`/game/${game.appid}`} key={game.appid} className="game-links">
                            <li key={game.rank} className="game-row">
                                <span className="rank">{game.rank}</span>
                                <img className='header-image-row' src={game.header_image} alt="img" />
                                <div className="row-info">
                                    <p><span>Game Name:</span> {game.name}</p>
                                    <p><span>Current Players:</span> {game.concurrent_in_game}</p>
                                </div>
                            </li>
                        </Link>
                    ))}

                <div className="number-of-data-rows">
                    <p>Showing {(startIndex + 1) + "-" + (startIndex + currentGames.length)} of {games?.length ?? 0} Games</p>
                </div>

                {/* Changing page buttons */}
                <div className="pagination">
                    {/* Back one page */}
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                        Prev
                    </button>
                    {/* Setting up numbers - From list check if current is "..." else put number */}
                    {pageCount().map((number, index) =>  number === "..." ? (
                        <span key={index} className="dots">...</span>
                    ) : (
                        <button
                            key={index}
                            className={currentPage === number as number ? 'active' : ''}
                            onClick={() => handlePageChange(number as number)}>
                            {number}
                        </button>
                    ))}
                    {/* Forward one page */}
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                        Next
                    </button>
                </div>
            </ul>
        </div>
    )
}


export default GameStats