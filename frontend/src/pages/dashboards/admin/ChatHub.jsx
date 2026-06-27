import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, CheckCircle, User } from 'lucide-react'
import { chatApi } from '../../../services/api'
import { getSocket } from '../../../services/socket'
import { useDialog } from '../../../context/DialogContext'

export default function ChatHub() {
  const [conversations, setConversations] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const { notify, confirm } = useDialog()
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const fetchConversations = async () => {
    try {
      const [assigned, unassigned] = await Promise.all([
        chatApi.getConversations(),
        chatApi.getUnassigned()
      ])
      const merged = [...assigned, ...unassigned]
      merged.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
      
      const unique = []
      const seen = new Set()
      for (const conv of merged) {
        if (!seen.has(conv._id)) {
          seen.add(conv._id)
          unique.push(conv)
        }
      }
      setConversations(unique)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
    const socket = getSocket()
    
    if (socket) {
      const handleCreated = ({ conversation }) => {
        setConversations(prev => [conversation, ...prev])
      }
      const handleAssigned = ({ conversation }) => {
        setConversations(prev => {
          const exists = prev.find(c => c._id === conversation._id)
          if (exists) return prev.map(c => c._id === conversation._id ? conversation : c)
          return [conversation, ...prev]
        })
      }
      const handleClosed = ({ conversationId }) => {
        setConversations(prev => prev.map(c => c._id === conversationId ? { ...c, status: 'Closed' } : c))
      }
      
      socket.on('conversation:created', handleCreated)
      socket.on('conversation:assigned', handleAssigned)
      socket.on('conversation:closed', handleClosed)
      
      return () => {
        socket.off('conversation:created', handleCreated)
        socket.off('conversation:assigned', handleAssigned)
        socket.off('conversation:closed', handleClosed)
      }
    }
  }, [activeChat])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !activeChat) return

    const handleNewMessage = ({ message }) => {
      if (message.conversationId === activeChat) {
        setMessages(prev => [...prev, message])
        scrollToBottom()
      }
    }

    socket.on('message:new', handleNewMessage)
    return () => socket.off('message:new', handleNewMessage)
  }, [activeChat])

  const loadChat = async (id) => {
    try {
      setActiveChat(id)
      const msgs = await chatApi.getMessages(id)
      setMessages(msgs)
      scrollToBottom()
      
      const socket = getSocket()
      if (socket) {
        socket.emit('conversation:join', { conversationId: id })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendMessage = async (e) => {
    e?.preventDefault()
    if (!input.trim() || !activeChat) return
    
    const socket = getSocket()
    if (!socket) return notify('Chat service is disconnected.', 'error')

    setMsgLoading(true)
    socket.emit('message:send', { conversationId: activeChat, text: input.trim() }, (res) => {
      setMsgLoading(false)
      if (res.error) {
        if (res.error.includes('assigned')) {
          socket.emit('conversation:assign', { conversationId: activeChat }, (assignRes) => {
            if (assignRes.error) return notify(assignRes.error, 'error')
            socket.emit('message:send', { conversationId: activeChat, text: input.trim() }, (retryRes) => {
              if (retryRes.error) notify(retryRes.error, 'error')
              else setInput('')
            })
          })
        } else {
          notify(res.error, 'error')
        }
      } else {
        setInput('')
      }
    })
  }

  const handleCloseChat = async () => {
    const confirmed = await confirm('Are you sure you want to close this chat?', 'Close Chat')
    if (!confirmed) return
    
    const socket = getSocket()
    if (!socket) return notify('Chat service is disconnected.', 'error')

    socket.emit('conversation:close', { conversationId: activeChat }, (res) => {
      if (res.error) notify(res.error, 'error')
      else fetchConversations()
    })
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const activeConvData = conversations.find(c => c._id === activeChat)

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 6rem)', gap: '1rem' }}>
      
      {/* Left Sidebar (Conversations) */}
      <div style={{ width: '300px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>Conversations</h3>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading chats...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No active conversations.</div>
          ) : (
            conversations.map(c => {
              const memberName = c.memberId?.name || 'Unknown Member';
              const memberCode = c.memberId?.memberCode ? `(${c.memberId.memberCode})` : '';
              return (
                <div 
                  key={c._id} 
                  onClick={() => loadChat(c._id)}
                  style={{ 
                    padding: '1rem', borderBottom: '1px solid var(--border-color)', 
                    cursor: 'pointer', background: activeChat === c._id ? 'var(--accent-gold-hover)' : 'transparent',
                    transition: '0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem'
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} color="var(--text-muted)" />
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500 }}>
                      {memberName} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{memberCode}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{c.status}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeChat && activeConvData ? (
          <>
            {/* Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>
                  {activeConvData.memberId?.name || 'Unknown Member'} {activeConvData.memberId?.memberCode && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({activeConvData.memberId.memberCode})</span>}
                </h3>
                <span style={{ fontSize: '0.85rem', color: activeConvData.status === 'Open' ? '#FFA000' : activeConvData.status === 'Assigned' ? '#81C784' : '#EF5350', background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block', marginTop: '0.25rem' }}>
                  {activeConvData.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleCloseChat} disabled={activeConvData.status === 'Closed'} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: activeConvData.status === 'Closed' ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
                  Close Chat
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>No messages in this conversation.</div>
              ) : (
                messages.map(m => {
                  const isMe = m.senderRole !== 'Member'
                  return (
                    <div key={m._id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                      <div style={{ 
                        background: isMe ? 'var(--accent-gold)' : 'var(--bg-hover)', 
                        color: isMe ? '#fff' : 'var(--text-main)', 
                        padding: '0.8rem 1.25rem', borderRadius: '12px', 
                        borderBottomRightRadius: isMe ? 0 : '12px',
                        borderBottomLeftRadius: !isMe ? 0 : '12px',
                        lineHeight: 1.5, fontSize: '0.95rem',
                        wordBreak: 'break-word'
                      }}>
                        {m.text || m.message}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: isMe ? 'right' : 'left' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" value={input} onChange={e => setInput(e.target.value)}
                  placeholder={activeConvData.status === 'Closed' ? "Conversation closed..." : "Type your message..."}
                  disabled={activeConvData.status === 'Closed' || msgLoading}
                  style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '0.95rem', outline: 'none' }}
                />
                <button 
                  type="submit" disabled={!input.trim() || activeConvData.status === 'Closed' || msgLoading}
                  style={{ background: 'var(--accent-gold)', color: '#fff', border: 'none', padding: '0 1.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, opacity: (!input.trim() || activeConvData.status === 'Closed' || msgLoading) ? 0.7 : 1 }}
                >
                  <Send size={18} /> {msgLoading ? 'Sending...' : 'Send'}
                </button>
              </form>
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
