/**
 * Основной скрипт приложения (SPA)
 * Управляет навигацией, загрузкой контента из n8n и корзиной.
 */

// URL вебхуков n8n (заменить их на свои)
const N8N_WEBHOOKS = {
  templates: 'https://n8n.soedmi.ru/webhook/get-templates',
  news: 'https://your-n8n-domain.com/webhook/get-news',
  video: 'https://your-n8n-domain.com/webhook/get-video',
  portfolio: 'https://your-n8n-domain.com/webhook/get-portfolio',
  createPayment: 'https://your-n8n-domain.com/webhook/create-payment',
  aiChat: 'https://n8n.soedmi.ru/webhook-test/ai-chat' // ЗАМЕНИТЬ НА СВОЙ ВЕБХУК
};

// Генерируем или получаем sessionId для чата
function getChatSessionId() {
  let sessionId = localStorage.getItem('tg_chat_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('tg_chat_session_id', sessionId);
  }
  return sessionId;
}

// Состояние приложения
const state = {
  currentRoute: 'home',
  templates: [],
  portfolio: [],
  sessionId: getChatSessionId() // ID сессии для ИИ
};

// Главный контроллер приложения
const app = {
  // Инициализация
  init() {
    this.cacheDOM();
    this.bindEvents();

    // Чтение хэша из URL если есть, иначе открываем главную
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      this.navigate(hash);
    } else {
      this.renderRoute('home');
    }

    // Cookie Popup
    const cookiePopup = document.getElementById('cookie-popup');
    const cookieAcceptBtn = document.getElementById('cookie-accept-btn');
    if (cookiePopup && cookieAcceptBtn) {
      if (!localStorage.getItem('cookies_accepted')) {
        setTimeout(() => cookiePopup.classList.remove('hidden'), 2000);
      }
      cookieAcceptBtn.addEventListener('click', () => {
        localStorage.setItem('cookies_accepted', 'true');
        cookiePopup.classList.add('hidden');
      });
    }
  },

  cacheDOM() {
    this.$appContent = document.getElementById('app-content');
    this.$navLinks = document.querySelectorAll('.nav-link');
    this.$menuToggle = document.getElementById('menu-toggle');
    this.$mainNav = document.getElementById('main-nav');

    // Модальное окно
    this.$modalOverlay = document.getElementById('modal-overlay');
    this.$modalClose = document.getElementById('modal-close');
    this.$modalBody = document.getElementById('modal-body');

    // Виджет Telegram
    this.$tgWidgetBtn = document.getElementById('tg-widget-btn');
    this.$tgWidgetWindow = document.getElementById('tg-widget-window');
    this.$tgWidgetClose = document.getElementById('tg-widget-close');
    this.$tgChatForm = document.getElementById('tg-chat-form');
    this.$tgChatInput = document.getElementById('tg-chat-input');
    this.$tgChatHistory = document.getElementById('tg-chat-history');
    this.$tgChatSubmit = document.getElementById('tg-chat-submit');
    this.$footerContactsBtn = document.getElementById('footer-contacts-btn');
  },

  bindEvents() {
    // Навигация по ссылкам в меню
    this.$navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = e.currentTarget.getAttribute('data-route');
        this.navigate(route);

        // Закрываем мобильное меню при клике
        if (window.innerWidth <= 768) {
          this.$mainNav.classList.remove('show');
        }
      });
    });

    // Мобильное меню
    this.$menuToggle.addEventListener('click', () => {
      this.$mainNav.classList.toggle('show');
    });

    // Виджет Telegram
    if (this.$tgWidgetBtn && this.$tgWidgetWindow && this.$tgWidgetClose) {
      const openWidget = (e) => {
        if (e) e.preventDefault();
        this.$tgWidgetWindow.classList.remove('hidden');
      };

      this.$tgWidgetBtn.addEventListener('click', () => {
        this.$tgWidgetWindow.classList.toggle('hidden');
      });

      this.$tgWidgetClose.addEventListener('click', () => {
        this.$tgWidgetWindow.classList.add('hidden');
      });

      if (this.$footerContactsBtn) {
        this.$footerContactsBtn.addEventListener('click', openWidget);
      }
    }

    if (this.$tgChatForm) {
      this.$tgChatForm.addEventListener('submit', (e) => this.handleChatSubmit(e));
    }

    // Модальное окно (закрытие)
    if (this.$modalClose) {
      this.$modalClose.addEventListener('click', () => this.closeModal());
    }
    if (this.$modalOverlay) {
      this.$modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.$modalOverlay) this.closeModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.$modalOverlay && !this.$modalOverlay.classList.contains('hidden')) {
        this.closeModal();
      }
    });
  },

  // Глобальный метод для открытия виджета Telegram
  openTgWidget(e) {
    if (e) e.preventDefault();
    if (this.$tgWidgetWindow) {
      this.$tgWidgetWindow.classList.remove('hidden');
    }
  },

  // Метод навигации
  navigate(route) {
    state.currentRoute = route;
    window.location.hash = route; // Меняем URL без перезагрузки

    // Обновляем активный пункт меню
    this.$navLinks.forEach(link => {
      if (link.getAttribute('data-route') === route) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    this.renderRoute(route);
  },

  // Отрисовка нужного раздела
  renderRoute(route) {
    // Ищем шаблон (template) в index.html
    const templateId = `tpl-${route}`;
    const template = document.getElementById(templateId);

    if (template) {
      // Клонируем содержимое шаблона
      const content = template.content.cloneNode(true);

      // Очищаем контейнер и вставляем новое содержимое
      this.$appContent.innerHTML = '';

      // Добавляем класс для анимации
      const firstElement = content.firstElementChild;
      if (firstElement) {
        firstElement.classList.add('fade-in');
      }

      this.$appContent.appendChild(content);

      // Если раздел требует загрузки данных - вызываем соответствующий метод
      if (route === 'templates') this.loadTemplates();
      if (route === 'news') this.loadNews();
      if (route === 'portfolio') this.loadPortfolio();
      if (route === 'video') this.loadVideos();

      // Обновляем SEO данные
      this.updateSEO(route);

      // Прокрутка наверх
      window.scrollTo(0, 0);
    } else {
      this.$appContent.innerHTML = '<div class="container section-padding"><h2 class="section-header">Страница не найдена</h2></div>';
    }
  },

  // ----------------------------------------------------
  // SEO роутинг
  // ----------------------------------------------------
  updateSEO(route) {
    const seoData = {
      home: {
        title: 'n8nStore — Шаблоны, Услуги и Гайды по Автоматизации',
        desc: 'Готовые шаблоны n8n, услуги по автоматизации бизнеса, подробные гайды по интеграции сервисов и обучающие видео.'
      },
      services: {
        title: 'Услуги по автоматизации бизнеса на n8n | n8nStore',
        desc: 'Закажите разработку сценариев n8n, настройку серверов и интеграцию AI (ChatGPT) для вашего бизнеса.'
      },
      templates: {
        title: 'Магазин готовых шаблонов n8n | n8nStore',
        desc: 'Скачайте готовые скрипты и шаблоны для n8n: Telegram боты, парсеры, интеграция CRM и выгрузка отчетов.'
      },
      portfolio: {
        title: 'Наши кейсы и проекты автоматизации | n8nStore',
        desc: 'Реализованные проекты по автоматизации бизнеса, интеграции сервисов и разработке ботов.'
      },
      news: {
        title: 'Новости магазина и обновления n8n | n8nStore',
        desc: 'Свежие обновления платформы n8n, новые возможности сервиса и релизы новых шаблонов.'
      },
      video: {
        title: 'Обучающие видео уроки по n8n | n8nStore',
        desc: 'Смотрите бесплатные видео-уроки по настройке n8n: от быстрого старта до сложных интеграций Telegram API и Google Sheets.'
      },
      oferta: {
        title: 'Условия предоставления услуг (Оферта) | n8nStore',
        desc: 'Официальное предложение об оказании услуг по автоматизации и продаже цифровых товаров n8nStore.'
      },
      privacy: {
        title: 'Политика конфиденциальности | n8nStore',
        desc: 'Информация о том, как мы собираем, используем и защищаем ваши персональные данные.'
      }
    };

    if (seoData[route]) {
      // Обновляем заголовок документа (Title)
      document.title = seoData[route].title;

      // Вспомогательная функция для обновления meta value
      const changeContent = (id, property) => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('content', seoData[route][property]);
      };

      // Обновляем мета-теги
      changeContent('meta-desc', 'desc');
      changeContent('og-title', 'title');
      changeContent('og-desc', 'desc');
      changeContent('tw-title', 'title');
      changeContent('tw-desc', 'desc');
    }
  },

  // ----------------------------------------------------
  // Методы загрузки данных из n8n (Пока с Mock-данными для демонстрации верстки)
  // ----------------------------------------------------

  async loadTemplates() {
    const grid = document.getElementById('templates-grid');
    if (!grid) return;

    try {
      grid.innerHTML = '<div class="loader"><i class="bx bx-loader-alt bx-spin"></i> Загрузка шаблонов...</div>';

      const response = await fetch(N8N_WEBHOOKS.templates);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      let data = await response.json();

      // Ensure data is an array
      if (!Array.isArray(data)) {
        data = [data];
      }

      state.templates = data;
      this.renderItems(grid, data, 'template');

    } catch (error) {
      grid.innerHTML = '<div class="loader error">Ошибка при загрузке шаблонов. Проверьте настройки n8n.</div>';
      console.error(error);
    }
  },

  async loadNews() {
    const timeline = document.getElementById('news-timeline');
    // По аналогии - тут будет fetch к n8n webhook
    timeline.innerHTML = '<div class="loader"><i class="bx bx-loader-alt bx-spin"></i> Подгрузка новостей...</div>';
    setTimeout(() => {
      const mockNews = [
        { id: 101, date: '24 Февраля 2026', title: 'Обновление шаблона Telegram Бота', content: 'Добавлена поддержка новых моделей нейронных сетей и улучшена обработка длительного контекста разговора. Скачайте новую версию в личном кабинете.' },
        { id: 102, date: '20 Февраля 2026', title: 'Как интегрировать ЮKassa в n8n', content: 'Опубликован новый подробный гайд по настройке приема платежей в ваших сценариях. Разбираем создание инвойсов и вебхуки.' },
        { id: 103, date: '15 Февраля 2026', title: 'Запуск магазина!', content: 'Добро пожаловать в наш новый магазин шаблонов n8n. Мы подготовили для вас лучшие решения для автоматизации рутины.' }
      ];
      this.renderItems(timeline, mockNews, 'news');
    }, 500);
  },

  async loadPortfolio() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="loader"><i class="bx bx-loader-alt bx-spin"></i> Подгрузка проектов...</div>';
    setTimeout(() => {
      const mockPortfolio = [
        {
          id: 1,
          title: 'Telegram-бот для службы поддержки',
          tag: 'Коммуникации',
          image: 'https://placehold.co/600x400/222/FFF?text=Support+Bot',
          desc: 'Автоматизированная система приема обращений с ChatGPT и сохранением в Google Sheets.',
          features: [
            'Интеграция с OpenAI',
            'Синхронизация с базой данных',
            'Маршрутизация к операторам'
          ]
        },
        {
          id: 2,
          title: 'Автоматизация отдела продаж',
          tag: 'CRM',
          image: 'https://placehold.co/600x400/222/FFF?text=Sales+CRM',
          desc: 'Связка AmoCRM с телефонией и автоматическими рассылками коммерческих предложений.',
          features: [
            'Настройка триггерных писем',
            'Генерация PDF-документов',
            'Уведомления менеджерам в Slack'
          ]
        },
        {
          id: 3,
          title: 'Парсер конкурентов с уведомлениями',
          tag: 'Данные',
          image: 'https://placehold.co/600x400/222/FFF?text=Data+Scraper',
          desc: 'Ежедневный сбор цен с 5 сайтов конкурентов, анализ и сводный отчет в Telegram.',
          features: [
            'Обход капчи и Cloudflare',
            'Сравнение цен в реальном времени',
            'Форматированный отчет в мессенджер'
          ]
        }
      ];
      state.portfolio = mockPortfolio;
      this.renderItems(grid, mockPortfolio, 'portfolio');
    }, 500);
  },

  async loadVideos() {
    const grid = document.getElementById('video-grid');
    grid.innerHTML = '<div class="loader"><i class="bx bx-loader-alt bx-spin"></i> Подгрузка видео...</div>';
    setTimeout(() => {
      const mockVideos = [
        { id: 'dQw4w9WgXcQ', title: '1. Быстрый старт в n8n за 10 минут' },
        { id: 'jNQXAC9IVRw', title: '2. Подключение Telegram Bot API' },
        { id: 'kJQP7kiw5Fk', title: '3. Интеграция с Google Sheets' }
      ];
      this.renderItems(grid, mockVideos, 'video');
    }, 500);
  },

  // Универсальный рендер списка
  renderItems(container, items, type) {
    if (!items || items.length === 0) {
      container.innerHTML = '<div class="loader">Ничего не найдено.</div>';
      return;
    }

    let html = '';
    if (type === 'template') {
      html = items.map(item => `
                <article class="product-card-horizontal fade-in" onclick="app.openTemplateModal(${item.id})" aria-label="Открыть подробности шаблона" role="button" tabindex="0">
                    <div class="product-icon"><i class='bx ${item.icon}' aria-hidden="true"></i></div>
                    <div class="product-info">
                        <h3>${item.title}</h3>
                        <p>${item.desc}</p>
                    </div>
                    <div class="product-footer">
                        <span class="price" aria-label="Цена">${item.price}</span>
                        <button class="btn btn-primary btn-glow" onclick="event.stopPropagation(); app.buyTemplate(${item.id}, '${item.title.replace(/'/g, "\\'")}')" aria-label="Купить ${item.title}">
                            <i class='bx bx-credit-card' aria-hidden="true"></i> Купить
                        </button>
                    </div>
                </article>
            `).join('');
    } else if (type === 'news') {
      html = items.map(item => `
                <article class="news-item glass-panel fade-in">
                    <div class="news-date"><i class='bx bx-calendar' aria-hidden="true"></i> <time>${item.date}</time></div>
                    <h3>${item.title}</h3>
                    <p>${item.content}</p>
                </article>
            `).join('');
      // wrap with list manually to match older layout
      html = `<div class="news-list">${html}</div>`;
    } else if (type === 'portfolio') {
      html = items.map(item => `
                <article class="portfolio-card glass-panel fade-in" onclick="app.openPortfolioModal(${item.id})">
                    <div class="portfolio-preview">
                        <img src="${item.image}" alt="Превью ${item.title}">
                    </div>
                    <div class="portfolio-info">
                        <div class="portfolio-meta">
                            <span class="badge" aria-label="Категория: ${item.tag}">${item.tag}</span>
                        </div>
                        <h3>${item.title}</h3>
                    </div>
                </article>
            `).join('');
    } else if (type === 'video') {
      html = items.map(item => `
                <article class="video-card glass-panel fade-in">
                    <div class="video-preview" onclick="app.openVideoModal('${item.id}', '${item.title.replace(/'/g, "\\'")}')" aria-label="Воспроизвести видео ${item.title}" role="button" tabindex="0">
                        <img src="https://img.youtube.com/vi/${item.id}/maxresdefault.jpg" alt="Превью видео ${item.title}" onerror="this.src='https://img.youtube.com/vi/${item.id}/hqdefault.jpg'">
                        <i class='bx bx-play-circle video-play-btn' aria-hidden="true"></i>
                    </div>
                    <div class="video-info">
                        <h3>${item.title}</h3>
                    </div>
                </article>
            `).join('');
      // The template uses <div class="video-grid" id="video-grid">
      // But styling was on video-container-grid. So wrap it:
      html = `<div class="video-container-grid">${html}</div>`;
    }

    container.innerHTML = html;
  },

  // ----------------------------------------------------
  // Логика Модальных Окон (Попапов)
  // ----------------------------------------------------
  openModal(htmlContent) {
    if (!this.$modalBody || !this.$modalOverlay) return;
    this.$modalBody.innerHTML = htmlContent;
    this.$modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // prevent scrolling underneath
  },

  closeModal() {
    if (!this.$modalOverlay) return;
    this.$modalOverlay.classList.add('hidden');
    setTimeout(() => { if (this.$modalBody) this.$modalBody.innerHTML = ''; }, 300); // clear content & kill iframes
    document.body.style.overflow = '';
  },

  openTemplateModal(id) {
    const item = state.templates.find(t => t.id === id);
    if (!item) return;

    const html = `
            <div style="display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap;">
                <div class="product-icon" style="flex-shrink: 0; width: 100px; height: 100px; font-size: 4rem;">
                    <i class='bx ${item.icon}' aria-hidden="true"></i>
                </div>
                <div style="flex-grow: 1; min-width: 250px;">
                    <h2 style="margin-bottom: 16px;">${item.title}</h2>
                    <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 1.1rem; line-height: 1.6;">
                        ${item.desc}
                    </p>
                    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                        <h4 style="margin-bottom: 12px; color: var(--accent-primary);">Комплектация шаблона:</h4>
                        <ul class="benefits-list" style="margin-top:0;">
                            <li><i class='bx bx-check' aria-hidden="true"></i> JSON файл для быстрого импорта</li>
                            <li><i class='bx bx-check' aria-hidden="true"></i> Текстовая инструкция по настройке</li>
                            <li><i class='bx bx-check' aria-hidden="true"></i> Подсказки по кастомизации</li>
                        </ul>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 24px; border-top: 1px solid var(--border-color);">
                        <span class="price" aria-label="Цена" style="font-size: 2rem; font-weight: 700;">${item.price}</span>
                        <button class="btn btn-primary btn-glow" onclick="app.buyTemplate(${item.id}, '${item.title.replace(/'/g, "\\'")}')" aria-label="Купить ${item.title}">
                            <i class='bx bx-credit-card' aria-hidden="true"></i> Купить шаблон
                        </button>
                    </div>
                </div>
            </div>
        `;
    this.openModal(html);
  },

  openPortfolioModal(id) {
    const item = state.portfolio.find(p => p.id === id);
    if (!item) return;

    const listHtml = item.features ? item.features.map(f => `<li><i class='bx bx-check' aria-hidden="true"></i> ${f}</li>`).join('') : '';

    const html = `
            <div class="portfolio-modal-content">
                <div class="portfolio-modal-image">
                    <img src="${item.image}" alt="${item.title}">
                </div>
                <div class="portfolio-modal-details">
                    <span class="badge">${item.tag}</span>
                    <h2>${item.title}</h2>
                    <p>${item.desc}</p>
                    ${listHtml ? `
                    <h4>Что было сделано:</h4>
                    <ul class="benefits-list" style="margin-top:0;">
                        ${listHtml}
                    </ul>
                    ` : ''}
                </div>
            </div>
        `;
    this.openModal(html);
  },

  openVideoModal(id, title) {
    const html = `
            <h3 style="margin-bottom: 20px;">${title}</h3>
            <div class="video-preview" style="cursor: auto;">
                <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0" title="${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position: absolute; top:0; left:0; width:100%; height:100%; border-radius: 12px;"></iframe>
            </div>
        `;
    this.openModal(html);
  },

  // ----------------------------------------------------
  // Оплата и Корзина
  // ----------------------------------------------------

  // Прямая покупка товара через ЮKassa (запрос в n8n)
  async buyTemplate(id, title) {
    // Показываем индикатор загрузки на кнопке
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Обработка...';
    btn.disabled = true;

    try {
      // В реальном проекте здесь будет POST запрос на вебхук n8n, 
      // который создаст платеж в ЮKassa и вернет ссылку

      /*
      const response = await fetch(N8N_WEBHOOKS.createPayment, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: id, title: title })
      });
      const data = await response.json();
      
      if (data.confirmationUrl) {
          // Перенаправляем пользователя на страницу оплаты ЮKassa
          window.location.href = data.confirmationUrl;
      } else {
          throw new Error('Не получена ссылка на оплату');
      }
      */

      // Симуляция задержки ответа сервера ЮKassa
      setTimeout(() => {
        alert(`Демо: Перенаправление на оплату шаблона "${title}" в ЮKassa...`);
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 1500);

    } catch (error) {
      console.error('Ошибка оплаты:', error);
      alert('Произошла ошибка при инициализации платежа. Попробуйте позже.');
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  },

  // ----------------------------------------------------
  // Виджет Telegram (Chat)
  // ----------------------------------------------------
  async handleChatSubmit(e) {
    if (e) e.preventDefault();

    const message = this.$tgChatInput.value.trim();
    if (!message) return;

    // Добавляем сообщение пользователя в интерфейс
    this.addChatMessage(message, 'user');
    this.$tgChatInput.value = '';

    const btn = this.$tgChatSubmit;
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i>';
    btn.disabled = true;
    this.$tgChatInput.disabled = true;

    try {
      const response = await fetch(N8N_WEBHOOKS.aiChat, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          sessionId: state.sessionId
        }) // Передаем сообщение и ID сессии
      });

      if (response.ok) {
        // Пробуем распарсить JSON ответ. Если n8n возвращает текст или пустоту, обрабатываем это.
        let reply = '';
        try {
          const data = await response.json();
          // Ожидаем поле reply или output от n8n, иначе берем текст целиком
          reply = data.reply || data.output || data.message || 'На сервере произошла ошибка, попробуйте позднее.';
        } catch (jsonErr) {
          reply = 'На сервере произошла ошибка, попробуйте позднее.';
        }

        this.addChatMessage(reply, 'bot');
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      this.addChatMessage('Произошла ошибка связи с сервером. Попробуйте позже.', 'bot');
    } finally {
      btn.innerHTML = originalIcon;
      btn.disabled = false;
      this.$tgChatInput.disabled = false;
      this.$tgChatInput.focus();
    }
  },

  addChatMessage(text, sender) {
    if (!this.$tgChatHistory) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `tg-message ${sender}`;
    msgDiv.innerHTML = `<div class="msg-bubble">${this.escapeHTML(text)}</div>`;

    this.$tgChatHistory.appendChild(msgDiv);

    // Скролл вниз к новому сообщению
    this.$tgChatHistory.scrollTop = this.$tgChatHistory.scrollHeight;
  },

  escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g,
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
};

// Запуск приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
