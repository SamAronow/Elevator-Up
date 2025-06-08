// At the top of your script (replace the existing code)
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get("room");
localStorage.removeItem("playerName"); // This might be problematic if you want to remember the name across sessions, but I'll keep it as per your snippet.

document.getElementById("room-code-display").textContent = roomCode;

let playerCount = 0;
let selectedPlayerNum = null;
let playerName = localStorage.getItem('playerName') || null;

// New: Variable to track the number of messages for unread indicator
let lastMessageCount = 0;

// Show name popup immediately when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Only show popup if we don't have a stored name
    if (playerName === null) {
        playerName = await showInitialNamePopup();
        if (!playerName) {
            // If no name provided, redirect back
            window.location.href = 'index.html';
            return;
        }
        sendSystemMessage(`${playerName} joined`); // Send after player name is confirmed
        localStorage.setItem('playerName', playerName);
    } else {
        // If player name exists, send system message on page load
        sendSystemMessage(`${playerName} rejoined`); // Or "joined" if it's a fresh load with cached name
    }
    
    // Then setup the room
    setupRoom();
    
    // Check for rejoin scenario
    await checkRejoinScenario();
});

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


function showInitialNamePopup() {
    return new Promise((resolve) => {
        const popup = document.getElementById("player-name-popup");
        const input = document.getElementById("player-name-input");
        const submitBtn = popup.querySelector("button.submit-btn");
        
        // Make sure popup is visible
        popup.style.display = "flex";
        popup.style.opacity = "1";
        input.value = "";
        input.focus();

        function cleanupAndResolve(name) {
            submitBtn.removeEventListener("click", onSubmit);
            input.removeEventListener("keydown", handleKeyDown);
            popup.style.display = "none";
            resolve(name);
        }

        function onSubmit() {
            const val = input.value.trim();
            if (val.length === 0) return;
            cleanupAndResolve(val);
        }

        function handleKeyDown(e) {
            if (e.key === "Enter") {
                onSubmit();
            }
        }

        submitBtn.addEventListener("click", onSubmit);
        input.addEventListener("keydown", handleKeyDown);
    });
}

async function checkRejoinScenario() {
    const inGame = localStorage.getItem("inGame");
    const playerNum = localStorage.getItem("player");
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get("room");

    // If we have a stored game, check if we can rejoin
    if (inGame === roomCode && playerNum) {
        try {
            const snapshot = await firebase.database().ref(`/${inGame}/players/${playerNum}/Used`).once('value');
            if (snapshot.exists() && snapshot.val() === true) {
                showRejoinButton(inGame);
            } else {
                // Clean up if our slot isn't used anymore
                localStorage.removeItem('inGame');
                localStorage.removeItem('player');
            }
        } catch (error) {
            console.error("Error checking game status:", error);
        }
    }
}

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
    
    const mainContainer = document.querySelector('.container'); // Assuming your main content container has this class
    if (mainContainer) {
        mainContainer.appendChild(rejoinContainer);
    } else {
        console.error("Main container not found for rejoin button.");
    }

    document.querySelector('.rejoin-btn').addEventListener('click', async () => {
        const playerNum = localStorage.getItem('player');
        
        if (!playerNum) return;
        
        try {
            const snapshot = await firebase.database().ref(`/${roomCode}/players/${playerNum}/Used`).once('value');
            if (snapshot.exists() && snapshot.val() === true) {
                window.location.href = `game.html?player=${playerNum}&room=${roomCode}`;
            } else {
                rejoinContainer.remove();
                localStorage.removeItem('inGame');
                localStorage.removeItem('player');
            }
        } catch (error) {
            console.error("Rejoin failed:", error);
        }
    });
}

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

async function selectPlayer(num) {
    selectedPlayerNum = num;
    await write(`/${roomCode}/players/${num}/Used`, true);
    await write(`/${roomCode}/players/${num}/Name`, playerName.trim());
    
    // Wait for the system message to be sent before redirecting
    await sendSystemMessage(`${playerName} chose Player ${num}`);
    
    localStorage.setItem("inGame", roomCode);
    localStorage.setItem("player", num);
    localStorage.removeItem("playerName"); // This removes the name so it asks again on next visit

    // Remove the setTimeout and redirect immediately after message is sent
    window.location.href = `game.html?player=${num}&room=${roomCode}`;
}

// Chat functionality
let chatOpen = false;

