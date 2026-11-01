// Включаем «js»-режим: без него меню и фильтры остаются открытыми.
document.documentElement.classList.replace('no-js', 'js');

// ---------- Мобильное меню ----------

const navToggle = document.querySelector('.site-nav-toggle');
const siteNav = document.getElementById('site-nav');

if (navToggle && siteNav) {
  // Открыть или закрыть меню и синхронизировать состояние кнопки.
  const setNavState = (open) => {
    siteNav.classList.toggle('site-nav--open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  };

  navToggle.addEventListener('click', () => {
    setNavState(navToggle.getAttribute('aria-expanded') !== 'true');
  });

  // После перехода по ссылке меню закрывается.
  siteNav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setNavState(false);
  });

  // Esc закрывает меню и возвращает фокус на кнопку.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && siteNav.classList.contains('site-nav--open')) {
      setNavState(false);
      navToggle.focus();
    }
  });

  // На широком экране меню всегда открыто, состояние кнопки сбрасывается.
  const desktopQuery = window.matchMedia('(min-width: 768px)');
  const resetOnDesktop = (event) => {
    if (event.matches) setNavState(false);
  };
  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener('change', resetOnDesktop);
  } else {
    desktopQuery.addListener(resetOnDesktop);
  }
}

// ---------- Фильтры каталога на мобильном ----------

const filtersToggle = document.querySelector('.catalog-filters__toggle');
const filtersPanel = document.querySelector('.catalog-filters');

if (filtersToggle && filtersPanel) {
  filtersToggle.addEventListener('click', () => {
    const open = filtersPanel.classList.toggle('catalog-filters--open');
    filtersToggle.setAttribute('aria-expanded', String(open));
    filtersToggle.textContent = open ? 'Скрыть фильтры' : 'Показать фильтры';
  });
}

// Элементы страницы. Модальное окно есть только на главной.
const orderDialog = document.getElementById('order-dialog');
const orderButtons = document.querySelectorAll('.product-card__button[data-product]');
const closeDialogButton = document.getElementById('close-order-dialog');
const selectedProductInput = document.getElementById('selected-product');
const selectedProductName = document.getElementById('selected-product-name');
const successMessage = document.getElementById('success-message');

let successTimer;

// Русский текст ошибки в зависимости от того, какое правило нарушено.
function getErrorMessage(field) {
  const state = field.validity;

  if (state.valueMissing) {
    if (field.type === 'checkbox') return 'Необходимо согласие на обработку данных.';
    if (field.tagName === 'SELECT') return 'Выберите тему заявки.';
    return 'Заполните это поле.';
  }
  if (state.typeMismatch) return 'Введите корректный e-mail, например example@mail.ru.';
  if (state.tooShort) return `Минимум символов: ${field.minLength}.`;
  if (state.patternMismatch) return 'Введите телефон в формате +7 (900) 000-00-00.';
  return 'Проверьте значение поля.';
}

// Показываем ошибку: рамка (aria-invalid) и текст под полем.
function showError(field) {
  const errorId = `${field.id}-error`;
  let error = document.getElementById(errorId);

  if (!error) {
    error = document.createElement('small');
    error.id = errorId;
    error.className = 'order-form__error';
    field.closest('.order-form__field').append(error);
  }

  error.textContent = getErrorMessage(field);
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-describedby', errorId);
}

// Убираем ошибку у поля.
function clearError(field) {
  field.removeAttribute('aria-invalid');
  field.removeAttribute('aria-describedby');
  const error = document.getElementById(`${field.id}-error`);
  if (error) error.remove();
}

// Поля формы, которые проверяются браузером.
function getFields(form) {
  return Array.from(form.querySelectorAll('input, select, textarea')).filter((field) => field.willValidate);
}

// Уведомление об успехе: показываем и скрываем через 5 секунд.
function showSuccess() {
  if (!successMessage) return;
  successMessage.hidden = false;
  clearTimeout(successTimer);
  successTimer = setTimeout(() => {
    successMessage.hidden = true;
  }, 5000);
}

if (orderDialog) {
  orderButtons.forEach((button) => {
    button.addEventListener('click', () => {
      // Записываем товар в скрытое поле и показываем его в заголовке окна.
      selectedProductInput.value = button.dataset.product;
      selectedProductName.textContent = button.dataset.product;
      document.getElementById('dialog-topic').value = 'product';
      orderDialog.showModal();
    });
  });

  closeDialogButton.addEventListener('click', () => orderDialog.close());

  // Клик по затемнённому фону (за пределами окна) закрывает окно.
  orderDialog.addEventListener('click', (event) => {
    const rect = orderDialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (event.target === orderDialog && !inside) orderDialog.close();
  });

  // При закрытии убираем ошибки, чтобы окно открывалось «чистым».
  orderDialog.addEventListener('close', () => {
    getFields(orderDialog.querySelector('.order-form')).forEach(clearError);
  });
}

// Обработка всех форм заявки (в модальном окне и на странице order.html).
document.querySelectorAll('.order-form').forEach((form) => {
  const fields = getFields(form);

  // Если поле уже помечено ошибкой, перепроверяем его при вводе.
  fields.forEach((field) => {
    const eventName = field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'input';
    field.addEventListener(eventName, () => {
      if (!field.hasAttribute('aria-invalid')) return;
      if (field.checkValidity()) {
        clearError(field);
      } else {
        showError(field);
      }
    });
  });

  form.addEventListener('reset', () => fields.forEach(clearError));

  form.addEventListener('submit', (event) => {
    // Backend пока не подключён, поэтому отменяем стандартную отправку.
    event.preventDefault();

    fields.forEach(clearError);
    const invalidFields = fields.filter((field) => !field.checkValidity());

    if (invalidFields.length > 0) {
      invalidFields.forEach(showError);
      invalidFields[0].focus();
      return;
    }

    form.reset();

    // Закрываем модальное окно, если форма была в нём.
    if (orderDialog && orderDialog.contains(form)) {
      orderDialog.close();
    }

    showSuccess();
  });
});
