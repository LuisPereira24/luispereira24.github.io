var toggle  = document.getElementById('menu-toggle');
var siteNav = document.getElementById('site-nav');

(function() {
	if (!toggle || !siteNav) return;
	function openMenu() {
		siteNav.classList.add('is-open');
		toggle.setAttribute('aria-expanded', 'true');
	}
	function closeMenu() {
		siteNav.classList.remove('is-open');
		toggle.setAttribute('aria-expanded', 'false');
	}
	toggle.addEventListener('click', function() {
		siteNav.classList.contains('is-open') ? closeMenu() : openMenu();
	});
	document.querySelectorAll('.mobile-link').forEach(function(link) {
		link.addEventListener('click', closeMenu);
	});
})();

var servicosImg = document.querySelector('#frame-img')
var servicosItems = document.querySelectorAll('.frame-text')

servicosItems.forEach(function(item) {
	var contentClass = item.classList.contains('frame-content1') ? 'servicos-content1' :
		item.classList.contains('frame-content2') ? 'servicos-content2' :
		item.classList.contains('frame-content3') ? 'servicos-content3' : ''

	if (!contentClass) return;

	item.addEventListener('mouseover', function() {
		servicosImg.classList.add(contentClass);
	});

	item.addEventListener('mouseout', function() {
		servicosImg.classList.remove(contentClass);
	});
});


/* BLOG */

window.onload = function() {
    var botoes = document.querySelectorAll('.btns-blog .categorias');
    var cards = document.querySelectorAll('.card-blog');

    for (var i = 0; i < botoes.length; i++) {
        
        botoes[i].addEventListener('click', function(evento) {
            evento.preventDefault();
            this.classList.toggle('active');
            var categoriasAtivas = [];
            
            for (var j = 0; j < botoes.length; j++) {
                if (botoes[j].classList.contains('active')) {
                    var nomeDaCategoria = botoes[j].getAttribute('data-category');
                    categoriasAtivas.push(nomeDaCategoria);
                }
            }
            if (categoriasAtivas.length === 0) {
                for (var k = 0; k < cards.length; k++) {
                    cards[k].style.display = '';
				}
                return;
            }
            for (var k = 0; k < cards.length; k++) {
                var card = cards[k];
                var categoriasCard = card.getAttribute('data-categories');
                var mostrarCard = false;
                for (var m = 0; m < categoriasAtivas.length; m++) {
                    var categoriaFiltro = categoriasAtivas[m];
                    if (categoriasCard.indexOf(categoriaFiltro) !== -1) {
                        mostrarCard = true;
                    }
                }
                if (mostrarCard === true) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            }
        });
    }
};

/* CONTACTOS */

document.querySelectorAll('.faq-btn').forEach(function(btn) {
	btn.addEventListener('click', function() {
		var item   = this.closest('.faq-item');
		var body   = item.querySelector('.faq-body');
		var isOpen = item.classList.contains('is-open');
		document.querySelectorAll('.faq-item.is-open').forEach(function(el) {
			el.classList.remove('is-open');
			el.querySelector('.faq-btn').setAttribute('aria-expanded', 'false');
			el.querySelector('.faq-body').style.maxHeight = null;
		});
		if (!isOpen) {
			item.classList.add('is-open');
			this.setAttribute('aria-expanded', 'true');
			body.style.maxHeight = body.scrollHeight + 'px';
		}
	});
});

/* ANIMAÇÃO LOGOS */

var track = document.querySelector('.logos-track');

track.innerHTML += track.innerHTML;

var position = 0;
var speed = 1;

function animate() {
	position += speed;

	if (position >= track.scrollWidth / 2) {
		position = 0;
	}

	track.style.transform = `translateX(${position}px)`;

	requestAnimationFrame(animate);
}

animate();
