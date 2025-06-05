// firebase-messaging-sw.js
// Service Worker específico para Firebase Cloud Messaging

importScripts('https://www.gstatic.com/firebasejs/9.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.0/firebase-messaging-compat.js');

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
firebase.initializeApp(firebaseConfig);

// Obter instância do messaging
const messaging = firebase.messaging();

// Manipular mensagens em background
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Mensagem em background recebida:', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'EcoTech PWA';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Você tem uma nova notificação!',
    icon: payload.notification?.icon || './icons/icon-192-192.png',
    badge: './icons/icon-192-192.png',
    tag: 'ecotech-firebase-notification',
    requireInteraction: true,
    actions: [
      { 
        action: 'open', 
        title: 'Abrir App',
        icon: './icons/icon-192-192.png'
      },
      { 
        action: 'close', 
        title: 'Fechar',
        icon: './icons/icon-192-192.png'
      }
    ],
    data: {
      url: payload.data?.url || '/',
      timestamp: Date.now(),
      customData: payload.data
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manipular clique na notificação
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notificação clicada:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Abrir ou focar na aplicação
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      const urlToOpen = event.notification.data?.url || '/';
      
      // Procurar por uma janela já aberta
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Se não houver janela aberta, abrir uma nova
      if (clients.openWindow) {
        return clients.openWindow(self.location.origin + urlToOpen);
      }
    })
  );
});