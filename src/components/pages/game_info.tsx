import { useParams } from "react-router-dom";

const GameInfo = () => {

     let { appid } = useParams();

    return (
        <div className="game-info">
           <p>This is {appid}</p>
        </div>
    );
}

export default GameInfo;
