// ============================================================
// TELEGRAM BOT: Игорь Иванов | Консалтинг
// v3: цветные кнопки Bot API 9.4 (success/primary/danger) + Premium
// Только inline-кнопки, без slash-команд
// ============================================================

const { Bot, webhookCallback } = require("grammy");
const { createClient } = require("@supabase/supabase-js");
const http = require("http");

// ─── ENV ────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://igor-ivanov-consult.lovable.app";
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "igor-bot-secret-2026";

if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN required");
if (!SUPABASE_URL) throw new Error("SUPABASE_URL required");
if (!SUPABASE_KEY) throw new Error("SUPABASE_SERVICE_KEY required");

const bot = new Bot(BOT_TOKEN);

// ─── ФИКС: answerCallbackQuery timeout (Telegram лимит ~30 сек) ─────
// Цепочка Telegram → Supabase → Render иногда занимает >30 сек.
// Grammy кидает ошибку и весь обработчик падает. Молча игнорируем.
bot.api.config.use(async (prev, method, payload, signal) => {
  if (method === "answerCallbackQuery") {
    try { return await prev(method, payload, signal); }
    catch (e) {
      if (e?.error_code === 400 && e?.description?.includes("query is too old")) return { ok: true };
      throw e;
    }
  }
  return prev(method, payload, signal);
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BOT_USERNAME = "igor_ivanov_consult_bot";

// ═══════════════════════════════════════════════════════════
//  ЦВЕТНЫЕ КНОПКИ (Bot API 9.4 + Telegram Premium)
//  success=🟢  primary=🔵  danger=🔴  (без style = серый)
// ═══════════════════════════════════════════════════════════
function cbBtn(text, data, style) {
  const b = { text, callback_data: data };
  if (style) b.style = style;
  return b;
}
function urlBtn(text, url, style) {
  const b = { text, url };
  if (style) b.style = style;
  return b;
}
function appBtn(text, url, style) {
  const b = { text, web_app: { url } };
  if (style) b.style = style;
  return b;
}
function kb(...rows) {
  return { inline_keyboard: rows.map(r => Array.isArray(r) ? r : [r]) };
}


// ─── DATA ───────────────────────────────────────────────────

const BOOKS = {
  "partnership-strategy": {
    title: "Партнёрство как стратегия",
    author: "Игорь Иванов",
    emoji: "🤝",
    description: "Как построить сеть партнёров, которая заменит платную рекламу",
  },
};

const CHECKLIST =
  `📋 *5 точек роста вашего бизнеса*\n` +
  `_Чек-лист от Игоря Иванова_\n\n` +
  `━━━━━━━━━━━━━━━━━━━━\n\n` +
  `*1. 🔄 Партнёрские продажи*\n` +
  `Сколько партнёров приводят вам клиентов?\n` +
  `• 0 — вы теряете самый дешёвый канал\n` +
  `• 1-3 — начало, но нет системы\n` +
  `• 5+ — вы в топ-10% бизнесов\n` +
  `→ _Посчитайте ROI в калькуляторе партнёрств_\n\n` +
  `*2. 🤖 Автоматизация первого контакта*\n` +
  `Кто отвечает клиенту в нерабочее время?\n` +
  `• Никто — теряете до 40% обращений\n` +
  `• Автоответчик — не продаёт\n` +
  `• ИИ-чатбот — отвечает, записывает 24/7\n` +
  `→ _Считайте экономию в калькуляторе «ИИ vs Человек»_\n\n` +
  `*3. 📞 Реактивация базы*\n` +
  `Когда звонили «спящим» клиентам?\n` +
  `• Никогда — в базе спрятана выручка на 2-3 мес\n` +
  `• Вручную — дорого, менеджеры саботируют\n` +
  `• Голосовой робот — 200 звонков/день, ₽1.5/звонок\n` +
  `→ _Крутите рулетку — выиграйте 3 тестовых звонка!_\n\n` +
  `*4. 🎯 Конверсия отдела продаж*\n` +
  `Какой % лидов → сделки?\n` +
  `• <10% — серьёзные проблемы\n` +
  `• 10-20% — средний рынок, можно ×2\n` +
  `• 20%+ — фокус на масштаб\n` +
  `→ _Пройдите аудит лидерства — 8 вопросов_\n\n` +
  `*5. 💰 Стоимость привлечения (CAC)*\n` +
  `Знаете свой CAC по каналам?\n` +
  `• Не считаю — летите вслепую\n` +
  `• Общий — нет понимания что работает\n` +
  `• По каналам — можете масштабировать\n` +
  `→ _Партнёры дают CAC в 3-5 раз ниже рекламы_\n\n` +
  `━━━━━━━━━━━━━━━━━━━━\n\n` +
  `*Сколько из 5 закрыты?*\n` +
  `🔴 0-1 — бизнес недозарабатывает 30-50%\n` +
  `🟡 2-3 — есть рост, но много дыр\n` +
  `🟢 4-5 — отличная форма!`;

const ACHIEVEMENTS = {
  reader: { emoji: "📚", name: "Читатель", min: 0 },
  gifter: { emoji: "🎁", name: "Даритель", min: 5, bonus: 2 },
  ambassador: { emoji: "⭐", name: "Амбассадор", min: 15, bonus: 5 },
  legend: { emoji: "💎", name: "Легенда", min: 30, bonus: 10 },
};

// ─── HELPERS ────────────────────────────────────────────────

function genCode(n = 6) {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

function achievementFor(gifts) {
  if (gifts >= 30) return "legend";
  if (gifts >= 15) return "ambassador";
  if (gifts >= 5) return "gifter";
  return "reader";
}

function ticketBar(n) {
  const f = Math.min(n, 5);
  return "🎟".repeat(f) + "⬜".repeat(5 - f);
}

async function getUser(ctx) {
  const t = ctx.from;
  if (!t) return null;
  const { data: u } = await supabase.from("user_profiles").select("*").eq("telegram_id", t.id).single();
  if (u) return u;
  const { data: c } = await supabase.from("user_profiles").insert({
    telegram_id: t.id, first_name: t.first_name || "", last_name: t.last_name || "",
    username: t.username || "", total_gifts: 0, total_tickets: 0, achievement_level: "reader",
  }).select().single();
  return c;
}

async function getReferrer(t) {
  const { data: u } = await supabase.from("referrers").select("*").eq("telegram_id", t.id).single();
  if (u) return u;
  const { data: c } = await supabase.from("referrers").insert({
    telegram_id: t.id, ref_code: genCode(), first_name: t.first_name || "",
    last_name: t.last_name || "", username: t.username || "", level: "Start",
    commission_rate: 10, total_clicks: 0, total_leads: 0, total_conversions: 0, total_earned: 0, balance: 0,
  }).select().single();
  return c;
}

// ─── KEYBOARDS ──────────────────────────────────────────────

function mainMenu() {
  return kb(
    [cbBtn("📖 Забрать книгу", "get_book", "success"), cbBtn("🎰 Рулетка", "open_roulette", "primary")],
    [appBtn("🤖 Mini App", WEBAPP_URL, "primary")],
    [cbBtn("📊 Профиль", "my_profile"), cbBtn("🏆 Топ", "leaderboard")],
    [cbBtn("🤝 Стать партнёром", "become_partner", "success")]
  );
}

// ─── /start ─────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  const p = ctx.match;
  const user = await getUser(ctx);

  if (p && p.startsWith("gift_")) return giftLanding(ctx, p, user);
  if (p === "from_group") return welcomeGroup(ctx);

  if (p && p.startsWith("ref_")) {
    try { await supabase.functions.invoke("track-click", { body: { ref_code: p.replace("ref_", ""), source: "bot" } }); } catch {}
  }

  return welcome(ctx);
});

async function welcome(ctx) {
  await ctx.reply(
    `✨ *Добро пожаловать, ${ctx.from?.first_name || "друг"}!*\n\n` +
    `Я — бот Игоря Иванова, эксперта по продажам и ИИ-решениям.\n\n` +
    `Что здесь есть:\n` +
    `📚 Бесплатные бизнес-книги\n` +
    `📋 Чек-лист «5 точек роста» в подарок\n` +
    `🎰 Рулетка призов\n` +
    `🎁 Розыгрыш ИИ-Экосистемы (230 000 ₽)\n\n` +
    `Заберите книгу + бонусы 👇`,
    { parse_mode: "Markdown", reply_markup: mainMenu() }
  );
}

async function welcomeGroup(ctx) {
  await ctx.reply(
    `👋 *${ctx.from?.first_name || "друг"}, добро пожаловать из группы!*\n\n` +
    `Эксклюзивно для подписчиков бота:\n` +
    `📚 Книги бесплатно\n` +
    `📋 Чек-лист «5 точек роста»\n` +
    `🎰 Рулетка подарков\n` +
    `🎁 Розыгрыш ИИ-Экосистемы (230 000 ₽)\n\n` +
    `Забирайте 👇`,
    {
      parse_mode: "Markdown",
      reply_markup: kb(
        [cbBtn("📖 Забрать книгу + бонусы", "get_book", "success")],
        [cbBtn("🎰 Рулетка", "open_roulette", "primary")],
        [appBtn("🤖 Mini App", WEBAPP_URL, "primary")]
      ),
    }
  );
}

// ═══════════════════════════════════════════════════════════
//  ВИРАЛЬНАЯ ВОРОНКА
//  Подарок → Подписка → Книга + Чек-лист + Рулетка
// ═══════════════════════════════════════════════════════════

// ШАГ 1: landing — превью подарка с кнопкой подписки
async function giftLanding(ctx, payload, receiver) {
  const parts = payload.replace("gift_", "").split("_");
  if (parts.length < 2) return welcome(ctx);

  const gifterId = parseInt(parts[0]);
  const bookId = parts.slice(1).join("_");
  const book = BOOKS[bookId] || BOOKS["partnership-strategy"];
  if (!ctx.from?.id || ctx.from.id === gifterId) return welcome(ctx);

  await ctx.reply(
    `🎁 *${ctx.from.first_name || "Привет"}, вам подарили книгу!*\n\n` +
    `${book.emoji} *«${book.title}»*\n` +
    `_${book.author}_\n\n` +
    `${book.description}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Подпишитесь и заберите *3 подарка:*\n\n` +
    `📖 Книга «${book.title}» (PDF)\n` +
    `📋 Чек-лист «5 точек роста бизнеса»\n` +
    `🎰 Бесплатный спин рулетки призов\n\n` +
    `Один клик — и всё ваше 👇`,
    {
      parse_mode: "Markdown",
      reply_markup: kb(
        [cbBtn("✅ Подписаться и забрать всё!", `sub:${gifterId}:${bookId}`, "success")],
        [cbBtn("ℹ️ Что это за бот?", "about_bot")]
      ),
    }
  );
}

// ШАГ 2: подписался → выдаём книгу + планируем чек-лист + рулетку
bot.callbackQuery(/^sub:(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery("🎉 Добро пожаловать!");

  const gifterId = parseInt(ctx.match[1]);
  const bookId = ctx.match[2];
  const book = BOOKS[bookId] || BOOKS["partnership-strategy"];

  // Записываем подарок → даритель получает билет
  try {
    await supabase.functions.invoke("gift-book", {
      body: { gifter_telegram_id: gifterId, receiver_telegram_id: ctx.from.id, book_id: bookId },
    });
  } catch (e) { console.error("Gift error:", e.message); }

  // Уведомляем дарителя (async)
  notifyGifter(gifterId, bookId, ctx.from?.first_name || "Друг");

  // Выдаём подарки
  await ctx.editMessageText(
    `🎉 *Вы подписаны! Вот ваши 3 подарка:*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `*📖 1/3 — Книга*\n` +
    `${book.emoji} «${book.title}»\n\n` +
    `*📋 2/3 — Чек-лист*\n` +
    `«5 точек роста бизнеса»\n\n` +
    `*🎰 3/3 — Спин рулетки*\n` +
    `Выиграйте подарок от Игоря!\n\n` +
    `Забирайте по порядку 👇`,
    {
      parse_mode: "Markdown",
      reply_markup: kb(
        [cbBtn("📥 1. Скачать книгу", `download_${bookId}`, "primary")],
        [cbBtn("📋 2. Получить чек-лист", "send_checklist", "primary")],
        [appBtn("🎰 3. Крутить рулетку!", `https://igor-ivanov-consult.lovable.app/roulette`, "success")],
        [cbBtn("🎁 Подарить книгу другу = +1 🎟", `gift_${bookId}`, "success")]
      ),
    }
  );
});

