
// -------------------------------------------
// Mini E-Commerce Store with Login & Signup (Fixed + Persistent Users)
// -------------------------------------------

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 4000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// File for saving users permanently
const USERS_FILE = path.join(__dirname, "users.json");

// Load users from file
function loadUsers() {
  if (fs.existsSync(USERS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    } catch (e) {
      console.error("Error reading users.json:", e);
      return [];
    }
  }
  return [];
}

// Save users to file
function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// -------------------------------------------
// In-memory Data
// -------------------------------------------
let users = loadUsers(); // { username, password }
let sessions = {}; // sessionId → username
let products = [
  { id: 1, name: "T-Shirt", price: 499, stock: 10 },
  { id: 2, name: "Shoes", price: 1499, stock: 6 },
  { id: 3, name: "Mug", price: 199, stock: 15 },
];
let carts = {}; // username → cart items

// Utility
function newSession(username) {
  const id = Math.random().toString(36).substring(2);
  sessions[id] = username;
  return id;
}
function getUser(req) {
  const sid = req.headers["x-session-id"];
  return sessions[sid];
}

// -------------------------------------------
// Auth Routes
// -------------------------------------------
app.post("/api/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing username or password" });

  if (users.find((u) => u.username === username))
    return res.status(400).json({ error: "User already exists" });

  users.push({ username, password });
  saveUsers();
  return res.json({ success: true, message: "Signup successful!" });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const sid = newSession(username);
  res.json({ success: true, sessionId: sid });
});

app.post("/api/logout", (req, res) => {
  const sid = req.headers["x-session-id"];
  if (sid) delete sessions[sid];
  res.json({ success: true });
});

// -------------------------------------------
// Store Routes (need login)
// -------------------------------------------
app.get("/api/products", (req, res) => {
  if (!getUser(req)) return res.status(403).json({ error: "Not logged in" });
  res.json(products);
});

app.post("/api/cart/add", (req, res) => {
  const username = getUser(req);
  if (!username) return res.status(403).json({ error: "Not logged in" });

  const { productId } = req.body;
  const product = products.find((p) => p.id === productId);
  if (!product || product.stock <= 0)
    return res.status(400).json({ error: "Product not available" });

  product.stock--;
  if (!carts[username]) carts[username] = [];
  const cart = carts[username];
  const existing = cart.find((c) => c.id === productId);
  if (existing) existing.qty++;
  else cart.push({ ...product, qty: 1 });
  res.json({ cart });
});

app.get("/api/cart", (req, res) => {
  const username = getUser(req);
  if (!username) return res.status(403).json({ error: "Not logged in" });
  res.json(carts[username] || []);
});

app.post("/api/checkout", (req, res) => {
  const username = getUser(req);
  if (!username) return res.status(403).json({ error: "Not logged in" });
  carts[username] = [];
  res.json({ success: true, message: "Order placed successfully!" });
});

app.get("/health", (_, res) => res.send("OK"));

// -------------------------------------------
// Frontend (HTML served directly)
// -------------------------------------------
app.get("/", (_, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Mini E-Commerce Store with Login</title>
  <style>
    body { font-family: Arial; margin: 40px; }
    h1 { color: #222; }
    .box { border: 1px solid #ccc; padding: 10px; margin: 5px; display: inline-block; }
    button { padding: 5px 10px; margin-top: 5px; }
    #loginForm, #signupForm { margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>🛍️ Mini E-Commerce Store</h1>

  <div id="auth">
    <div id="loginForm">
      <h3>Login</h3>
      <input id="loginUser" placeholder="Username"> 
      <input id="loginPass" placeholder="Password" type="password">
      <button onclick="login()">Login</button>
    </div>
    <div id="signupForm">
      <h3>Signup</h3>
      <input id="signupUser" placeholder="Username"> 
      <input id="signupPass" placeholder="Password" type="password">
      <button onclick="signup()">Signup</button>
    </div>
  </div>

  <div id="store" style="display:none;">
    <button onclick="logout()">Logout</button>
    <h2>Products</h2>
    <div id="products"></div>
    <h2>Your Cart</h2>
    <div id="cart"></div>
    <button onclick="checkout()">Checkout</button>
  </div>

<script>
let sessionId = localStorage.getItem('sessionId') || '';

async function signup() {
  const username = document.getElementById('signupUser').value;
  const password = document.getElementById('signupPass').value;
  const res = await fetch('/api/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  alert(data.message || data.error);
}

async function login() {
  const username = document.getElementById('loginUser').value;
  const password = document.getElementById('loginPass').value;
  const res = await fetch('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.sessionId) {
    sessionId = data.sessionId;
    localStorage.setItem('sessionId', sessionId);
    showStore();
  } else {
    alert(data.error);
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST', headers: { 'x-session-id': sessionId } });
  sessionId = '';
  localStorage.removeItem('sessionId');
  document.getElementById('store').style.display = 'none';
  document.getElementById('auth').style.display = 'block';
}

async function showStore() {
  document.getElementById('auth').style.display = 'none';
  document.getElementById('store').style.display = 'block';
  await loadProducts();
  await loadCart();
}

async function loadProducts() {
  const res = await fetch('/api/products', { headers: { 'x-session-id': sessionId } });
  const products = await res.json();
  const div = document.getElementById('products');
  div.innerHTML = products.map(p =>
    \`<div class="box">
       <strong>\${p.name}</strong><br>
       ₹\${p.price}<br>
       Stock: \${p.stock}<br>
       <button onclick="addToCart(\${p.id})" \${p.stock<=0?'disabled':''}>Add to Cart</button>
     </div>\`
  ).join('');
}

async function loadCart() {
  const res = await fetch('/api/cart', { headers: { 'x-session-id': sessionId } });
  const cart = await res.json();
  const div = document.getElementById('cart');
  if (cart.length === 0) div.innerHTML = '<em>Empty</em>';
  else div.innerHTML = cart.map(c =>
    \`<div class="box">\${c.name} × \${c.qty} = ₹\${c.price * c.qty}</div>\`
  ).join('');
}

async function addToCart(id) {
  await fetch('/api/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify({ productId: id })
  });
  await loadProducts();
  await loadCart();
}

async function checkout() {
  await fetch('/api/checkout', { method: 'POST', headers: { 'x-session-id': sessionId } });
  alert('Order placed!');
  loadProducts();
  loadCart();
}

// auto-login if session exists
if (sessionId) showStore();
</script>
</body>
</html>
  `);
});

// -------------------------------------------
app.listen(PORT, () =>
  console.log(`🛒 Mini E-Commerce running with login on http://localhost:${PORT}`)
);
