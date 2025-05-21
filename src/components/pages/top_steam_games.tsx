import { useEffect, useState, useRef } from 'react';
import '../../styles/top_current_games.css'

import { fetchTopSteamGames } from '../../api/top_steam_games';

const SHOW_PAGES = 1

type Game = {
  rank: number
  name: string
  concurrent_in_game: number
  header_image: string
}

const GameStats = () => {
    const [games, setGames] = useState<Game[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)
    const hasFetched = useRef(false)

    useEffect(() => {
        if (hasFetched.current) return
        hasFetched.current = true
        fetchTopSteamGames()
            .then(setGames)
            .catch((error) => {
                console.error('Error fetching top Steam games:', error)
            })
    }, [])

    const totalPages = Math.ceil(games.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentGames = games.slice(startIndex, startIndex + itemsPerPage)

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage((prev) => prev + 1)
    }

    const handlePrev = () => {
        if (currentPage > 1) setCurrentPage((prev) => prev - 1)
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

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
                <div className="num-games-selector">
                    <p>Number of games per page:</p>
                    <select value={itemsPerPage} onChange={(e) => {setItemsPerPage(Number(e.target.value)), handlePageChange(1)}}>
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                    </select>
                </div>
                {currentGames.map((game) => (
                    <li key={game.rank}>
                        <span className="rank">{game.rank}</span>
                        <img src={game.header_image} alt="img" />
                        <div>
                            <p><span>Game Name:</span> {game.name}</p>
                            <p><span>Current Players:</span> {game.concurrent_in_game}</p>
                        </div>
                    </li>
                ))}
            
                <div className="pagination">
                    <button onClick={handlePrev} disabled={currentPage === 1}>
                        Prev
                    </button>
                    
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

                    <button onClick={handleNext} disabled={currentPage === totalPages}>
                        Next
                    </button>
                </div>
            </ul>
        </div>
    )
}


export default GameStats