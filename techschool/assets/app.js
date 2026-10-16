/* Андромеда Техспейс — общие скрипты лендинга */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var burger = document.querySelector('.burger');
    var links = document.querySelector('.nav-links');
    if (burger && links) {
      burger.addEventListener('click', function () {
        links.classList.toggle('open');
      });
      var items = links.querySelectorAll('a');
      for (var i = 0; i < items.length; i++) {
        items[i].addEventListener('click', function () { links.classList.remove('open'); });
      }
    }
  });
})();
