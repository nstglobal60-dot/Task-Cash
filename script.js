// ======== Global Variables ========
let taskList = [];
let balance = parseFloat(localStorage.getItem("balance")) || 0;
let tasksCompleted = parseInt(localStorage.getItem("tasksCompleted")) || 0;
let completedTaskTitles = JSON.parse(localStorage.getItem("completedTaskTitles")) || [];
let usernameStored = localStorage.getItem("username") || "";

// ======== DOMContentLoaded ========
document.addEventListener("DOMContentLoaded", () => {
  if(usernameStored) autoLogin();
  loadSavedTasks();
  displayTasks();
  displayRecommendedTasks();
  updateWalletUI();
  loadRealTasks(); // Fetch simulated real-world tasks
  registerServiceWorker();
  loadPayPal();
});

// ======== Login ========
function loginUser() {
  const username = document.getElementById("username-input").value.trim();
  if(!username) return alert("Please enter your name.");
  localStorage.setItem("username", username);
  usernameStored = username;
  autoLogin();
}
function autoLogin() {
  document.getElementById("username").innerText = usernameStored;
  document.getElementById("login").style.display = "none";
  document.querySelector("header").style.display = "flex";
  document.getElementById("tasks").style.display = "block";
  document.getElementById("wallet").style.display = "block";
  document.getElementById("profile").style.display = "block";
}

// ======== Task Management ========
function createTask() {
  const title = document.getElementById("task-title").value.trim();
  const reward = parseFloat(document.getElementById("task-reward").value);
  if(!title || isNaN(reward) || reward <=0) return alert("Enter valid title & reward.");
  const newTask = { title, reward };
  taskList.push(newTask);
  saveTasks();
  displayTasks();
  notify(`New Task Added: "${title}" worth $${reward.toFixed(2)}`);
  document.getElementById("task-title").value = "";
  document.getElementById("task-reward").value = "";
}
function saveTasks() { localStorage.setItem("taskList", JSON.stringify(taskList)); }
function loadSavedTasks() {
  const savedTasks = JSON.parse(localStorage.getItem("taskList"));
  if(savedTasks) taskList = savedTasks;
}
function displayTasks() {
  const container = document.querySelector(".task-list");
  if(!container) return;
  container.innerHTML = "";
  taskList.forEach((task,index)=>{
    const taskDiv = document.createElement("div");
    taskDiv.classList.add("task");
    taskDiv.style.opacity = 0;
    taskDiv.innerHTML = `<h3>${task.title}</h3><p>Reward: $${task.reward}</p>
    <button onclick="completeTask(${index})">Complete Task</button>`;
    container.appendChild(taskDiv);
    setTimeout(()=> taskDiv.style.opacity = 1, index*100);
  });
}

// ======== Complete Task ========
function completeTask(index) {
  const task = taskList[index];
  balance += parseFloat(task.reward);
  tasksCompleted++;
  completedTaskTitles.push(task.title);
  localStorage.setItem("balance", balance);
  localStorage.setItem("tasksCompleted", tasksCompleted);
  localStorage.setItem("completedTaskTitles", JSON.stringify(completedTaskTitles));
  updateWalletUI();
  displayRecommendedTasks();
  alert(`Task completed! You earned $${task.reward}`);
}

// ======== Wallet & Profile ========
function updateWalletUI() {
  document.getElementById("balance").innerText = balance.toFixed(2);
  document.getElementById("tasks-completed").innerText = tasksCompleted;
  document.getElementById("withdraw-balance").innerText = balance.toFixed(2);
  updateLeaderboard();
  updateBadges();
  updateProgressBar();
}

// ======== Leaderboard ========
function updateLeaderboard() {
  const leaderboardList = document.getElementById("leaderboard-list");
  if(!leaderboardList) return;
  const users = JSON.parse(localStorage.getItem("users")) || [];
  if(!users.some(u=>u.username===usernameStored)) users.push({username: usernameStored, balance});
  users.sort((a,b)=>b.balance - a.balance);
  localStorage.setItem("users", JSON.stringify(users));
  leaderboardList.innerHTML = "";
  users.forEach(u=>{
    const li = document.createElement("li");
    li.innerText = `${u.username}: $${u.balance.toFixed(2)}`;
    leaderboardList.appendChild(li);
  });
}