function setupChat() {
    const chatToggle = document.getElementById('chat-toggle-btn');
    const chatContainer = document.getElementById('chat-container');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const chatInput = document.getElementById('chat-input-field');
    const chatIcon = document.getElementById('chat-icon');
    const closeIcon = document.getElementById('close-icon');
    const mainContent = document.getElementById('main-content'); // Assuming you have a main-content in room.html

    if (!chatToggle || !chatContainer || !sendChatBtn || !chatInput || !chatIcon || !closeIcon || !mainContent) {
        console.warn("Chat elements not found in room.html. Chat functionality might not work as expected.");
        return; // Exit if essential elements are missing
    }

    // Toggle chat visibility
    chatToggle.addEventListener('click', () => {
        chatOpen = !chatOpen;
        chatContainer.classList.toggle('open', chatOpen);
        chatToggle.classList.toggle('chat-open'); // this makes it move!
        mainContent.classList.toggle('chat-open');

        // New: Remove new-message-indicator when chat is opened
        if (chatOpen) {
            chatIcon.style.display = 'none';
            closeIcon.style.display = 'block';
            chatInput.focus();
            chatToggle.classList.remove('new-message-indicator'); // <--- ADD THIS
        } else {
            chatIcon.style.display = 'block';
            closeIcon.style.display = 'none';
        }
    });

    // Close icon click handler
    closeIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        chatOpen = false;
        chatContainer.classList.remove('open');
        chatToggle.classList.remove('chat-open');
        mainContent.classList.remove('chat-open');
        chatIcon.style.display = 'block';
        closeIcon.style.display = 'none';
        chatToggle.classList.remove('new-message-indicator'); // <--- ADD THIS
    });


    // Send message handler
    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Initialize Firebase chat listener
    if (typeof roomCode !== 'undefined') {
        firebase.database().ref(`/${roomCode}/chat`).on('value', (snapshot) => {
            const messages = snapshot.val() || [];
            updateChatDisplay(messages);
        });
    }
}

function sendMessage() {
    const chatInput = document.getElementById('chat-input-field');
    const message = chatInput.value.trim();
    if (message === '') return;

    const newMessage = {
        sender: playerName,
        text: message,
        timestamp: Date.now(),
        type: 'user' // Add message type
    };

    if (typeof roomCode !== 'undefined') {
        firebase.database().ref(`/${roomCode}/chat`).once('value').then((snapshot) => {
            const currentChat = snapshot.val() || [];
            const updatedChat = [...currentChat, newMessage];
            firebase.database().ref(`/${roomCode}/chat`).set(updatedChat);
            chatInput.value = '';
        });
    }
}

function sendSystemMessage(message) {
    return new Promise((resolve) => {
        if (typeof roomCode !== 'undefined') {
            const newMessage = {
                sender: 'System',
                text: message,
                timestamp: Date.now(),
                type: 'system'
            };
            
            firebase.database().ref(`/${roomCode}/chat`).once('value').then((snapshot) => {
                const currentChat = snapshot.val() || [];
                const updatedChat = [...currentChat, newMessage];
                firebase.database().ref(`/${roomCode}/chat`).set(updatedChat)
                    .then(() => resolve()); // Resolve when message is fully written
            });
        } else {
            resolve(); // Still resolve if no room code (e.g., if called before roomCode is set)
        }
    });
}

function updateChatDisplay(messages) {
    const chatMessages = document.getElementById('chat-messages');
    const chatToggle = document.getElementById('chat-toggle-btn'); // Get the button element
    
    if (!chatMessages || !chatToggle) {
        console.warn("Chat display or toggle elements not found.");
        return; // Exit if elements are missing
    }

    // New: Check for new messages only if the chat is not currently open
    if (!chatOpen && messages.length > lastMessageCount) {
        chatToggle.classList.add('new-message-indicator');
    }
    lastMessageCount = messages.length; // Update the count of messages


    chatMessages.innerHTML = ''; // Clear existing messages

    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        
        if (msg.type === 'system') {
            // System message styling (green)
            messageDiv.className = 'message system';
            messageDiv.innerHTML = `
                <span style="color: lightgreen; font-style: italic;">${msg.text}</span>
                <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
            `;
        } else {
            // Regular user message
            messageDiv.className = msg.sender === playerName ? 'message you' : 'message';
            messageDiv.innerHTML = `
                <span class="message-sender">${msg.sender}:</span>
                <span>${msg.text}</span>
                <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', setupChat);