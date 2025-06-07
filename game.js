

    /*get data about game
    ---------------------------------------------------------------------------------------
    */
    var turn=1
    var player = getPlayerFromURL();
    var code = getCodeFromURL();
    var numPlayers
    var playerName
    var players

    if (player==1){
        var opponent=2
    }
    else{
        var opponent=1
    }

    function getPlayerFromURL() {
      var params = new URLSearchParams(window.location.search);
      return params.get("player"); // "player1" or "player2"
    }

    function getCodeFromURL() {
      var params = new URLSearchParams(window.location.search);
      return params.get("room"); // "player1" or "player2"
    }

    /*Set up card helper stuff
    ---------------------------------------------------------------------------------------
    */

    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }

    function deal(deck,count) {
      return deck.splice(0,count);
    }
    
    const cardRank = {
        "2": 1,
        "3": 2,
        "4": 3,
        "5": 4,
        "6": 5,
        "7": 6,
        "8": 7,
        "9": 8,
        "10": 9,
        "L": 10,
        "S": 11,
        "D": 12,
        "N": 13,
        "P": 14
    };

    function sortCards(cards) {
        return cards.slice().sort((a, b) => cardRank[a] - cardRank[b]);
    }

    function legalMove(move,lastVal){
        //move: 2-10
        //last: L,P,null
        const numMove = parseInt(move);
        const numLast = parseInt(lastVal);


        // Check if both are numbers from 2 to 10
        if (!isNaN(numMove)) {
            if(!isNaN(numLast)){
                return numMove >= numLast;
            }
            return lastVal=='L' || lastVal==null            
        }
        else{
            return true
        }


        return false; // Default to false for now
    }

    /* Set up functionality for flashing tab title
    ---------------------------------------------------------------------------------------
    */


    /* Add this function to create flying card animation */
    async function showPlayedCardsAnimation() {
        const [inPlay, lastAmt] = await Promise.all([
            read(`/${code}/inPlay`),
            read(`/${code}/lastAmt`)
        ]);
        
        if (!inPlay || inPlay.length === 0) return;
        
        // Get the last played cards (up to 4)
        const playedCards = inPlay.slice(-Math.min(4, lastAmt || 1));
        
        // Create a container for the animation
        const animContainer = document.createElement('div');
        animContainer.style.position = 'fixed';
        animContainer.style.top = '0';
        animContainer.style.left = '0';
        animContainer.style.width = '100vw';
        animContainer.style.height = '100vh';
        animContainer.style.display = 'flex';
        animContainer.style.justifyContent = 'center';
        animContainer.style.alignItems = 'center';
        animContainer.style.zIndex = '10000';
        animContainer.style.pointerEvents = 'none';
        document.body.appendChild(animContainer);
        
        // Create card elements
        playedCards.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card-flying';
            cardEl.style.backgroundImage = `url('Card_pics/${card}.png')`;
            cardEl.style.transform = `translateY(-100vh) rotate(${(index - playedCards.length/2) * 5}deg)`;
            cardEl.style.opacity = '0';
            animContainer.appendChild(cardEl);
            
            // Animate the card
            setTimeout(() => {
                cardEl.style.transform = `translateY(0) rotate(${(index - playedCards.length/2) * 5}deg)`;
                cardEl.style.opacity = '1';
            }, 50 * index);
        });
        
        // Remove after animation
        setTimeout(() => {
            animContainer.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(animContainer);
            }, 500);
        }, 1000);
    }



    let flashInterval;
    let flashing = false;

    function startFlashingTitle(message) {
        if (flashing) return; // prevent multiple intervals
        flashing = true;

        let showingMessage = false;
        flashInterval = setInterval(() => {
            document.title = showingMessage ? "Pay Attention" : message;
            showingMessage = !showingMessage;
        }, 1000); // toggle every second
    }

    function stopFlashingTitle() {
        clearInterval(flashInterval);
        var isMyTurn = turn === Number(player);
        document.title = isMyTurn ? "Your turn" : "Opponent Turn"
        flashing = false;
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Tab became active
            stopFlashingTitle();
        }
    });

    /* Set up function to getCards for the end at the start of the game
    ---------------------------------------------------------------------------------------
    */

  function getEnd() {
    return new Promise(async (resolve) => {
        const hand = await read(`/${code}/hands/${player}`);
        let selected = [];

        const popup = document.createElement("div");
        popup.id = "popup";
        popup.style.position = "fixed";
        popup.style.top = "0";
        popup.style.left = "0";
        popup.style.width = "100vw";
        popup.style.height = "100vh";
        popup.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        popup.style.display = "flex";
        popup.style.flexDirection = "column";
        popup.style.alignItems = "center";
        popup.style.justifyContent = "center";
        popup.style.zIndex = "1000";

        const cardButtonsHtml = hand.map((card, i) => `
            <button 
                data-index="${i}" 
                class="end-select" 
                style="
                    width: 120px;
                    height: 180px;
                    margin: 5px;
                    background-image: url('Card_pics/${card}.png');
                    background-size: contain;
                    background-repeat: no-repeat;
                    background-position: center;
                    border: 2px solid #ccc;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: box-shadow 0.2s, border 0.2s;
                ">
            </button>
        `).join("");

        popup.innerHTML = `
        <div style="
            background: #fff;
            padding: 30px 20px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 8px 20px rgba(0,0,0,0.4);
            width: 400px;
            color: #1e1e2f;
        ">
            <h3 style="margin-bottom: 20px; color: #222;">Select 2 cards for your Ends</h3>
            <div id="card-selection" style="display: flex; flex-wrap: wrap; justify-content: center;">
            ${cardButtonsHtml}
            </div>
            <button id="confirmEnds" disabled style="
            margin-top: 20px;
            padding: 12px 24px;
            font-size: 18px;
            background-color: #1e1e2f;
            color: #f0e68c;
            border: none;
            border-radius: 10px;
            width: 100%;
            cursor: pointer;
            ">Confirm</button>
            <div id="waitMessage" style="margin-top: 10px; color: #444;"></div>
        </div>
        `;

        document.body.innerHTML = "";  // Remove any setup messages
        document.body.appendChild(popup);


        const buttons = popup.querySelectorAll(".end-select");
        const confirmBtn = popup.querySelector("#confirmEnds");
        const waitMessage = popup.querySelector("#waitMessage");

        buttons.forEach(btn => {
            btn.onclick = () => {
                const index = Number(btn.dataset.index);
                if (selected.includes(index)) {
                    selected = selected.filter(i => i !== index);
                    btn.style.boxShadow = "";
                    btn.style.border = "2px solid #ccc";
                } else if (selected.length < 2) {
                    selected.push(index);
                    btn.style.boxShadow = "0 0 10px 3px lightgreen";
                    btn.style.border = "2px solid green";
                }

                // Reset visuals for unselected buttons
                buttons.forEach((b, i) => {
                    if (!selected.includes(i)) {
                        b.style.boxShadow = "";
                        b.style.border = "2px solid #ccc";
                    }
                });

                confirmBtn.disabled = selected.length !== 2;
            };
        });

        confirmBtn.onclick = async () => {
            const ends = [hand[selected[0]], hand[selected[1]]];
            const newHand = hand.filter((_, i) => !selected.includes(i));

            await write(`/${code}/hands/${player}`, newHand);
            await write(`/${code}/ends/${player}`, ends);

            waitMessage.textContent = "Waiting for all players to choose...";

            // Start polling until all players have submitted 2 ends
            const endsRef = database.ref(`/${code}/ends`);
            endsRef.on('value', (snapshot) => {
                const endsData = snapshot.val() || {};
                let allDone = true;

                for (let i = 1; i <= numPlayers; i++) {
                    if (!Array.isArray(endsData[i]) || endsData[i].length !== 2) {
                        allDone = false;
                        break;
                    }
                }

                if (allDone) {
                    popup.remove();
                    endsRef.off(); // stop listening
                    resolve();
                }
            });
        };
    });
}



    /* Set up functionality for winner pop up and play again and delete room options
    ---------------------------------------------------------------------------------------
    */
    let play_again = false;
    let delete_game = false;
     let playAgainBtn, deleteBtn;
    let otherPlayerChoices = {}; // e.g., {1: {playAgain: true, deleteGame: false}, ...}

    async function winner(win) {
    players = await read(`/${code}/players`);
    const winnerName = win == player ? "You" : players[win]?.Name || "Opponent";
    const message = win == player ? "You won!" : `${winnerName} won!`;

    const winpopup = document.createElement("div");
    Object.assign(winpopup.style, {
        position: "fixed", top: "0", left: "0",
        width: "100vw", height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        zIndex: "10000"
    });

    const winMessageBox = document.createElement("div");
    Object.assign(winMessageBox.style, {
        background: "#2b2b3a",
        padding: "30px",
        border: "2px solid #444",
        borderRadius: "12px",
        fontSize: "28px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "#f0e68c",
        boxShadow: "0 6px 18px rgba(0,0,0,0.3)"
    });

    const messageText = document.createElement("div");
    messageText.innerHTML = win == player
        ? `<span style="color:lightgreen;">${message}</span>`
        : `<span style="color:#ff6666;">${message}</span>`;

    const buttonContainer = document.createElement("div");
    Object.assign(buttonContainer.style, {
        display: "flex", flexDirection: "column",
        marginTop: "20px", gap: "10px"
    });

    playAgainBtn = document.createElement("button");
    playAgainBtn.textContent = "Play Again";
    Object.assign(playAgainBtn.style, {
        padding: "10px 20px", fontSize: "18px",
        backgroundColor: "#eee", transition: "background-color 0.3s",
        borderRadius: "8px", border: "none", cursor: "pointer"
    });
    playAgainBtn.onclick = () => chooseOption("playAgain");

    deleteBtn = document.createElement("button");
    deleteBtn.textContent = "End Game";
    Object.assign(deleteBtn.style, {
        padding: "10px 20px", fontSize: "18px",
        backgroundColor: "#eee", transition: "background-color 0.3s",
        borderRadius: "8px", border: "none", cursor: "pointer"
    });
    deleteBtn.onclick = () => chooseOption("deleteGame");

    const statusMessage = document.createElement("div");
    Object.assign(statusMessage.style, {
        marginTop: "15px", fontSize: "18px", color: "#f0e68c"
    });

    buttonContainer.appendChild(playAgainBtn);
    buttonContainer.appendChild(deleteBtn);
    winMessageBox.appendChild(messageText);
    winMessageBox.appendChild(buttonContainer);
    winMessageBox.appendChild(statusMessage);
    winpopup.appendChild(winMessageBox);
    document.body.appendChild(winpopup);

    // Attach listeners to all players
    for (let i = 1; i <= numPlayers; i++) {
        if (i == player) continue;

        firebase.database().ref(`/${code}/players/${i}`).on('value', snapshot => {
            otherPlayerChoices[i] = snapshot.val() || {};
            updateStatus();
        });
    }

    // Listen for your own data to refresh button highlights
    firebase.database().ref(`/${code}/players/${player}`).on('value', snapshot => {
        const data = snapshot.val() || {};
        play_again = !!data.playAgain;
        delete_game = !!data.deleteGame;
        highlightChoice();
        updateStatus();
    });

    function updateStatus() {
        const allPlayAgain = play_again && Object.values(otherPlayerChoices).every(p => p.playAgain);
        const allDelete = delete_game && Object.values(otherPlayerChoices).every(p => p.deleteGame);

        if (allPlayAgain) {
            playAgain();
        } else if (allDelete) {
            deleteGame();
        } else {
            const playAgainNames = Object.values(otherPlayerChoices)
                .filter(p => p.playAgain)
                .map(p => p.Name);

            const deleteNames = Object.values(otherPlayerChoices)
                .filter(p => p.deleteGame)
                .map(p => p.Name);

            const playNameText = playAgainNames.join(", ");
            const deleteNameText = deleteNames.join(", ");

            if (playAgainNames.length > 0 && deleteNames.length > 0) {
                statusMessage.innerHTML = `
                    <span style="color:lightgreen;">${playNameText} ${playAgainNames.length === 1 ? "wants" : "want"} to play again</span><br>
                    <span style="color:#ff6666;">${deleteNameText} ${deleteNames.length === 1 ? "wants" : "want"} to delete room</span>
                `;
            }
            else if (playAgainNames.length > 0) {
                statusMessage.innerHTML = `<span style="color:lightgreen;">${playNameText} ${playAgainNames.length === 1 ? "wants" : "want"} to play again</span>`;
            } 
            else if (deleteNames.length > 0){
                statusMessage.innerHTML = `<span style="color:#ff6666;">${deleteNameText} ${deleteNames.length === 1 ? "wants" : "want"} to delete room</span>`;
            }
            else {
                statusMessage.textContent = "Waiting on others...";
            }
        }
    }

    function highlightChoice() {
        playAgainBtn.style.backgroundColor = play_again ? "#cce5cc" : "#eee";
        deleteBtn.style.backgroundColor = delete_game ? "#f5cccc" : "#eee";
    }
}

    async function chooseOption(option) {
        if (option === "playAgain") {
            play_again = true;
            delete_game = false;
            playAgainBtn.style.backgroundColor = "#cce5cc";
            deleteBtn.style.backgroundColor = "#eee";
            await update(`/${code}/players/${player}`, {
                playAgain: true,
                deleteGame: false
            });

        } 
        else if (option === "deleteGame") {
            delete_game = true;
            play_again = false;
            deleteBtn.style.backgroundColor = "#f5cccc";
            playAgainBtn.style.backgroundColor = "#eee";
            await update(`/${code}/players/${player}`, {
                playAgain: false,
                deleteGame: true
            });
        }
    }


    async function playAgain(){
        if (player==1){

            const removePlayerPaths = [];
            for (let i = 1; i <= numPlayers; i++) {
                removePlayerPaths.push(removeNode(`/${code}/players/${i}/deleteGame`));
                removePlayerPaths.push(removeNode(`/${code}/players/${i}/playAgain`));
            }
            
            await Promise.all([
                removeNode(`/${code}/hands`),
                removeNode(`/${code}/inPlay`),
                removeNode(`/${code}/lastAmt`),
                removeNode(`/${code}/lastMove`),
                removeNode(`/${code}/lastVal`),
                removeNode(`/${code}/mysteryPlayed`),
                removeNode(`/${code}/mysts`),
                removeNode(`/${code}/turn`),
                removeNode(`/${code}/deck`),
                removeNode(`/${code}/ends`),
                ...removePlayerPaths,
                write(`/${code}/gameStarted`, false),
                write(`/${code}/initialized`, false),
                write(`/${code}/resetDone`, true)
            ]);
            location.reload();
        }
        else {
            firebase.database().ref(`/${code}/resetDone`).on('value', snapshot => {
                if (snapshot.val() === true) {
                    location.reload();
                }
            });
        }
    }

    async function deleteGame(){
        if (player==1){
            await removeNode(`/${code}`)
        }
        window.location.href = 'index.html';
    }


    /* Set up the initialization process
    ---------------------------------------------------------------------------------------
    */

    window.onload = initializeGame;

    var initRef = database.ref(`/${code}/initialized`);
    initRef.on('value', async (snapshot) => {
        var inval = snapshot.val();
        if (inval === true) {
            initializeGame();
        }  
    });

    async function initializeGame() {
        players = await read(`/${code}/players`);
        playerName= players[player]?.Name
        const gameStarted = await read(`/${code}/gameStarted`);
        numPlayers = await read(`/${code}/playerCount`);

        // Ensure all players are marked as "Used"
        const allPlayersJoined = players && players.every(p => p && p.Used && p.Name);
if (!allPlayersJoined) {
    return;
}


        const alreadyInit = await read(`/${code}/initialized`);
        if (alreadyInit === true) {
            if (!gameStarted) {
                write(`/${code}/players/${player}/playAgain`, false);
                write(`/${code}/players/${player}/deleteGame`, false);
                await getEnd();
            }

            // Listen for turn changes
            const turnRef = database.ref(`/${code}/turn`);
            //turnRef.on('value', () => updateGame());
            turnRef.on('value', async (snapshot) => {
                const newTurn = snapshot.val();
                if (newTurn !== turn) {
                    await showPlayedCardsAnimation();
                    turn = newTurn;
                    updateGame();
                }
            });

            // Listen for mystery plays
            const mystRef = database.ref(`/${code}/mysteryPlayed`);
            mystRef.on('value', async (snapshot) => {
                let turn = await read(`/${code}/turn`);
                let lastVal = await read(`/${code}/lastVal`);
                var isMyTurn = turn === Number(player);

                let data = snapshot.val();
                if (!data || !data.played) return;

                let card = data.played;
                let isLegal = legalMove(card, lastVal);

                const oldPopup = document.getElementById("popup");
                if (oldPopup) oldPopup.remove();


                const popup = document.createElement("div");
popup.id = "popup";
popup.style = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: rgba(0, 0, 0, 0.5); display: flex;
    justify-content: center; align-items: center; z-index: 1000;
`;

const messageBox = document.createElement("div");
messageBox.style.background = "#2b2b3a"; // dark background, matches select number popup
messageBox.style.padding = "25px";
messageBox.style.border = "2px solid #444";
messageBox.style.borderRadius = "12px";
messageBox.style.color = "#f0e68c"; // light yellow text
messageBox.style.boxShadow = "0 6px 18px rgba(0,0,0,0.3)";
messageBox.style.textAlign = "center";
messageBox.style.fontSize = "20px";

players = await read(`/${code}/players`);
const currentPlayerName = players[turn]?.Name || `Player ${turn}`;
const displayName = isMyTurn ? "Your" : `${currentPlayerName}'s`;
messageBox.innerHTML = `
    <span>
        ${displayName} card played was <strong>${card}</strong><br>
        It is <strong style="color:${isLegal ? 'lightgreen' : '#ff6666'}">${isLegal ? 'legal' : 'not legal'}</strong>
    </span>
`;

popup.appendChild(messageBox);
document.body.appendChild(popup);

setTimeout(() => {
    if (isMyTurn) {
        const actionContainer = document.createElement("div");
        actionContainer.style.marginTop = "20px";
        if (isLegal) {
            const playBtn = document.createElement("button");
            playBtn.textContent = "Play Card";
            playBtn.onclick = () => {
                popup.remove();
                endTurn(card, 1, 2);
            };
            playBtn.style.background = "#f0e68c";
            playBtn.style.color = "#2b2b3a";
            playBtn.style.border = "none";
            playBtn.style.borderRadius = "8px";
            playBtn.style.padding = "10px 20px";
            playBtn.style.fontWeight = "bold";
            playBtn.style.cursor = "pointer";
            playBtn.style.fontSize = "16px";
            actionContainer.appendChild(playBtn);
        } else {
            const takeBtn = document.createElement("button");
            takeBtn.textContent = "Take Cards";
            takeBtn.onclick = () => {
                popup.remove();
                takeCards(card);
            };
            takeBtn.style.background = "#f0e68c";
            takeBtn.style.color = "#2b2b3a";
            takeBtn.style.border = "none";
            takeBtn.style.borderRadius = "8px";
            takeBtn.style.padding = "10px 20px";
            takeBtn.style.fontWeight = "bold";
            takeBtn.style.cursor = "pointer";
            takeBtn.style.fontSize = "16px";
            actionContainer.appendChild(takeBtn);
        }
        messageBox.appendChild(actionContainer);
    } else {
        messageBox.innerHTML += `<br><br><span style="color:#f0e68c;">Waiting for opponent to ${isLegal ? "play" : "take cards"}.</span>`;
    }
}, 1200);

            }
        );

            await write(`/${code}/gameStarted`, true);
            //updateGame();
            return;
        }

        // --- Game not yet initialized, so initialize it now ---
        const baseDeck = ["D", "P"];
        for (let i = 0; i < 4; i++) {
            for (let j = 2; j <= 10; j++) baseDeck.push(j.toString());
            baseDeck.push("L", "N", "S");
        }
        shuffle(baseDeck);

        const deck = [...baseDeck];
        const hands = {};
        const mysts = {};
        const ends = {};

        for (let i = 1; i <= numPlayers; i++) {
            hands[i] = deal(deck, 5);
            mysts[i] = deal(deck, 3);
            ends[i] = [];
        }

        const writes = [
            write(`/${code}/deck`, deck),
            write(`/${code}/inPlay`, []),
            write(`/${code}/turn`, 1),
            write(`/${code}/mysteryPlayed`, false),
            write(`/${code}/lastMove`, null),
            write(`/${code}/lastVal`, null),
            write(`/${code}/lastAmt`, null),
            write(`/${code}/resetDone`, false),
        ];

        for (let i = 1; i <= numPlayers; i++) {
            writes.push(write(`/${code}/hands/${i}`, hands[i]));
            writes.push(write(`/${code}/mysts/${i}`, mysts[i]));
            writes.push(write(`/${code}/ends/${i}`, []));
        }

        await Promise.all(writes);

        await write(`/${code}/initialized`, true)
    }


   /* Set up the end of turn processes
    ---------------------------------------------------------------------------------------
    */

    async function processClick(card,stage) {
        if (stage==2){
            await write(`/${code}/mysteryPlayed`, {
                played: card,
                date: Date.now()  // or some turn counter
            });
            return
        }
        let count=0
        if (stage==0){
            count = Array.from(document.querySelectorAll("#hand .card-button"))
                   .filter(btn => btn.dataset.card === card).length;
        }
        if (stage==1){
            count = Array.from(document.querySelectorAll(".end-card"))
                   .filter(btn => btn.dataset.card === card).length;
        }
        if (count === 1 || card=='L' || card=='S' || card=='N') {
            endTurn(card, 1,stage);
            return;
        }

    // Create overlay
const overlay = document.createElement("div");
overlay.className = "popup-overlay";
overlay.style.position = "fixed";
overlay.style.top = "0";
overlay.style.left = "0";
overlay.style.width = "100%";
overlay.style.height = "100%";
overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
overlay.style.zIndex = "9998";

// Create popup box
const popup = document.createElement("div");
popup.className = "popup";
popup.style.position = "fixed";
popup.style.top = "50%";
popup.style.left = "50%";
popup.style.transform = "translate(-50%, -50%)";
popup.style.background = "#2b2b3a";  // dark background
popup.style.padding = "25px";
popup.style.border = "2px solid #444";
popup.style.borderRadius = "12px";
popup.style.color = "#f0e68c";  // light yellow text
popup.style.boxShadow = "0 6px 18px rgba(0,0,0,0.3)";
popup.style.zIndex = "9999";
popup.innerHTML = `<h3 style="margin-bottom: 15px;">Select how many ${card}'s to play:</h3>
  <div id="popup-btn-container" style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;"></div>`;

const btnContainer = popup.querySelector("#popup-btn-container");

for (let i = 1; i <= count; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.style.margin = "5px";
    btn.style.padding = "10px 16px";
    btn.style.fontSize = "16px";
    btn.style.borderRadius = "8px";
    btn.style.border = "none";
    btn.style.backgroundColor = "#f0e68c";
    btn.style.color = "#2b2b3a";
    btn.style.cursor = "pointer";
    btn.style.fontWeight = "bold";
    btn.onclick = () => {
        document.body.removeChild(overlay);
        document.body.removeChild(popup);
        endTurn(card, i, stage);
    };
    btnContainer.appendChild(btn);
}

document.body.appendChild(overlay);
document.body.appendChild(popup);


    }

    async function endTurn(card,amt,stage) {   
        var [deck,hand,end_cards,myst_cards,lastMove,inPlay,prevAmt] = await Promise.all([
                read(`/${code}/deck`),
                read(`/${code}/hands/${player}`),
                read(`/${code}/ends/${player}`),
                read(`/${code}/mysts/${player}`),
                read(`/${code}/lastMove`),
                read(`/${code}/inPlay`),
                read(`/${code}/lastAmt`),
        ]);


        if (card == 'N') {
            write(`/${code}/lastMove`, 'N');
            write(`/${code}/lastVal`, null);
            write(`/${code}/lastAmt`, 1);
        } 
        else if (!isNaN(parseInt(card)) && (amt == 4 || ((amt + prevAmt) % 4 == 0 && card == lastMove))) {
            write(`/${code}/lastMove`, 'New from 4 of ' + card);
            write(`/${code}/lastVal`, null);
            write(`/${code}/lastAmt`, 4);
        } 
        else if (card == 'D' || card == 'S') {
            write(`/${code}/lastMove`, card);
            if (card == lastMove) {
                write(`/${code}/lastAmt`, amt + prevAmt);
            } else {
                write(`/${code}/lastAmt`, amt);
            }
        } 
        else {
            write(`/${code}/lastMove`, card);
            write(`/${code}/lastVal`, card);
            if (card == lastMove) {
                write(`/${code}/lastAmt`, amt + prevAmt);
            } else {
                write(`/${code}/lastAmt`, amt);
            }
        }

        if (stage==0){
            if (inPlay === null) {
                inPlay = [];
            }
            if (deck === null) {
                deck = [];
            }
            if (hand === null) {
                hand = [];
            }
            for (i=0; i<amt; i++){
                inPlay.push(card)
                const index = hand.indexOf(card);
                hand.splice(hand.indexOf(card), 1);
                if (deck.length!=0 && hand.length<=2){
                    hand.push(deal(deck,1)[0])
                }
            }
            await write(`/${code}/hands/${player}`, hand)
            await write(`/${code}/deck`, deck)
        }
        if (stage==1){
            if (inPlay === null) {
                inPlay = [];
            }
            if (end_cards === null) {
                end_cards = [];
            }
            for (i=0; i<amt; i++){
                inPlay.push(card)
                const index = end_cards.indexOf(card);
                end_cards.splice(end_cards.indexOf(card), 1);
            }
            await write(`/${code}/ends/${player}`, end_cards)
        }
        if (stage==2){
            if (inPlay === null) {
                inPlay = [];
            }
            if (myst_cards === null) {
                myst_cards = [];
            }
            inPlay.push(card)
            const index = myst_cards.indexOf(card);
            myst_cards.splice(myst_cards.indexOf(card), 1);
            await write(`/${code}/mysts/${player}`, myst_cards)
        }
    
        if (card =='N' || (!isNaN(parseInt(card)) && (amt==4 || ((amt+prevAmt)%4==0 && card==lastMove)))){
            write(`/${code}/inPlay`,[])
        }
        else{
            write(`/${code}/inPlay`,inPlay)
        }

        let newTurn = (turn % numPlayers) + 1;
        temp=turn
        write(`/${code}/turn`,newTurn)
        if (card =='N' || (!isNaN(parseInt(card)) && (amt==4 || ((amt+prevAmt)%4==0 && card==lastMove)))){
            write(`/${code}/turn`,temp)   
        }
        else if (card =='D'){
            newTurn = (newTurn % numPlayers) + 1;
            write(`/${code}/turn`,newTurn)   
        }
    }  


    async function takeCards(card){
        var [hand,inPlay,myst_cards] = await Promise.all([
                read(`/${code}/hands/${player}`),
                read(`/${code}/inPlay`),
                read(`/${code}/mysts/${player}`)
            ]);
        if (inPlay === null) {
            inPlay = [];
        }
        if (hand === null) {
            hand = [];
        }
        if (card!=null) {
            if (myst_cards === null) {
                myst_cards = [];
            }
            inPlay.push(card)
            const index = myst_cards.indexOf(card);
            myst_cards.splice(myst_cards.indexOf(card), 1);
            await write(`/${code}/mysts/${player}`, myst_cards)
        }
        hand.push(...inPlay);
        inPlay=[]

        let newTurn = (turn % numPlayers) + 1;
        await Promise.all([
            write(`/${code}/lastMove`, null),
            write(`/${code}/lastVal`, null),
            write(`/${code}/lastAmt`, null),
            write(`/${code}/inPlay`, inPlay),
            write(`/${code}/hands/${player}`, hand),
            write(`/${code}/turn`, newTurn)
        ]);

    }

    /* Set up the Displays
    ---------------------------------------------------------------------------------------
    */