// ======== Notifications ========
function notify(message) {
  const notificationList = document.getElementById("notification-list");
  if(notificationList){
    const li = document.createElement("li");
    li.innerText = message;
    li.style.opacity = 0;
    notificationList.prepend(li);
    setTimeout(()=>li.style.opacity=1,50);
  }
  if("Notification" in window && Notification.permission==="granted") new Notification(message);
  else if(Notification.permission!=="denied") Notification.requestPermission();
}

// ======== Gamification ========
const badges = [
  { name: "First Task", condition: t=>t>=1 },
  { name: "Task Master", condition: t=>t>=5 },
  { name: "Pro Earner", condition: t=>t>=10 }
];
function updateBadges() {
  const badgeList = document.getElementById("badge-list");
  if(!badgeList) return;
  badgeList.innerHTML="";
  badges.forEach(b=>{
    if(b.condition(tasksCompleted)){
      const li=document.createElement("li");
      li.innerText=b.name;
      li.style.opacity=1;
      badgeList.appendChild(li);
      speak(`Badge Unlocked: ${b.name}`);
    }
  });
}
function updateProgressBar(){
  const progress = Math.min((tasksCompleted/10)*100,100);
  const bar = document.getElementById("progress-bar");
  if(bar) bar.style.width = progress+"%";
}
function speak(message){
  const synth=window.speechSynthesis;
  const utterThis=new SpeechSynthesisUtterance(message);
  synth.speak(utterThis);
}

// ======== AI Recommendations ========
function displayRecommendedTasks(){
  const container=document.getElementById("recommended-tasks");
  if(!container) return;
  container.innerHTML="";
  const avgReward = completedTaskTitles.length
    ? taskList.filter(t=>completedTaskTitles.includes(t.title)).reduce((sum,t)=>sum+parseFloat(t.reward),0)/completedTaskTitles.length
    : 1;
  const recommended = taskList.filter(t=>!completedTaskTitles.includes(t.title) && parseFloat(t.reward)>=avgReward);
  recommended.forEach((task,index)=>{
    const taskDiv = document.createElement("div");
    taskDiv.classList.add("task");
    taskDiv.innerHTML=`<h3>${task.title}</h3><p>Reward: $${task.reward}</p>
    <button onclick="completeTask(${taskList.indexOf(task)})">Complete Task</button>`;
    container.appendChild(taskDiv);
  });
}

// ======== Simulated Real Tasks ========
async function loadRealTasks(){
  try{
    const response = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5');
    const data = await response.json();
    data.forEach(item=>{
      const task = { title: item.title, reward:(Math.random()*2+0.5).toFixed(2) };
      taskList.push(task);
    });
    saveTasks();
    displayTasks();
    notify("New real-world tasks loaded!");
  }catch(e){console.error(e);}
}

// ======== PWA Service Worker ========
function registerServiceWorker(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').then(reg=>console.log("SW Registered")).catch(err=>console.log(err));
  }
}

// ======== PayPal Integration ========
function loadPayPal(){
  if(balance<=0) return;
  const script = document.createElement("script");
  script.src="https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=USD";
  script.onload = ()=>{
    paypal.Buttons({
      createOrder: (data,actions)=>actions.order.create({purchase_units:[{amount:{value:balance.toFixed(2)}}]}),
      onApprove: (data,actions)=>actions.order.capture().then(details=>{
        alert('Withdrawal Successful! Transaction completed by '+details.payer.name.given_name);
        balance=0;
        localStorage.setItem("balance",balance);
        updateWalletUI();
      })
    }).render('#paypal-button-container');
  };
  document.body.appendChild(script);
}

const cacheName='taskcash-cache-v1';
const assetsToCache=[
  './index.html','./style.css','./script.js','./manifest.json'
];
self.addEventListener('install',evt=>{
  evt.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(assetsToCache)));
});
self.addEventListener('fetch',evt=>{
  evt.respondWith(
    caches.match(evt.request).then(cacheRes=>{
      return cacheRes || fetch(evt.request).then(fetchRes=>{
        return caches.open(cacheName).then(cache=>{cache.put(evt.request,fetchRes.clone()); return fetchRes;});
      });
    }).catch(()=>{if(evt.request.destination==='document') return caches.match('./index.html');})
  );
});


