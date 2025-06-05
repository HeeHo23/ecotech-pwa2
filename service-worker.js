const CACHE_NAME = 'ecotech-cache-v1';
const urlsToCache = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192-192.png',
  './icons/icon-512x512.png',
  './images/notification-icon.png',
  './images/notification-badge.png'
];

// Instalando o Service Worker e cacheando os arquivos
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cacheando arquivos');
        // Cachear arquivos um por um para identificar problemas
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.log('Erro ao cachear:', url, err);
              // Não falhar a instalação se um arquivo não puder ser cacheado
              return Promise.resolve();
            });
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Cache criado com sucesso');
        // Força a ativação imediata do novo service worker
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Erro durante instalação:', error);
      })
  );
});

// Ativando o Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativando...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('Service Worker: Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Ativado com sucesso');
        // Assume controle de todas as páginas imediatamente
        return self.clients.claim();
      })
  );
});

// Interceptando as requisições de rede
self.addEventListener('fetch', event => {
  // Apenas interceptar requisições GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('Service Worker: Servindo do cache:', event.request.url);
          return response;
        }
        
        console.log('Service Worker: Buscando da rede:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // Verificar se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar a resposta porque ela pode ser consumida apenas uma vez
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.log('Service Worker: Erro na requisição:', error);
            // Retornar uma resposta offline personalizada se necessário
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            
            // Retorna resposta de fallback para recursos não disponíveis
            return new Response('Recurso não disponível e falha de rede', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// ===== PUSH NOTIFICATIONS =====

// Evento de push - receber notificações
self.addEventListener('push', function(event) {
  let data = { 
    title: 'EcoTech PWA',
    body: 'Nova notificação!'
  }; // Valor padrão caso event.data seja nulo
  
  // Verificar se event.data existe e tentar converter para JSON
  if (event.data) {
    try {
      data = event.data.json(); // Tenta converter os dados para JSON
    } catch (e) {
      console.error('Os dados não estão em formato JSON:', e);
      try {
        data = { 
          title: 'EcoTech PWA',
          body: event.data.text() || 'Nova notificação!'
        }; // Fallback para tratar como texto
      } catch (textError) {
        console.error('Erro ao processar dados como texto:', textError);
      }
    }
  }

  console.log('Push recebido:', data);
  
  const options = {
    body: data.body || 'Você tem uma nova notificação!',
    icon: './icons/icon-192-192.png', // Usar ícone existente como fallback
    badge: './icons/icon-192-192.png', // Usar ícone existente como fallback
    tag: 'ecotech-notification',
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Abrir App', icon: './icons/icon-192-192.png' },
      { action: 'close', title: 'Fechar', icon: './icons/icon-192-192.png' }
    ],
    data: {
      url: self.location.origin,
      timestamp: Date.now()
    }
  };

  // Exibir a notificação
  event.waitUntil(
    self.registration.showNotification(data.title || 'EcoTech PWA', options)
  );
});

// Evento de clique na notificação
self.addEventListener('notificationclick', function(event) {
  console.log('Notificação clicada:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'close') {
    // Usuário clicou em fechar
    return;
  }
  
  // Para ação 'open' ou clique na notificação
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Verificar se já existe uma janela aberta
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Se não houver janela aberta, abrir uma nova
      if (clients.openWindow) {
        return clients.openWindow(self.location.origin);
      }
    })
  );
});

// Evento quando a notificação é fechada
self.addEventListener('notificationclose', function(event) {
  console.log('Notificação fechada:', event.notification.tag);
  
  // Aqui você pode registrar analytics ou outras ações
  // quando o usuário fechar a notificação sem interagir
});

// Função auxiliar para verificar permissão de notificação
function askNotificationPermission() {
  return new Promise(function(resolve, reject) {
    const permissionResult = Notification.requestPermission(function(result) {
      resolve(result);
    });

    if (permissionResult) {
      permissionResult.then(resolve, reject);
    }
  })
  .then(function(permissionResult) {
    if (permissionResult !== 'granted') {
      throw new Error('Permissão não concedida.');
    }
    return permissionResult;
  });
}