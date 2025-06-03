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
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)

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
    const totalPages = Math.ceil((games?.length ?? 0) / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentGames = (games ?? []).slice(startIndex, startIndex + itemsPerPage)

    // Function to handle going forward one page
    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage((prev) => prev + 1)
    }
    // Function to handle going back one page
    const handlePrev = () => {
        if (currentPage > 1) setCurrentPage((prev) => prev - 1)
    }

    // Function to handle page change when a number is clicked
    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    // Function to generate the page numbers to display
    const pageCount = () => {
        const start = Math.max(2, currentPage - SHOW_PAGES)
        const end = Math.min(totalPages - 1, currentPage + SHOW_PAGES)
        const pages = []

        pages.push(1)
        
        if (start > 2) {pages.push('...')}
        for (let i = start; i <= end; i++) {
            pages.push(i)
        }
        if (end < totalPages - 1) {pages.push('...')}
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
                                <div>
                                    <p><span>Game Name:</span> {game.name}</p>
                                    <p><span>Current Players:</span> {game.concurrent_in_game}</p>
                                </div>
                            </li>
                        </Link>
                    ))}
                {/* Changing page buttons */}
                <div className="pagination">
                    {/* Back one page */}
                    <button onClick={handlePrev} disabled={currentPage === 1}>
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
                    <button onClick={handleNext} disabled={currentPage === totalPages}>
                        Next
                    </button>
                </div>
            </ul>
        </div>
    )
}


export default GameStats