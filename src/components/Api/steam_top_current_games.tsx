import { useEffect, useState } from 'react'
import '../../styles/top_current_games.css'

type Game = {
  rank: number
  name: string
  concurrent_in_game: number
  header_image: string
}

const ITEMS_PER_PAGE = 10

const GameStats = () => {
  const [games, setGames] = useState<Game[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetch('http://localhost:5000/api/topcurrentgames')
      .then((res) => res.json())
      .then((data) => {
        setGames(data)
      })
      .catch(console.error)
  }, [])

  const totalPages = Math.ceil(games.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentGames = games.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1)
  }

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div>
      <h1>Top Steam Games</h1>
      <ul>
        {currentGames.map((game) => (
          <li key={game.rank}>
            <img src={game.header_image} alt="img" />
            <div>
              <p><span>Game Name:</span> {game.name}</p>
              <p><span>Current Players:</span> {game.concurrent_in_game}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="pagination">
        <button onClick={handlePrev} disabled={currentPage === 1}>
          Prev
        </button>
        
        {[...Array(totalPages)].map((_, index) => (
          <button
            key={index}
            className={currentPage === index + 1 ? 'active' : ''}
            onClick={() => handlePageChange(index + 1)}
          >
            {index + 1}
          </button>
        ))}

        <button onClick={handleNext} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>
    </div>
  )
}

export default GameStats