// О боте (для сомневающихся на landing)
bot.callbackQuery("about_bot", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    `ℹ️ *Бот Игоря Иванова*\n\n` +
    `Игорь — бизнес-консультант, 15+ лет в продажах и партнёрствах.\n\n` +
    `*Бесплатно:*\n` +
    `📚 Библиотека бизнес-книг\n` +
    `📋 Чек-листы и гайды\n` +
    `🤖 ИИ-калькуляторы\n` +
    `🎰 Рулетка с реальными призами\n\n` +
    `*Не будет:*\n` +
    `❌ Спама (макс 2-3 сообщения/неделю)\n` +
    `❌ Продаж в лоб\n\n` +
    `_Отписаться можно в любой момент._`,
    { parse_mode: "Markdown", reply_markup: kb([cbBtn("⬅️ Назад", "main_menu")]) }
  );
});

// ─── УВЕДОМЛЕНИЕ ДАРИТЕЛЮ ───────────────────────────────────

async function notifyGifter(gifterId, bookId, receiverName) {
  try {
    const { data: p } = await supabase.from("user_profiles").select("*").eq("telegram_id", gifterId).single();
    const tickets = p?.total_tickets || 0;
    const gifts = p?.total_gifts || 0;
    const book = BOOKS[bookId] || BOOKS["partnership-strategy"];

    let text =
      `🎟 *+1 билет!*\n\n` +
      `*${receiverName}* подписался и забрал «${book.title}»!\n\n` +
      `${ticketBar(tickets)} *${tickets}* из 5\n`;

    if (tickets < 5) text += `\nЕщё *${5 - tickets}* — и вы в розыгрыше ИИ-Экосистемы! 🎰`;
    else text += `\n✅ *Вы в розыгрыше!* Больше билетов = выше шанс 🔥`;

    // Проверяем ачивку
    const newLvl = achievementFor(gifts);
    if (newLvl !== (p?.achievement_level || "reader")) {
      const a = ACHIEVEMENTS[newLvl];
      text += `\n\n🏆 *Ачивка: ${a.emoji} ${a.name}!*`;
      if (a.bonus) text += ` +${a.bonus} 🎟`;
    }

    await bot.api.sendMessage(gifterId, text, {
      parse_mode: "Markdown",
      reply_markup: kb(
        [cbBtn("🎁 Подарить ещё", `gift_${bookId}`, "success"), cbBtn("🏆 Топ", "leaderboard")]
      ),
    });
  } catch (e) { console.error("Notify gifter:", e.message); }
}

