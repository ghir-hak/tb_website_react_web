import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectToChat = async () => {
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }

    try {
      // Get WebSocket URL from backend
      const response = await fetch("/api/getsocketurl?room=general");
      const wsPath = await response.text();

      console.log("WebSocket path from backend:", wsPath);

      // Connect to WebSocket directly
      let wsUrl;
      if (wsPath.startsWith("ws://") || wsPath.startsWith("wss://")) {
        // Backend returned full URL
        wsUrl = wsPath;
      } else {
        // Backend returned path, construct full URL
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.host}/${wsPath}`;
      }

      console.log("Connecting to WebSocket:", wsUrl);
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log("Connected to chat");
        setIsConnected(true);
      };

      websocket.onmessage = (event) => {
        console.log("Received WebSocket message type:", typeof event.data);
        console.log("Received WebSocket message:", event.data);

        // Handle blob data
        if (event.data instanceof Blob) {
          event.data.text().then((text) => {
            console.log("Blob converted to text:", text);
            try {
              const message = JSON.parse(text);
              console.log("Parsed message:", message);

              // Only add messages that have the expected structure
              if (message.username && message.message) {
                setMessages((prev) => [...prev, message]);
              } else {
                console.log(
                  "Skipping message - missing username or message:",
                  message
                );
              }
            } catch (error) {
              console.error("Error parsing blob text:", error);
              console.error("Raw blob text:", text);
            }
          });
        } else {
          // Handle text data
          try {
            const message = JSON.parse(event.data);
            console.log("Parsed message:", message);

            // Only add messages that have the expected structure
            if (message.username && message.message) {
              setMessages((prev) => [...prev, message]);
            } else {
              console.log(
                "Skipping message - missing username or message:",
                message
              );
            }
          } catch (error) {
            console.error("Error parsing message:", error);
            console.error("Raw message data:", event.data);
          }
        }
      };

      websocket.onclose = () => {
        console.log("Disconnected from chat");
        setIsConnected(false);
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        console.error("Failed to connect to:", wsUrl);
        setIsConnected(false);
        alert(`Failed to connect to chat. Check console for details.`);
      };

      setWs(websocket);
    } catch (error) {
      console.error("Error connecting to chat:", error);
      alert("Failed to connect to chat");
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !isConnected || !ws) return;

    const messageData = {
      username: username,
      message: newMessage.trim(),
      timestamp: Date.now(),
    };

    // Send directly through WebSocket
    ws.send(JSON.stringify(messageData));
    setNewMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
      setWs(null);
      setIsConnected(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="chat-container">
          <div className="chat-header">
            <h1>🚀 Wowrack Chat</h1>
            <div className="connection-status">
              {isConnected ? (
                <span className="status-connected">🟢 Connected</span>
              ) : (
                <span className="status-disconnected">🔴 Disconnected</span>
              )}
            </div>
          </div>

          {!isConnected ? (
            <div className="login-section">
              <h2>Join the Chat</h2>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="username-input"
                />
                <button onClick={connectToChat} className="connect-btn">
                  Connect
                </button>
              </div>
            </div>
          ) : (
            <div className="chat-section">
              <div className="messages-container">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message ${
                      msg.username === username ? "own-message" : ""
                    }`}
                  >
                    <div className="message-header">
                      <span className="username">{msg.username}</span>
                      <span className="timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-content">{msg.message}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="input-section">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="message-input"
                />
                <button onClick={sendMessage} className="send-btn">
                  Send
                </button>
                <button onClick={disconnect} className="disconnect-btn">
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;
