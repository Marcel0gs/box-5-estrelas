/* Box 5 Estrelas: script único do site, usado pela home e por /projetos/.
   Cada bloco confere se o elemento dele existe antes de agir, então a página de
   projetos roda o mesmo arquivo sem topo, sem carrossel e sem placar. */
(function(){
  'use strict';
  var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* cabeçalho: fundo translúcido com blur depois de rolar */
  var topo = document.querySelector('.topo');
  function marcaTopo(){ topo.classList.toggle('rolou', scrollY > 24); }
  addEventListener('scroll', marcaTopo, {passive:true});
  marcaTopo();

  /* entrada das seções */
  var revela = document.querySelectorAll('.revela');
  if('IntersectionObserver' in window && !reduz){
    var obs = new IntersectionObserver(function(itens){
      itens.forEach(function(it){
        if(it.isIntersecting){ it.target.classList.add('is-visible'); obs.unobserve(it.target); }
      });
    },{threshold:0.14});
    revela.forEach(function(el){ obs.observe(el); });
  } else {
    revela.forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* colmeia de LED no topo: grade de hexágonos que acende perto do ponteiro,
     bem de leve (a foto já tem o LED de verdade), com faixa de luz automática
     que só começa ~10 s depois de entrar na página e passa devagar.
     Parada com movimento reduzido. */
  (function(){
    var hero = document.getElementById('inicio');
    var canvas = document.getElementById('colmeia');
    if(!hero || !canvas) return;
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0, base = null, segs = [];
    var mx = null, my = null, raf = 0, visivel = true, ultimoT = 0;
    var scanAtiva = false, scanInicio = 0, scanX = -10000, proxScan = 10000;

    function construir(){
      var dpr = Math.min(devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      base = document.createElement('canvas');
      base.width = w * dpr; base.height = h * dpr;
      var b = base.getContext('2d');
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      b.strokeStyle = 'rgba(244,244,241,0.014)';
      b.lineWidth = 1;
      segs = [];
      var R = 34, dx = 1.5 * R, dy = Math.sqrt(3) * R;
      var cols = Math.ceil(w / dx) + 2, rows = Math.ceil(h / dy) + 2;
      for(var c = 0; c < cols; c++){
        for(var r = 0; r < rows; r++){
          var cx = c * dx + R;
          var cy = r * dy + ((c % 2) ? dy / 2 : 0) - dy;
          var v = [];
          for(var k = 0; k < 6; k++){
            var ang = Math.PI / 3 * k;
            v.push([cx + R * Math.cos(ang), cy + R * Math.sin(ang)]);
          }
          b.beginPath();
          for(var i = 0; i < 6; i++){ i ? b.lineTo(v[i][0], v[i][1]) : b.moveTo(v[i][0], v[i][1]); }
          b.closePath(); b.stroke();
          for(var j = 0; j < 6; j++){
            var a1 = v[j], a2 = v[(j + 1) % 6];
            segs.push({x1:a1[0], y1:a1[1], x2:a2[0], y2:a2[1], mx:(a1[0]+a2[0])/2, my:(a1[1]+a2[1])/2, a:0});
          }
        }
      }
      if(reduz){ ctx.drawImage(base, 0, 0, w, h); }
    }

    function passo(t){
      raf = 0;
      if(!visivel) return;
      var dt = Math.min((t - ultimoT) / 1000, 0.05) || 0.016;
      ultimoT = t;
      if(!scanAtiva && t > proxScan){ scanAtiva = true; scanInicio = t; }
      if(scanAtiva){
        var p = (t - scanInicio) / 9000;
        scanX = -0.15 * w + p * w * 1.3;
        if(p >= 1){ scanAtiva = false; proxScan = t + 15000; scanX = -10000; }
      }
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(base, 0, 0, w, h);
      ctx.lineCap = 'round';
      for(var i = 0; i < segs.length; i++){
        var s = segs[i], alvo = 0, q;
        if(mx !== null){
          var dxp = s.mx - mx, dyp = s.my - my, d = Math.sqrt(dxp * dxp + dyp * dyp);
          if(d < 190){ q = 1 - d / 190; alvo = q * q * 0.10; }
        }
        if(scanAtiva){
          var ds = Math.abs(s.mx - scanX);
          if(ds < 300){ q = 1 - ds / 300; alvo = Math.max(alvo, q * q * 0.045); }
        }
        if(alvo > s.a) s.a += (alvo - s.a) * Math.min(1, dt * 2.2);
        else s.a *= Math.exp(-dt / 1.1);
        if(s.a < 0.008){ s.a = Math.max(0, s.a); continue; }
        ctx.shadowColor = 'rgba(255,246,229,' + (s.a * 0.42).toFixed(3) + ')';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(255,246,229,' + (s.a * 0.6).toFixed(3) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(passo);
    }

    function liga(){ if(raf || reduz) return; ultimoT = performance.now(); raf = requestAnimationFrame(passo); }

    function ponteiro(e){
      var r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    }
    hero.addEventListener('pointermove', ponteiro, {passive:true});
    hero.addEventListener('pointerdown', ponteiro, {passive:true});
    hero.addEventListener('pointerleave', function(){ mx = null; my = null; });

    if('IntersectionObserver' in window){
      new IntersectionObserver(function(itens){
        visivel = itens[0].isIntersecting;
        if(visivel) liga();
      }).observe(hero);
    }
    var espera = 0;
    addEventListener('resize', function(){
      clearTimeout(espera);
      espera = setTimeout(construir, 160);
    }, {passive:true});

    construir();
    liga();
  })();


  /* abertura: acender o box, uma vez por sessão (molde DeniseMota) */
  (function(){
    var intro = document.getElementById('intro');
    if(!intro || !document.documentElement.classList.contains('com-intro')) return;
    try{ history.scrollRestoration = 'manual'; }catch(e){}
    scrollTo(0, 0);
    var saiu = false;
    function sai(){
      if(saiu) return; saiu = true;
      try{ sessionStorage.setItem('intro-box5', '1'); }catch(e){}
      document.documentElement.classList.add('intro-fim');
      intro.remove();
      removeEventListener('keydown', tecla);
    }
    function tecla(e){
      if(e.metaKey || e.ctrlKey || e.altKey) return;
      sai();
    }
    intro.addEventListener('click', sai);
    intro.addEventListener('touchstart', sai, {passive:true});
    addEventListener('keydown', tecla);
    setTimeout(sai, 2600);
  })();

  /* parallax leve nas fotos do box, pela propriedade translate */
  (function(){
    if(reduz) return;
    var fotos = document.querySelectorAll('.box-foto img');
    if(!fotos.length) return;
    var raf = 0;
    function anda(){
      raf = 0;
      var vh = innerHeight;
      for(var i = 0; i < fotos.length; i++){
        var img = fotos[i];
        var r = img.parentElement.getBoundingClientRect();
        if(r.bottom < 0 || r.top > vh) continue;
        var p = ((r.top + r.height / 2) - vh / 2) / vh;
        var y = Math.max(-20, Math.min(20, p * 56));
        img.style.translate = '0 ' + y.toFixed(1) + 'px';
      }
    }
    addEventListener('scroll', function(){ if(!raf) raf = requestAnimationFrame(anda); }, {passive:true});
    addEventListener('resize', function(){ if(!raf) raf = requestAnimationFrame(anda); }, {passive:true});
    anda();
  })();

  /* lightbox da galeria, com teclado */
  (function(){
    var dlg = document.getElementById('foto-cheia');
    if(!dlg || !dlg.showModal) return;
    var img = dlg.querySelector('img');
    var legenda = dlg.querySelector('.legenda');
    var contador = dlg.querySelector('.contador');
    var itens = Array.prototype.slice.call(document.querySelectorAll('.box-foto, .proj-foto'));
    var i = 0;
    function mostra(k){
      i = (k + itens.length) % itens.length;
      var b = itens[i];
      img.src = b.getAttribute('data-grande');
      img.alt = b.getAttribute('data-legenda');
      legenda.textContent = b.getAttribute('data-legenda');
      contador.textContent = (i + 1) + ' de ' + itens.length;
    }
    itens.forEach(function(b, k){
      b.addEventListener('click', function(){ mostra(k); dlg.showModal(); });
    });
    dlg.querySelector('.fechar').addEventListener('click', function(){ dlg.close(); });
    dlg.querySelector('.anterior').addEventListener('click', function(){ mostra(i - 1); });
    dlg.querySelector('.proximo').addEventListener('click', function(){ mostra(i + 1); });
    dlg.addEventListener('keydown', function(e){
      if(e.key === 'ArrowLeft') mostra(i - 1);
      if(e.key === 'ArrowRight') mostra(i + 1);
    });
  })();

  /* avaliações (modelo da Ana Flávia, pela Pulse): as estrelas do placar se
     preenchem quando ele entra na tela, e o carrossel mostra uma avaliação por vez.
     Gira sozinho a cada 5,5 s; para com o mouse nos controles ou com o foco dentro,
     e aceita arrastar o dedo no celular. */
  (function(){
    var placar = document.querySelector('[data-placar]');
    if(placar && 'IntersectionObserver' in window && !reduz){
      placar.classList.add('placar--anima');
      var op = new IntersectionObserver(function(itens){
        itens.forEach(function(it){ if(it.isIntersecting){ placar.classList.add('contou'); op.disconnect(); } });
      },{threshold:0.35});
      op.observe(placar);
    }
    var car = document.querySelector('[data-carrossel]');
    var trilho = car ? car.querySelector('[data-trilho]') : null;
    var slides = trilho ? Array.prototype.slice.call(trilho.children) : [];
    if(slides.length < 2) return;
    car.classList.add('carrossel--on');
    var pontos = car.querySelector('[data-pontos]'), atual = 0, timer = null, botoes = [];
    function ir(n){
      atual = (n + slides.length) % slides.length;
      trilho.style.transform = 'translateX(' + (-atual * 100) + '%)';
      botoes.forEach(function(b, i){ b.setAttribute('aria-current', i === atual ? 'true' : 'false'); });
      slides.forEach(function(s, i){ s.setAttribute('aria-hidden', i === atual ? 'false' : 'true'); });
    }
    function parar(){ if(timer){ clearInterval(timer); timer = null; } }
    function girar(){ parar(); if(!reduz) timer = setInterval(function(){ ir(atual + 1); }, 5500); }
    slides.forEach(function(s, i){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ponto';
      b.setAttribute('aria-label', 'Avaliação ' + (i + 1) + ' de ' + slides.length);
      b.addEventListener('click', function(){ ir(i); girar(); });
      pontos.appendChild(b); botoes.push(b);
    });
    car.querySelector('[data-anterior]').addEventListener('click', function(){ ir(atual - 1); girar(); });
    car.querySelector('[data-proximo]').addEventListener('click', function(){ ir(atual + 1); girar(); });
    var controles = car.querySelector('.carrossel__controles');
    controles.addEventListener('mouseenter', parar);
    controles.addEventListener('mouseleave', girar);
    car.addEventListener('focusin', parar);
    car.addEventListener('focusout', girar);
    document.addEventListener('visibilitychange', function(){ if(document.hidden) parar(); else girar(); });
    var x0 = null;
    car.addEventListener('touchstart', function(e){ x0 = e.touches[0].clientX; parar(); }, {passive:true});
    car.addEventListener('touchend', function(e){
      if(x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if(Math.abs(dx) > 40) ir(atual + (dx < 0 ? 1 : -1));
      x0 = null; girar();
    }, {passive:true});
    ir(0); girar();
  })();

  /* ============================================================
     MELHORIAS
     ============================================================ */

  /* 1. título do topo em palavras, cada uma subindo de uma máscara */
  (function(){
    var alvos = document.querySelectorAll('[data-palavras]');
    if(!alvos.length) return;
    if(reduz){
      alvos.forEach(function(el){ el.classList.add('is-visivel'); });
      return;
    }
    /* quebra em palavras sem perder o <em> do destaque: a palavra de dentro dele
       continua dentro dele, com a cor. Espaço só onde havia espaço no texto. */
    var n = 0;
    function quebra(origem, destino){
      Array.prototype.slice.call(origem.childNodes).forEach(function(no){
        if(no.nodeType === 3){
          no.textContent.split(/(\s+)/).forEach(function(parte){
            if(!parte) return;
            if(/^\s+$/.test(parte)){ destino.appendChild(document.createTextNode(' ')); return; }
            var fora = document.createElement('span');
            fora.className = 'palavra';
            fora.style.setProperty('--i', n++);
            var dentro = document.createElement('i');
            dentro.textContent = parte;
            fora.appendChild(dentro);
            destino.appendChild(fora);
          });
        } else if(no.nodeType === 1){
          var copia = no.cloneNode(false);
          quebra(no, copia);
          destino.appendChild(copia);
        }
      });
    }
    alvos.forEach(function(el){
      n = 0;
      var frag = document.createDocumentFragment();
      quebra(el, frag);
      el.textContent = '';
      el.appendChild(frag);
    });
    if('IntersectionObserver' in window){
      var obs = new IntersectionObserver(function(itens){
        itens.forEach(function(it){
          if(it.isIntersecting){ it.target.classList.add('is-visivel'); obs.unobserve(it.target); }
        });
      },{threshold:0.2});
      alvos.forEach(function(el){ obs.observe(el); });
    } else {
      alvos.forEach(function(el){ el.classList.add('is-visivel'); });
    }
  })();

  /* 2. parallax: a foto anda mais devagar que a página */
  (function(){
    if(reduz) return;
    var itens = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if(!itens.length) return;
    var raf = 0;
    function anda(){
      raf = 0;
      var vh = innerHeight;
      for(var i = 0; i < itens.length; i++){
        var el = itens[i];
        var r = el.getBoundingClientRect();
        if(r.bottom < -200 || r.top > vh + 200) continue;
        var fator = parseFloat(el.getAttribute('data-parallax')) || 0.15;
        /* -1 (abaixo da tela) a 1 (acima): o meio da imagem */
        var p = ((r.top + r.height / 2) - vh / 2) / vh;
        var y = p * fator * vh;
        el.style.translate = '0 ' + y.toFixed(1) + 'px';
      }
    }
    addEventListener('scroll', function(){ if(!raf) raf = requestAnimationFrame(anda); }, {passive:true});
    addEventListener('resize', function(){ if(!raf) raf = requestAnimationFrame(anda); }, {passive:true});
    anda();
  })();

  /* 3. holofote que segue o ponteiro nas fotos do box e dos projetos */
  (function(){
    if(reduz) return;
    var alvos = document.querySelectorAll('.box-foto, .proj-foto');
    for(var i = 0; i < alvos.length; i++){
      (function(el){
        el.addEventListener('pointermove', function(e){
          var r = el.getBoundingClientRect();
          el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
          el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        }, {passive:true});
      })(alvos[i]);
    }
  })();

  /* 4. lupa de ampliar em cima das fotos que abrem em tela cheia */
  (function(){
    var alvos = document.querySelectorAll('.box-foto, .proj-foto');
    var icone = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7.5 7.5"/><path d="M3 21l7.5-7.5"/></svg>';
    for(var i = 0; i < alvos.length; i++){
      var b = document.createElement('span');
      b.className = 'zoom';
      b.setAttribute('aria-hidden', 'true');
      b.innerHTML = icone;
      alvos[i].appendChild(b);
    }
  })();

  /* 5. números que sobem até o valor */
  (function(){
    var alvos = document.querySelectorAll('[data-contador]');
    if(!alvos.length) return;
    function conta(el){
      var alvo = el.getAttribute('data-contador');
      var fim = parseFloat(alvo.replace(',', '.'));
      var casas = (alvo.split(',')[1] || '').length;
      var dur = 1100, t0 = null;
      function passo(t){
        if(!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        /* ease out */
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = (fim * e).toFixed(casas).replace('.', ',');
        if(p < 1) requestAnimationFrame(passo);
        else el.textContent = alvo;
      }
      requestAnimationFrame(passo);
    }
    if('IntersectionObserver' in window && !reduz){
      var obs = new IntersectionObserver(function(itens){
        itens.forEach(function(it){
          if(it.isIntersecting){ it.target.classList.add('is-visible'); conta(it.target); obs.unobserve(it.target); }
        });
      },{threshold:0.4});
      alvos.forEach(function(el){ obs.observe(el); });
    } else {
      alvos.forEach(function(el){ el.textContent = el.getAttribute('data-contador'); });
    }
  })();

  /* 6. como funciona (modelo do site do Marcelo): a luz de cada cartão segue o
     ponteiro. Os ícones flutuando nos vãos saíram a pedido dele (07/11/2026). */
  (function(){
    if(reduz || !matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('.passos li').forEach(function(li){
      li.addEventListener('pointermove', function(e){
        var r = li.getBoundingClientRect();
        li.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
        li.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      }, {passive:true});
    });
  })();

  /* menu do celular: os três risquinhos abrem os links (modelo do Belloni, 07/11/2026).
     Fecha ao tocar num link, fora do menu ou no Esc, e quando a tela vira computador. */
  (function(){
    var cab = document.querySelector('.topo');
    var botao = document.querySelector('.menu-btn');
    var nav = document.getElementById('menu');
    if(!cab || !botao || !nav) return;
    function abre(sim){
      cab.classList.toggle('menu-aberto', sim);
      botao.setAttribute('aria-expanded', sim ? 'true' : 'false');
      botao.setAttribute('aria-label', sim ? 'Fechar menu' : 'Abrir menu');
    }
    botao.addEventListener('click', function(){ abre(!cab.classList.contains('menu-aberto')); });
    nav.addEventListener('click', function(e){ if(e.target.closest('a')) abre(false); });
    document.addEventListener('click', function(e){ if(cab.classList.contains('menu-aberto') && !cab.contains(e.target)) abre(false); });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && cab.classList.contains('menu-aberto')){ abre(false); botao.focus(); }
    });
    var tela = matchMedia('(min-width: 881px)');
    var muda = function(m){ if(m.matches) abre(false); };
    if(tela.addEventListener) tela.addEventListener('change', muda); else if(tela.addListener) tela.addListener(muda);
  })();

  /* o botão flutuante do WhatsApp fica escondido no topo do celular (o CSS decide) e
     aparece quando a pessoa passa da metade do topo */
  (function(){
    var hero = document.getElementById('inicio');
    if(!hero) return;
    var raiz = document.documentElement;
    function marca(){ raiz.classList.toggle('passou-topo', scrollY > hero.offsetHeight * 0.55); }
    addEventListener('scroll', marca, {passive:true});
    marca();
  })();

  /* 7. barra de progresso da rolagem */
  (function(){
    var barra = document.getElementById('progresso');
    if(!barra) return;
    var raf = 0;
    function mede(){
      raf = 0;
      var alt = document.documentElement.scrollHeight - innerHeight;
      var p = alt > 0 ? Math.min(1, Math.max(0, scrollY / alt)) : 0;
      barra.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    addEventListener('scroll', function(){ if(!raf) raf = requestAnimationFrame(mede); }, {passive:true});
    addEventListener('resize', function(){ if(!raf) raf = requestAnimationFrame(mede); }, {passive:true});
    mede();
  })();

  /* 8. botão de voltar ao topo */
  (function(){
    var b = document.getElementById('voltar');
    if(!b) return;
    b.addEventListener('click', function(){
      scrollTo({top:0, behavior: reduz ? 'auto' : 'smooth'});
    });
    var raf = 0;
    function mede(){
      raf = 0;
      b.classList.toggle('visivel', scrollY > innerHeight * 0.9);
    }
    addEventListener('scroll', function(){ if(!raf) raf = requestAnimationFrame(mede); }, {passive:true});
    mede();
  })();

  /* 9. o link do menu da seção que está na tela */
  (function(){
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
    if(!links.length || !('IntersectionObserver' in window)) return;
    var secoes = links.map(function(a){
      return document.querySelector(a.getAttribute('href'));
    }).filter(Boolean);
    var obs = new IntersectionObserver(function(itens){
      itens.forEach(function(it){
        if(!it.isIntersecting) return;
        links.forEach(function(a){ a.classList.remove('ativo'); });
        var alvo = links[secoes.indexOf(it.target)];
        if(alvo) alvo.classList.add('ativo');
      });
    },{rootMargin:'-45% 0px -45% 0px'});
    secoes.forEach(function(s){ obs.observe(s); });
  })();
})();
