// const API_URL = 'https://gamestatsimg-92459476338.us-central1.run.app/api/';
const API_URL = 'http://127.0.0.1:8080/api/'

export const fetchTopSteamGames = async () => {
    const res = await fetch(API_URL + "topcurrentgames");
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

export const fetchGame = async (appid: string | undefined) => {
    const res = await fetch(API_URL + "steam/game/" + appid);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

export const fetchGameHistory = async (appid: string | undefined) => {
    const res = await fetch(API_URL + "steam/playercount/" + appid);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};
  
export const searchForGamesAllList = async () => {
    const res = await fetch(API_URL + "steam/getallgameslist");
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

export const searchForGames = async (query: string | undefined) => {
    const res = await fetch(API_URL + "steam/search/" + query);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

export const fetchAllGamesMetadata = async () => {
    const res = await fetch(API_URL + "steam/allmetadata");
    if (!res.ok) throw new Error('Failed to fetch');

    const text = await res.text();
    // Replace all occurrences of NaN with null to fix invalid JSON
    const cleanedText = text.replace(/\bNaN\b/g, 'null');
    
    return JSON.parse(cleanedText);
};
