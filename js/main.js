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
    error.setAttribute('role', 'alert');
    field.closest('.order-form__field').append(error);
  }

  error.textContent = getErrorMessage(field);
  field.setAttribute('aria-invalid', 'true');
  // Подсказку формата (если есть) оставляем в описании вместе с ошибкой.
  const base = field.dataset.baseDescribedby;
  field.setAttribute('aria-describedby', base ? `${base} ${errorId}` : errorId);
}

// Убираем ошибку у поля.
function clearError(field) {
  field.removeAttribute('aria-invalid');
  if (field.dataset.baseDescribedby) {
    field.setAttribute('aria-describedby', field.dataset.baseDescribedby);
  } else {
    field.removeAttribute('aria-describedby');
  }
  const error = document.getElementById(`${field.id}-error`);
  if (error) error.remove();
}

// Поля формы, которые проверяются браузером.
function getFields(form) {
  const fields = Array.from(form.querySelectorAll('input, select, textarea')).filter((field) => field.willValidate);
  // Запоминаем исходный aria-describedby (подсказка формата телефона).
  fields.forEach((field) => {
    if (field.dataset.baseDescribedby === undefined && field.hasAttribute('aria-describedby')) {
      field.dataset.baseDescribedby = field.getAttribute('aria-describedby');
    }
  });
  return fields;
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

// Мобильное меню: кнопка «Меню» открывает и закрывает список ссылок.
// Состояние хранится в aria-expanded, видимость меню задаёт CSS (класс is-open).
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.getElementById('site-nav');

if (navToggle && siteNav) {
  const desktopQuery = window.matchMedia('(min-width: 768px)');

  function setNavOpen(open) {
    siteNav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  }

  navToggle.addEventListener('click', () => {
    setNavOpen(navToggle.getAttribute('aria-expanded') !== 'true');
  });

  // Escape закрывает меню и возвращает фокус на кнопку.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
      setNavOpen(false);
      navToggle.focus();
    }
  });

  // Переход по ссылке меню (в том числе по якорю на той же странице) закрывает меню.
  siteNav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setNavOpen(false);
  });

  // Клик вне шапки закрывает меню.
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) setNavOpen(false);
  });

  // При переходе на планшет/desktop меню всегда показано, сбрасываем состояние кнопки.
  desktopQuery.addEventListener('change', () => setNavOpen(false));
}
