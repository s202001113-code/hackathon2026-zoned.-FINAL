"use client"


import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase/client'

const parentAccounts = [
  { name: 'Mia (Mom)', email: 'mia@zoned.app' },
  { name: 'Avery (Dad)', email: 'avery@zoned.app' },
]

const initialTasks = [
  { id: 'task-1', title: 'Finish Algebra', description: 'Complete chapter 6 review.', due: 'Today', completed: false, assignedBy: 'Mia' },
  { id: 'task-2', title: 'Read History Notes', description: 'Summarize the Civil War timeline.', due: 'Tomorrow', completed: false, assignedBy: 'Avery' },
]

const appLocks = [
  { name: 'Social Media', blocked: true, automatic: true },
  { name: 'Gaming', blocked: false, automatic: false },
  { name: 'Video Streaming', blocked: true, automatic: true },
  { name: 'Chat Apps', blocked: false, automatic: false },
]

const leaderboardData = [
  { name: 'Riley', points: 940 },
  { name: 'Jordan', points: 820 },
  { name: 'You', points: 620 },
  { name: 'Sam', points: 490 },
]

const friendList = [
  { id: 'friend-1', name: 'Elliot', status: 'Study streak 3 days' },
  { id: 'friend-2', name: 'Kai', status: 'Unlocked Cosmic Hoodie' },
  { id: 'friend-3', name: 'Nova', status: 'Waiting for challenge' },
]

const randomRewards = ['Neon Glasses', 'Lunar Hoodie', 'Spark Badge', 'Pixel Boots']

type Role = 'parent' | 'child'
type AuthView = 'signIn' | 'signUp'