// ═══════════════════════════════════════════════════════════
//  CALLBACK-ОБРАБОТЧИКИ
// ═══════════════════════════════════════════════════════════

async function safeEdit(ctx, text, opts) {
  try { await ctx.editMessageText(text, opts); }
  catch { await ctx.reply(text, opts); }
}

bot.callbackQuery("main_menu", async (ctx) => {
  await ctx.answerCallbackQuery();
  await safeEdit(ctx, `✨ *Главное меню*\n\nВыберите:`, { parse_mode: "Markdown", reply_markup: mainMenu() });
});

// ─── КНИГА ──────────────────────────────────────────────────

bot.callbackQuery("get_book", async (ctx) => {
  await ctx.answerCallbackQuery();
  const b = BOOKS["partnership-strategy"];
  await safeEdit(ctx,
    `📖 *Книга месяца:*\n\n` +
    `${b.emoji} *«${b.title}»*\n_${b.author}_\n\n${b.description}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎁 Подарите другу = 🎟 билет на розыгрыш ИИ-Экосистемы!\n5 билетов = участие`,
    {
      parse_mode: "Markdown",
      reply_markup: kb(
        [cbBtn("📥 Скачать PDF", "download_partnership-strategy", "primary")],
        [cbBtn("🎁 Подарить другу = +1 🎟", "gift_partnership-strategy", "success")],
        [cbBtn("📋 Чек-лист «5 точек роста»", "send_checklist", "primary")],
        [cbBtn("🎟 Мои билеты", "my_tickets"), cbBtn("🏆 Топ", "leaderboard")],
        [cbBtn("⬅️ В меню", "main_menu")]
      ),
    }
  );
});

