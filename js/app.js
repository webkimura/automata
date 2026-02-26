/**
 * Основной скрипт приложения (SPA)
 * Управляет навигацией, загрузкой контента из n8n и корзиной.
 */

// URL вебхуков n8n (заменить их на свои)
const N8N_WEBHOOKS = {
  templates: 'https://your-n8n-domain.com/webhook/get-templates',
  news: 'https://your-n8n-domain.com/webhook/get-news',
  guides: 'https://your-n8n-domain.com/webhook/get-guides',
  video: 'https://your-n8n-domain.com/webhook/get-video',
  createPayment: 'https://your-n8n-domain.com/webhook/create-payment',
  telegramContact: 'https://your-n8n-domain.com/webhook/telegram-contact' // ЗАМЕНИТЕ ЭТО НА СВОЙ ВЕБХУК
};

// Состояние приложения
const state = {
  currentRoute: 'home',
  cart: [],
  templates: [],
  articles: []
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
      if (hash.startsWith('article-')) {
        const id = parseInt(hash.replace('article-', ''));
        // Сначала загружаем гайды (чтобы статьи были в state), затем открываем
        this.loadGuides().then(() => this.openArticle(id));
      } else {
        this.navigate(hash);
      }
    } else {
      this.renderRoute('home');
    }

    this.updateCartBadge();
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
    this.$tgWidgetForm = document.getElementById('tg-widget-form');
    this.$tgWidgetSuccess = document.getElementById('tg-widget-success');
    this.$tgWidgetError = document.getElementById('tg-widget-error');
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

    if (this.$tgWidgetForm) {
      this.$tgWidgetForm.addEventListener('submit', (e) => this.handleTgSubmit(e));
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
      if (route === 'guides') this.loadGuides();
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
      guides: {
        title: 'Обучающие статьи и гайды по n8n | n8nStore',
        desc: 'Изучите базу знаний по работе с n8n, JSON, HTTP запросами и архитектурой автоматизаций.'
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
      // В реальной жизни: const response = await fetch(N8N_WEBHOOKS.templates);
      grid.innerHTML = '<div class="loader"><i class="bx bx-loader-alt bx-spin"></i> Загрузка шаблонов...</div>';

      setTimeout(() => {
        const mockData = [
          { id: 1, title: 'Telegram Бот + AI', price: '1 500 ₽', desc: 'Готовый бот для поддержки на базе OpenAI. Отвечает по базе знаний.', icon: 'bx-bot' },
          { id: 2, title: 'Парсер RSS в Telegram', price: '900 ₽', desc: 'Сборщик новостей из RSS-лент с автопубликацией в ваш канал.', icon: 'bx-news' },
          { id: 3, title: 'Синхронизация Лидов CRM', price: '2 000 ₽', desc: 'Автоматическая передача заявок с сайта прямо в воронку продаж.', icon: 'bx-sync' },
          { id: 4, title: 'Генератор Отчетов Google Sheets', price: '1 200 ₽', desc: 'Сбор статистики из рекламных кабинетов в удобную таблицу.', icon: 'bx-spreadsheet' }
        ];
        state.templates = mockData;
        this.renderItems(grid, mockData, 'template');
      }, 800);
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

  async loadGuides() {
    const list = document.getElementById('guides-list');
    list.innerHTML = '<div class="loader"><i class="bx bx-loader-alt bx-spin"></i> Подгрузка статей...</div>';
    setTimeout(() => {
      const mockGuides = [
        {
          id: 201,
          title: 'Основы работы с JSON для n8n',
          category: 'Начинающим',
          readTime: '5 мин',
          content: '<h3>Что такое JSON?</h3><p>JSON (JavaScript Object Notation) — это простой формат обмена данными, удобный для чтения и записи как человеком, так и компьютером...</p><p>В n8n все данные между узлами (нодами) передаются в формате массива JSON объектов. Если вы поймете этот принцип, автоматизация станет интуитивной.</p>'
        },
        { id: 202, title: 'Обработка ошибок в тяжелых сценариях', category: 'Продвинутым', readTime: '12 мин', content: '<p>Контент гайда об обработке ошибок...</p>' },
        { id: 203, title: 'Best Practices архитектуры автоматизации', category: 'Архитектура', readTime: '15 мин', content: '<p>Контент про архитектуру...</p>' },
        { id: 204, title: 'Гайд: Работа с HTTP Request Node', category: 'Основы', readTime: '8 мин', content: '<p>Контент про HTTP запросы...</p>' }
      ];
      state.articles = mockGuides;
      this.renderItems(list, mockGuides, 'guide');
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
                        <button class="btn btn-primary btn-glow" onclick="event.stopPropagation(); app.buyTemplate(${item.id}, '${item.title}')" aria-label="Купить ${item.title}">
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
    } else if (type === 'guide') {
      html = items.map(item => `
                <article class="guide-card glass-panel fade-in">
                    <div class="guide-meta">
                        <span class="badge" aria-label="Категория: ${item.category}">${item.category}</span>
                        <span class="read-time" aria-label="Время чтения: ${item.readTime}"><i class='bx bx-time-five' aria-hidden="true"></i> ${item.readTime}</span>
                    </div>
                    <h3>${item.title}</h3>
                    <button class="btn btn-outline" style="margin-top: 15px; width: 100%;" onclick="app.openArticle(${item.id})">Читать статью</button>
                </article>
            `).join('');
      // the guide container template has class items-grid so we just drop it in
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
                        <button class="btn btn-primary btn-glow" onclick="app.buyTemplate(${item.id}, '${item.title}')" aria-label="Купить ${item.title}">
                            <i class='bx bx-credit-card' aria-hidden="true"></i> Купить шаблон
                        </button>
                    </div>
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

  openArticle(id) {
    // Меняем URL (но без перезагрузки)
    window.location.hash = 'article-' + id;
    state.currentRoute = 'article';

    // Очищаем активное меню
    this.$navLinks.forEach(link => link.classList.remove('active'));

    // Ищем и вставляем шаблон статьи (на полный экран, вместо модалки)
    const template = document.getElementById('tpl-article');
    if (template) {
      const content = template.content.cloneNode(true);
      this.$appContent.innerHTML = '';
      content.firstElementChild.classList.add('fade-in');
      this.$appContent.appendChild(content);
      window.scrollTo(0, 0);

      // Загружаем данные статьи (в реальности тут будет fetch по id)
      const articleContent = document.getElementById('article-content');
      const articleTitle = document.getElementById('article-title');
      const articleMeta = document.getElementById('article-meta');

      setTimeout(() => {
        const article = state.articles.find(a => a.id === id);
        if (article) {
          articleTitle.textContent = article.title;
          articleMeta.innerHTML = `<span class="badge" aria-label="Категория">${article.category}</span>
                                             <span class="read-time" style="margin-left: 15px;"><i class='bx bx-time-five' aria-hidden="true"></i> ${article.readTime}</span>`;
          articleContent.innerHTML = article.content || '<p>Текст статьи не найден.</p>';
        } else {
          articleContent.innerHTML = '<p class="error">Статья не найдена или была удалена.</p>';
          articleTitle.textContent = 'Ошибка загрузки';
        }
      }, 400); // симуляция загрузки
    }
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

  updateCartBadge() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
      badge.textContent = state.cart.length;
      if (state.cart.length > 0) {
        badge.classList.add('pulse'); // Анимация при добавлении
        setTimeout(() => badge.classList.remove('pulse'), 300);
      }
    }
  },

  // ----------------------------------------------------
  // Виджет Telegram
  // ----------------------------------------------------
  async handleTgSubmit(e) {
    e.preventDefault();

    const btn = document.getElementById('tg-submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Отправка...';
    btn.disabled = true;

    const formData = new FormData(this.$tgWidgetForm);
    const data = {
      name: formData.get('name'),
      contact: formData.get('contact'),
      message: formData.get('message')
    };

    try {
      const response = await fetch(N8N_WEBHOOKS.telegramContact, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      // Считаем успешным любой ответ, так как n8n webhook обычно возвращает 200
      if (response.ok) {
        this.$tgWidgetForm.style.display = 'none';
        if (this.$tgWidgetWindow.querySelector('.tg-widget-body > p')) {
          this.$tgWidgetWindow.querySelector('.tg-widget-body > p').style.display = 'none';
        }
        this.$tgWidgetSuccess.classList.remove('hidden');

        // Очистка формы для будущего
        setTimeout(() => {
          this.$tgWidgetForm.reset();
          this.$tgWidgetForm.style.display = 'block';
          if (this.$tgWidgetWindow.querySelector('.tg-widget-body > p')) {
            this.$tgWidgetWindow.querySelector('.tg-widget-body > p').style.display = 'block';
          }
          this.$tgWidgetSuccess.classList.add('hidden');
          this.$tgWidgetWindow.classList.add('hidden');
        }, 5000);
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (error) {
      console.error('Ошибка отправки формы:', error);
      this.$tgWidgetForm.style.display = 'none';
      if (this.$tgWidgetWindow.querySelector('.tg-widget-body > p')) {
        this.$tgWidgetWindow.querySelector('.tg-widget-body > p').style.display = 'none';
      }
      this.$tgWidgetError.classList.remove('hidden');

      setTimeout(() => {
        this.$tgWidgetForm.style.display = 'block';
        if (this.$tgWidgetWindow.querySelector('.tg-widget-body > p')) {
          this.$tgWidgetWindow.querySelector('.tg-widget-body > p').style.display = 'block';
        }
        this.$tgWidgetError.classList.add('hidden');
      }, 5000);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
};

// Запуск приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
