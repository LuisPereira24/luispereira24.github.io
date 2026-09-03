/**
 * Carrinho AJAX — liga o botão "ADD TO CART" da página de produto (mesmo
 * markup/CSS do protótipo) ao endpoint AJAX real do WooCommerce, e
 * actualiza o "(N)" do header via wc-cart-fragments, sem recarregar a
 * página. Produtos variáveis: aguarda a variação estar seleccionada antes
 * de permitir o submit (o próprio WooCommerce valida via wc-add-to-cart-variation.js).
 */
(function ($) {
    'use strict';
    if (typeof jQuery === 'undefined' || typeof loopclubCart === 'undefined') return;

    var wcAjaxUrl = loopclubCart.wc_ajax_url.toString().replace('%%endpoint%%', 'add_to_cart');

    function feedback($btn, added, qty) {
        var $label = $btn.find('[data-add-label]');
        if (!$label.length) return;
        var restore = $btn.data('default-label') || $label.text();
        $btn.data('default-label', restore);
        if (added) {
            $label.text('ADDED (' + qty + ') ✓');
            $btn.addClass('is-added').attr('aria-pressed', 'true');
            window.clearTimeout($btn.data('loopclubTimer'));
            var t = window.setTimeout(function () {
                $label.text(restore);
                $btn.removeClass('is-added').attr('aria-pressed', 'false');
            }, 2400);
            $btn.data('loopclubTimer', t);
        }
    }

    /* Stepper de quantidade — liga directamente ao input real name="quantity"
       (o WooCommerce precisa do valor real no submit, ao contrário do
       protótipo original que só tinha um <span> decorativo). */
    $(document.body).on('click', '[data-qty-decrease]', function () {
        if ($(this).closest('[data-cart-row]').length) return; // carrinho: ver initCartQty()
        var $input = $(this).closest('[data-qty]').find('[data-qty-value]');
        var v = Math.max(1, (parseInt($input.val(), 10) || 1) - 1);
        $input.val(v).trigger('change');
    });
    $(document.body).on('click', '[data-qty-increase]', function () {
        if ($(this).closest('[data-cart-row]').length) return; // carrinho: ver initCartQty()
        var $input = $(this).closest('[data-qty]').find('[data-qty-value]');
        var v = (parseInt($input.val(), 10) || 1) + 1;
        $input.val(v).trigger('change');
    });

    /* ---------------------------------------------------------------
       CARRINHO — quantidade com efeito imediato.
       Os botões deixam de mexer só no campo: falam com o servidor
       (loopclub_update_cart_item) e reescrevem total da linha, subtotal,
       total e o "(N)" do header. Chegar a 0 remove o artigo.
       --------------------------------------------------------------- */
    function paintCartCount(n) {
        var $link = $('.site-nav__item--cart .site-nav__link');
        $link.find('[data-cart-count], [data-text]').text('(' + n + ')');
        $link.attr('aria-label', 'Cart, ' + n + ' items');
    }

    function updateCartItem($row, qty) {
        if ($row.data('busy')) return;
        $row.data('busy', true).addClass('is-updating');

        $.post(loopclubCart.ajax_url, {
            action: 'loopclub_update_cart_item',
            nonce: loopclubCart.nonce,
            key: $row.data('key'),
            qty: qty
        }).done(function (res) {
            if (!res || !res.success) {
                if (res && res.data && res.data.message) window.alert(res.data.message);
                return;
            }
            var d = res.data;

            if (d.removed) {
                $row.slideUp(180, function () { $row.remove(); });
            } else {
                $row.find('[data-qty-value]').val(d.quantity);
                $row.find('[data-cart-line-total]').html(d.line_total);
            }

            $('[data-cart-subtotal]').html(d.subtotal);
            $('[data-cart-grand-total]').html(d.total);
            $('[data-shop-count], [data-cart-count-num]').text(d.count);
            paintCartCount(d.count);

            if (d.cart_empty) window.location.reload(); // mostra o estado vazio do protótipo
        }).always(function () {
            $row.data('busy', false).removeClass('is-updating');
        });
    }

    $(document.body).on('click', '[data-cart-row] [data-qty-increase]', function (e) {
        e.preventDefault();
        var $row = $(this).closest('[data-cart-row]');
        var cur = parseInt($row.find('[data-qty-value]').val(), 10) || 1;
        updateCartItem($row, cur + 1);
    });

    $(document.body).on('click', '[data-cart-row] [data-qty-decrease]', function (e) {
        e.preventDefault();
        var $row = $(this).closest('[data-cart-row]');
        var cur = parseInt($row.find('[data-qty-value]').val(), 10) || 1;
        updateCartItem($row, Math.max(0, cur - 1)); // 0 = remover
    });

    /* Escrever o número à mão também vale. */
    $(document.body).on('change', '[data-cart-row] [data-qty-value]', function () {
        var $row = $(this).closest('[data-cart-row]');
        var v = Math.max(0, parseInt($(this).val(), 10) || 0);
        updateCartItem($row, v);
    });

    /* Trava de submissão.
       O evento estava a disparar duas vezes por clique (2 unidades
       entravam no carrinho como 4). Duas defesas: (1) o binding é
       namespaced e removido antes de ser registado, para nunca ficar
       duplicado se o script for avaliado mais do que uma vez; (2) uma
       flag "em curso" por formulário ignora qualquer segundo submit
       enquanto o pedido AJAX ainda não respondeu. */
    var ADDING = 'loopclubAdding';

    $(document.body).off('submit.loopclub', 'form.cart').on('submit.loopclub', 'form.cart', function (e) {
        var $form = $(this);
        if ($form.hasClass('grouped_form') || $form.find('[name="add-to-cart"]').length === 0 && !$form.data('product_id')) {
            return; // formulários que o WooCommerce já sabe tratar sozinho
        }
        e.preventDefault();
        e.stopImmediatePropagation();

        if ($form.data(ADDING)) return;
        $form.data(ADDING, true);

        var $btn = $form.find('.single_add_to_cart_button, [data-add-to-cart]').first();
        var qty  = $form.find('input.qty').val() || 1;

        if ($btn.hasClass('disabled')) { $form.data(ADDING, false); return; } // variação em falta

        /* CAUSA DA ADIÇÃO EM DOBRO.
           O endpoint WC_AJAX::add_to_cart lê $_POST['product_id'] +
           $_POST['quantity']. Mas o WooCommerce tem TAMBÉM um segundo
           mecanismo, o WC_Form_Handler::add_to_cart_action(), ligado ao
           'wp_loaded' — esse dispara sempre que existir um campo
           "add-to-cart" no pedido, seja qual for o URL.
           Ao enviar o formulário serializado tal e qual (que inclui
           add-to-cart=ID) MAIS o product_id, os dois mecanismos corriam
           no mesmo pedido e cada um adicionava a quantidade pedida — daí
           2 unidades entrarem como 4. Não era duplo submit; era um só
           pedido processado duas vezes do lado do servidor.
           Solução: remover "add-to-cart" (e o "quantity" repetido) do
           payload e enviar apenas os parâmetros do endpoint AJAX. */
        var productId   = $form.find('[name="add-to-cart"]').val() || $form.data('product_id') || 0;
        var variationId = $form.find('[name="variation_id"]').val() || 0;

        var payload = $form.serializeArray().filter(function (field) {
            return field.name !== 'add-to-cart' && field.name !== 'quantity' && field.name !== 'product_id';
        });
        payload.push({ name: 'product_id', value: productId });
        payload.push({ name: 'quantity', value: qty });
        if (variationId) payload.push({ name: 'variation_id', value: variationId });

        var data = $.param(payload);

        $btn.addClass('loading').prop('disabled', true);

        $.ajax({
            type: 'POST',
            url: wcAjaxUrl,
            data: data,
            dataType: 'json'
        }).done(function (response) {
            if (!response || response.error) {
                if (response && response.product_url) window.location = response.product_url;
                return;
            }
            $(document.body).trigger('added_to_cart', [response.fragments, response.cart_hash, $btn]);
            $(document.body).trigger('wc_fragment_refresh');
            feedback($btn, true, qty);
        }).always(function () {
            $btn.removeClass('loading').prop('disabled', false);
            $form.data(ADDING, false);
        });
    });
})(jQuery);
