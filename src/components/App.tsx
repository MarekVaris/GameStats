import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../styles/App.css';
import Header from './layout/header_app'
import Footer from './layout/footer_app'

import Home from './pages/home'
import TopSteamGames from './pages/top_steam_games'
import GameInfo from './pages/game_info'
import SteamAnalyse from './pages/steam_analyse'

const client = new QueryClient()

const App = () => {
  const [backgroundUrl, setBackgroundUrl] = React.useState('');

  return (
    <Router>
      <div className="App">
        <QueryClientProvider client={client}>
          <Header />
            <main className="container-main" style={{ 
                  backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none',
            }}>
            <Routes>
              <Route path="/GameStats" element={<Home />} />
              <Route path="/TopSteamGames" element={<TopSteamGames />} />
              <Route path="/game/:appid" element={<GameInfo setBackgroundUrl={setBackgroundUrl} />} />
              <Route path="/SteamAnalyse" element={<SteamAnalyse />} />
            </Routes>
          </main>
        </QueryClientProvider>
        <Footer />
      </div>
    </Router>
  )
}

export default App
