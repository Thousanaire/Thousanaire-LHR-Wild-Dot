const messagesDiv = document.getElementById("messages");
const input = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", () => {
  const text = input.value.trim();
  if (text !== "") {
    addMessage("Player", text);
    input.value = "";
  }
});

function addMessage(user, text) {
  const msg = document.createElement("p");
  msg.textContent = `${user}: ${text}`;
  messagesDiv.appendChild(msg);

  // Optional: make chat talk
  let utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}
