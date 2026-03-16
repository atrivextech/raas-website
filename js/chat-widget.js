// WhatsApp Chat Widget Functionality

// Toggle chat box
function toggleChat() {
  const chatBox = document.getElementById('wa-chat-box');
  chatBox.classList.toggle('active');
}

// Send predefined message to WhatsApp
function sendMessage(message) {
  const phoneNumber = '919800000000'; // Replace with actual WhatsApp number
  const encodedMessage = encodeURIComponent(`Hi RAAS, ${message}`);
  const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(whatsappURL, '_blank');
}

// Close chat when clicking outside
document.addEventListener('click', function(event) {
  const widget = document.getElementById('wa-widget');
  const chatBox = document.getElementById('wa-chat-box');
  
  if (widget && !widget.contains(event.target) && chatBox.classList.contains('active')) {
    chatBox.classList.remove('active');
  }
});

// Auto-open chat after 5 seconds (optional)
setTimeout(() => {
  const chatBox = document.getElementById('wa-chat-box');
  if (chatBox && !sessionStorage.getItem('chat_opened')) {
    chatBox.classList.add('active');
    sessionStorage.setItem('chat_opened', 'true');
    
    // Auto-close after 10 seconds
    setTimeout(() => {
      chatBox.classList.remove('active');
    }, 10000);
  }
}, 5000);
