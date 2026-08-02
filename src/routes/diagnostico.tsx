import { createFileRoute } from "@tanstack/react-router";
import { MAX_SCORE, QUESTIONS, STAGES } from "@/lib/diagnostico";

const CSS = `
:root {
  --cream: #F7F4EC; --cream-deep: #EFE9D8; --card: #FFFFFF; --edge: #E4DDC9;
  --ink: #202B22; --ink-soft: #5B6459;
  --forest: #2F5D45; --forest-deep: #1E3E2C; --forest-tint: #E3ECE4;
  --gold: #C79A56; --gold-lt: #E3C081;
}
* { box-sizing: border-box; }
body { margin: 0; }
.dx-root { background:var(--cream); color:var(--ink); font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; min-height:100vh; position:relative; overflow-x:hidden; }
.dx-backdrop { position:fixed; inset:0; z-index:0; pointer-events:none;
  background:
    radial-gradient(60% 40% at 15% 0%, var(--forest-tint), transparent 70%),
    radial-gradient(50% 35% at 100% 100%, #F3E6C9 0%, transparent 70%);
  opacity:.9; }
.dx-shell { position:relative; z-index:1; max-width:640px; margin:0 auto; min-height:100vh; display:flex; flex-direction:column; padding:24px 20px 56px; }
.dx-top { display:flex; flex-direction:column; gap:14px; margin-bottom:8px; }
.dx-brandrow { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:12px; }
.dx-back { width:36px; height:36px; border-radius:50%; border:1px solid var(--edge); background:var(--card); color:var(--forest-deep); font-size:16px; cursor:pointer; visibility:hidden; }
.dx-back:hover { background:var(--forest-tint); }
.dx-brand { font-family:'Fraunces',Georgia,serif; font-size:15px; color:var(--forest-deep); text-align:center; letter-spacing:.02em; }
.dx-stepc { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-soft); text-align:right; min-width:82px; }
.dx-progress { height:3px; background:var(--cream-deep); border-radius:2px; overflow:hidden; margin-top:10px; }
.dx-progress > div { height:100%; background:linear-gradient(90deg, var(--forest), var(--gold)); transition:width .3s ease; width:0; }
.dx-card { background:var(--card); border:1px solid var(--edge); border-radius:20px; padding:32px 24px; margin-top:32px; box-shadow:0 4px 20px -12px rgba(30,62,44,.15); animation:dxIn .3s ease; }
@keyframes dxIn { from{opacity:0; transform:translateY(14px);} to{opacity:1; transform:translateY(0);} }
.dx-moon { font-size:32px; display:block; margin-bottom:12px; }
.dx-eyebrow { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--forest); margin-bottom:14px; font-weight:500; }
.dx-h1 { font-family:'Fraunces',Georgia,serif; font-size:28px; line-height:1.15; color:var(--ink); font-weight:500; margin:0 0 12px; }
.dx-h2 { font-family:'Fraunces',Georgia,serif; font-size:22px; line-height:1.25; color:var(--ink); font-weight:500; margin:0 0 20px; }
.dx-lede { color:var(--ink-soft); font-size:15px; line-height:1.55; margin:0 0 22px; }
.dx-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; background:linear-gradient(135deg, var(--forest), var(--forest-deep)); color:#fff; border:none; padding:14px 22px; border-radius:12px; font-size:14px; font-weight:500; cursor:pointer; width:100%; transition:transform .15s, box-shadow .15s; }
.dx-btn:hover { transform:translateY(-1px); box-shadow:0 10px 26px -8px rgba(47,93,69,.55); }
.dx-btn:active { transform:translateY(0); }
.dx-btn:disabled { opacity:.7; cursor:wait; transform:none; box-shadow:none; }
.dx-options { display:flex; flex-direction:column; gap:10px; margin-top:10px; }
.dx-opt { display:flex; align-items:center; gap:12px; text-align:left; padding:14px 16px; background:var(--card); border:1px solid var(--edge); border-radius:12px; font-size:14px; color:var(--ink); cursor:pointer; transition:border-color .15s, background .15s; width:100%; }
.dx-opt:hover { border-color:var(--forest); background:var(--forest-tint); }
.dx-tick { width:18px; height:18px; border:1.5px solid var(--edge); border-radius:50%; flex-shrink:0; }
.dx-field { margin-bottom:14px; }
.dx-field label { display:block; font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--forest-deep); margin-bottom:6px; font-weight:500; }
.dx-field input { width:100%; padding:12px 14px; border:1px solid var(--edge); border-radius:10px; font-size:15px; font-family:inherit; background:var(--card); color:var(--ink); }
.dx-field input:focus { outline:none; border-color:var(--forest); }
.dx-consent { font-size:12px; color:var(--ink-soft); margin:14px 0; line-height:1.5; }
.dx-result-stage { text-align:center; margin-bottom:20px; }
.dx-result-icon { font-size:56px; display:block; margin-bottom:6px; }
.dx-result-label { font-family:'Fraunces',Georgia,serif; font-size:24px; color:var(--forest-deep); }
.dx-insights { display:flex; flex-direction:column; gap:12px; margin:20px 0; }
.dx-insight { padding:14px; background:var(--forest-tint); border-radius:10px; font-size:14px; color:var(--ink); line-height:1.5; }
.dx-cta-block { margin-top:20px; padding:18px; background:var(--cream-deep); border-radius:14px; text-align:center; }
.dx-error { color:#b3261e; font-size:13px; margin-top:8px; }
`;

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function renderDiagnosticoHtml() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Raio-X do Sono Financeiro — Tiago Gomes Consultor</title>
  <meta name="description" content="Diagnóstico gratuito em 2 minutos: descubra se suas finanças estão tirando seu sono e o que fazer com clareza." />
  <meta property="og:title" content="Raio-X do Sono Financeiro" />
  <meta property="og:description" content="Mapeie seus pesadelos financeiros em 2 minutos e receba um plano para dormir melhor." />
  <meta property="og:type" content="website" />
  <link rel="canonical" href="/diagnostico" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&family=Inter:wght@400;500;600&display=swap" onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&family=Inter:wght@400;500;600&display=swap" /></noscript>
  <style>${CSS}</style>
