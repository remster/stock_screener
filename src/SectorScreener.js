const fetchHoldings = async (etfSymbol) => {
    try {
        const url = `http://localhost:3001/holdings/${etfSymbol}`
        console.log(`Fetching ${url}`)
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch holdings: ${response.status} ${response.statusText}`);
        }
        const json = await response.json();
        const dataRows = json.slice(3);
        let tickerKey = undefined;
        for (let key in dataRows[0]) {
            if (key.includes("Select Sector SPDR®")) {
                tickerKey = key;
                break;
            }
        }

        const holdings = dataRows.filter(
                (row) => tickerKey in row && row[tickerKey] != "-"
            ).map(row => ({
                name: row["Fund Name:"],
                ticker: row[tickerKey].replace(".", "-"),
                cusip: row["__EMPTY"],
                sedol: row["__EMPTY_1"],
                weight: parseFloat(row["__EMPTY_2"]),
                sector: row["__EMPTY_3"],
                sharesHeld: parseInt(row["__EMPTY_4"], 10),
                currency: row["__EMPTY_5"]
        }));
        return holdings;
    } catch (error) {
        console.error("Error fetching holdings:", error);
        throw error;
    }
}

const sma = (candles, period) => {
    if (candles.length >= period) {
        const samples = candles.slice(-period);
        return samples.reduce((cum, sample) => cum + sample.close, 0) / samples.length;
    }
}

const screenSector = async (sectorSymbol, filterCb, orderCb) => {
    filterCb = filterCb || ((data) => true);
    orderCb = orderCb || ((a, b) => a.ticker.localeCompare(b.ticker));

    const holdings = await fetchHoldings(sectorSymbol);

    // Limit to first 50 holdings to avoid overload
    const tickers = holdings
      .map((h) => h.ticker)
      .slice(0, 50);

    let result = [];
    for (let i = 0; i < tickers.length; i++) {
        let ticker = tickers[i];
        try {
            const data_req = await fetch(`http://localhost:3001/history/${ticker}`);
            let data = await data_req.json();
            const candles = data.candles
            data = data.summary;
            // Calculate timestamps for SMA query (~ last 100 days)
            const to = Math.floor(Date.now() / 1000);
            const from = to - 86400 * 100;

            let sma50 = sma(candles, 50);
            let sma150 = sma(candles, 150);
            data["close"] = candles[candles.length-1].close;
            data["sma50"] = sma50;
            data["sma150"] = sma150;
            data["distanceToSma50Percent"] = 100 * (sma50 - data["close"]) / data["close"];
            data["ticker"]= ticker;
            if (filterCb(data)) {
                result.push(data);
            }
        } catch (e) {
            console.error(`Error ${e} when fetching ${ticker}`)
        }
    }
    return result.sort(orderCb);
};

export default screenSector;