bot.callbackQuery(/^download_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery("📥 Отправляем...");
  const bookId = ctx.match[1];
  const b = BOOKS[bookId] || BOOKS["partnership-strategy"];

  // TODO: await ctx.replyWithDocument(b.pdf_file_id); — после загрузки PDF
  await ctx.reply(
    `📥 *«${b.title}»*\n\n` +
    `⏳ PDF загружается — отправим сюда автоматически.\n\n` +
    `А пока — заберите остальные подарки 👇`,
    {
      parse_mode: "Markdown",
      reply_markup: kb(
        [cbBtn("📋 Чек-лист «5 точек роста»", "send_checklist", "primary")],
        [appBtn("🎰 Крутить рулетку", `https://igor-ivanov-consult.lovable.app/roulette`, "success")],
        [cbBtn("🎁 Подарить книгу другу", `gift_${bookId}`, "success")],
        [cbBtn("⬅️ В меню", "main_menu")]
      ),
    }
  );
});

// ─── ЧЕК-ЛИСТ ──────────────────────────────────────────────

bot.callbackQuery("send_checklist", async (ctx) => {
  await ctx.answerCallbackQuery("📋 Отправляем...");

  await ctx.reply(CHECKLIST, { parse_mode: "Markdown" });

  setTimeout(async () => {
    try {
      await ctx.reply(
        `👆 *Проверили точки роста?*\n\n` +
        `Теперь:\n` +
        `🎰 *Крутите рулетку* — выиграйте подарок\n` +
        `🤖 *Пройдите калькуляторы* — посчитайте ROI\n\n` +
        `И подарите книгу другу — получите 🎟 билет!`,
        {
          parse_mode: "Markdown",
          reply_markup: kb(
            [appBtn("🎰 Крутить рулетку!", `https://igor-ivanov-consult.lovable.app/roulette`, "success")],
            [appBtn("🤖 Калькуляторы", WEBAPP_URL, "primary")],
            [cbBtn("🎁 Подарить книгу = +1 🎟", "gift_partnership-strategy", "success")],
            [cbBtn("⬅️ В меню", "main_menu")]
          ),
        }
      );
    } catch (e) { console.error("Checklist CTA:", e.message); }
  }, 1500);
});

