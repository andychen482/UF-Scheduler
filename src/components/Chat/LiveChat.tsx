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
}

interface ChatProps {
  setIsChatVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isChatVisible: boolean;
}

let backendServer = process.env.REACT_APP_BACKEND_SERVER_IP as string;

const socket: Socket = io(`https://${backendServer}`);

const Chat: React.FC<ChatProps> = ({ setIsChatVisible, isChatVisible }) => {
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
      const currentTime = Math.floor(Date.now() / 1000);
      if (userInfo.exp > currentTime) {
        setUser(userInfo);
        fetchUsername(userInfo.sub);
      } else {
        localStorage.removeItem("user");
      }
    }

    socket.on("load messages", (data: Message[]) => {
      const formattedMessages = data.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp || "").toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      }));
      setMessages(formattedMessages);
    });

    socket.on("receive message", (data: Message) => {
      const formattedMessage = {
        ...data,
        timestamp: new Date(data.timestamp || "").toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      };
      setMessages((prevMessages) => [...prevMessages, formattedMessage]);
    });

    return () => {
      socket.off("load messages");
      socket.off("receive message");
    };
  }, []);

  useEffect(() => {
    // if (isUserAtBottom()) {
    //   scrollToBottom();
    // }
    scrollToBottom();
  }, [messages]);

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
        const response = await fetch(
          `https://${backendServer}/set-username`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              googleId: user.sub,
              username,
            }),
          }
        );

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
        350
      );
    }
    return false;
  };

  useEffect(() => {
    if (containerRef.current && isUsernameSet) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [isChatVisible, isUsernameSet]);

  return (
    <div className="chat-panel" ref={containerRef}>
      <IoClose className="close-icon" onClick={() => setIsChatVisible(false)} />
      <h1 className="text-white text-xl">Chat</h1>
      {!user ? (
        <div className="google-auth">
          <GoogleAuth onSuccess={handleLoginSuccess} />
        </div>
      ) : (
        <div className="chat-content">
          {!isUsernameSet ? (
            <div className="mt-auto mb-[12px]">
              <h2 className="text-white text-center choose-username-text">Choose a Username</h2>
              <div className="username-input-container">
                <input
                  type="text"
                  className="text-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleUserNameKeyDown}
                />
                {/* <button onClick={handleUsernameSubmit} className="text-white">
                Sub
              </button> */}
                <IoSend onClick={handleUsernameSubmit} className="text-white" />
              </div>
            </div>
          ) : (
            <div className="chat-messages-container">
              <div className="chat-messages" ref={chatMessagesRef}>
                {messages.map((msg, index) => (
                  <div key={index} className="message-container text-white">
                    <div className="message-header">
                      <strong>{msg.user}</strong>
                      <span className="timestamp">{msg.timestamp}</span>
                    </div>
                    <div className="message-content">{msg.message}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input-container">
                <input
                  type="text"
                  className="text-input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Send a message"
                />
                {/* <button onClick={handleSendMessage} className="text-white">
                  Send
                </button> */}
                <IoSend onClick={handleSendMessage} className="text-white" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Chat;