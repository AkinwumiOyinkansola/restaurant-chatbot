async function postChat(message) {
  const resp = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return resp.json();
}

function addMessage(text, who = "bot") {
  const div = document.createElement("div");
  div.className = "msg " + (who === "bot" ? "bot" : "user");
  div.innerText = text;
  document.getElementById("messages").appendChild(div);
  document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
}

document.getElementById("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("input");
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, "user");
  input.value = "";

  const data = await postChat(text);
  addMessage(data.reply || "No reply");
});

// on load, request initial menu (empty message)
window.addEventListener("load", async () => {
  const data = await postChat("");
  addMessage(data.reply);
});