// ─── ПОДАРИТЬ ───────────────────────────────────────────────

bot.callbackQuery(/^gift_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const bookId = ctx.match[1];
  const b = BOOKS[bookId] || BOOKS["partnership-strategy"];
  const url = `https://t.me/${BOT_USERNAME}?start=gift_${ctx.from.id}_${bookId}`;
  const shareText = `📚 Дарю тебе книгу «${b.title}» от эксперта Игоря Иванова!\n\n🎁 Внутри: книга + чек-лист + спин рулетки!\n\nЗабирай:`;

  await safeEdit(ctx,
    `🎁 *Подарите книгу = 🎟 билет*\n\n` +
    `${b.emoji} «${b.title}»\n\n` +
    `Ваша ссылка:\n\`${url}\`\n\n` +
    `📤 Отправьте другу. Когда он *подпишется* — вы получите 🎟\n\n` +
    `Друг получит *3 подарка:*\n` +
    `📖 Книгу  📋 Чек-лист  🎰 Рулетку\n\n` +
    `_🎟×5 = розыгрыш ИИ-Экосистемы (230 000 ₽)_`,
    {
      parse_mode: "Markdown",
      reply_markup: kb(
        [urlBtn("📤 Отправить в Telegram", `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`, "success")],
        [cbBtn("📖 Другую книгу", "book_list")],
        [cbBtn("🎟 Мои билеты", "my_tickets"), cbBtn("⬅️ В меню", "main_menu")]
      ),
    }
  );
});

