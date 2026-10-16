/* Анкета записи в «Андромеда Техспейс»
   Одна форма на все лендинги. Заявка уходит в приёмную школы:
   e-mail andromeda.space@ya.ru (основной канал) + мгновенное уведомление менеджеру. */

(function () {
  'use strict';

  // Канал мгновенной доставки заявки (доставляется в приёмную школы и на e-mail)
  var RELAY_TOPIC = 'andromeda_techspace_zayavka_2026';
  var RELAY_URL = 'https://ntfy.sh/' + RELAY_TOPIC;
  var EMAIL = 'andromeda.space@ya.ru';

  var MAX_CHILDREN = 5;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function childBlock(i) {
    return '' +
      '<div class="child-block" data-child="' + i + '">' +
        '<h4>Ребёнок ' + i + '</h4>' +
        '<div class="form-row">' +
          '<div class="form-group">' +
            '<label for="fio' + i + '">Фамилия и имя ребёнка *</label>' +
            '<input type="text" id="fio' + i + '" name="fio' + i + '" placeholder="Иванов Иван" required>' +
          '</div>' +
          '<div class="form-group">' +
            '<label for="age' + i + '">Возраст ребёнка *</label>' +
            '<select id="age' + i + '" name="age' + i + '" required>' +
              '<option value="">Выберите возраст</option>' +
              '<option>6</option><option>7</option><option>8</option><option>9</option><option>10</option>' +
              '<option>11</option><option>12</option><option>13</option><option>14</option>' +
              '<option>15</option><option>16</option><option>17</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function formHtml(ctx) {
    var opts = '';
    for (var n = 1; n <= MAX_CHILDREN; n++) {
      opts += '<option value="' + n + '">' + n + (n === 1 ? ' ребёнок' : ' детей') + '</option>';
    }
    return '' +
      '<form id="anketaForm" novalidate>' +
        '<input type="hidden" name="landing" value="' + esc(ctx) + '">' +
        '<div class="form-row">' +
          '<div class="form-group">' +
            '<label for="phone">Телефон родителя *</label>' +
            '<input type="tel" id="phone" name="phone" placeholder="+7 (___) ___-__-__" required>' +
          '</div>' +
          '<div class="form-group">' +
            '<label for="children">Количество детей *</label>' +
            '<select id="children" name="children" required>' + opts + '</select>' +
          '</div>' +
        '</div>' +
        '<div id="childrenWrap">' + childBlock(1) + '</div>' +
        '<div class="form-group">' +
          '<label for="comment">Комментарий</label>' +
          '<textarea id="comment" name="comment" placeholder="Удобное время занятий, вопросы"></textarea>' +
        '</div>' +
        '<label class="checkbox">' +
          '<input type="checkbox" id="consent" name="consent" required>' +
          '<span>Согласен(на) на обработку персональных данных ребёнка и своих данных ' +
          'в соответствии с политикой конфиденциальности АНО «ЛИС ПТП «Андромеда» *</span>' +
        '</label>' +
        '<button type="submit" class="form-submit" id="anketaSubmit">Записаться на бесплатное пробное занятие</button>' +
        '<p class="form-note" id="anketaNote">Заявка поступает в приёмную школы: ' + EMAIL +
        ' и менеджеру — обычно отвечаем в течение рабочего дня.</p>' +
      '</form>';
  }

  function render() {
    var spots = document.querySelectorAll('[data-anketa]');
    for (var i = 0; i < spots.length; i++) {
      var spot = spots[i];
      var ctx = spot.getAttribute('data-anketa') || 'site';
      spot.innerHTML = formHtml(ctx);
      bind(spot);
    }
  }

  function bind(spot) {
    var form = spot.querySelector('#anketaForm');
    var wrap = spot.querySelector('#childrenWrap');
    var sel = spot.querySelector('#children');
    var comment = spot.querySelector('#comment');

    // поле «комментарий» должно идти после блока детей
    function applyCount() {
      var n = parseInt(sel.value, 10) || 1;
      var html = '';
      for (var i = 1; i <= n; i++) html += childBlock(i);
      wrap.innerHTML = html;
    }
    sel.addEventListener('change', applyCount);
    applyCount();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = spot.querySelector('#anketaSubmit');
      var note = spot.querySelector('#anketaNote');

      var phone = spot.querySelector('#phone').value.trim();
      var consent = spot.querySelector('#consent').checked;
      var n = parseInt(sel.value, 10) || 1;

      if (phone.replace(/\D/g, '').length < 10) {
        note.textContent = 'Проверьте, пожалуйста, номер телефона.';
        note.style.color = '#c0392b';
        spot.querySelector('#phone').focus();
        return;
      }
      var children = [];
      for (var i = 1; i <= n; i++) {
        var fio = spot.querySelector('#fio' + i);
        var age = spot.querySelector('#age' + i);
        if (!fio || !fio.value.trim()) {
          note.textContent = 'Укажите фамилию и имя ребёнка' + (n > 1 ? ' ' + i : '') + '.';
          note.style.color = '#c0392b';
          if (fio) fio.focus();
          return;
        }
        if (!age.value) {
          note.textContent = 'Укажите возраст ребёнка' + (n > 1 ? ' ' + i : '') + '.';
          note.style.color = '#c0392b';
          age.focus();
          return;
        }
        children.push({ fio: fio.value.trim(), age: age.value });
      }
      if (!consent) {
        note.textContent = 'Без согласия на обработку персональных данных мы не можем принять заявку.';
        note.style.color = '#c0392b';
        spot.querySelector('#consent').focus();
        return;
      }

      var lines = [];
      lines.push('Заявка с лендинга «Андромеда Техспейс»');
      lines.push('Страница: ' + (form.querySelector('[name=landing]').value || ''));
      lines.push('Телефон: ' + phone);
      lines.push('Детей: ' + children.length);
      children.forEach(function (c, idx) {
        lines.push('Ребёнок ' + (idx + 1) + ': ' + c.fio + ', ' + c.age + ' лет');
      });
      if (comment.value.trim()) lines.push('Комментарий: ' + comment.value.trim());
      lines.push('Согласие на обработку ПД: да');
      lines.push('Время: ' + new Date().toLocaleString('ru-RU'));

      var title = 'Заявка: ' + children[0].fio + ', ' + children[0].age + ' лет — ' + phone;

      btn.disabled = true;
      btn.textContent = 'Отправляем…';

      var req = new XMLHttpRequest();
      req.open('POST', RELAY_URL, true);
      req.setRequestHeader('Title', encodeURIComponent(title));
      req.setRequestHeader('Tags', 'school,zayavka');
      req.setRequestHeader('Priority', 'high');

      var done = false;
      function finish(ok) {
        if (done) return;
        done = true;
        if (ok) {
          window.location.href = 'spasibo.html' +
            '?n=' + encodeURIComponent(children[0] ? children[0].fio : '') +
            '&from=' + encodeURIComponent(form.querySelector('[name=landing]').value || '');
        } else {
          btn.disabled = false;
          btn.textContent = 'Записаться на бесплатное пробное занятие';
          note.innerHTML = 'Не удалось отправить заявку автоматически. Позвоните нам: ' +
            '<a href="tel:+79872900593">+7 (987) 290-05-93</a> или напишите на ' +
            '<a href="mailto:' + EMAIL + '">' + EMAIL + '</a>.';
          note.style.color = '#c0392b';
        }
      }
      req.onload = function () { finish(req.status >= 200 && req.status < 300); };
      req.onerror = function () { finish(false); };
      req.timeout = 15000;
      req.ontimeout = function () { finish(false); };
      req.send(new Blob([lines.join('\n')], { type: 'text/plain' }));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
