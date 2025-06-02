export const fetchTopSteamGames = async () => {
  const res = await fetch('http://localhost:5000/api/topcurrentgames');
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};