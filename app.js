import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-messaging.js";

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registrado com sucesso:', registration);
      })
      .catch(error => {
        console.log('Falha no registro do Service Worker:', error);
      });
  });
}

// Configuração do Firebase - SUBSTITUA pelas suas credenciais
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Chave VAPID - SUBSTITUA pela sua chave pública VAPID do Firebase
const vapidKey = "SUA_CHAVE_VAPID_AQUI";

// Elementos DOM
const enableButton = document.getElementById('enable-notifications');
const statusElement = document.getElementById('notification-status');

// Verificar se as notificações são suportadas
if (!('Notification' in window)) {
  statusElement.textContent = 'Status: Notificações não suportadas neste navegador';
  enableButton.disabled = true;
} else {
  // Verificar permissão atual
  updateNotificationStatus();
}

// Event listener para o botão
enableButton.addEventListener('click', requestNotificationPermission);

// Função para solicitar permissão de notificação
async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Permissão concedida para notificações');
      statusElement.textContent = 'Status: Permissão concedida';
      await subscribeUserToPush();
    } else {
      console.log('Permissão negada para notificações');
      statusElement.textContent = 'Status: Permissão negada';
    }
    
    updateNotificationStatus();
  } catch (error) {
    console.error('Erro ao solicitar permissão:', error);
    statusElement.textContent = 'Status: Erro ao solicitar permissão';
  }
}

// Função para inscrever usuário no push
async function subscribeUserToPush() {
  try {
    const currentToken = await getToken(messaging, { vapidKey: vapidKey });
    
    if (currentToken) {
      console.log('Token de Push gerado:', currentToken);
      statusElement.textContent = 'Status: Inscrito com sucesso!';
      
      // Aqui você enviaria o token para seu backend
      // sendTokenToServer(currentToken);
      
      // Para demonstração, vamos armazenar localmente
      localStorage.setItem('fcmToken', currentToken);
      
    } else {
      console.log('Nenhum token disponível. Solicite permissão para notificações.');
      statusElement.textContent = 'Status: Erro ao gerar token';
    }
  } catch (err) {
    console.error('Erro ao gerar token:', err);
    statusElement.textContent = 'Status: Erro ao gerar token';
  }
}

// Monitorar mensagens recebidas enquanto o app está em primeiro plano
onMessage(messaging, (payload) => {
  console.log('Mensagem recebida enquanto o app está em execução:', payload);
  
  // Exibir notificação customizada quando o app está aberto
  if (payload.notification) {
    showCustomNotification(payload.notification);
  }
});

// Função para exibir notificação customizada
function showCustomNotification(notification) {
  if (Notification.permission === 'granted') {
    const notif = new Notification(notification.title, {
      body: notification.body,
      icon: notification.icon || './icons/icon-192-192.png',
      badge: './images/notification-badge.png'
    });
    
    notif.onclick = function() {
      window.focus();
      notif.close();
    };
  }
}

// Função para atualizar status da notificação
function updateNotificationStatus() {
  if (Notification.permission === 'granted') {
    statusElement.textContent = 'Status: Notificações ativadas';
    enableButton.textContent = 'Reativar Notificações';
  } else if (Notification.permission === 'denied') {
    statusElement.textContent = 'Status: Notificações bloqueadas';
    enableButton.textContent = 'Notificações Bloqueadas';
    enableButton.disabled = true;
  } else {
    statusElement.textContent = 'Status: Aguardando permissão';
    enableButton.textContent = 'Ativar Notificações';
  }
}

// Verificar conectividade
function checkConnectivity() {
  if (!navigator.onLine) {
    console.log('Você está offline, notificações não serão recebidas.');
    statusElement.textContent = 'Status: Offline - Notificações indisponíveis';
  }
}

// Monitorar mudanças na conectividade
window.addEventListener('online', () => {
  console.log('Conexão restaurada');
  updateNotificationStatus();
});

window.addEventListener('offline', () => {
  console.log('Conexão perdida');
  checkConnectivity();
});

// Verificar conectividade inicial
checkConnectivity();