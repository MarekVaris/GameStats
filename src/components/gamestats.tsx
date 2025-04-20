import { useEffect, useState } from 'react'

type Game = {
  rank: number
  appid: number
  peak_in_game: number
}

const GameStats = () => {
  const [games, setGames] = useState<Game[]>([])

  useEffect(() => {
    fetch('http://localhost:5000/api/steam')
      .then((res) => res.json())
      .then((data) => {
        setGames(data.response.ranks)
      })
      .catch(console.error)
  }, [])

  return (
    <div>
      <h2>Top Steam Games:</h2>
      <ul>
        {games.map((game) => (
          <li key={game.appid}>
            <p>Rank: {game.rank}</p>
            <p>Game ID: {game.appid}</p>
            <p>Peak Players: {game.peak_in_game.toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default GameStats