bot.callbackQuery("book_list", async (ctx) => {
  await ctx.answerCallbackQuery();
  let t = "📚 *Библиотека*\n\nВыберите для подарка:\n\n";
  const rows = [];
  for (const [id, b] of Object.entries(BOOKS)) {
    t += `${b.emoji} «${b.title}» — _${b.author}_\n`;
    rows.push([cbBtn(`${b.emoji} ${b.title}`, `gift_${id}`, "success")]);
  }
  rows.push([cbBtn("⬅️ В меню", "main_menu")]);
  await safeEdit(ctx, t, { parse_mode: "Markdown", reply_markup: { inline_keyboard: rows } });
});

// ─── БИЛЕТЫ / ПРОФИЛЬ / ТОП ────────────────────────────────

bot.callbackQuery("my_tickets", async (ctx) => {
  await ctx.answerCallbackQuery();
  const u = await getUser(ctx);
  const t = u?.total_tickets || 0, g = u?.total_gifts || 0;
  const a = ACHIEVEMENTS[u?.achievement_level || "reader"];

  await safeEdit(ctx,
    `🎟 *Билеты на розыгрыш*\n\n` +
    `${ticketBar(t)}\n\n` +
    `Билетов: *${t}*\nПодарено: *${g}* 📚\nАчивка: ${a.emoji} ${a.name}\n\n` +
    `${t < 5 ? `Ещё *${Math.max(5-g,0)}* подарков для участия!` : `✅ *Вы участвуете!*`}\n\n` +
    `🏆 Приз: ИИ-Экосистема (230 000 ₽)`,
    {
      parse_mode: "Markdown",
      reply_markup: kb(
        [cbBtn("🎁 Подарить = +1 🎟", "gift_partnership-strategy", "success")],
        [cbBtn("🏆 Топ", "leaderboard"), cbBtn("⬅️ В меню", "main_menu")]
      ),
    }
  );
});

bot.callbackQuery("my_profile", async (ctx) => {
  await ctx.answerCallbackQuery();
  const u = await getUser(ctx);
  const t = u?.total_tickets || 0, g = u?.total_gifts || 0;
  const a = ACHIEVEMENTS[u?.achievement_level || "reader"];
  const lvls = Object.entries(ACHIEVEMENTS);
  const idx = lvls.findIndex(([k]) => k === (u?.achievement_level || "reader"));
  const next = idx < lvls.length - 1 ? lvls[idx + 1][1] : null;

  let text =
    `📊 *Профиль*\n\n` +
    `👤 ${ctx.from?.first_name || ""} ${ctx.from?.last_name || ""}\n` +
    `${a.emoji} *${a.name}*\n\n` +
    `📚 Подарено: *${g}*\n🎟 Билетов: *${t}*\n`;

  if (next) text += `\n📈 До ${next.emoji} ${next.name}: ещё *${next.min - g}*\n`;

  text += `\n━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📚 Читатель — старт\n🎁 Даритель — 5 (+2🎟)\n⭐ Амбассадор — 15 (+5🎟)\n💎 Легенда — 30 (+10🎟)`;

  await safeEdit(ctx, text, {
    parse_mode: "Markdown",
    reply_markup: kb(
      [cbBtn("🎁 Подарить книгу", "gift_partnership-strategy", "success")],
      [cbBtn("🏆 Топ", "leaderboard"), cbBtn("⬅️ В меню", "main_menu")]
    ),
  });
});

bot.callbackQuery("leaderboard", async (ctx) => {
  await ctx.answerCallbackQuery();
  let text = "🏆 *Топ дарителей*\n\n";
  try {
    const { data } = await supabase.functions.invoke("get-gifters-leaderboard");
    if (data?.leaderboard?.length) {
      const m = ["👑", "🥈", "🥉"];
      data.leaderboard.forEach((e, i) => {
        const a = ACHIEVEMENTS[e.achievement_level || "reader"];
        text += `${i < 3 ? m[i] : `*${i+1}.*`} ${e.first_name || "Аноним"} ${a.emoji} — *${e.total_gifts}* 📚 (*${e.total_tickets||0}* 🎟)\n`;
      });
    } else text += "_Пока пусто!_\n";
  } catch { text += "_Загрузка..._\n"; }

  text += `\n━━━━━━━━━━━━━━━━━━━━\nПодарите книгу → в топ → бонусные 🎟`;

  await safeEdit(ctx, text, {
    parse_mode: "Markdown",
    reply_markup: kb(
      [cbBtn("🎁 Подарить книгу", "gift_partnership-strategy", "success")],
      [cbBtn("📊 Профиль", "my_profile"), cbBtn("⬅️ В меню", "main_menu")]
    ),
  });
});

