const API_URL = 'http://localhost:5000/api/';

export const fetchTopSteamGames = async () => {
  const res = await fetch(API_URL + "topcurrentgames");
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export const fetchGame = async (appid: string | undefined) => {
  const res = await fetch(API_URL + "steam/game/"+appid);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};