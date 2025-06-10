import { useState, useRef, useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { useParams } from "react-router-dom";
import "../../styles/game_info.css";

import { fetchGame } from "../../api/steam_games";

import windowsIcon from '../../assets/platform_icons/windows.png';
import macIcon from '../../assets/platform_icons/mac.png';
import linuxIcon from '../../assets/platform_icons/linux.png';
import androidIcon from '../../assets/platform_icons/android.png';
import unknownIcon from '../../assets/platform_icons/unknown.png';

// Type definition for game metadata from API
type GameMetadata = {
    appid: number;
    name: string;
    header_image: string;
    short_description: string;
    developers: string;
    publishers: string;
    release_date: string;
    platforms: string[];
    price: string;
    categories: string[];
    genres: string[];
    website: string;
    screenshots: string[];
    background: string;
};

// Props interface for background image setter
interface GameInfoProps {
    setBackgroundUrl: React.Dispatch<React.SetStateAction<string>>;
}

const GameInfo = ({ setBackgroundUrl }: GameInfoProps) => {
    const { appid } = useParams<string>();
    const [focusImage, setFocusImage] = useState<string | null>(null);

    // Default focus image to the first screenshot if available
    const platforms: Record<string, string> = {
        windows: windowsIcon,
        mac: macIcon,
        linux: linuxIcon,
        android: androidIcon,
    };

    // Fetch game metadata using React Query
    const {
        data: metadata,
        isLoading,
        error,
    } = useQuery<GameMetadata>({
        queryKey: ['game', appid],
        queryFn: () => fetchGame(appid),
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
        if (error?.status === 404 || error?.status === 400 || error?.status === 500) {
            return false;
        }
        return failureCount < 2;
    },
    });
    
    // Ref to image list container
    const imageListRef = useRef<HTMLDivElement>(null); 

    // Set page background when metadata is available, clean up on unmount
    useEffect(() => {
        if (metadata?.background) {
            setBackgroundUrl(metadata.background);
        }
        return () => {
            setBackgroundUrl('');
        };
    }, [metadata?.background, setBackgroundUrl]);
    
    if (error) {
        return <p>Error loading game data: {error.message}</p>; 
    }
    if (isLoading) {
        return <p>Loading game data...</p>;
    }

    // Scroll carousel left or right
    const scrollImages = (direction: number) => {
        const container = imageListRef.current;
        if (!container) return;

        const scrollAmount = container.offsetWidth * 0.8;
        container.scrollBy({
            left: direction === 0 ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
    };

    return (
        <div className="game-info">
            {/* Screenshots and image carousel */}
            {Array.isArray(metadata?.screenshots) && metadata.screenshots.length > 0 ? (
                <div className="screenshots-game-info">
                    <div> 
                        <h1>{metadata.name}</h1>
                        <div className="platforms-wrapper-game-info">
                            {metadata.platforms && metadata.platforms.length > 0 ? (
                                metadata.platforms.map((platform) => (
                                    <img 
                                        key={platform}
                                        src={platforms[platform] || unknownIcon}
                                        alt={platform}
                                        className="platform-icon-game-info">
                                    </img>
                                ))) : (
                                <p>No platforms available.</p>
                            )}   
                        </div>
                    </div>
                    <div className="header-game-info">
                        <img
                            src={focusImage || metadata.screenshots[0]}
                            alt={metadata.name}
                        />
                    </div>
                    
                    { /* Image carousel for screenshots */}
                    <div className="image-carousel-wrapper-game-info">
                        <button className="scroll-button left" onClick={() => scrollImages(0)}>◀</button>

                        <div className="image-list-container-game-info" ref={imageListRef}>
                            {metadata.screenshots.map((screenshot, index) => (
                                <img
                                    key={index}
                                    src={screenshot}
                                    alt={`Screenshot ${index + 1}`}
                                    className={focusImage === screenshot ? 'focused' : ''}
                                    onClick={() => setFocusImage(screenshot)}
                                />
                            ))}
                        </div>

                        <button className="scroll-button right" onClick={() => scrollImages(1)}>▶</button>
                    </div>
                </div>
            ) : (
                <p>Loading screenshots...</p>
            )}

            {/* Game description and publisher/developer info */}
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

            {/* Genres, categories, and release date */}
            <div className="category-container-game-info">
                <div className="genres-game-info">
                    <h2>Genres:</h2>
                    <div>
                        {metadata?.genres && metadata.genres.length > 0 ? (
                            metadata.genres.map((genre, index) => (
                                <span key={index} className="genre-tag">{genre}</span>
                            ))
                        ) : (
                            <p>No genres available.</p>
                        )}
                    </div>
                    <h2 style={{ marginTop: "1em" }}>Release Date:</h2>
                    <p>{metadata?.release_date}</p>
                </div>
                <div className="categories-game-info">
                    <h2>Categories:</h2>
                    <div>
                        {metadata?.categories && metadata.categories.length > 0 ? (
                            metadata.categories.map((category, index) => (
                                <span key={index} className="category-tag">{category}</span>
                            ))
                        ) : (
                            <p>No categories available.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameInfo;