type Friendship = {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted'
  friend_email?: string
}

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [userRole, setUserRole] = useState<Role | null>(null)
  const [authView, setAuthView] = useState<AuthView>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleSelection, setRoleSelection] = useState<Role>('child')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [studyActive, setStudyActive] = useState(false)
  const [idleMinutes, setIdleMinutes] = useState(0)
  const [points, setPoints] = useState(620)
  const [currency, setCurrency] = useState(140)
  const [decorations, setDecorations] = useState(['Starlight Cape', 'Study Crown'])
  const [mysteryBoxes, setMysteryBoxes] = useState(2)
  const [tasks, setTasks] = useState(initialTasks)
  const [locks, setLocks] = useState(appLocks)
  const [notifications, setNotifications] = useState<string[]>(['Welcome to zoned. Parent alert is ready.'])
  const [chatHistory, setChatHistory] = useState([
    { id: 'msg-1', sender: 'friend', text: 'Hey! Ready for the leaderboard challenge?', time: '10:12 AM' },
    { id: 'msg-2', sender: 'child', text: 'Yes! I just started a focus session.', time: '10:15 AM' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')

  // Friendship state
  const [friends, setFriends] = useState<Friendship[]>([])
  const [friendEmailInput, setFriendEmailInput] = useState('')

  const currentStatus = useMemo(
    () => (studyActive ? 'Studying now' : idleMinutes > 0 ? `Idle for ${idleMinutes} min` : 'Not studying'),
    [studyActive, idleMinutes],
  )

  useEffect(() => {
    let isMounted = true

    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!isMounted) return
      setSession(data.session)
      const role = data.session?.user?.user_metadata?.role as Role | undefined
      if (role) setUserRole(role)
    }

    fetchSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sessionData) => {
      setSession(sessionData)
      const role = sessionData?.user?.user_metadata?.role as Role | undefined
      if (role) setUserRole(role)
    })

    return () => {
      isMounted = false
      listener?.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      fetchFriends()
    }
  }, [session])

  const fetchFriends = async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)

    if (error) {
      console.error('Error fetching friends:', error)
      return
    }

    setFriends(data || [])
  }

  const sendFriendRequest = async () => {
    if (!friendEmailInput.trim()) return
    setLoading(true)

    // Note: In a real app, you'd probably call a Edge Function to find a user by email
    // or query a 'profiles' table. Since we don't have that yet, let's assume
    // we are just inserting a record with a placeholder for now, or 
    // if you have a profiles table, we'd search it.
    
    // For this demo, let's try to find the user in a hypothetical profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', friendEmailInput.trim())
      .single()

    if (profileError || !profile) {
      setMessage('User not found. Make sure the email is correct.')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('friendships').insert([
      {
        user_id: session.user.id,
        friend_id: profile.id,
        status: 'pending'
      }
    ])

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Friend request sent!')
      setFriendEmailInput('')
      fetchFriends()
    }
    setLoading(false)
  }

  const acceptFriendRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)

    if (error) {
      setMessage(error.message)
    } else {
      fetchFriends()
    }
  }

  const handleAuthError = (error: any, successMessage: string) => {
    setLoading(false)
    if (error) {
      setMessage(error.message ?? 'Unable to complete request')
      return false
    }
    setMessage(successMessage)
    return true
  }

  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: roleSelection,
        },
      },
    })

    if (!handleAuthError(error, 'Sign up successful — check email if confirmation is required.')) {
      return
    }

    setSession(data.session)
    setUserRole(roleSelection)
    setLoading(false)
  }

  const handleSignIn = async () => {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!handleAuthError(error, 'Signed in successfully.')) {
      return
    }

    const role = data.session?.user?.user_metadata?.role as Role | undefined
    if (role) {
      setUserRole(role)
    } else {
      setMessage('Sign in succeeded, but no role was found on your account.')
    }
    setSession(data.session)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUserRole(null)
    setMessage('You have signed out.')
  }

  if (!session) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1>zoned.</h1>
          <p>Focus with a Supabase login system and role-based parent/child flow.</p>

          <div className="auth-toggle">
            <button className={authView === 'signIn' ? 'active' : ''} onClick={() => setAuthView('signIn')}>
              Sign in
            </button>
            <button className={authView === 'signUp' ? 'active' : ''} onClick={() => setAuthView('signUp')}>
              Sign up
            </button>
          </div>

          <div className="auth-form">
            <label>
              Email
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
            </label>
            <label>
              Password
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" />
            </label>

            {authView === 'signUp' && (
              <fieldset className="role-fieldset">
                <legend>Choose your role</legend>
                <label>
                  <input type="radio" checked={roleSelection === 'child'} onChange={() => setRoleSelection('child')} />
                  Child
                </label>
                <label>
                  <input type="radio" checked={roleSelection === 'parent'} onChange={() => setRoleSelection('parent')} />
                  Parent
                </label>
              </fieldset>
            )}

            <button className="primary" onClick={authView === 'signIn' ? handleSignIn : handleSignUp} disabled={loading}>
              {loading ? 'Processing...' : authView === 'signIn' ? 'Sign in' : 'Create account'}
            </button>

            {message && <p className="auth-message">{message}</p>}
          </div>
        </div>
      </div>
    )
  }

  const currentRole = userRole ?? (session?.user?.user_metadata?.role as Role) ?? 'child'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>zoned.</h1>
          <p>Study focus, parent control, gamified momentum.</p>
        </div>
        <div className="role-info">
          <span>Logged in as</span>
          <strong>{session.user.email}</strong>
          <small>Role: {currentRole}</small>
          <button className="secondary" onClick={handleSignOut}>Sign out</button>
        </div>
        <section>
          <h2>Quick facts</h2>
          <div className="stat-block">
            <span>{currentStatus}</span>
            <small>{studyActive ? 'Focus mode active' : 'Waiting for study session'}</small>
          </div>
          <div className="stat-grid">
            <div>
              <strong>{points}</strong>
              <span>Points</span>
            </div>
            <div>
              <strong>{currency}</strong>
              <span>Currency</span>
            </div>
            <div>
              <strong>{mysteryBoxes}</strong>
              <span>Boxes</span>
            </div>
          </div>
        </section>
      </aside>

      <main>
        {currentRole === 'parent' ? (
          <>
            <section className="panel grid-2">
              <div className="card">
                <h2>Parent accounts</h2>
                <ul className="mini-list">
                  {parentAccounts.map(parent => (
                    <li key={parent.email}>
                      <strong>{parent.name}</strong>
                      <span>{parent.email}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h2>Study monitoring</h2>
                <p className={studyActive ? 'status active' : 'status idle'}>{currentStatus}</p>
                <button onClick={() => setStudyActive(!studyActive)}>{studyActive ? 'Stop study session' : 'Start study session'}</button>
                {studyActive && <button className="secondary" onClick={() => { const nextMinutes = idleMinutes + 5; setIdleMinutes(nextMinutes); if (nextMinutes >= 10) setNotifications(prev => [`Child has been idle for ${nextMinutes} minutes.`, ...prev].slice(0, 5)); }}>Simulate idle +5 min</button>}
              </div>
            </section>

            <section className="card">
              <h2>App controls</h2>
              <div className="lock-grid">
                {locks.map(lock => (
                  <div key={lock.name} className="lock-card">
                    <strong>{lock.name}</strong>
                    <p>{lock.blocked ? 'Blocked' : 'Allowed'}</p>
                    <button onClick={() => setLocks(prev => prev.map(item => item.name === lock.name ? { ...item, blocked: !item.blocked } : item))}>{lock.blocked ? 'Unlock' : 'Lock'}</button>
                    <label>
                      <input type="checkbox" checked={lock.automatic} onChange={() => setLocks(prev => prev.map(item => item.name === lock.name ? { ...item, automatic: !item.automatic } : item))} />
                      Auto-lock
                    </label>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel grid-2">
              <div className="card">
                <h2>Assigned tasks</h2>
                <ul className="task-list">
                  {tasks.map(task => (
                    <li key={task.id} className={task.completed ? 'done' : ''}>
                      <div>
                        <strong>{task.title}</strong>
                        <p>{task.description}</p>
                        <small>Due {task.due} · Assigned by {task.assignedBy}</small>
                      </div>
                      <button onClick={() => { setTasks(prev => prev.map(item => item.id === task.id ? { ...item, completed: !item.completed } : item)); setPoints(prev => prev + 15); setCurrency(prev => prev + 5); }}>{task.completed ? 'Undo' : 'Complete'}</button>
                    </li>
                  ))}
                </ul>
                <div className="new-task">
                  <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="New task title" />
                  <input value={newTaskDescription} onChange={e => setNewTaskDescription(e.target.value)} placeholder="Description (optional)" />
                  <button onClick={() => { if (!newTaskTitle.trim()) return; const newTask = { id: `task-${Date.now()}`, title: newTaskTitle.trim(), description: newTaskDescription.trim() || 'Assigned by parent', due: 'Today', completed: false, assignedBy: 'Parent' }; setTasks(prev => [newTask, ...prev]); setNewTaskTitle(''); setNewTaskDescription(''); setNotifications(prev => ['New task assigned to child.', ...prev].slice(0, 5)); }}>Assign task</button>
                </div>
              </div>
              <div className="card">
                <h2>Notifications</h2>
                <ul className="mini-list">
                  {notifications.map((note, index) => (
                    <li key={`${note}-${index}`}>{note}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="card">
              <h2>Leaderboard</h2>
              <ol className="leaderboard">
                {leaderboardData.map(player => (
                  <li key={player.name}>
                    <span>{player.name}</span>
                    <strong>{player.points}</strong>
                  </li>
                ))}
              </ol>
            </section>
          </>
        ) : (
          <>
            <section className="panel grid-2">
              <div className="card highlight">
                <h2>Study console</h2>
                <p className={studyActive ? 'status active' : 'status idle'}>{currentStatus}</p>
                <button onClick={() => setStudyActive(!studyActive)}>{studyActive ? 'Pause focus' : 'Begin focus'}</button>
                <div className="inline-blocks">
                  <span>{points} pts</span>
                  <span>{currency} coins</span>
                </div>
                <button className="secondary" onClick={() => { if (currency < 20 || mysteryBoxes === 0) return; const reward = randomRewards[Math.floor(Math.random() * randomRewards.length)]; setCurrency(prev => prev - 20); setMysteryBoxes(prev => prev - 1); setDecorations(prev => [...prev, reward]); setPoints(prev => prev + 40); setNotifications(prev => [`Mystery box opened: ${reward}!`, ...prev].slice(0, 5)); }} disabled={currency < 20 || mysteryBoxes === 0}>
                  Open mystery box (-20 coins)
                </button>
                <p className="caption">Decorations: {decorations.join(', ')}</p>
              </div>
              <div className="card">
                <h2>Friend zone</h2>
                <div className="friend-search">
                  <input 
                    value={friendEmailInput} 
                    onChange={e => setFriendEmailInput(e.target.value)} 
                    placeholder="Friend's email" 
                  />
                  <button onClick={sendFriendRequest} disabled={loading}>Add</button>
                </div>
                
                <ul className="mini-list">
                  {friends.length === 0 && <li className="caption">No friends yet.</li>}
                  {friends.map(friendship => {
                    const isIncoming = friendship.friend_id === session.user.id
                    const isPending = friendship.status === 'pending'
                    const otherUser = isIncoming ? 'Someone' : (friendship.friend_email || 'User')
                    
                    return (
                      <li key={friendship.id}>
                        <div>
                          <strong>{otherUser}</strong>
                          <span>{isPending ? (isIncoming ? 'Invited you' : 'Pending...') : 'Friend'}</span>
                        </div>
                        {isIncoming && isPending && (
                          <button onClick={() => acceptFriendRequest(friendship.id)}>Accept</button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </section>

            <section className="card">
              <h2>My tasks</h2>
              <ul className="task-list">
                {tasks.map(task => (
                  <li key={task.id} className={task.completed ? 'done' : ''}>
                    <div>
                      <strong>{task.title}</strong>
                      <p>{task.description}</p>
                      <small>Due {task.due} · Assigned by {task.assignedBy}</small>
                    </div>
                    <button onClick={() => { setTasks(prev => prev.map(item => item.id === task.id ? { ...item, completed: !item.completed } : item)); setPoints(prev => prev + 15); setCurrency(prev => prev + 5); }}>{task.completed ? 'Undo' : 'Done'}</button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel grid-2">
              <div className="card">
                <h2>Leaderboard</h2>
                <ol className="leaderboard">
                  {leaderboardData.map(player => (
                    <li key={player.name} className={player.name === 'You' ? 'you' : ''}>
                      <span>{player.name}</span>
                      <strong>{player.points}</strong>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="card">
                <h2>Messages</h2>
                <div className="chat-box">
                  {chatHistory.map(message => (
                    <div key={message.id} className={`chat-message ${message.sender}`}>
                      <p>{message.text}</p>
                      <small>{message.time}</small>
                    </div>
                  ))}
                </div>
                <div className="chat-input">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Send a message" />
                  <button onClick={() => { const trimmed = chatInput.trim(); if (!trimmed) return; setChatHistory(prev => [{ id: `msg-${Date.now()}`, sender: 'child', text: trimmed, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev]); setChatInput(''); }}>Send</button>
                </div>
              </div>
            </section>

            <section className="card">
              <h2>Study rewards</h2>
              <p>Use coins to unlock cosmetics, buy extra screentime, or open mystery boxes.</p>
              <div className="reward-grid">
                <div>
                  <strong>{decorations.length}</strong>
                  <span>Cosmetics</span>
                </div>
                <div>
                  <strong>{mysteryBoxes}</strong>
                  <span>Mystery boxes</span>
                </div>
                <div>
                  <strong>{studyActive ? 'Active' : 'Idle'}</strong>
                  <span>Focus mode</span>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
