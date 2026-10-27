import { cached, fetchJson } from '../cache.js';

export function getMarketBrief() {
  return cached('market-brief', 10 * 60 * 1000, async () => {
    async function movers(id) {
      const r = await fetchJson(`https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${id}&count=2`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }, timeoutMs: 15000,
      });
      const quotes = r.data?.finance?.result?.[0]?.quotes || [];
      return quotes.map(q => ({ symbol: q.symbol, price: q.regularMarketPrice,
        change: q.regularMarketChangePercent, high: q.fiftyTwoWeekHigh, low: q.fiftyTwoWeekLow,
        quoteTime: q.regularMarketTime, exchange: q.fullExchangeName }));
    }
    async function crypto(symbol) {
      const r = await fetchJson(`https://api.exchange.coinbase.com/products/${symbol}-USD/stats`, { timeoutMs: 15000 });
      const price = Number(r.data?.last), open = Number(r.data?.open);
      return { symbol, ok: r.ok && price > 0 && open > 0, price,
        change: open > 0 ? (price / open - 1) * 100 : null };
    }
    const [gainers, losers, btc, eth] = await Promise.all([
      movers('day_gainers'), movers('day_losers'), crypto('BTC'), crypto('ETH'),
    ]);
    return { ok: gainers.length > 0 || losers.length > 0 || btc.ok || eth.ok,
      gainers, losers, crypto: [btc, eth], fetchedAt: Date.now() };
  });
}
