import { useState, useRef, useEffect } from "react";
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

type GameInfoProps = {
    setBackgroundUrl: React.Dispatch<React.SetStateAction<string>>;
};

const GameInfo: React.FC<GameInfoProps> = ({ setBackgroundUrl }) => {
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
    
    useEffect(() => {
        if (metadata?.background) {
            setBackgroundUrl(metadata.background);
        }
        return () => {
            setBackgroundUrl('');
        };
    }, [metadata?.background, setBackgroundUrl]);

    const imageListRef = useRef<HTMLDivElement>(null);

    const scrollImages = (direction : number) => {
        const container = imageListRef.current;
        if (!container) return;

        const scrollAmount = container.offsetWidth * 0.8;
        container.scrollBy({ 
            left: direction === 0 ? -scrollAmount : scrollAmount, 
            behavior: 'smooth' 
        });
    };



    return (
        <div>
            { Array.isArray(metadata?.screenshots) && metadata.screenshots.length > 0 ? ( 
                <div className="screenshots-game-info">
                    <h1>{metadata.name}</h1>
                    <div className="header-game-info">
                        <img 
                            src={focusImage || metadata.screenshots[0]} 
                            alt={metadata.name} 
                        />
                    </div>

                    <div className="image-carousel-wrapper-game-info">
                        <button className="scroll-button left" onClick={() => scrollImages(0)}>◀</button>

                        <div className="image-list-container-game-info" ref={imageListRef}>                        
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

                        <button className="scroll-button right" onClick={() => scrollImages(1)}>▶</button>
                    </div>
                </div>
                ) : (
                    <p>Loading screenshots...</p>
                )
            }
            <div className="details-game-info">
                <div className="description-game-info">
                    <h2>{metadata?.name}</h2>
                    <p>{metadata?.short_description}</p>
                </div>
                <div className="pub-dev-game-info">
                    <h3>Publisher:</h3>
                    <p>{metadata?.publishers}</p>
                    <h3>Developers:</h3>
                    <p>{metadata?.developers}</p>
                </div>
            </div>
            <div className="categories-game-info">
                <h2>Categories:</h2>
                <div>
                    { metadata?.categories && metadata.categories.length > 0 ? (
                        metadata.categories.map((category, index) => (
                            <span key={index} className="category-tag">{category}</span>
                        ))
                    ) : (
                        <p>No categories available.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default GameInfo;
