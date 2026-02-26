// Анимация частиц на фоне (с параллакс эффектом)
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.createElement('canvas');
  canvas.id = 'bg-canvas';
  // Настройки стилей для canvas, чтобы он был фоном на весь экран
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '-1';
  canvas.style.pointerEvents = 'none'; // Чтобы клики проходили сквозь него
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  let mouse = { x: null, y: null, targetX: null, targetY: null };

  // Устанавливаем размеры канваса и пересоздаем частицы при ресайзе
  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initParticles();
  }

  window.addEventListener('resize', resize);

  // Отслеживаем координаты мыши для параллакса
  window.addEventListener('mousemove', (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
  });

  // Плавное следование за мышью
  function updateMouse() {
    if (mouse.targetX !== null) {
      if (mouse.x === null) {
        mouse.x = mouse.targetX;
        mouse.y = mouse.targetY;
      } else {
        mouse.x += (mouse.targetX - mouse.x) * 0.05; // Плавность (0.05)
        mouse.y += (mouse.targetY - mouse.y) * 0.05;
      }
    }
  }

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      // Размер частицы
      this.size = Math.random() * 1.5 + 1;

      // Базовые координаты (без параллакса)
      this.baseX = this.x;
      this.baseY = this.y;

      // Скорость её собственного движения
      this.speedX = (Math.random() - 0.5) * 0.7;
      this.speedY = (Math.random() - 0.5) * 0.7;

      // Множитель параллакса для создания объема: чем меньше, тем дальше (медленнее двигается)
      this.parallaxFactor = (Math.random() * 0.06) + 0.02;
    }

    update() {
      this.baseX += this.speedX;
      this.baseY += this.speedY;

      // Отражение от краев (или перенос на другую сторону)
      if (this.baseX < 0) this.baseX = width;
      if (this.baseX > width) this.baseX = 0;
      if (this.baseY < 0) this.baseY = height;
      if (this.baseY > height) this.baseY = 0;

      // Расчет смещения от параллакса (относительно центра экрана)
      let dx = 0;
      let dy = 0;
      if (mouse.x !== null) {
        dx = (mouse.x - width / 2) * this.parallaxFactor;
        dy = (mouse.y - height / 2) * this.parallaxFactor;
      }

      this.x = this.baseX - dx;
      this.y = this.baseY - dy;
    }

    draw() {
      // Цвет частицы (акцентный n8n - #ff6d5a)
      ctx.fillStyle = 'rgba(255, 109, 90, 0.5)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function initParticles() {
    particles = [];
    // Плотность частиц зависит от размера экрана, максимум 150 штук
    let numParticles = Math.min(Math.floor((width * height) / 8000), 150);
    for (let i = 0; i < numParticles; i++) {
      particles.push(new Particle());
    }
  }

  function animate() {
    // Очищаем канвас
    ctx.clearRect(0, 0, width, height);
    updateMouse();

    // Обновляем позиции всех частиц
    particles.forEach(p => p.update());

    // Рисуем соединительные линии (Web)
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        let dx = particles[i].x - particles[j].x;
        let dy = particles[i].y - particles[j].y;
        let dist = dx * dx + dy * dy;

        // Если частицы близко (< ~120px) — соединяем линией
        if (dist < 14400) {
          let opacity = 1 - (dist / 14400);
          // Линии более прозрачные, чем сами точки
          ctx.strokeStyle = `rgba(255, 109, 90, ${opacity * 0.25})`;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Рисуем сами точки поверх линий
    particles.forEach(p => p.draw());

    requestAnimationFrame(animate);
  }

  resize();
  animate();
});
