# RaceCard Video Script - Botpress Interview (Lobby Feature Deep Dive)
**Target Duration: 3-4 minutes**

---

## PART 1: INTRODUCTION (0:00-0:20) — 20 seconds

**[Face on camera, casual but professional]**

"Hi, I'm [Your Name]. Today I want to walk you through a specific feature I built in RaceCard: **the lobby system**. 

Lobbies are the core of how multiplayer games work. Multiple players need to join the same game session, see each other in real-time, and stay synchronized. What's interesting here is how we use WebSockets for instant communication, store lobby state in-memory for speed, and handle the complexity of keeping 10+ players in sync without lag."

---

## PART 2: THE PROBLEM & ARCHITECTURE (0:20-0:40) — 20 seconds

**[Screen share - show lobby UI briefly]**

"The problem: How do you let multiple players join a temporary game session and keep everyone's view of the lobby synchronized without each player polling the server every millisecond?

**Traditional approach (polling):**
- Client: 'Any updates?' → Server: 'No'
- Client: 'Any updates?' → Server: 'No'
- [repeat 100 times/minute]

**Our approach (WebSockets + Server Push):**
- Player joins → Server broadcasts to all connected players in that lobby instantly
- All real-time updates happen via WebSocket events
- No polling, no waste

This is what we're diving into today."

---

## PART 3: CODE WALKTHROUGH (0:40-3:20) — 160 seconds

**[Screen share - navigate through code files. Speak clearly and naturally]**

### **File 1: Backend Server Setup & WebSocket Communication**
**`backend/src/server.ts`**

**Talking points:**

"Let's start with the server. This is where Socket.io—WebSocket library—is initialized.

**Key setup:**
- Express server is created
- Socket.io is attached to listen for WebSocket connections
- When a player visits the app, they establish a WebSocket connection—a persistent, bidirectional tunnel with the server

**Look at the connection handler:**
```typescript
io.on('connection', (socket) => {
  // socket represents ONE connected player
  // We can emit events TO this player
  // We can listen for events FROM this player
});
```

**Here's the key insight:** Instead of making HTTP requests (request → response → done), WebSockets keep the connection *open*. The server can push data to the client instantly. The client can send messages without waiting for a response.

**Joining a lobby:**
When a player enters a lobby code, we do:
```typescript
socket.join('lobby-' + code);
```

This adds their socket to a Socket.io 'room'—think of it as a broadcast channel. Every message we emit to this room reaches all players in that lobby.

**Example flow:**
1. Player A joins lobby 'XYZ123' → socket joins room 'lobby-XYZ123'
2. Player B joins lobby 'XYZ123' → socket joins room 'lobby-XYZ123'
3. Server broadcasts 'playerJoined' event to room 'lobby-XYZ123'
4. Both Player A and B receive the update instantly via WebSocket

This is **asynchronous non-blocking communication**. While one player's event is being processed, we're not blocking other lobbies."

---

### **File 2: Lobby Manager & In-Memory State**
**`backend/src/lobbyManager.ts`**

**Talking points:**

"This is where lobbies are actually stored and managed. Here's the critical design decision:

**We store lobbies in an in-memory JavaScript Map:**
```typescript
const lobbies = new Map<string, Lobby>();
```

**Why not a database or Redis?**

Lobbies are **temporary**. They live for 5-10 minutes during active gameplay, then disappear. We don't need to persist them. A Map gives us:
- **Speed**: Microsecond lookups vs milliseconds with Redis
- **Simplicity**: No external dependencies, easier to debug
- **Perfect for MVP**: This scales easily to 100+ concurrent lobbies on a single server

**Operations on lobbies:**
```typescript
// Create a lobby
lobbies.set(code, newLobby);

// Find a lobby
const lobby = lobbies.get(code);

// Add a player to a lobby
lobby.players.push(playerSocket);

// Clean up when lobby ends
lobbies.delete(code);
```

**However—and this matters—we designed with scalability in mind:**

If we grew to thousands of concurrent games, we'd swap this to **Redis** without changing application logic. We'd:
1. Replace `lobbies.get(code)` with `await redis.get(code)`
2. Replace `lobbies.set(code, ...)` with `await redis.set(code, ..., EX: 600)` (10-minute expiration)
3. Multi-server setup would share the same Redis instance

**This shows pragmatic engineering**: Solve today's problem simply, but don't box yourself into a corner."

---

### **File 3: Game Manager & Broadcasting Updates**
**`backend/src/gameManager.ts`**

**Talking points:**

"When a player joins the lobby, we need to:
1. Add them to the in-memory Map
2. **Broadcast** to all other players that someone joined
3. Send the new player the current lobby state

**See how we use WebSocket rooms here:**

When someone joins:
```typescript
io.to('lobby-' + code).emit('playerJoined', {
  playerName: socket.data.playerName,
  playerCount: lobby.players.length,
});
```

`io.to('lobby-' + code)` targets everyone in that room—all connected players for that lobby code.

**The asynchronous pattern:**
- Player A's join event is processed → broadcast happens
- While broadcast is in flight over WebSockets, Player C in a different lobby isn't blocked
- Each broadcast is independent

**Real-time synchronization:**
Every state change—player joins, player leaves, game starts, timer updates—is broadcast instantly. Players see the exact same lobby view with sub-100ms latency.

**Problem we solved:** Connection drops

When a player disconnects, we need to:
1. Remove them from the in-memory lobby
2. Broadcast the new player count to remaining players
3. Delete the lobby if empty

