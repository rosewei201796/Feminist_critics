import React, { useState } from 'react';
import './ChatBox.css';

function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dify API 配置
  const DIFY_API_URL = 'https://api.dify.ai/v1/workflows/run';
  const API_KEY = 'app-PlKTPoHz3KcHA8yz1sNTQ6FB';

  // 日志记录函数
  const logToStorage = (logData) => {
    const timestamp = new Date().toISOString();
    const log = {
      timestamp,
      ...logData
    };
    
    // 获取现有日志
    const existingLogs = JSON.parse(localStorage.getItem('chatLogs') || '[]');
    
    // 添加新日志
    existingLogs.push(log);
    
    // 保存回 localStorage
    localStorage.setItem('chatLogs', JSON.stringify(existingLogs));
    
    // 同时打印到控制台
    console.log('Chat Log:', log);
  };

  const sendMessageToDify = async (message) => {
    try {
      // 构建请求体
      const requestBody = {
        inputs: {
          user_input: message,
          message: ""
        },
        response_mode: "blocking",
        user: "user-" + Date.now(),
      };

      // 记录请求日志
      logToStorage({
        type: 'request',
        message,
        url: DIFY_API_URL,
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: requestBody
      });

      const response = await fetch(DIFY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      // 记录响应日志
      logToStorage({
        type: 'response',
        status: response.status,
        data
      });

      // 修改这里：正确获取嵌套的 text 字段
      return data.data.outputs.text || '没有收到有效的回复';
    } catch (error) {
      // 记录错误日志
      logToStorage({
        type: 'error',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      console.error('Error sending message to Dify:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputText.trim() === '' || isLoading) return;

    const userMessage = inputText.trim(); // 保存用户输入的消息

    // 添加用户消息到界面
    const newMessage = {
      text: userMessage,
      isUser: true,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // 发送消息到 Dify API 并获取响应
      const difyResponse = await sendMessageToDify(userMessage);  // 传递用户消息
      
      // 添加 AI 响应消息
      const responseMessage = {
        text: difyResponse,
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prevMessages => [...prevMessages, responseMessage]);
    } catch (error) {
      console.error('Error:', error);
      // 添加错误消息
      const errorMessage = {
        text: '抱歉，发生了错误，请稍后再试。',
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 添加查看日志的功能
  const handleViewLogs = () => {
    const logs = JSON.parse(localStorage.getItem('chatLogs') || '[]');
    console.log('All Chat Logs:', logs);
    
    // 可以选择下载日志文件
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button onClick={handleViewLogs} className="view-logs-button">
          下载日志
        </button>
      </div>
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.isUser ? 'user-message' : 'response-message'}`}
          >
            <div className="message-content">{message.text}</div>
            <div className="message-timestamp">{message.timestamp}</div>
          </div>
        ))}
        {isLoading && (
          <div className="message response-message">
            <div className="message-content">正在思考中...</div>
          </div>
        )}
      </div>
      
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="请输入消息..."
          className="chat-input"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={isLoading}
        >
          {isLoading ? '发送中...' : '发送'}
        </button>
      </form>
    </div>
  );
}

export default ChatBox; 