// ─── РУЛЕТКА ────────────────────────────────────────────────

bot.callbackQuery("open_roulette", async (ctx) => {
  await ctx.answerCallbackQuery();
  await safeEdit(ctx,
    `🎰 *Рулетка подарков*\n\n` +
    `Призы:\n` +
    `🎯 Стратсессия 45мин (50 000₽)\n` +
    `🔥 Скидка 50 000₽ на ИИ-Экосистему\n` +
    `🎁 Месяц сопровождения\n` +
    `🤖 ИИ-аудит бизнеса\n` +
    `💬 Демо чатбота\n` +
    `📞 3 тест-звонка\n` +
    `⭐ Скидка 15%\n` +
    `💎 VIP-бонус\n\n` +
    `Крутите в Mini App 👇`,
    {
      parse_mode: "Markdown",
      reply_markup: kb(
        [appBtn("🎰 Крутить!", `https://igor-ivanov-consult.lovable.app/roulette`, "success")],
        [cbBtn("⬅️ В меню", "main_menu")]
      ),
    }
  );
});

// ═══════════════════════════════════════════════════════════
//  ПАРТНЁРСКАЯ СИСТЕМА
// ═══════════════════════════════════════════════════════════

bot.callbackQuery("become_partner", async (ctx) => {
  await ctx.answerCallbackQuery();
  await safeEdit(ctx, `🤝 *Партнёрская программа*\n\nОткрываю кабинет партнёра...`, {
    parse_mode: "Markdown",
    reply_markup: kb(
      [appBtn("🤝 Открыть кабинет партнёра", `https://igor-ivanov-consult.lovable.app/partner`, "success")],
      [cbBtn("⬅️ В меню", "main_menu")]
    ),
  });
});

bot.callbackQuery("partner_stats", async (ctx) => {
  await ctx.answerCallbackQuery();
  const { data: r } = await supabase.from("referrers").select("*").eq("telegram_id", ctx.from?.id).single();
  if (!r) return ctx.reply("Вы не партнёр.", { reply_markup: kb([cbBtn("🤝 Стать партнёром", "become_partner", "success"), cbBtn("⬅️ В меню", "main_menu")]) });

  await safeEdit(ctx,
    `📈 *Статистика*\n\n👆 ${r.total_clicks}\n👤 ${r.total_leads}\n💰 ${r.total_conversions}\n💵 ${r.total_earned.toLocaleString("ru")} ₽\n\nБаланс: *${r.balance.toLocaleString("ru")} ₽*`,
    {
      parse_mode: "Markdown",
      reply_markup: kb(
        [cbBtn("💰 Вывести", "partner_withdraw", "success")],
        [appBtn("📊 Кабинет", `${WEBAPP_URL}?startapp=partner_${r.ref_code}`, "primary")],
        [cbBtn("⬅️ В меню", "main_menu")]
      ),
    }
  );
});

bot.callbackQuery("partner_balance", async (ctx) => {
  await ctx.answerCallbackQuery();
  const { data: r } = await supabase.from("referrers").select("*").eq("telegram_id", ctx.from?.id).single();
  if (!r) return ctx.reply("Вы не партнёр.", { reply_markup: kb([cbBtn("🤝 Стать партнёром", "become_partner", "success")]) });

  await safeEdit(ctx,
    `💰 *Баланс*\n\nК выводу: *${r.balance.toLocaleString("ru")} ₽*\nВсего: *${r.total_earned.toLocaleString("ru")} ₽*\n\n` +
    `${r.balance >= 5000 ? "✅ Можно вывести" : `⏳ Мин: 5 000₽ (ещё ${(5000-r.balance).toLocaleString("ru")}₽)`}`,
    {
      parse_mode: "Markdown",
      reply_markup: kb(
        [cbBtn("💰 Вывести", "partner_withdraw", "success")],
        [cbBtn("📈 Стата", "partner_stats"), cbBtn("⬅️ В меню", "main_menu")]
      ),
    }
  );
});

