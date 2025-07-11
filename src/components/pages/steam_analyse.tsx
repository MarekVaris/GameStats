import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import html2canvas from "html2canvas";

import "../../styles/steam_analyse.css";

import { fetchAllGamesMetadata } from "../../api/steam_games";
import { TableAnalyse } from "./charts/tableAnalyse"
import { BarChartAnalyse } from "./charts/barChartAnalyse";
import { PieChartAnalyse } from "./charts/pieChartAnalyse";
import { LineChartAnalyse } from "./charts/lineChartAnalyse";

type GameMetadataAnalyse = {
    appid: number;
    name: string;
    developers: string;
    publishers: string;
    release_date: string;
    platforms: string;
    categories: string;
    genres: string;
}

type ChartsConfig = {
    type: "bar" | "pie" | "line";
    data: { name: string; value: number }[];
    title: string;
    numberOfSlices: number;
};

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const SteamAnalyse = () => {
    // Fetch all game metadata
    const {
        data: analyseGames,
        isLoading,
        isError
    } = useQuery<GameMetadataAnalyse[]>({
        queryKey: ["fetchAllGamesMetadata"],
        queryFn: fetchAllGamesMetadata,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    // State to manage the charts data
    const [dataPage, setDataPage] = useState<ChartsConfig[]>([]);

    const developersCounter: Record<string, number> = {};
    const platformsCounter: Record<string, number> = {};
    const categoriesCounter: Record<string, number> = {};
    const genresCounter: Record<string, number> = {};

    const chartRefs = useRef<HTMLDivElement[]>([]);

    // Process the game metadata to count developers, platforms, categories, and genres
    analyseGames?.forEach((game) => {
        developersCounter[game.developers] = (developersCounter[game.developers] || 0) + 1;
        
        const platformsStr = game.platforms || "";
        platformsStr.split(", ").forEach((platform) => {
            if (platform) {
                platformsCounter[platform] = (platformsCounter[platform] || 0) + 1;
            }
        });
        
        const categoriesStr = game.categories || "";
        categoriesStr.split(", ").forEach((category) => {
            if (category) {
                categoriesCounter[category] = (categoriesCounter[category] || 0) + 1;
            }
        });
        
        const genresStr = game.genres || "";
        genresStr.split(", ").forEach((genre) => {
            if(genre) {
                genresCounter[genre] = (genresCounter[genre] || 0) + 1;
            } 
        });
    });
    
    // DEVELOPERS
    const developersData = Object.entries(developersCounter).map(([name, value]) => ({
        name, value
    })).filter(({ name }) => name !== "null").sort((a, b) => b.value - a.value);
    
    // PLATFORMS
    const platformsData = Object.entries(platformsCounter).map(([name, value]) => ({
        name, value
    })).sort((a, b) => b.value - a.value);
    
    // CATEGORIES
    const categoriesData = Object.entries(categoriesCounter).map(([name, value]) => ({
        name, value
    })).sort((a, b) => b.value - a.value);
    
    // GENRES
    const genresData = Object.entries(genresCounter).map(([name, value]) => ({
        name, value
    })).sort((a, b) => b.value - a.value);
    
    const downloadChart = (index: number) => {
        const chartElement = chartRefs.current[index];
        html2canvas(chartElement).then((canvas) => {
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `chart-${index + 1}.png`;
            link.click();
    })};

    // Initialize the data page with developers data
    useEffect(() => {
        setDataPage([{ type: "bar", data: developersData, title: "Developers", numberOfSlices: 20 }]);
    }, [analyseGames]);
    
    return (
        isLoading ? (
            <div className="loading-container">
                <h1>Loading...</h1>
            </div>
        ) : isError ? (
            <div className="error-container">
                <h1>Error loading game metadata</h1>
            </div>
        ) : (
            <>
                {/* Displaying the table of games */}
                { analyseGames && (
                    <div className="table-page">
                        <ThemeProvider theme={darkTheme}>
                            <TableAnalyse data={analyseGames} />
                        </ThemeProvider>
                    </div>
                )}
                
                {/* Displaying the charts */}
                <div className="charts-page">
                    { dataPage.map((dataset, i) => (
                        <div key={i} className="chart-container">
                            <p>{dataset.title}</p>
                            <div className="chart-controls">
                                {/* Dropdown to select dataset */}
                                <select value={dataset.type} onChange={(e) => {
                                        setDataPage((prev) => {
                                            const newPage = [...prev];
                                            newPage[i].type = e.target.value as "bar" | "pie" | "line";
                                            return newPage;
                                    });
                                }}
                                >
                                <option value="bar">Bar Chart</option>
                                <option value="pie">Pie Chart</option>
                                <option value="line">Line Chart</option>
                                </select>
                                {/* Dropdown changing dataset */}
                                <select onChange={(e) => {
                                    const value = e.target.value;
                                    let newDataSet: any[] = [];
                                    let title = "";
                                    switch (value) {
                                        case "developers":
                                            newDataSet = developersData;
                                            title = "Developers";
                                            break;
                                        case "platforms":
                                            newDataSet = platformsData;
                                            title = "Platforms";
                                            break;
                                        case "categories":
                                            newDataSet = categoriesData;
                                            title = "Categories";
                                            break;
                                        case "genres":
                                            newDataSet = genresData;
                                            title = "Genres";
                                            break;
                                        default:
                                            newDataSet = [];
                                            title = "";
                                    } 
                                    setDataPage(prev => {
                                        const newPage = [...prev];
                                        newPage[i].data = newDataSet;
                                        newPage[i].title = title;
                                        return newPage;
                                    });
                                }}>
                                    <option value="developers">Developers</option>
                                    <option value="platforms">Platforms</option>
                                    <option value="categories">Categories</option>
                                    <option value="genres">Genres</option>
                                </select>
                                {/* Input to change number of slices */}
                                <input
                                    type="number"
                                    min={1}
                                    max={dataset.data.length}
                                    value={dataset.numberOfSlices}
                                    onChange={(e) => {
                                        setDataPage(prev => {
                                            const newPage = [...prev];
                                            newPage[i].numberOfSlices = Number(e.target.value);
                                            return newPage;
                                        });
                                    }}/>
                            </div>
                            {/* Displaying the chart */}
                            <div className="chart-display" ref={(el) => { chartRefs.current[i] = el as HTMLDivElement; }}>
                            {dataset.type === "bar" && (
                                <BarChartAnalyse data={dataset.data.slice(0, dataset.numberOfSlices)} />
                            )}
                            {dataset.type === "pie" && (
                                <PieChartAnalyse data={dataset.data.slice(0, dataset.numberOfSlices)} />
                            )}
                            {dataset.type === "line" && (
                                <LineChartAnalyse data={dataset.data.slice(0, dataset.numberOfSlices)} />
                            )}
                            </div>
                            {/* Actions for the chart */}
                            <div className="chart-actions">
                                <button className="save-button" onClick={() => downloadChart(i)}>Download Chart</button>
                                <button className="delete-button" onClick={() => setDataPage(prev => prev.filter((_, index) => index !== i))}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div>
                    { /* Add new chart */ }
                    <div className="add-chart-controls">
                        <button onClick={() => setDataPage(prev => [...prev, { type: "bar", data: developersData, title: "Developers", numberOfSlices: 20 }])}>Add New Chart</button>
                    </div>
                </div>
            </>
        )
    );
}

export default SteamAnalyse;