</head>
<body>
  <main class="dx-root">
    <div class="dx-backdrop"></div>
    <div class="dx-shell">
      <header class="dx-top">
        <div class="dx-brandrow">
          <button id="dx-back" class="dx-back" type="button" aria-label="Voltar">←</button>
          <div class="dx-brand">Tiago Gomes Consultor</div>
          <div id="dx-stepc" class="dx-stepc"></div>
        </div>
        <div class="dx-progress"><div id="dx-progress-bar"></div></div>
      </header>
      <section id="dx-card" class="dx-card"></section>
    </div>
  </main>
  <script>
    window.__DX_DATA__ = ${safeJson({ questions: QUESTIONS, stages: STAGES, maxScore: MAX_SCORE })};
  </script>
  <script>
(function () {
  var data = window.__DX_DATA__;
  var questions = data.questions;
  var stages = data.stages;
  var maxScore = data.maxScore;
  var totalQ = questions.length;
  var stepCapture = totalQ + 1;
  var stepResult = totalQ + 2;
  var step = 0;
  var answers = Array(totalQ).fill(null);
  var form = { name: '', email: '', phone: '' };
  var submitting = false;
  var submitError = null;

  var card = document.getElementById('dx-card');
  var back = document.getElementById('dx-back');
  var stepc = document.getElementById('dx-stepc');
  var progress = document.getElementById('dx-progress-bar');

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function score() {
    return answers.reduce(function (sum, value) { return sum + (value || 0); }, 0);
  }

  function getStage(currentScore) {
    for (var i = 0; i < stages.length; i += 1) {
      if (currentScore <= stages[i].max) return stages[i];
    }
    return stages[stages.length - 1];
  }

  function currentStepCount() {
    if (step === 0) return '';
    if (step === stepCapture) return 'Quase lá';
    if (step === stepResult) return 'Resultado';
    return 'Pergunta ' + step + ' de ' + totalQ;
  }

  function currentPct() {
    if (step >= 1 && step <= totalQ) return ((step - 1) / totalQ) * 100;
    if (step === stepCapture) return 92;
    if (step === stepResult) return 100;
    return 0;
  }

  function renderIntro() {
    card.innerHTML = '<span class="dx-moon">🌙</span>' +
      '<div class="dx-eyebrow">Diagnóstico gratuito · 2 minutos</div>' +
      '<h1 class="dx-h1">Suas finanças têm tirado seu sono?</h1>' +
      '<p class="dx-lede">Com esse raio-x você mapeia seus pesadelos financeiros e constrói uma estratégia para dormir melhor.</p>' +
      '<button id="dx-start" class="dx-btn" type="button">Começar meu raio-x →</button>';
    document.getElementById('dx-start').addEventListener('click', function () {
      step = 1;
      render();
    });
  }

  function renderQuestion() {
    var q = questions[step - 1];
    card.innerHTML = '<div class="dx-eyebrow">' + esc(q.eyebrow) + '</div>' +
      '<h2 class="dx-h2">' + esc(q.text) + '</h2>' +
      '<div class="dx-options">' + q.options.map(function (opt, index) {
        return '<button class="dx-opt" type="button" data-option="' + index + '">' +
          '<span class="dx-tick"></span><span>' + esc(opt.label) + '</span></button>';
      }).join('') + '</div>';
    card.querySelectorAll('[data-option]').forEach(function (button) {
      button.addEventListener('click', function () {
        var option = q.options[Number(button.getAttribute('data-option'))];
        answers[step - 1] = option.value;
        step += 1;
        render();
      });
    });
  }

  function renderCapture() {
    card.innerHTML = '<span class="dx-moon">🌗</span>' +
      '<div class="dx-eyebrow">Última etapa</div>' +
      '<h1 class="dx-h1">Pra onde eu envio seu raio-x?</h1>' +
      '<p class="dx-lede">Seu diagnóstico já está pronto. Deixe seu contato pra ver o resultado agora — e saber o que fazer com ele.</p>' +
      '<form id="dx-form">' +
        '<div class="dx-field"><label>Nome</label><input id="dx-name" required type="text" placeholder="Como você se chama?" value="' + esc(form.name) + '" /></div>' +
        '<div class="dx-field"><label>E-mail</label><input id="dx-email" required type="email" placeholder="voce@email.com" value="' + esc(form.email) + '" /></div>' +
        '<div class="dx-field"><label>WhatsApp (opcional)</label><input id="dx-phone" type="tel" placeholder="(00) 00000-0000" value="' + esc(form.phone) + '" /></div>' +
        '<p class="dx-consent">Ao continuar, você concorda em receber seu diagnóstico e um contato do Tiago Gomes Consultor. Sem spam — só clareza.</p>' +
        '<button id="dx-submit" class="dx-btn" type="submit"' + (submitting ? ' disabled' : '') + '>' + (submitting ? 'Enviando…' : 'Ver meu resultado →') + '</button>' +
        (submitError ? '<div class="dx-error">' + esc(submitError) + '</div>' : '') +
      '</form>';
    document.getElementById('dx-form').addEventListener('submit', submitCapture);
  }

  function renderResult() {
    var currentScore = score();
    var stage = getStage(currentScore);
    card.innerHTML = '<div class="dx-result-stage">' +
        '<span class="dx-result-icon">' + esc(stage.icon) + '</span>' +
        '<div class="dx-result-label">' + esc(stage.label) + '</div>' +
      '</div>' +
      '<p class="dx-lede">' + esc(stage.lede) + '</p>' +
      '<div class="dx-insights">' + stage.insights.map(function (item) {
        return '<div class="dx-insight">' + esc(item) + '</div>';
      }).join('') + '</div>' +
      '<div class="dx-cta-block">' +
        '<div class="dx-eyebrow">Próximo passo</div>' +
        '<p class="dx-lede" style="margin-bottom:14px">Leve esse raio-x para uma conversa estratégica e transforme ansiedade em plano de ação.</p>' +
        '<a class="dx-btn" style="text-decoration:none" href="https://calendly.com/" target="_blank" rel="noreferrer">Agendar conversa</a>' +
      '</div>';
  }

  async function submitCapture(event) {
    event.preventDefault();
    var name = document.getElementById('dx-name').value.trim();
    var email = document.getElementById('dx-email').value.trim();
    var phone = document.getElementById('dx-phone').value.trim();
    if (!name || !email) return;
    form = { name: name, email: email, phone: phone };
    submitting = true;
    submitError = null;
    renderCapture();

    var currentScore = score();
    var stage = getStage(currentScore);
    var params = new URLSearchParams(window.location.search);
    var answersPayload = questions.map(function (q, i) {
      var value = answers[i] || 0;
      var chosen = q.options.find(function (opt) { return opt.value === value; });
      return { question: q.text, answer: chosen ? chosen.label : '-', value: value };
    });

    try {
      var response = await fetch('/api/public/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email,
          phone: phone,
          score: currentScore,
          max_score: maxScore,
          stage_key: stage.key,
          stage_label: stage.label,
          answers: answersPayload,
          utm_source: params.get('utm_source') || undefined,
          utm_medium: params.get('utm_medium') || undefined,
          utm_campaign: params.get('utm_campaign') || undefined,
          utm_content: params.get('utm_content') || undefined,
          landing_url: window.location.href,
          referrer: document.referrer || undefined
        })
      });
      if (!response.ok) throw new Error('Falha ao enviar');
    } catch (error) {
      console.error(error);
      submitError = 'Não conseguimos registrar agora. Você ainda pode ver seu resultado abaixo.';
    } finally {
      submitting = false;
      step = stepResult;
      render();
    }
  }

  function render() {
    stepc.textContent = currentStepCount();
    progress.style.width = currentPct() + '%';
    back.style.visibility = step === 0 ? 'hidden' : 'visible';
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = '';
    if (step === 0) renderIntro();
    else if (step >= 1 && step <= totalQ) renderQuestion();
    else if (step === stepCapture) renderCapture();
    else renderResult();
    window.scrollTo(0, 0);
  }

  back.addEventListener('click', function () {
    if (step === 0) return;
    step -= 1;
    render();
  });

  render();
})();
  </script>
</body>
</html>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/diagnostico")({
  server: {
    handlers: {
      GET: async () =>
        new Response(renderDiagnosticoHtml(), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          },
        }),
    },
  },
});
