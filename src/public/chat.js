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

// New function to add payment button
function addPaymentButton(paymentUrl, reference) {
  const div = document.createElement("div");
  div.className = "msg payment-msg";
  div.innerHTML = `
    <div style="background: linear-gradient(135deg, #28a745, #20c997); 
                color: white; padding: 15px; border-radius: 10px; 
                text-align: center; margin: 10px 0;">
      <p style="margin: 0 0 10px 0; font-weight: bold;">💳 Ready to pay?</p>
      <button onclick="initiatePayment('${paymentUrl}')" 
              style="background: white; color: #28a745; border: none; 
                     padding: 10px 20px; border-radius: 25px; cursor: pointer; 
                     font-weight: bold; transition: all 0.3s ease;">
        🚀 Pay with Paystack
      </button>
      <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">
        Ref: ${reference}
      </p>
    </div>
  `;
  document.getElementById("messages").appendChild(div);
  document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
}

// Initiate payment
function initiatePayment(paymentUrl) {
  // Show loading message
  addMessage('🔄 Redirecting to Paystack payment page...');
  
  // Disable payment buttons
  const buttons = document.querySelectorAll('.payment-msg button');
  buttons.forEach(btn => {
    btn.innerHTML = '⏳ Redirecting...';
    btn.disabled = true;
    btn.style.opacity = '0.6';
  });
  
  // Redirect after short delay
  setTimeout(() => {
    window.location.href = paymentUrl;
  }, 1500);
}

// Verify payment after callback
async function verifyPayment(reference) {
  try {
    addMessage('🔄 Verifying your payment...');
    
    const response = await fetch('/paystack/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reference: reference })
    });
    
    const data = await response.json();
    
    if (data.success) {
      addMessage('🎉 Payment successful! Your order has been confirmed.');
      addMessage('Thank you for choosing QuickBites! 🍔');
    } else {
      addMessage('❌ Payment verification failed: ' + data.message);
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    addMessage('❌ Unable to verify payment. Please contact support.');
  }
}

document.getElementById("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("input");
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, "user");
  input.value = "";

  const data = await postChat(text);
  
  // Check if it's a payment response
  if (data.type === "payment" && data.paymentUrl) {
    // Display the bot message first
    addMessage(data.reply || "Payment ready");
    // Then add the payment button
    addPaymentButton(data.paymentUrl, data.reference);
  } else {
    // Regular bot message
    addMessage(data.reply || "No reply");
  }
});

// Check for payment callback on page load
window.addEventListener("load", async () => {
  // Check URL parameters for payment callback
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference');
  const status = urlParams.get('status');
  
  if (reference && status === 'callback') {
    // Verify payment
    await verifyPayment(reference);
    
    // Clean URL without refreshing
    const url = new URL(window.location);
    url.searchParams.delete('reference');
    url.searchParams.delete('status');
    window.history.replaceState({}, document.title, url.pathname);
  } else {
    // Normal load - request initial menu
    const data = await postChat("");
    addMessage(data.reply);
  }
});