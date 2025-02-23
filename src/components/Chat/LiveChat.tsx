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
  handleNewMessage: () => void; // Add this prop for new message notification
  onActiveUsersUpdate: (count: number) => void;
}

let backendServer = process.env.REACT_APP_BACKEND_SERVER_IP as string;

const socket: Socket = io(`https://${backendServer}`);

const Chat: React.FC<ChatProps> = ({
  setIsChatVisible,
  isChatVisible,
  handleNewMessage,
  onActiveUsersUpdate,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [username, setUsername] = useState<string>("");
  const [isUsernameSet, setIsUsernameSet] = useState<boolean>(false);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<any>(null);
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

    socket.on("receive message", (data: Message) => {
      const userAtBottom = isUserAtBottom();
      setMessages((prevMessages) => [...prevMessages, data]);

      handleNewMessage(); // Notify parent component about the new message

      if (userAtBottom) {
        setTimeout(() => {
          scrollToBottom();
        }, 50);
      }
    });

    socket.on("active users", (data: { activeUsers: number }) => {
      onActiveUsersUpdate(data.activeUsers);
    });

    return () => {
      socket.off("receive message");
      socket.off("active users");
    };
  }, []);

  useEffect(() => {
    socket.on("load messages", (data) => {
      if (lastEvaluatedKey === null) {
        setMessages(data.messages);
        setLastEvaluatedKey(data.lastEvaluatedKey);
      } else {
        const { messages: newMessages, lastEvaluatedKey: newKey } = data;
        
        // Store the current scroll height before adding new messages
        const prevScrollHeight = chatMessagesRef.current?.scrollHeight || 0;
        
        setMessages((prevMessages) => [...newMessages, ...prevMessages]);
        setLastEvaluatedKey(newKey);
        
        // After the messages are updated, adjust scroll position
        setTimeout(() => {
          if (chatMessagesRef.current) {
            // Disable momentum scrolling
            (chatMessagesRef.current.style as any)['-webkit-overflow-scrolling'] = 'auto';
            
            // Calculate the new scroll position
            const newScrollHeight = chatMessagesRef.current.scrollHeight;
            const heightDifference = newScrollHeight - prevScrollHeight;
            chatMessagesRef.current.scrollTop = heightDifference;
            
            // Re-enable momentum scrolling
            (chatMessagesRef.current.style as any)['-webkit-overflow-scrolling'] = 'touch';
          }
        }, 0);
      }
    });

    return () => {
      socket.off("load messages");
    };
  }, [lastEvaluatedKey]);

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

  const handleScrollToTop = () => {
    if (chatMessagesRef.current?.scrollTop === 0 && lastEvaluatedKey) {
      socket.emit("load more messages", lastEvaluatedKey);
    }
  };

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.addEventListener("scroll", handleScrollToTop);
    }
    return () => {
      chatMessagesRef.current?.removeEventListener("scroll", handleScrollToTop);
    };
  }, [lastEvaluatedKey]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [isChatVisible]);

  const handleToggleChat = () => {
    setIsChatVisible(false);
    localStorage.setItem("hasClosedChat", "true");
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
                    id={`message-${index}`}
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
