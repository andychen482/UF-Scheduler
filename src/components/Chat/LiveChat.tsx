import React, { useEffect, useState, useRef } from "react";
import io, { Socket } from "socket.io-client";
import GoogleAuth from "./GoogleSignIn";
import { CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { IoClose, IoSend } from "react-icons/io5";
import "./Chat.css";

interface Message {
  message: string;
  user: string;
  timestamp?: string;
}

interface UserInfo {
  name: string;
  given_name: string;
  exp: number; // Token expiry time
  sub: string; // Google user ID
  email: string;
  picture: string;
}

interface ChatProps {
  setIsChatVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isChatVisible: boolean;
  onNewMessage: () => void; // Add this prop for new message notification
  setHasNewMessage: React.Dispatch<React.SetStateAction<boolean>>;
}

let backendServer = process.env.REACT_APP_BACKEND_SERVER_IP as string;

const socket: Socket = io(`https://${backendServer}`);

const Chat: React.FC<ChatProps> = ({
  setIsChatVisible,
  isChatVisible,
  onNewMessage,
  setHasNewMessage,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [username, setUsername] = useState<string>("");
  const [isUsernameSet, setIsUsernameSet] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userInfo: UserInfo = JSON.parse(storedUser);
      setUser(userInfo);
      fetchUsername(userInfo.sub);
    }

    socket.on("load messages", (data: Message[]) => {
      setMessages(data);
      handleLoadMessages(data);
    });

    socket.on("receive message", (data: Message) => {
      const userAtBottom = isUserAtBottom();
      setMessages((prevMessages) => [...prevMessages, data]);

      onNewMessage(); // Notify parent component about the new message

      if (userAtBottom) {
        setTimeout(() => {
          scrollToBottom();
        }, 50);
      }
    });

    return () => {
      socket.off("load messages");
      socket.off("receive message");
    };
  }, []);

  const handleLoadMessages = (data: Message[]) => {
    const lastReadTimestamp = localStorage.getItem("lastReadTimestamp") ? Date.parse(localStorage.getItem("lastReadTimestamp") as string) : 0;
    if (lastReadTimestamp) {
      const newMessages = data.filter((message: Message) => {
        return message.timestamp && Date.parse(message.timestamp) > lastReadTimestamp;
      });
      if (newMessages.length > 0) {
        setHasNewMessage(true);
        localStorage.setItem("hasNewMessage", "true");
      }
    }
  };

  const fetchUsername = async (googleId: string) => {
    try {
      const response = await fetch(
        `https://${backendServer}/username/${googleId}`
      );
      const data = await response.json();
      if (data.username) {
        setUsername(data.username);
        setIsUsernameSet(true);
      }
    } catch (error) {
      console.error("Error fetching username:", error);
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && username) {
      const newMessage: Message = {
        message,
        user: username,
      };
      socket.emit("send message", newMessage);
      setMessage("");
      scrollToBottom();
    }
  };

  const handleLoginSuccess = (response: CredentialResponse) => {
    if (response.credential) {
      const userInfo = jwtDecode<UserInfo>(response.credential);
      setUser(userInfo);
      localStorage.setItem("user", JSON.stringify(userInfo));
      fetchUsername(userInfo.sub);
    }
  };

  const handleUsernameSubmit = async () => {
    if (username.trim() && user) {
      try {
        const response = await fetch(`https://${backendServer}/set-username`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            googleId: user.sub,
            username,
            email: user.email,
            name: user.name,
            profilePic: user.picture,
          }),
        });

        const result = await response.json();
        if (response.status === 200) {
          setIsUsernameSet(true);
        } else if (response.status === 409) {
          // Conflict status for username taken
          alert(result.error); // Display an error message to the user
        }
      } catch (error) {
        console.error("Error setting username:", error);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSendMessage();
    }
  };

  const handleUserNameKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      handleUsernameSubmit();
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const isUserAtBottom = () => {
    if (chatMessagesRef.current) {
      return (
        chatMessagesRef.current.scrollHeight -
          chatMessagesRef.current.scrollTop <=
        chatMessagesRef.current.clientHeight + 20
      );
    }
    return false;
  };

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        observer.disconnect();
      }
    });

    if (chatMessagesRef.current) {
      observer.observe(chatMessagesRef.current, { childList: true });
    }

    return () => {
      if (chatMessagesRef.current) {
        observer.disconnect();
      }
    };
  }, []);

  const handleToggleChat = () => {
    setIsChatVisible(false);
    localStorage.setItem("hasClosedChat", "true");
    const now = new Date().toISOString();
    localStorage.setItem("lastReadTimestamp", now);
  };

  useEffect(() => {
    if (isUsernameSet) {
      setTimeout(() => {
        if (messagesEndRef.current)
          messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      }, 0);
    }
  }, [isUsernameSet]);

  return (
    <div className="chat-panel" ref={containerRef}>
      <IoClose className="close-icon" onClick={handleToggleChat} />
      <h1 className="text-white text-xl">Chat</h1>
      <div className="chat-content">
        <div className="chat-messages-container">
          <div className="chat-messages" ref={chatMessagesRef}>
            {user && !isUsernameSet
              ? null
              : messages.map((msg, index) => (
                  <div
                    key={msg.timestamp + msg.user}
                    className="message-container text-white"
                  >
                    <div className="message-header">
                      <strong>{msg.user}</strong>
                      <span className="timestamp">
                        {new Date(msg.timestamp || "").toLocaleTimeString(
                          "en-GB",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          }
                        )}
                      </span>
                    </div>
                    <div className="message-content">{msg.message}</div>
                  </div>
                ))}
            <div ref={messagesEndRef} />
          </div>
          {!user ? (
            <div className="google-auth">
              <GoogleAuth onSuccess={handleLoginSuccess} />
            </div>
          ) : !isUsernameSet ? (
            <div>
              <h2 className="text-white text-center choose-username-text">
                Choose a Username
              </h2>
              <div className="chat-input-container">
                <input
                  type="text"
                  className="text-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleUserNameKeyDown}
                  placeholder="Enter your username"
                />
                <IoSend
                  onClick={handleUsernameSubmit}
                  className="text-white cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="chat-input-container">
              <input
                type="text"
                className="text-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message"
              />
              <IoSend
                onClick={handleSendMessage}
                className="text-white cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
