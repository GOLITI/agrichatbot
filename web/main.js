import { streamGemini } from './gemini-api.js';

let form = document.querySelector('form');
let promptInput = document.querySelector('input[name="prompt"]');
let output = document.querySelector('.output');
let welcomeMessage = document.getElementById('welcome-message');
let typingIndicator = document.getElementById('typing-indicator');
let chatArea = document.getElementById('chat-area');

// Fonction pour ajouter un message à l'interface comme dans Flutter
function addMessage(text, isUser) {
  if (welcomeMessage.style.display !== 'none') {
    welcomeMessage.style.display = 'none';
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user-message' : ''}`;

  const avatarDiv = document.createElement('div');
  avatarDiv.className = `avatar ${isUser ? 'user-avatar' : 'bot-avatar'}`;
  
  if (isUser) {
    avatarDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    `;
  } else {
    avatarDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M15.5,9.5C16.44,9.5 17.33,9.79 18.06,10.3C18.23,9.71 18.32,9.09 18.32,8.44C18.32,4.93 15.5,2 12.03,2C8.55,2 5.68,4.93 5.68,8.44C5.68,12.72 9.76,16.83 15.5,20.29C21.24,16.83 25.32,12.72 25.32,8.44C25.32,7.7 25.19,7 24.97,6.32C24.39,7.77 22.85,8.74 21.03,8.74C19.21,8.74 17.67,7.77 17.09,6.32C16.87,7 16.74,7.7 16.74,8.44C16.74,9.09 16.83,9.71 17,10.3C17.73,9.79 18.62,9.5 19.56,9.5H21.03C21.03,9.5 15.5,15.13 15.5,19.29C15.5,15.13 9.97,9.5 9.97,9.5H11.44C12.38,9.5 13.27,9.79 14,10.3C14.17,9.71 14.26,9.09 14.26,8.44C14.26,7.7 14.13,7 13.91,6.32C13.33,7.77 11.79,8.74 9.97,8.74C8.15,8.74 6.61,7.77 6.03,6.32C5.81,7 5.68,7.7 5.68,8.44C5.68,9.09 5.77,9.71 5.94,10.3C6.67,9.79 7.56,9.5 8.5,9.5H9.97"/>
      </svg>
    `;
  }

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = `message-bubble ${isUser ? 'user-bubble' : 'bot-bubble'}`;
  bubbleDiv.textContent = text;

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(bubbleDiv);
  chatArea.appendChild(messageDiv);
  
  // Auto-scroll to bottom
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Variable pour stocker la réponse actuelle du bot
let currentBotMessageElement = null;

form.onsubmit = async (ev) => {
  ev.preventDefault();
  
  const userPrompt = promptInput.value;
  if (!userPrompt.trim()) return; // Ne pas soumettre si vide
  
  // Ajouter le message de l'utilisateur
  addMessage(userPrompt, true);
  
  // Afficher l'indicateur de frappe
  typingIndicator.classList.remove('hidden');
  
  // Créer un nouvel élément pour la réponse du bot au lieu de réutiliser output
  currentBotMessageElement = document.createElement('div');
  currentBotMessageElement.className = 'message';
  
  const botAvatarDiv = document.createElement('div');
  botAvatarDiv.className = 'avatar bot-avatar';
  botAvatarDiv.innerHTML = `
    <i class="material-icons">eco</i>
  `;
  
  const botBubbleDiv = document.createElement('div');
  botBubbleDiv.className = 'message-bubble bot-bubble';
  
  currentBotMessageElement.appendChild(botAvatarDiv);
  currentBotMessageElement.appendChild(botBubbleDiv);
  chatArea.appendChild(currentBotMessageElement);

  try {
    let contents = [
      {
        type: "text",
        text: userPrompt,
      }
    ];
    
    // Option: ajouter l'image seulement si une case est cochée
    let useImage = document.getElementById('use-image-checkbox').checked;
    if (useImage) {
      let imageUrl = form.elements.namedItem('chosen-image').value;
      let imageBase64 = await fetch(imageUrl)
        .then(r => r.arrayBuffer())
        .then(a => base64js.fromByteArray(new Uint8Array(a)));
      
      contents.push({
        type: "image_url",
        image_url: `data:image/jpeg;base64,${imageBase64}`,
      });
    }
    
    // Call the multimodal model, and get a stream of results
    let stream = streamGemini({
      model: 'gemini-1.5-flash', // or gemini-1.5-pro
      contents,
    });
    
    // Read from the stream and interpret the output as markdown
    let buffer = [];
    let md = new markdownit();
    
    for await (let chunk of stream) {
      buffer.push(chunk);
      botBubbleDiv.innerHTML = md.render(buffer.join(''));
      
      // Auto-scroll to bottom while typing
      chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    // Cacher l'indicateur de frappe quand c'est fini
    typingIndicator.classList.add('hidden');
    
    // Vider le champ de saisie
    promptInput.value = '';
    
  } catch (e) {
    if (botBubbleDiv) {
      botBubbleDiv.innerHTML += '<hr>Erreur: ' + e.message;
    }
    typingIndicator.classList.add('hidden');
  }
  
  // Auto-scroll to bottom after completion
  chatArea.scrollTop = chatArea.scrollHeight;
};