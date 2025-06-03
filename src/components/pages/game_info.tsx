import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { useParams } from "react-router-dom";
import "../../styles/game_info.css";

import { fetchGame } from "../../api/steam_games";

type GameMetadata = {
    appid: number
    name: string
    header_image: string
    short_description: string
    developers: string
    publishers: string
    release_date: string
    platforms: string[]
    price: string
    categories: string[]
    genres: string[]
    website: string
    screenshots: string[]
    background: string
}
    

const GameInfo = () => {
    const { appid } = useParams<string>();
    const [focusImage, setFocusImage] = useState<string | null>(null);
    
    const { 
        data: metadata,
        isLoading, 
        error
    } = useQuery<GameMetadata>({
        queryKey: ['game', appid],
        queryFn: () => fetchGame(appid),
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });



    return (
        <div className="game-info">
            { Array.isArray(metadata?.screenshots) && metadata.screenshots.length > 0 ? ( 
                <>
                    <div className="header-game-info">
                        <h1>{metadata.name}</h1>
                        <img 
                            src={focusImage || metadata.screenshots[0]} 
                            alt={metadata.name} 
                        />
                    </div>

                    <div className="image-list-container-gameinfo">                        
                        {metadata.screenshots.map((screenshot, index) => (
                            <img 
                                key={index}
                                src={screenshot} 
                                alt={`Screenshot ${index + 1}`} 
                                className={`${focusImage === screenshot ? 'focused' : ''}`}
                                onClick={() => setFocusImage(screenshot)}
                            />
                        ))}
                    </div>
                </>
                ) : (
                    <p>Loading screenshots...</p>
                )
            }
            <div className="details-game-info">
                <div className="description-game-info">
                    <p>{metadata?.short_description}</p>
                </div>
                <div className="pub-dev-game-info">
                    <p>{metadata?.publishers}</p>
                    <p>{metadata?.developers}</p>
                </div>
            </div>
        </div>
    );
}

export default GameInfo;