```typescript
socket.on('disconnect', () => {
  const lobby = getLobbyBySocket(socket);
  if (lobby) {
    lobby.players = lobby.players.filter(p => p.id !== socket.id);
    io.to('lobby-' + lobby.code).emit('playerLeft', {
      playerCount: lobby.players.length,
    });
    if (lobby.players.length === 0) {
      lobbies.delete(lobby.code);
    }
  }
});
```

This is **synchronous cleanup of async events**—when a WebSocket disconnects, we handle cleanup immediately."

---

### **File 4: Frontend Hook for Real-time Lobby Sync**
**`frontend/src/hooks/useLobbyData.ts`**

**Talking points:**

"On the frontend, we need to **listen** for WebSocket events from the server and update React state. This is where custom React hooks shine.

**The pattern:**
```typescript
useEffect(() => {
  // Subscribe to 'playerJoined' event
  socket.on('playerJoined', (data) => {
    setLobbyData(prev => ({
      ...prev,
      playerCount: data.playerCount,
    }));
  });

  // Cleanup: unsubscribe when component unmounts
  return () => socket.off('playerJoined');
}, []);
```

**What's happening:**
1. Component mounts → WebSocket listener is registered
2. Server sends `playerJoined` event → component re-renders with new data
3. Component unmounts → listener is removed (no memory leaks)

**Why this is clean:**
- Socket.io subscriptions are encapsulated in a hook
- Multiple components can use `useLobbyData` without duplicating logic
- Unsubscribe is automatic—prevents event listeners from piling up

**Real-time flow example:**
1. Player A loads the lobby page → useLobbyData subscribes to `playerJoined`, `playerLeft`, `gameStarted`
2. Player B joins the lobby
3. Server sends `playerJoined` event to all connected players
4. Player A's component receives the event → state updates → React re-renders
5. Player A sees Player B in the lobby instantly

**Contrast with polling:**
If we polled: `setInterval(() => fetch('/lobby/' + code), 500ms)`
- Wasted bandwidth (99% of responses are "no change")
- 500ms delay between when Player B joins and Player A sees it
- Server gets hammered with requests

With WebSockets:
- Updates only when data changes
- Instant delivery
- Scalable—one server handles thousands of players"

---

## PART 5: KEY DESIGN DECISIONS (3:20-3:45) — 25 seconds

**[Face on camera]**

"Three design decisions I'm proud of:

### **1. In-Memory Storage for Transient Data**
Lobbies only exist during gameplay. We don't persist them. In-memory Map = fast, simple, zero overhead. Clear path to Redis if we scale.

### **2. WebSockets, Not Polling**
Real-time updates via server push. Players see each other join/leave instantly. No wasted requests. This is the pattern Botpress probably uses for real-time chat.

### **3. Async Event Handling**
The entire system is non-blocking. One lobby's events don't block another's. Node.js can handle hundreds of concurrent lobbies on a single process.

These decisions show pragmatic thinking: choose the right tool for the problem, not the fanciest one."

---

## PART 6: SCALING STRATEGY (3:45-3:55) — 10 seconds

**[Face on camera]**

"**If this grows:**
- Today: Single Node.js server, in-memory lobbies, handles 100+ concurrent games
- Tomorrow: Switch lobbies from Map → Redis with TTL (auto-cleanup)
- Scale to multiple servers: Load balancer + sticky sessions (Socket.io ensures reconnects go to same server)

**Code barely changes**—we abstract the storage layer. That's good architecture."

---

## PART 7: CLOSING & RELEVANCE TO BOTPRESS (3:55-4:00) — 5 seconds

**[Face on camera]**

"Real-time multiplayer is hard. WebSockets, in-memory state management, async event handling—these aren't just nice-to-haves, they're the foundations of responsive, scalable systems.

Botpress does this with real-time chat. I did it with lobbies. The patterns are the same.

Thanks for the opportunity!"

---

## KEY TECHNICAL CONCEPTS EMPHASIZED:

✅ **WebSockets (Socket.io)** — Persistent bidirectional connection, server push events  
✅ **Real-time Broadcasting** — `io.to(room).emit()` for instant updates to all players  
✅ **In-Memory State with Maps** — Fast, simple, designed with Redis migration path  
✅ **Asynchronous Event Handling** — Non-blocking architecture  
✅ **React Hooks for Socket.io** — Clean subscription/unsubscription patterns  
✅ **Rooms/Namespaces** — Targeting specific lobbies with broadcasts  
✅ **Problem-Solving** — Handled connection drops gracefully  
✅ **Scalability Thinking** — MVP-appropriate choices, clear upgrade path  

---

## PRODUCTION TIPS:

- **Zoom in on code** (150-200% for readability)
- **Highlight with cursor** as you explain each section
- **Pause between files** to let viewers follow
- **Keep voice energetic** when explaining WebSocket benefits (not boring!)
- **Show the frontend/backend connection**: When you switch from backend to frontend code, maybe show a diagram or clarify "Now we're on the client side"
- **Demo in browser dev tools** if possible: Show Network tab to see WebSocket frames being sent/received

---

## WHAT THIS DEMONSTRATES TO BOTPRESS:

1. **Real-time Architecture**: You understand how to build systems where multiple clients stay synchronized
2. **WebSocket Proficiency**: Socket.io knowledge + understanding when to use it vs HTTP
3. **Async-First Thinking**: Non-blocking architecture for scalability
4. **Smart Trade-offs**: In-memory is fast now, Redis is flexible later
5. **React + Node.js**: Exact stack they use

---

**Good luck! This focused narrative is much easier to deliver in 4 minutes. 🚀**
