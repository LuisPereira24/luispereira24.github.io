/**
 * Protecção contra submissão dupla nos formulários do tema.
 *
 * O botão de subscrever é um ícone pequeno (a seta): é fácil carregar
 * duas vezes sem dar por isso, e cada clique disparava um pedido próprio
 * para admin-post.php — daí chegarem dois emails de boas-vindas
 * idênticos. Do lado do servidor já existe uma trava por endereço; isto
 * resolve na origem, impedindo o segundo pedido de sequer partir.
 *
 * Sem dependências: corre em qualquer página, com ou sem WooCommerce.
 */
(function () {
    'use strict';

    function guard(form) {
        if (form.dataset.loopclubGuarded) return;
        form.dataset.loopclubGuarded = '1';

        form.addEventListener('submit', function () {
            if (form.dataset.loopclubSubmitting === '1') return;
            form.dataset.loopclubSubmitting = '1';

            var buttons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
            Array.prototype.forEach.call(buttons, function (btn) {
                btn.disabled = true;
                btn.classList.add('is-submitting');
            });

            /* Rede de segurança: se a navegação não acontecer (validação do
               browser a falhar, por exemplo), devolvemos o botão ao normal
               para o utilizador poder corrigir e tentar de novo. */
            window.setTimeout(function () {
                form.dataset.loopclubSubmitting = '';
                Array.prototype.forEach.call(buttons, function (btn) {
                    btn.disabled = false;
                    btn.classList.remove('is-submitting');
                });
            }, 8000);
        });
    }

    function init() {
        var forms = document.querySelectorAll(
            'form[action*="admin-post.php"], .footer-news, .cart-signup__form'
        );
        Array.prototype.forEach.call(forms, guard);
    }

    if (document.readyState !== 'loading') init();
    else document.addEventListener('DOMContentLoaded', init);
})();
