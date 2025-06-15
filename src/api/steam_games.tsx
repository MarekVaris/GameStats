const API_URL = 'https://gamestats-92459476338.europe-west1.run.app/api/';

export const fetchTopSteamGames = async () => {
    const res = await fetch(API_URL + "topcurrentgames");
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

export const fetchGame = async (appid: string | undefined) => {
    const res = await fetch(API_URL + "steam/game/" + appid);
    if (!res.ok) {
      const error: any = new Error('Failed to fetch');
      error.status = res.status;
      throw error;
    }
    return res.json();
};

export const fetchGameHistory = async (appid: string | undefined) => {
    const res = await fetch(API_URL + "steam/playercount/" + appid);
    if (!res.ok) {
      const error: any = new Error('Failed to fetch');
      error.status = res.status;
      throw error;
    }
    return res.json();
};
  
export const searchForGamesAllList = async () => {
    const res = await fetch(API_URL + "steam/search");
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};


export const fetchAllGamesMetadata = async () => {
    const res = await fetch(API_URL + "steam/allmetadata");
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};