async function updateGame() {
    var [deck, inPlay, hand, ends, mysts, lastMove, lastVal, lastAmt, allPlayers] = await Promise.all([
        read(`/${code}/deck`),
        read(`/${code}/inPlay`),
        read(`/${code}/hands/${player}`),
        read(`/${code}/ends/${player}`),
        read(`/${code}/mysts/${player}`),
        read(`/${code}/lastMove`),
        read(`/${code}/lastVal`),
        read(`/${code}/lastAmt`),
        read(`/${code}/players`)
    ]);
    
    // Initialize null values
    if (inPlay === null) inPlay = [];
    if (deck === null) deck = [];
    if (hand === null) hand = [];
    if (ends === null) ends = [];
    if (mysts === null) mysts = [];
    
    turn = await read(`/${code}/turn`);
    const isMyTurn = turn === Number(player);
    
    // Process opponents data
    const opponents = allPlayers
        .map((p, idx) => ({ ...p, id: idx }))
        .filter(p => p && p.id !== Number(player) && p.id !== 0);
    
    // Build opponents HTML
    const opponentHTML = await Promise.all(opponents.map(async (p) => {
        var [h = [], e = [], m = []] = await Promise.all([
            read(`/${code}/hands/${p.id}`),
            read(`/${code}/ends/${p.id}`),
            read(`/${code}/mysts/${p.id}`)
        ]);
        
        const isCurrentTurn = turn === p.id;
        const nameClass = isCurrentTurn ? "current-turn" : "";
        
        return `
        <div class="col-md-${opponents.length > 2 ? '4' : '6'} mb-4">
            <div class="opponent-block h-100">
                <h4 class="${nameClass} mb-3">${p.Name}</h4>
                <div class="row g-2">
                    <div class="col-4">
                        <div class="card-label">Hand</div>
                        <div class="overlap-container justify-content-center">
                            ${h.map(() => `<button class="card-button card-back" disabled></button>`).join("")}
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="card-label">Ends</div>
                        <div class="overlap-container justify-content-center">
                            ${e.map(card => `
                                <button class="card-button" style="background-image: url('Card_pics/${card}.png')" disabled></button>
                            `).join("")}
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="card-label">Mystery</div>
                        <div class="overlap-container justify-content-center">
                            ${m.map(() => `<button class="card-button card-back" disabled></button>`).join("")}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }));
    
    // Player display
    const youNameDisplay = isMyTurn ? `<span class="current-turn">You</span>` : `You`;
    const sortedHand = sortCards(hand);
    
    // Deck display
    const deckHTML = deck.length > 0 ? `
        <div class="d-flex align-items-center gap-3 mb-3">
            <span class="card-label">Deck:</span>
            <div class="overlap-container">
                ${deck.map(() => `<button class="card-button card-back" disabled></button>`).join("")}
            </div>
        </div>
    ` : "";
    
    // In-play display (last 4 visible)
    const numHidden = Math.max(0, inPlay.length - 4);
    const visible = inPlay.slice(-4);
    const playHTML = `
        <div class="d-flex align-items-center gap-3">
            <span class="card-label">In Play:</span>
            <div class="overlap-container">
                ${Array(numHidden).fill().map(() =>
                    `<button class="card-button card-back" disabled></button>`
                ).join("")}
                ${visible.map(card => `
                    <button class="card-button" style="background-image: url('Card_pics/${card}.png')" disabled></button>
                `).join("")}
            </div>
        </div>
    `;
    
    // Update page title and flashing
    document.title = isMyTurn ? "Your turn" : "Opponent Turn";
    if (document.visibilityState !== 'visible' && isMyTurn) {
        startFlashingTitle("Your Turn!");
    }
    
    // Update DOM with Bootstrap structure
    document.getElementById("opponents-container").innerHTML = opponentHTML.join("");
    document.getElementById("deck-area").innerHTML = deckHTML;
    document.getElementById("play-area").innerHTML = playHTML;
    document.getElementById("player-name-display").innerHTML = youNameDisplay;
    
    // Update hand, ends, and mystery cards
    document.getElementById("hand").innerHTML = sortedHand.map(card =>
        `<button class="card-button" data-card="${card}"></button>`
    ).join("");
    
    document.getElementById("ends").innerHTML = ends.map(card =>
        `<button class="card-button end-card" data-card="${card}"></button>`
    ).join("");
    
    document.getElementById("mystery").innerHTML = mysts.map(card =>
        `<button class="card-button myst-card" data-card="${card}"></button>`
    ).join("");
    
    // Update button states
    const canPlay = updateHandButtons(isMyTurn, lastVal, deck, hand, ends);
    
    // Check win conditions
    if (hand.length === 0 && ends.length === 0 && mysts.length === 0) {
        winner(player);
    }
    
    for (const p of opponents) {
        var [h = [], e = [], m = []] = await Promise.all([
            read(`/${code}/hands/${p.id}`),
            read(`/${code}/ends/${p.id}`),
            read(`/${code}/mysts/${p.id}`)
        ]);
        
        if (h.length === 0 && e.length === 0 && m.length === 0) {
            winner(p.id);
        }
    }
}

function updateHandButtons(enabled, lastVal, deck, hand, ends) {
    let canPlay = false;
    
    // Helper function to update card button appearance
    const updateCardButton = (btn, card, isEnabled) => {
        const isLegal = legalMove(card, lastVal);
        const active = enabled && isLegal;
        
        btn.style.backgroundImage = `url('Card_pics/${card}.png')`;
        btn.disabled = !active;
        btn.classList.toggle('btn-primary', active);
        btn.classList.toggle('btn-secondary', !active);
        
        if (active) {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.4)';
            btn.onmouseenter = () => {
                btn.style.transform = 'scale(1.05)';
                btn.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.5)';
            };
            btn.onmouseleave = () => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.4)';
            };
            canPlay = true;
        } else {
            btn.onmouseenter = null;
            btn.onmouseleave = null;
        }
    };
    
    // Update hand cards
    const handButtons = document.querySelectorAll("#hand .card-button");
    handButtons.forEach(btn => {
        const card = btn.dataset.card;
        updateCardButton(btn, card, enabled);
        btn.onclick = enabled && legalMove(card, lastVal) ? () => processClick(card, 0) : null;
    });
    
    // Update end cards
    const endButtons = document.querySelectorAll(".end-card");
    endButtons.forEach(btn => {
        const card = btn.dataset.card;
        const active = hand.length === 0 && enabled && legalMove(card, lastVal);
        updateCardButton(btn, card, active);
        btn.onclick = active ? () => processClick(card, 1) : null;
    });
    
    // Update mystery cards
    const mystButtons = document.querySelectorAll(".myst-card");
    mystButtons.forEach(btn => {
        const card = btn.dataset.card;
        const active = hand.length === 0 && ends.length === 0 && enabled;
        btn.style.backgroundImage = "url('Card_pics/back.png')";
        btn.disabled = !active;
        btn.classList.toggle('btn-primary', active);
        btn.classList.toggle('btn-secondary', !active);
        
        if (active) {
            canPlay = true;
            btn.onclick = () => processClick(card, 2);
        } else {
            btn.onclick = null;
        }
    });
    
    // Update Take Cards button
    const takeContainer = document.getElementById("take-cards-container");
    takeContainer.innerHTML = '';
    
    if (enabled && !canPlay) {
        const takeBtn = document.createElement("button");
        takeBtn.id = "take-cards-btn";
        takeBtn.className = "btn btn-warning btn-lg mt-3";
        takeBtn.textContent = "Take Cards";
        takeBtn.onclick = () => takeCards(null);
        takeContainer.appendChild(takeBtn);
    }
    
    return canPlay;
}
