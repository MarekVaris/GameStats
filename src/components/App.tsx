import React from 'react'
import '../styles/App.css';
import GameStats from './Api/steam_top_current_games'

const App: React.FC = () => {
  return (
    <div>
      <h1>Game Popularity</h1>
      <GameStats />
    </div>
  )
}

export default App
