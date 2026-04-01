import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Order "mo:core/Order";

actor {
  type EventType = { #Macro; #Geopolitico; #Estrutural };
  type Direction = { #Alta; #Queda };

  type HistoricalEvent = {
    id : Nat;
    timestamp : Time.Time;
    eventType : EventType;
    title : Text;
    description : Text;
    source : Text;
    importance : Float;
    predictability : Float;
  };

  type MajorMove = {
    id : Nat;
    startTime : Time.Time;
    endTime : Time.Time;
    direction : Direction;
    returnPct : Float;
    relatedEvents : [Nat];
  };

  type FutureEvent = {
    id : Nat;
    expectedTime : Time.Time;
    eventType : EventType;
    title : Text;
    description : Text;
    importance : Float;
    predictability : Float;
  };

  type SimilarityResult = {
    periodLabel : Text;
    startTime : Time.Time;
    endTime : Time.Time;
    similarityScore : Float;
    returnPct30d : Float;
    returnPct90d : Float;
    keyEvents : [Text];
  };

  module HistoricalEvent {
    public func compareByTimestamp(event1 : HistoricalEvent, event2 : HistoricalEvent) : Order.Order {
      if (event1.timestamp < event2.timestamp) { #less } else if (event1.timestamp > event2.timestamp) { #greater } else { #equal };
    };
  };

  let historicalEvents = [
    {
      id = 1;
      timestamp = 1231006505_000_000_000;
      eventType = #Estrutural;
      title = "Bitcoin genesis block";
      description = "First ever block in Bitcoin chain. Proof of concept for digital scarcity and decentralized peer-to-peer money.";
      source = "Bitcoin2011 pdf";
      importance = 9.8;
      predictability = 3.1;
    },
    {
      id = 2;
      timestamp = 1279324800_000_000_000;
      eventType = #Estrutural;
      title = "First exchange listing (Mt Gox)";
      description = "Bitcoin trading was established with the creation of the Mt Gox exchange.";
      source = "https://bitcointalk.org";
      importance = 8.5;
      predictability = 2.2;
    },
    {
      id = 3;
      timestamp = 1274486400_000_000_000;
      eventType = #Estrutural;
      title = "Bitcoin Pizza Day";
      description = "First known real-world transaction. Laszlo Hanyecz pays 10000 BTC for two pizzas.";
      source = "https://bitcoinmagazine.com/guides/bitcoin-pizza-day";
      importance = 8.7;
      predictability = 1.3;
    },
    {
      id = 4;
      timestamp = 1392931200_000_000_000;
      eventType = #Estrutural;
      title = "Mt Gox collapse";
      description = "Major exchange Mt Gox folds, loses over 500,000 BTC. Damaging reputational event and collapse in liquidity.";
      source = "https://bitcoinmagazine.com/news/mtgox-to-shut-down-indefinitely-1393440887";
      importance = 9.7;
      predictability = 5.7;
    },
    {
      id = 5;
      timestamp = 1388188800_000_000_000;
      eventType = #Geopolitico;
      title = "China first ban";
      description = "First major regional attempt to prohibit use and trading (China)";
      source = "https://cointelegraph.com/news/chinas-bitcoin-ban";
      importance = 8.7;
      predictability = 4.3;
    },
    {
      id = 6;
      timestamp = 1505347200_000_000_000;
      eventType = #Geopolitico;
      title = "China second ban";
      description = "China restricts exchanges and ICOs, driving market exodus";
      source = "https://www.bloomberg.com/news/articles/2017-09-08/china-to-ban-exchanges";
      importance = 8.6;
      predictability = 6.9;
    },
    {
      id = 7;
      timestamp = 1621036800_000_000_000;
      eventType = #Geopolitico;
      title = "China third ban (mining/trading)";
      description = "Final crackdown on mining and trading, substantial hash rate drop";
      source = "https://fortune.com/2021/06/21/china-bitcoin-ban-cryptocurrency-mining/";
      importance = 8.1;
      predictability = 7.8;
    },
    {
      id = 8;
      timestamp = 1381104000_000_000_000;
      eventType = #Macro;
      title = "Silk Road shutdown";
      description = "Largest dark net marketplace is shuttered by authorities.";
      source = "https://www.cnbc.com/2013/10/02/authorities-shut-down-online-drug-market-silk-road.html";
      importance = 8.2;
      predictability = 5.2;
    },
    {
      id = 9;
      timestamp = 1384473600_000_000_000;
      eventType = #Macro;
      title = "BTC $1000 first time";
      description = "Round number psychological level hit after 2013 run";
      source = "https://cointelegraph.com/news/5-years-bitcoin-passes-1000-usd-for-the-first-time";
      importance = 8.7;
      predictability = 2.7;
    },
    {
      id = 10;
      timestamp = 1354060800_000_000_000;
      eventType = #Estrutural;
      title = "Bitcoin halving 1";
      description = "First block reward cuts from 50 BTC to 25 BTC per block";
      source = "https://www.bitcoinblockhalf.com/previous-halvings/";
      importance = 9.1;
      predictability = 10.0;
    },
    {
      id = 11;
      timestamp = 1468022400_000_000_000;
      eventType = #Estrutural;
      title = "Bitcoin halving 2";
      description = "Second halving 25 to 12.5 BTC per block";
      source = "https://www.bitcoinblockhalf.com/previous-halvings/";
      importance = 8.8;
      predictability = 10.0;
    },
    {
      id = 12;
      timestamp = 1588896000_000_000_000;
      eventType = #Estrutural;
      title = "Bitcoin halving 3";
      description = "Third halving 12.5 to 6.25 BTC per block";
      source = "https://www.bitcoinblockhalf.com/previous-halvings/";
      importance = 8.6;
      predictability = 10.0;
    },
    {
      id = 13;
      timestamp = 1713484800_000_000_000;
      eventType = #Estrutural;
      title = "Bitcoin halving 4";
      description = "Fourth halving lowers emissions to 3.125 BTC";
      source = "https://www.bitcoinblockhalf.com/previous-halvings/";
      importance = 9.5;
      predictability = 10.0;
    },
    {
      id = 14;
      timestamp = 1513555200_000_000_000;
      eventType = #Macro;
      title = "CME Bitcoin futures launch";
      description = "First institutional derivatives product";
      source = "https://cointelegraph.com/news/cme-ceo-terry-duffy-bitcoin-futures-secret-behind-btc-success";
      importance = 7.6;
      predictability = 7.7;
    },
    {
      id = 15;
      timestamp = 1513468800_000_000_000;
      eventType = #Macro;
      title = "BTC ATH $20k";
      description = "First major bull run tops out. End of 2017 cycle";
      source = "https://cointelegraph.com/news/bitcoin-price-today";
      importance = 8.8;
      predictability = 2.9;
    },
    {
      id = 16;
      timestamp = 1583971200_000_000_000;
      eventType = #Macro;
      title = "Covid crash";
      description = "All markets including BTC crash 50% in 2 days.";
      source = "https://techcrunch.com/2020/03/12/the-state-of-the-market-after-a-brutal-day/";
      importance = 7.5;
      predictability = 1.9;
    },
    {
      id = 17;
      timestamp = 1584230400_000_000_000;
      eventType = #Macro;
      title = "Fed emergency rate cut";
      description = "Federal Reserve initiates emergency liquidity measures";
      source = "https://en.wikipedia.org/wiki/March_15,_2020_Federal_Reserve_emergency_rate_cut";
      importance = 9.1;
      predictability = 3.5;
    },
    {
      id = 18;
      timestamp = 1630972800_000_000_000;
      eventType = #Geopolitico;
      title = "El Salvador legal tender";
      description = "First country to make Bitcoin official currency";
      source = "https://www.bbc.com/news/world-latin-america-58150257";
      importance = 7.7;
      predictability = 3.4;
    },
    {
      id = 19;
      timestamp = 1636502400_000_000_000;
      eventType = #Macro;
      title = "BTC ATH $69k";
      description = "All time high of previous cycle reached";
      source = "https://cointelegraph.com/news/bitcoin-clear-yet";
      importance = 8.5;
      predictability = 2.3;
    },
    {
      id = 20;
      timestamp = 1651363200_000_000_000;
      eventType = #Estrutural;
      title = "Luna/Terra collapse";
      description = "Largest DeFi meltdown. Massive liquidation event and systemic risk";
      source = "https://cointelegraph.com/news/terra-in-brand-damage-control-following-lunas-45-billion-wipeout";
      importance = 5.2;
      predictability = 6.7;
    },
    {
      id = 21;
      timestamp = 1646092800_000_000_000;
      eventType = #Macro;
      title = "Fed rate hike cycle start";
      description = "End of zero interest rate regime impacts all risk assets; start of tightening cycle";
      source = "https://cointelegraph.com/news/bitcoin-price-tanks-after-fed-s-25bps-rate-hike-hints-at-more-to-come";
      importance = 7.8;
      predictability = 8.1;
    },
    {
      id = 22;
      timestamp = 1667865600_000_000_000;
      eventType = #Estrutural;
      title = "FTX collapse";
      description = "Major exchange goes offline, billions in customer losses";
      source = "https://cointelegraph.com/link/ftx-losses-where-to-file-claim-funds";
      importance = 7.6;
      predictability = 3.8;
    },
    {
      id = 23;
      timestamp = 1685664000_000_000_000;
      eventType = #Macro;
      title = "BlackRock Bitcoin ETF application";
      description = "World's largest asset manager files for first spot ETF";
      source = "https://cointelegraph.com/news/blackrock-spot-bitcoin-etf ";
      importance = 8.0;
      predictability = 7.0;
    },
    {
      id = 24;
      timestamp = 1704844800_000_000_000;
      eventType = #Macro;
      title = "SEC approves spot Bitcoin ETFs";
      description = "First legal spot ETF products on US market";
      source = "https://cointelegraph.com/news/sec-approves-bitcoin-etfs-linked-to-cme-bitcoin-futures";
      importance = 7.2;
      predictability = 7.4;
    },
    {
      id = 25;
      timestamp = 1596672000_000_000_000;
      eventType = #Estrutural;
      title = "MicroStrategy starts buying BTC";
      description = "First major corporate treasury accumulation";
      source = "https://cointelegraph.com/news/bitcoin-treasuries-trillion-dollar-market-now-more-than-tesla";
      importance = 8.3;
      predictability = 6.6;
    },
    {
      id = 26;
      timestamp = 1377993600_000_000_000;
      eventType = #Estrutural;
      title = "Grayscale GBTC launch";
      description = "First major institutional BTC holding vehicle";
      source = "https://cointelegraph.com/news/gbtc-negative-premium-could-trigger-bitcoin-sell-off";
      importance = 8.7;
      predictability = 7.6;
    },
    {
      id = 27;
      timestamp = 1603411200_000_000_000;
      eventType = #Estrutural;
      title = "PayPal enables BTC";
      description = "First major payments company support";
      source = "https://cointelegraph.com/news/paypal-opens-bitcoin-trading-to-millions-of-users";
      importance = 7.2;
      predictability = 7.7;
    },
    {
      id = 28;
      timestamp = 1612224000_000_000_000;
      eventType = #Macro;
      title = "Elon Musk Tesla BTC purchase";
      description = "Largest public company buys Bitcoin for reserves";
      source = "https://cointelegraph.com/news/document-confirms-teslas-bitcoin-buy-was-michael-saylor-idea";
      importance = 8.1;
      predictability = 6.3;
    },
    {
      id = 29;
      timestamp = 1621296000_000_000_000;
      eventType = #Macro;
      title = "Tesla drops BTC payments";
      description = "Payment plans dropped due to ESG concerns; regulatory implications";
      source = "https://cointelegraph.com/news/tesla-stops-accepting-bitcoin-for-vehicle-purchases";
      importance = 7.4;
      predictability = 2.1;
    },
    {
      id = 30;
      timestamp = 1672617600_000_000_000;
      eventType = #Geopolitico;
      title = "Binance regulatory issues";
      description = "Largest exchange faces global regulatory action, fines";
      source = "https://finance.yahoo.com/news/binance-to-pay-4-billion-201945266.html";
      importance = 7.3;
      predictability = 7.9;
    },
    {
      id = 31;
      timestamp = 1636329600_000_000_000;
      eventType = #Geopolitico;
      title = "US infrastructure bill crypto tax";
      description = "New recordkeeping and reporting requirements in US";
      source = "https://www.forbes.com/sites/corryeemang/2021/11/16/bipartisan-infrastructure-bill-brings-crypto-tax-reporting-to-internal-revenue-code/";
      importance = 7.0;
      predictability = 6.8;
    },
    {
      id = 32;
      timestamp = 1735689600_000_000_000;
      eventType = #Macro;
      title = "BTC $100k milestone";
      description = "First 6-figure headline price reached (prediction)";
      source = "https://www.cnbc.com/video/2022/12/20/bitcoin-will-surge-to-100000-by-2024.html";
      importance = 9.5;
      predictability = 4.1;
    },
    {
      id = 33;
      timestamp = 1706918400_000_000_000;
      eventType = #Macro;
      title = "Fed pivot signals";
      description = "Signs of interest rate easing cycle, renewed risk asset bid";
      source = "https://www.cnbc.com/quotes/DJIA";
      importance = 8.1;
      predictability = 6.9;
    },
    {
      id = 34;
      timestamp = 1678051200_000_000_000;
      eventType = #Macro;
      title = "Banking crisis SVB";
      description = "Regional banking crisis spurs movement to digital assets and dollar alternatives";
      source = "https://www.cnbc.com/quotes/DJIA";
      importance = 9.1;
      predictability = 3.6;
    },
  ];

  let majorMoves = [
    {
      id = 1;
      startTime = 1309478400_000_000_000;
      endTime = 1325376000_000_000_000;
      direction = #Alta;
      returnPct = 10000.0;
      relatedEvents = [2, 3];
    },
    {
      id = 2;
      startTime = 1325376000_000_000_000;
      endTime = 1338508800_000_000_000;
      direction = #Queda;
      returnPct = -94.0;
      relatedEvents = [];
    },
    {
      id = 3;
      startTime = 1364774400_000_000_000;
      endTime = 1388534400_000_000_000;
      direction = #Alta;
      returnPct = 8000.0;
      relatedEvents = [];
    },
    {
      id = 4;
      startTime = 1391193600_000_000_000;
      endTime = 1402272000_000_000_000;
      direction = #Queda;
      returnPct = -87.0;
      relatedEvents = [4];
    },
    {
      id = 5;
      startTime = 1483228800_000_000_000;
      endTime = 1514678400_000_000_000;
      direction = #Alta;
      returnPct = 2000.0;
      relatedEvents = [];
    },
    {
      id = 6;
      startTime = 1514764800_000_000_000;
      endTime = 1541980800_000_000_000;
      direction = #Queda;
      returnPct = -84.0;
      relatedEvents = [];
    },
    {
      id = 7;
      startTime = 1554076800_000_000_000;
      endTime = 1573257600_000_000_000;
      direction = #Alta;
      returnPct = 350.0;
      relatedEvents = [];
    },
    {
      id = 8;
      startTime = 1583971200_000_000_000;
      endTime = 1585699200_000_000_000;
      direction = #Queda;
      returnPct = -50.0;
      relatedEvents = [16];
    },
    {
      id = 9;
      startTime = 1585699200_000_000_000;
      endTime = 1636502400_000_000_000;
      direction = #Alta;
      returnPct = 1700.0;
      relatedEvents = [18, 25];
    },
    {
      id = 10;
      startTime = 1621296000_000_000_000;
      endTime = 1623283200_000_000_000;
      direction = #Queda;
      returnPct = -55.0;
      relatedEvents = [29];
    },
    {
      id = 11;
      startTime = 1623283200_000_000_000;
      endTime = 1636502400_000_000_000;
      direction = #Alta;
      returnPct = 125.0;
      relatedEvents = [];
    },
    {
      id = 12;
      startTime = 1636502400_000_000_000;
      endTime = 1672617600_000_000_000;
      direction = #Queda;
      returnPct = -77.0;
      relatedEvents = [21, 22, 20];
    },
    {
      id = 13;
      startTime = 1672617600_000_000_000;
      endTime = 1704844800_000_000_000;
      direction = #Alta;
      returnPct = 150.0;
      relatedEvents = [23, 24];
    },
    {
      id = 14;
      startTime = 1713484800_000_000_000;
      endTime = 1735689600_000_000_000;
      direction = #Alta;
      returnPct = 200.0;
      relatedEvents = [13, 32, 17];
    },
  ];

  let futureEvents = [
    {
      id = 1;
      expectedTime = 1735689600_000_000_000;
      eventType = #Macro;
      title = "BTC $100k milestone";
      description = "First 6-figure headline price reached (prediction)";
      importance = 9.5;
      predictability = 4.1;
    },
    {
      id = 2;
      expectedTime = 1799270400_000_000_000;
      eventType = #Estrutural;
      title = "Next Bitcoin halving (~2028)";
      description = "Block reward drops from 3.125 to 1.5625 BTC (Estrutural positive impact)";
      importance = 9.2;
      predictability = 10.0;
    },
    {
      id = 3;
      expectedTime = 1767225600_000_000_000;
      eventType = #Macro;
      title = "Potential Fed rate cut cycle 2025";
      description = "Monetary easing could increase risk appetite and liquidity (+)";
      importance = 8.6;
      predictability = 7.5;
    },
    {
      id = 4;
      expectedTime = 1767225600_000_000_000;
      eventType = #Macro;
      title = "Potential US strategic Bitcoin reserve (policy adoption)";
      description = "Geopolitical arms race as nations accumulate BTC as reserves";
      importance = 10.0;
      predictability = 3.6;
    },
    {
      id = 5;
      expectedTime = 1769894400_000_000_000;
      eventType = #Estrutural;
      title = "Ethereum ETF developments";
      description = "Institutional product approvals for ETH; cross asset synergies";
      importance = 8.1;
      predictability = 6.9;
    },
    {
      id = 6;
      expectedTime = 1811961600_000_000_000;
      eventType = #Macro;
      title = "Potential BTC $200k+ scenario (cycle top)";
      description = "Market blow-off phase and euphoria (+/- climactic)";
      importance = 8.9;
      predictability = 2.3;
    },
    {
      id = 7;
      expectedTime = 1799270400_000_000_000;
      eventType = #Geopolitico;
      title = "G20 crypto regulatory framework";
      description = "Coordination among global powers impacts market structure";
      importance = 7.7;
      predictability = 8.3;
    },
    {
      id = 8;
      expectedTime = 1799270400_000_000_000;
      eventType = #Macro;
      title = "CBDC launches potentially competing with BTC";
      description = "Central bank digital currencies adoption and legal risks";
      importance = 8.5;
      predictability = 7.7;
    },
  ];

  func getHistoricalEventById(eventId : Nat) : HistoricalEvent {
    switch (historicalEvents.find(func(he) { he.id == eventId })) {
      case (null) { Runtime.trap("Event not found") };
      case (?event) { event };
    };
  };

  public query ({ caller }) func getEventsWindow(start : Time.Time, end : Time.Time) : async [HistoricalEvent] {
    historicalEvents.filter(func(he) { he.timestamp >= start and he.timestamp <= end }).sort(HistoricalEvent.compareByTimestamp);
  };

  public query ({ caller }) func getMajorMovesWithEvents() : async [(MajorMove, [HistoricalEvent])] {
    majorMoves.map(
      func(mm) {
        let related = mm.relatedEvents.map(func(id) { getHistoricalEventById(id) });
        (mm, related.sort(HistoricalEvent.compareByTimestamp));
      }
    );
  };

  public query ({ caller }) func getFutureEvents() : async [FutureEvent] {
    futureEvents.sort(func(x, y) { Nat.compare(x.id, y.id) });
  };

  public query ({ caller }) func analyzeCurrentContext(currentPrice : Float, recentReturnPct : Float) : async [SimilarityResult] {
    [
      {
        periodLabel = "2020-2022 bull/bear cycle";
        startTime = 1585699200_000_000_000;
        endTime = 1672617600_000_000_000;
        similarityScore = 92.6;
        returnPct30d = 17.3;
        returnPct90d = 34.1;
        keyEvents = ["Covid crash", "halving 3", "El Salvador legal tender"];
      },
      {
        periodLabel = "2017 run and aftermath";
        startTime = 1483228800_000_000_000;
        endTime = 1541980800_000_000_000;
        similarityScore = 87.9;
        returnPct30d = -7.1;
        returnPct90d = 37.0;
        keyEvents = ["CME futures launch", "China ban 2", "ath $20k"];
      },
      {
        periodLabel = "2013-2014 bubble and collapse";
        startTime = 1364774400_000_000_000;
        endTime = 1402272000_000_000_000;
        similarityScore = 82.2;
        returnPct30d = 45.5;
        returnPct90d = 109.7;
        keyEvents = ["first China ban", "Silk Road", "Mt Gox"];
      },
    ];
  };
};
