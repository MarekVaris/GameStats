import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../styles/App.css';
import Header from './layout/header_app'
import Footer from './layout/footer_app'

import SteamGameStats from './pages/steam_game_stats'
import TopSteamGames from './pages/top_steam_games'
import GameInfo from './pages/game_info'
import SteamAnalyse from './pages/steam_analyse'
import SearchGame from './pages/search_game';

const client = new QueryClient()

const App = () => {
  const [backgroundUrl, setBackgroundUrl] = React.useState('');

  return (
    <Router basename="/GameStats/">
      <div className="App">
        <QueryClientProvider client={client}>
          <Header />
            <main className="container-main" style={{ 
                  backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none',
            }}>
            <Routes>
              <Route path="/" element={<SteamGameStats />} />
              <Route path="/TopSteamGames" element={<TopSteamGames />} />
              <Route path="/game/:appid" element={<GameInfo setBackgroundUrl={setBackgroundUrl} />} />
              <Route path="/SteamAnalyse" element={<SteamAnalyse />} />
              <Route path="/search/:query" element={<SearchGame />} />
            </Routes>
          </main>
        </QueryClientProvider>
        <Footer />
      </div>
    </Router>
  )
}

export default App
