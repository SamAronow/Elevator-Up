    function randomCode(length = 4) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }

function formatRoomCode(input) {
    // Remove all spaces and convert to uppercase
    let value = input.value.replace(/\s/g, '').toUpperCase();
    
    // Limit to 4 actual characters (ignore spaces in count)
    value = value.substring(0, 4);
    
    // Add spaces between characters
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
        if (i > 0) formatted += ' ';
        formatted += value[i];
    }
    
    // Update the input value
    input.value = formatted;
    
    // Expand max length to accommodate spaces
    localStorage.setItem("roomCodeValue", value);
    input.setAttribute('maxlength', 7); // 4 chars + 3 spaces
}

    function openPlayerCountPopup() {
    const popup = document.getElementById("player-count-popup");
    popup.style.display = "flex";
    popup.classList.remove('closing');
    const modalContent = popup.querySelector('.modal-content');
    if (modalContent) modalContent.classList.remove('closing');
    localStorage.setItem("openPopup", "playerCount");
}


    function openJoinPopup() {
    const popup = document.getElementById("join-popup");
    popup.style.display = "flex";
    popup.classList.remove('closing');
    const modalContent = popup.querySelector('.modal-content');
    if (modalContent) modalContent.classList.remove('closing');
    const input = document.getElementById("room-code-input");
    input.value = '';
    input.focus();
    localStorage.setItem("openPopup", "join");
}


    function closePopups(event) {
    if (event.target.classList.contains('popup-overlay')) {
        const popups = document.querySelectorAll('.popup-overlay');
        popups.forEach(popup => {
            // Add closing classes
            popup.classList.add('closing');
            const modalContent = popup.querySelector('.modal-content');
            if (modalContent) modalContent.classList.add('closing');
            
            // Remove after animation completes
            setTimeout(() => {
                popup.style.display = "none";
                popup.classList.remove('closing');
                if (modalContent) modalContent.classList.remove('closing');
            }, 300); // Match this to your longest animation duration
        });
        localStorage.removeItem("openPopup");
    }
}

    async function createRoom(playerCount) {
      localStorage.removeItem("openPopup");
      localStorage.removeItem("roomCodeValue");

      const code = randomCode();

      const players = {};
      for (let i = 1; i <= playerCount; i++) {
        players[i] = { Used: false };
      }

      await Promise.all([
        write(`/${code}/players`, players),
        write(`/${code}/initialized`, false),
        write(`/${code}/gameStarted`, false),
        write(`/${code}/playerCount`, playerCount)
      ]);


    await setUpDatabase(playerCount, code);

      window.location.href = `room.html?room=${code}`;
    }

       function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }

    function deal(deck,count) {
      return deck.splice(0,count);
    }
    async function setUpDatabase(playerCount,code){
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

            for (let i = 1; i <= playerCount; i++) {
                hands[i] = deal(deck, 5);
                mysts[i] = deal(deck, 3);
                ends[i] = [];
            }

            const writes = [
                await write(`/${code}/deck`, deck),
                await write(`/${code}/inPlay`, []),
                await write(`/${code}/turn`, 1),
                await write(`/${code}/mysteryPlayed`, false),
                await write(`/${code}/resetDone`, false),
            ];

            for (let i = 1; i <= playerCount; i++) {
                await write(`/${code}/hands/${i}`, hands[i])
                await write(`/${code}/mysts/${i}`, mysts[i])
                await write(`/${code}/ends/${i}`, [])
            }
    }
    
    
    async function submitJoinRoom() {
    const input = document.getElementById("room-code-input");
    const code = input.value.replace(/\s/g, '').trim().toUpperCase();
    
    // Clear previous errors
    hideInputError(input);
    
    if (!code || code.length !== 4) {
        showInputError(input, "Please enter a 4-letter code");
        return;
    }

    try {
        const roomRef = firebase.database().ref(`/${code}`);
        const snapshot = await roomRef.once('value');
        
        if (!snapshot.exists()) {
            showInputError(input, "Room doesn't exist");
            return;
        }

        localStorage.removeItem("openPopup");
        localStorage.removeItem("roomCodeValue");
        window.location.href = `room.html?room=${code}`;
        
    } catch (error) {
        console.error("Database check failed:", error);
        showInputError(input, "Connection error. Please try again.");
    }
}

function showInputError(inputElement, message) {
    // Store original border radius
    const originalRadius = getComputedStyle(inputElement).borderRadius;
    inputElement.dataset.originalRadius = originalRadius;
    
    // Apply error styles (preserving radius)
    inputElement.classList.add('input-error');
    inputElement.style.borderRadius = originalRadius; // Force maintain radius
    
    const container = inputElement.closest('.input-container') || inputElement.parentNode;
    
    // Create/update error message
    let errorDisplay = container.querySelector('.error-message');
    if (!errorDisplay) {
        errorDisplay = document.createElement('div');
        errorDisplay.className = 'error-message';
        container.appendChild(errorDisplay);
    }
    errorDisplay.textContent = message;
    
    // Apply shake animation
    inputElement.classList.add('shake-error');
    
    // Clear any existing timeout
    if (inputElement.errorTimeout) {
        clearTimeout(inputElement.errorTimeout);
    }
    
    // Remove shake after animation completes
    setTimeout(() => {
        inputElement.classList.remove('shake-error');
        // Explicitly restore radius after shake
        inputElement.style.borderRadius = inputElement.dataset.originalRadius;
    }, 500);
    
    // Remove all error styles after 1 second
    inputElement.errorTimeout = setTimeout(() => {
        inputElement.classList.remove('input-error');
        errorDisplay.textContent = '';
        // Final radius restoration
        inputElement.style.borderRadius = inputElement.dataset.originalRadius;
    }, 1500);
}

function hideInputError(inputElement) {
    // Clear any pending timeout
    if (inputElement.errorTimeout) {
        clearTimeout(inputElement.errorTimeout);
    }
    
    // Restore all styles
    inputElement.classList.remove('input-error', 'shake-error');
    if (inputElement.dataset.originalRadius) {
        inputElement.style.borderRadius = inputElement.dataset.originalRadius;
    }
    
    // Clear error message
    const container = inputElement.closest('.input-container') || inputElement.parentNode;
    const errorDisplay = container.querySelector('.error-message');
    if (errorDisplay) {
        errorDisplay.textContent = '';
    }
}

// On page load - restore both popup and value
window.addEventListener("load", () => {
    const openPopup = localStorage.getItem("openPopup");
    const savedCode = localStorage.getItem("roomCodeValue");
    
    if (openPopup === "join") {
        const input = document.getElementById("room-code-input");
        openJoinPopup();
        input.value = savedCode;
        formatRoomCode(input)
    } else if (openPopup === "playerCount") {
        openPlayerCountPopup();
    }
});

    document.getElementById("room-code-input").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        submitJoinRoom();
      }
    });
    // Update your button click handlers like this:
document.querySelector('.btn-close').onclick = function() {
    const popup = document.getElementById("player-count-popup");
    popup.classList.add('closing');
    const modalContent = popup.querySelector('.modal-content');
    if (modalContent) modalContent.classList.add('closing');
    
    setTimeout(() => {
        popup.style.display = "none";
        popup.classList.remove('closing');
        if (modalContent) modalContent.classList.remove('closing');
        localStorage.removeItem("openPopup");
    }, 300);
};