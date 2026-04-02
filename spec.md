# Bitcoin Analysis Lab

## Current State
A aba News (`src/frontend/src/components/NewsPage.tsx`, 1735 linhas) exibe:
- Top Crypto News (notícias da CryptoCompare, sem filtro de data)
- Yesterday's BTC Summary
- Current Market Analysis
- Assets in Focus
- BTC Weekly Macro
- BTC Daily Micro
- BTC Price Predictions

Problema atual: notícias antigas (ex: BTC a $80k de meses atrás) aparecem misturadas com artigos recentes porque não há filtro de data.

## Requested Changes (Diff)

### Add
- **Filtro de data nas notícias:** no hook `useNewsItems`, após mapear os itens, filtrar apenas artigos com `publishedOn` nas últimas 48h (`Date.now()/1000 - 172800`). Se após filtro restar menos de 3 artigos, ampliar para 72h. Se ainda insuficiente, usar fallback.
- **Timestamp destacado em cada card de notícia:** no componente `NewsFeed`, exibir data/hora absoluta de publicação no formato `DD/MM HH:mm` ao lado do `relTime`, para o usuário saber exatamente quando foi publicado.
- **Nova seção "Day Summary & Analysis":** card no topo da página (antes do grid principal), que consolida em texto narrativo os principais acontecimentos e uma análise de mercado baseada nos dados já carregados. Deve usar dados reais: variação de preço (useTicker), Fear & Greed (useFearGreed), dominância BTC (useCoinGeckoGlobal), tendência semanal (useWeeklyAnalysis), tendência diária (useDailyAnalysis). A análise deve ser gerada como texto em português e exibida em parágrafos curtos. Incluir: comportamento do preço no dia, sentimento do mercado (F&G), dominância BTC, tendência e momentum, e uma síntese narrativa do contexto.

### Modify
- `useNewsItems`: adicionar filtro de data (últimas 48h, com fallback para 72h)
- Render de cada item em `NewsFeed`: adicionar timestamp absoluto `DD/MM HH:mm` visível abaixo/ao lado do source e relTime
- Layout geral da página: inserir o novo card "Day Summary & Analysis" antes do grid de 2 colunas existente

### Remove
- Nada

## Implementation Plan
1. Em `useNewsItems`, após mapear os dados da API, filtrar por `publishedOn >= now - 48h`. Se resultado < 3 itens, tentar `>= now - 72h`. Se ainda < 3, usar fallback.
2. No render de cada NewsItem em `NewsFeed`, adicionar linha extra com timestamp absoluto formatado como `DD/MM HH:mm`.
3. Criar componente `DaySummaryAnalysis` que:
   - Usa hooks já existentes: `useTicker`, `useFearGreed`, `useCoinGeckoGlobal`, `useWeeklyAnalysis`, `useDailyAnalysis`
   - Gera texto narrativo em português com os dados
   - Exibe em card com ícone FileText ou Newspaper
   - Mostra skeleton durante carregamento
4. Adicionar `<DaySummaryAnalysis />` no topo do layout da página, antes do grid existente
5. Validar (typecheck + build)
