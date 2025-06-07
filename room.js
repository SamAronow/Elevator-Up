    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get("room");

    document.getElementById("room-code-display").textContent = roomCode;

    // Copy link animation (no alert)
    const copyBtn = document.getElementById("copy-link-btn");
    copyBtn.onclick = () => {
      const roomURL = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
      navigator.clipboard.writeText(roomURL).then(() => {
        copyBtn.innerHTML = '<i class="bi bi-check2 me-2"></i>Copied!';
        copyBtn.disabled = true;
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="bi bi-clipboard me-2"></i>Copy Room Link';
          copyBtn.disabled = false;
        }, 1000);
      });
    };

    let playerCount = 0;
    let selectedPlayerNum = null;
    setupRoom();

    async function setupRoom() {
      playerCount = await read(`/${roomCode}/playerCount`);
      const container = document.getElementById("player-buttons");
      container.innerHTML = "";

      for (let i = 1; i <= playerCount; i++) {
        const btn = document.createElement("button");
        btn.id = `player${i}-btn`;
        btn.className = "btn btn-dark-custom btn-lg";
        btn.innerHTML = `<i class="bi bi-person me-2"></i>Player ${i}`;
        btn.onclick = () => selectPlayer(i);
        container.appendChild(btn);

        // Listen for Used status changes and update button accordingly
        firebase.database().ref(`/${roomCode}/players/${i}/Used`).on("value", snapshot => {
          if (snapshot.val() === true) disableButton(i);
          else enableButton(i);
        });
      }
    }

    function disableButton(playerNum) {
      const btn = document.getElementById(`player${playerNum}-btn`);
      if (btn) {
        btn.disabled = true;
        btn.classList.add("taken");
        btn.innerHTML = `<i class="bi bi-person-x me-2"></i>Player ${playerNum} (Taken)`;
      }
    }

    function enableButton(playerNum) {
      const btn = document.getElementById(`player${playerNum}-btn`);
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("taken");
        btn.innerHTML = `<i class="bi bi-person me-2"></i>Player ${playerNum}`;
      }
    }

    // Add this at the top of your script, before setupRoom()
window.addEventListener("load", async () => {
    const choosingPlayer = localStorage.getItem("choosingPlayer");
    const inGame = localStorage.getItem("inGame");
    const playerNum = localStorage.getItem("player");
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get("room");

    // If we're in the middle of choosing a player (name popup was closed)
    if (!isNaN(parseInt(choosingPlayer)) && choosingPlayer > 0) {
        selectPlayer(parseInt(choosingPlayer));
    }
    // If we have a stored game, check if we can rejoin
    else if (inGame==roomCode && playerNum) {
        try {
            const snapshot = await firebase.database().ref(`/${inGame}/players/${playerNum}/Used`).once('value');
            if (snapshot.exists() && snapshot.val() === true ) {
                console.log(snapshot.val())
                console.log(`/${inGame}/players/${playerNum}/Used`);
                showRejoinButton(inGame);
            } else {
                // Clean up if our slot isn't used anymore
                localStorage.removeItem('inGame');
                localStorage.removeItem('player');
                localStorage.removeItem('playerName');
            }
        } catch (error) {
            console.error("Error checking game status:", error);
        }
    }
});

// Add this function to show the rejoin button at bottom
function showRejoinButton(roomCode) {
    // Remove existing rejoin button if any
    const existingBtn = document.querySelector('.rejoin-btn-container');
    if (existingBtn) existingBtn.remove();
    
    const rejoinContainer = document.createElement('div');
    rejoinContainer.className = 'rejoin-btn-container mt-5';
    rejoinContainer.innerHTML = `
        <button class="btn btn-custom rejoin-btn" style="background-color: #4CAF50;">
            <i class="bi bi-arrow-repeat me-2"></i>Rejoin Game (player ${localStorage.getItem('player') || 'unknown'}) 
        </button>
    `;
    
    // Insert at bottom of container (before closing </div>)
    const mainContainer = document.querySelector('.container');
    mainContainer.appendChild(rejoinContainer);
    
    // Add click handler
    document.querySelector('.rejoin-btn').addEventListener('click', async () => {
        const playerName = localStorage.getItem('playerName');
        const playerNum = localStorage.getItem('player');
        
        if (!playerName || !playerNum) return;
        
        try {
            const snapshot = await firebase.database().ref(`/${roomCode}/players/${playerNum}/Used`).once('value');
            if (snapshot.exists() && snapshot.val() === true) {
                window.location.href = `game.html?player=${playerNum}&room=${roomCode}`;
            } else {
                rejoinContainer.remove();
                localStorage.removeItem('inGame');
                localStorage.removeItem('player');
                localStorage.removeItem('playerName');
            }
        } catch (error) {
            console.error("Rejoin failed:", error);
        }
    });
}

// Update your selectPlayer function
async function selectPlayer(num) {
    selectedPlayerNum = num;
    await write(`/${roomCode}/players/${num}/Used`, true);
    localStorage.setItem("choosingPlayer", num);
    const name = await showNamePopup(num);

    if (!name) {
        await write(`/${roomCode}/players/${num}/Used`, false);
        localStorage.removeItem('choosingPlayer');
        setupRoom();
        return;
    }

    localStorage.removeItem('choosingPlayer');
    await write(`/${roomCode}/players/${num}/Name`, name.trim());
    localStorage.setItem("inGame", roomCode);
    localStorage.setItem("player", num);
    localStorage.setItem("playerName", name.trim());
    
    window.location.href = `game.html?player=${num}&room=${roomCode}`;
}


    function showNamePopup(num) {
      return new Promise((resolve) => {
        const popup = document.getElementById("player-name-popup");
        const input = document.getElementById("player-name-input");
        const submitBtn = popup.querySelector("button.submit-btn");

        popup.style.display = "flex";
        input.value = "";
        input.focus();

        function cleanupAndResolve(name) {
          submitBtn.removeEventListener("click", onSubmit);
          popup.style.display = "none";
          resolve(name);
        }

        function onSubmit() {
          const val = input.value.trim();
          if (val.length === 0) return;
          cleanupAndResolve(val);
        }

        submitBtn.addEventListener("click", onSubmit);

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            onSubmit();
          } else if (e.key === "Escape") {
            cleanupAndResolve(null);
          }
        });
      });
    }

    // Cancel name entry: close popup and re-enable the button
    async function cancelNameEntry() {
        localStorage.setItem("choosingPlayer", 0);
      if (selectedPlayerNum !== null) {
        await write(`/${roomCode}/players/${selectedPlayerNum}/Used`, false);
      }
      closeNamePopup();
    }

    function closeNamePopup() {
      const popup = document.getElementById("player-name-popup");
      popup.classList.add("closing");
      const modalContent = popup.querySelector(".modal-content");
      if (modalContent) modalContent.classList.add("closing");
      
      setTimeout(() => {
        popup.style.display = "none";
        popup.classList.remove("closing");
        if (modalContent) modalContent.classList.remove("closing");
      }, 300);
    }
 

            