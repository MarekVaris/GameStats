import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import '../styles/App.css';
import Header from './header_app'
import Footer from './footer_app'

import Home from './home'
import TopSteamGames from './Api/steam_top_current_games'


const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Header />
        <main className="container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/TopSteamGames" element={<TopSteamGames />} />
              <Route path="/game/:appid" element={<TopSteamGames />} />
            </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
