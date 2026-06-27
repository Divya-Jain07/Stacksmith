import { useState, useEffect, useRef } from 'react'
import { Send, User, MessageSquare } from 'lucide-react'
import { chatApi } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'
import { useDialog } from '../../../context/DialogContext'
import { getSocket, disconnectSocket } from '../../../services/socket'

export default function MemberChatHub() {
  const { user } = useAuth()
  const { notify } = useDialog()
  
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMsg, setInputMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const fetchConversations = async () => {
    try {
      const data = await chatApi.getConversations()
      setConversations(data)
      if (data.length > 0 && !activeConv) {
        handleSelectConv(data[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and global socket listeners
  useEffect(() => {
    fetchConversations()
    const socket = getSocket()
    
    if (socket) {
      const handleAssigned = ({ conversation }) => {
        setConversations(prev => prev.map(c => c._id === conversation._id ? conversation : c))
      }
      const handleClosed = ({ conversationId }) => {
        setConversations(prev => prev.map(c => c._id === conversationId ? { ...c, status: 'Closed' } : c))
      }
      socket.on('conversation:assigned', handleAssigned)
      socket.on('conversation:closed', handleClosed)
      
      return () => {
        socket.off('conversation:assigned', handleAssigned)
        socket.off('conversation:closed', handleClosed)
      }
    }
  }, [])

  // Listeners that depend on activeConv
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !activeConv) return

    const handleNewMessage = ({ message }) => {
      if (message.conversationId === activeConv._id) {
        setMessages(prev => [...prev, message])
        scrollToBottom()
      }
    }

    socket.on('message:new', handleNewMessage)
    return () => socket.off('message:new', handleNewMessage)
  }, [activeConv])

  const handleSelectConv = async (conv) => {
    setActiveConv(conv)
    try {
      const msgs = await chatApi.getMessages(conv._id)
      setMessages(msgs)
      scrollToBottom()
      
      const socket = getSocket()
      if (socket) {
        socket.emit('conversation:join', { conversationId: conv._id })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleStartNewChat = () => {
    const socket = getSocket()
    if (!socket) return notify('Chat service is disconnected.', 'error')
    
    socket.emit('conversation:new', { text: null }, (res) => {
      if (res.error) return notify(res.error, 'error')
      fetchConversations() // Refresh list
      handleSelectConv(res.conversation)
    })
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputMsg.trim() || !activeConv) return
    
    const socket = getSocket()
    if (!socket) return notify('Chat service is disconnected.', 'error')

    setMsgLoading(true)
    socket.emit('message:send', { conversationId: activeConv._id, text: inputMsg.trim() }, (res) => {
      setMsgLoading(false)
      if (res.error) {
        notify(res.error, 'error')
      } else {
        setInputMsg('')
        // message:new event will handle appending it
      }
    })
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '1.5rem' }}>
      {/* Sidebar */}
      <div style={{ width: '300px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: 0, fontFamily: '"Averia Sans Libre", system-ui' }}>My Chats</h2>
          <button 
            onClick={handleStartNewChat}
            style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
          >
            + New Chat
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>No active chats. Start one!</div>
          ) : (
            conversations.map(c => (
              <div 
                key={c._id} 
                onClick={() => handleSelectConv(c)}
                style={{ 
                  padding: '1rem', borderBottom: '1px solid var(--border-color)', 
                  cursor: 'pointer', background: activeConv?._id === c._id ? 'var(--accent-gold-hover)' : 'transparent',
                  transition: '0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem'
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={18} color="var(--accent-gold)" />
                </div>
                <div>
                  <div style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600 }}>Support Chat</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Status: {c.status}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeConv ? (
          <>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Library Support</h3>
                <span style={{ fontSize: '0.85rem', color: activeConv.status === 'Open' ? '#FFA000' : activeConv.status === 'Assigned' ? '#81C784' : '#EF5350', background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block', marginTop: '0.25rem' }}>
                  {activeConv.status}
                </span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.length === 0 ? (
                <div style={{ margin: 'auto', color: 'var(--text-muted)', textAlign: 'center' }}>No messages yet. Send a message to start the conversation!</div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderRole === 'Member'
                  return (
                    <div key={msg._id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                      <div style={{ 
                        background: isMe ? 'var(--accent-gold)' : 'var(--bg-hover)',
                        color: isMe ? '#fff' : 'var(--text-main)',
                        padding: '0.8rem 1.25rem',
                        borderRadius: '12px',
                        borderBottomRightRadius: isMe ? 0 : '12px',
                        borderBottomLeftRadius: !isMe ? 0 : '12px',
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        wordBreak: 'break-word'
                      }}>
                        {msg.text || msg.message}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: isMe ? 'right' : 'left' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
              {activeConv.status === 'Closed' ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '0.5rem' }}>This conversation has been closed by the librarian.</div>
              ) : (
                <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem' }}>
                  <input
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder="Type your message..."
                    disabled={msgLoading}
                    style={{ flex: 1, padding: '0.8rem 1rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none' }}
                  />
                  <button type="submit" disabled={msgLoading || !inputMsg.trim()} style={{ background: 'var(--accent-gold)', color: '#fff', border: 'none', padding: '0 1.5rem', borderRadius: '8px', cursor: (msgLoading || !inputMsg.trim()) ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (msgLoading || !inputMsg.trim()) ? 0.7 : 1 }}>
                    <Send size={18} /> {msgLoading ? 'Sending...' : 'Send'}
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <h3>Select a conversation</h3>
            <p>Choose a chat from the sidebar to view messages.</p>
          </div>
        )}
      </div>
    </div>
  )
}
