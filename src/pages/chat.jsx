// @ts-ignore;
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore;
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
// @ts-ignore;
import { Send, Bot, User, Calculator, BookOpen, History, Menu, X, Sparkles, MessageCircle, Loader2 } from 'lucide-react';

export default function ChatPage(props) {
  const {
    $w
  } = props;
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const messagesEndRef = useRef(null);
  const username = $w.page.dataset.params?.username || '用户';
  useEffect(() => {
    loadUser();
    loadConversations();
  }, []);
  useEffect(() => {
    if (currentConversationId) {
      loadMessages();
    }
  }, [currentConversationId]);
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const loadUser = () => {
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  };
  const loadConversations = async () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) {
        console.error('用户未登录');
        return;
      }
      const userData = JSON.parse(user);
      const response = await $w.cloud.callDataSource({
        dataSourceName: 'conversation',
        methodName: 'wedaGetRecordsV2',
        params: {
          filter: {
            where: {
              userId: {
                $eq: userData.id
              }
            }
          },
          select: {
            $master: true
          },
          orderBy: [{
            createdAt: 'desc'
          }]
        }
      });
      if (response.records) {
        setConversations(response.records);
        if (response.records.length > 0 && !currentConversationId) {
          setCurrentConversationId(response.records[0]._id);
        } else if (response.records.length === 0) {
          createNewConversation();
        }
      }
    } catch (error) {
      console.error('加载对话列表失败:', error);
    }
  };
  const createNewConversation = async () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) {
        console.error('用户未登录');
        return;
      }
      const userData = JSON.parse(user);
      const response = await $w.cloud.callDataSource({
        dataSourceName: 'conversation',
        methodName: 'wedaCreateV2',
        params: {
          data: {
            userId: userData.id,
            title: '新对话',
            messages: [],
            lastMessage: '',
            createdAt: Date.now()
          }
        }
      });
      if (response.id) {
        setCurrentConversationId(response.id);
        await loadConversations();
      }
    } catch (error) {
      console.error('创建新对话失败:', error);
    }
  };
  const loadMessages = async () => {
    try {
      const response = await $w.cloud.callDataSource({
        dataSourceName: 'conversation',
        methodName: 'wedaGetItemV2',
        params: {
          filter: {
            where: {
              _id: {
                $eq: currentConversationId
              }
            }
          },
          select: {
            $master: true
          }
        }
      });
      if (response) {
        setMessages(response.messages || []);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  };
  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentConversationId) {
      console.error('消息或对话ID为空');
      return;
    }
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);
    try {
      // 先更新对话消息
      await $w.cloud.callDataSource({
        dataSourceName: 'conversation',
        methodName: 'wedaUpdateV2',
        params: {
          data: {
            messages: newMessages,
            lastMessage: inputMessage
          },
          filter: {
            where: {
              _id: {
                $eq: currentConversationId
              }
            }
          }
        }
      });

      // 调用云函数获取AI回复
      const aiReply = await callDeepSeekAPI(inputMessage, newMessages);
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toISOString()
      };
      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);

      // 更新对话消息和标题
      const title = inputMessage.length > 10 ? inputMessage.substring(0, 10) + '...' : inputMessage;
      await $w.cloud.callDataSource({
        dataSourceName: 'conversation',
        methodName: 'wedaUpdateV2',
        params: {
          data: {
            messages: finalMessages,
            lastMessage: aiReply,
            title: title
          },
          filter: {
            where: {
              _id: {
                $eq: currentConversationId
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，我暂时无法回复。请稍后再试。',
        timestamp: new Date().toISOString()
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  const callDeepSeekAPI = async (message, conversationHistory) => {
    try {
      // 构建对话上下文
      const messages = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 调用云函数来访问DeepSeek API
      const response = await $w.cloud.callFunction({
        name: 'deepseek-ai-chat',
        data: {
          message: message,
          messages: [...messages, {
            role: 'user',
            content: message
          }],
          model: 'deepseek-chat',
          temperature: 0.7,
          max_tokens: 1000,
          stream: false
        }
      });
      console.log('DeepSeek API响应:', response);
      if (response.result && response.result.success) {
        return response.result.reply || '抱歉，AI没有返回有效回复';
      } else {
        console.error('API调用失败:', response.result?.error || '未知错误');
        return response.result?.error || '抱歉，AI服务暂时不可用';
      }
    } catch (error) {
      console.error('DeepSeek API调用失败:', error);
      return '抱歉，我暂时无法连接到AI服务。请稍后再试。';
    }
  };
  const startQuiz = () => {
    $w.utils.navigateTo({
      pageId: 'quiz',
      params: {
        username: username
      }
    });
  };
  const viewHistory = () => {
    $w.utils.navigateTo({
      pageId: 'history',
      params: {
        username: username
      }
    });
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  const switchConversation = conversationId => {
    setCurrentConversationId(conversationId);
    setSidebarOpen(false);
  };
  const formatTime = timestamp => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 侧边栏 */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800/90 backdrop-blur-xl border-r border-slate-700 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">对话列表</h2>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <Button onClick={createNewConversation} className="w-full mb-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
            <MessageCircle className="w-4 h-4 mr-2" />
            新建对话
          </Button>

          <div className="space-y-2">
            {conversations.map(conv => <div key={conv._id} onClick={() => switchConversation(conv._id)} className={`p-3 rounded-lg cursor-pointer transition-colors ${currentConversationId === conv._id ? 'bg-indigo-600/20 border border-indigo-500/50' : 'hover:bg-slate-700/50'}`}>
                <div className="text-sm text-white font-medium truncate">{conv.title || '新对话'}</div>
                <div className="text-xs text-slate-400 truncate mt-1">{conv.lastMessage || '暂无消息'}</div>
              </div>)}
          </div>
        </div>
      </div>

      {/* 遮罩层 */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 头部 */}
        <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white mr-3">
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-semibold">DeepSeek AI助手</h1>
                <p className="text-xs text-green-400">在线</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={startQuiz} className="text-slate-300 hover:text-white">
              <BookOpen className="w-4 h-4 mr-1" />
              答题
            </Button>
            <Button variant="ghost" size="sm" onClick={viewHistory} className="text-slate-300 hover:text-white">
              <History className="w-4 h-4 mr-1" />
              历史
            </Button>
          </div>
        </header>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Bot className="w-16 h-16 mb-4 text-slate-600" />
              <p className="text-lg mb-2">你好，{username}！</p>
              <p className="text-sm text-center max-w-md">
                我是基于DeepSeek的智能助手，可以为您提供更智能、更自然的对话体验。
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button onClick={() => setInputMessage('你好，请介绍一下自己')} variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始对话
                </Button>
                <Button onClick={startQuiz} variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700">
                  <BookOpen className="w-4 h-4 mr-2" />
                  开始答题
                </Button>
              </div>
            </div> : messages.map(message => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-2 max-w-xs md:max-w-md lg:max-w-lg ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-slate-600 to-slate-700'}`}>
                    {message.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                  </div>
                  <div className={`rounded-2xl px-4 py-2 ${message.role === 'user' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-none' : 'bg-slate-700/50 backdrop-blur-sm text-slate-200 rounded-tl-none'}`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatTime(message.timestamp)}</p>
                  </div>
                </div>
              </div>)}
          {isLoading && <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-slate-700/50 backdrop-blur-sm text-slate-200 rounded-2xl rounded-tl-none px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{
                  animationDelay: '0ms'
                }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{
                  animationDelay: '150ms'
                }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{
                  animationDelay: '300ms'
                }} />
                  </div>
                </div>
              </div>
            </div>}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="bg-slate-800/50 backdrop-blur-sm border-t border-slate-700 p-4">
          <div className="flex items-center space-x-3">
            <Input type="text" value={inputMessage} onChange={e => setInputMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="输入消息..." className="flex-1 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500" disabled={isLoading} />
            <Button onClick={sendMessage} disabled={!inputMessage.trim() || isLoading} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>;
}