bot.callbackQuery("partner_withdraw", async (ctx) => {
  await ctx.answerCallbackQuery();
  const { data: r } = await supabase.from("referrers").select("*").eq("telegram_id", ctx.from?.id).single();
  if (!r || r.balance < 5000) return safeEdit(ctx, `⚠️ Мин: 5 000₽\nБаланс: ${(r?.balance||0).toLocaleString("ru")}₽`, { reply_markup: kb([cbBtn("⬅️ В меню", "main_menu")]) });

  await supabase.from("payouts").insert({ referrer_id: r.id, amount: r.balance, method: "sbp", status: "pending" });
  await safeEdit(ctx, `✅ *Заявка создана*\n\n${r.balance.toLocaleString("ru")} ₽ • СБП\nОбработаем за 48ч.`, { parse_mode: "Markdown", reply_markup: kb([cbBtn("⬅️ В меню", "main_menu")]) });
});

// ─── FALLBACK ───────────────────────────────────────────────

bot.on("message:text", async (ctx) => {
  if (!ctx.message.text.startsWith("/")) {
    await ctx.reply("Выберите действие 👇", { reply_markup: mainMenu() });
  }
});

// ═══════════════════════════════════════════════════════════
//  SERVER + NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", bot: BOT_USERNAME, v: "3.0-colored-buttons" }));
  }
  if (req.method === "POST" && req.url === "/webhook") {
    try { await webhookCallback(bot, "http")(req, res); }
    catch (e) { console.error("WH:", e); res.writeHead(500); res.end(); }
    return;
  }
  if (req.method === "POST" && req.url === "/notify") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try {
        const d = JSON.parse(body);
        if (d.secret !== WEBHOOK_SECRET) { res.writeHead(401); return res.end(); }
        await notify(d);
        res.writeHead(200); res.end(JSON.stringify({ ok: true }));
      } catch (e) { console.error("Notify:", e); res.writeHead(500); res.end(); }
    });
    return;
  }
  res.writeHead(404); res.end();
});

async function notify({ type, telegram_id: tid, payload: p }) {
  if (!tid) return;
  const m = {
    click: `👆 Новый переход!`,
    lead: `👤 *Новый лид!* ${p?.name||"Кто-то"} оставил заявку.`,
    qualified: `✅ *Квалифицирован!* ${p?.name||"Лид"} подтверждён.`,
    conversion: `💰 *Сделка!* Комиссия: *${(p?.commission||0).toLocaleString("ru")}₽*`,
    level_up: `🎉 *Уровень: ${p?.level||"Партнёр"}!* ${p?.rate||15}%`,
    payout: `💸 *Выплата:* ${(p?.amount||0).toLocaleString("ru")}₽ ✅`,
    weekly_report: `📊 *Неделя:* 👆${p?.clicks||0} 👤${p?.leads||0} 💰${p?.conversions||0} 💵${(p?.earned||0).toLocaleString("ru")}₽`,
  }[type];
  if (!m) return;
  try { await bot.api.sendMessage(tid, m, { parse_mode: "Markdown", reply_markup: kb([cbBtn("📊 Стата", "partner_stats", "primary"), cbBtn("⬅️ В меню", "main_menu")]) }); }
  catch (e) { console.error(`Notify ${tid}:`, e.message); }
}

// ─── START ──────────────────────────────────────────────────

(async () => {
  if (process.env.RENDER_EXTERNAL_URL) {
    await bot.api.setWebhook(`${process.env.RENDER_EXTERNAL_URL}/webhook`);
    console.log(`🤖 Webhook: ${process.env.RENDER_EXTERNAL_URL}/webhook`);
    server.listen(PORT, () => console.log(`🚀 Port ${PORT}`));
  } else {
    await bot.api.deleteWebhook();
    server.listen(PORT, () => console.log(`🚀 Dev :${PORT}`));
    bot.start({ onStart: () => console.log("✅ Running!") });
  }
})().catch(e => { console.error("Fatal:", e); process.exit(1); });
