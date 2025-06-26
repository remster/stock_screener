const fetchHoldings = async (etfSymbol) => {
    try {
        const url = `http://localhost:3001/holdings/${etfSymbol}`
        console.log(`Fetching ${url}`)
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch holdings: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching holdings:", error);
        throw error;
    }
}

const insert_sma = (candles, period) => {
    if (candles.length >= period) {
      let tail_idx = 0;
      let head_idx = 0;
      let sum = 0;
      while (head_idx < candles.length) {
        sum += candles[head_idx].close;
        if (head_idx-tail_idx > period) {
          sum -= candles[tail_idx].close;
          tail_idx++;
        }
        if (head_idx-tail_idx == period) {
          candles[head_idx]["sma"+period] = sum/period;
        }
        head_idx++;
      }
    }
}

const rsi = (candles, period) => {
  const len = candles.length;
  if (len < period + 1) {
    return undefined;
  }

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss for the first 14 periods
  for (let i = len - period - 1; i < len - 1; i++) {
    const change = candles[i + 1].close - candles[i].close;
    if (change > 0) {
      gains += change;
    } else {
      losses -= change; // negative becomes positive
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  const lastChange = candles[len - 1].close - candles[len - 2].close;
  let gain = lastChange > 0 ? lastChange : 0;
  let loss = lastChange < 0 ? -lastChange : 0;

  averageGain = (averageGain * (period - 1) + gain) / period;
  averageLoss = (averageLoss * (period - 1) + loss) / period;

  const rs = averageLoss === 0 ? 100 : averageGain / averageLoss;
  const rsi = 100 - (100 / (1 + rs));

  return Math.round(rsi);
}

///
/// @brief finds supports and resistances
/// @param window - number of days (candles) before and after a given price point to
/// check for swing highs or lows.
/// @param volumeMultiplier - factor to determine if the volume on the swing point is significantly
/// higher than the average surrounding volume.
///
/// Purpose:
/// To filter out weak swing points that had low volume (less market conviction).
/// How it's used:
/// Compute average volume in the same window of candles.
/// Require that the swing point’s volume is at least volumeMultiplier × average volume.
///
/// Example (volumeMultiplier = 1.2):
/// If average volume is 100,000
/// Then swing point must have volume ≥ 120,000 to be valid
/// Helps confirm that support/resistance had real market interest
/// Prevents false levels due to noise or illiquid trading
const support_resistance = (
    data,
    window = 3,
    volumeThreshold = 1.2,
    priceClusterThreshold = 0.02 // 2% clustering threshold
) => {
  const supports = [];
  const resistances = [];

  // First pass: Find swing points
  for (let i = window; i < data.length - window; i++) {
    const current = data[i];
    let isSwingLow = true;
    let isSwingHigh = true;

    // Check if current point is a swing low/high
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;

      // For swing low: current low should be lower than neighbors
      if (current.low >= data[j].low) {
        isSwingLow = false;
      }

      // For swing high: current high should be higher than neighbors
      if (current.high <= data[j].high) {
        isSwingHigh = false;
      }
    }

    // Volume confirmation: check if volume is above average of neighbors
    const neighborVolumes = [];
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      neighborVolumes.push(data[j].volume);
    }
    const avgNeighborVolume = neighborVolumes.reduce((a, b) => a + b, 0) / neighborVolumes.length;
    const hasVolumeConfirmation = current.volume >= avgNeighborVolume * volumeThreshold;

    if (isSwingLow && hasVolumeConfirmation) {
      supports.push({
        ...current,
        level: current.low,
        type: 'support'
      });
    }

    if (isSwingHigh && hasVolumeConfirmation) {
      resistances.push({
        ...current,
        level: current.high,
        type: 'resistance'
      });
    }
  }

  // Second pass: Cluster nearby levels and find frequently tested ones
  const clusterLevels = (levels, type) => {
    if (levels.length === 0) return [];

    // Sort by price level
    const sorted = levels.sort((a, b) => a.level - b.level);
    const clusters = [];
    let currentCluster = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const priceDiff = Math.abs(sorted[i].level - currentCluster[0].level) / currentCluster[0].level;

      if (priceDiff <= priceClusterThreshold) {
        // Add to current cluster
        currentCluster.push(sorted[i]);
      } else {
        // Start new cluster
        if (currentCluster.length > 0) {
          clusters.push(currentCluster);
        }
        currentCluster = [sorted[i]];
      }
    }

    // Don't forget the last cluster
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    // Convert clusters to representative levels
    return clusters.map(cluster => {
      const avgLevel = cluster.reduce((sum, point) => sum + point.level, 0) / cluster.length;
      const totalVolume = cluster.reduce((sum, point) => sum + point.volume, 0);
      const testCount = cluster.length;

      return {
        level: avgLevel,
        type: type,
        strength: testCount, // How many times this level was tested
        totalVolume: totalVolume,
        tests: cluster,
        significance: testCount * Math.log(totalVolume + 1) // Combined metric
      };
    }).sort((a, b) => b.significance - a.significance); // Sort by significance
  };

  const clusteredSupports = clusterLevels(supports, 'support');
  const clusteredResistances = clusterLevels(resistances, 'resistance');

  return {
    supports: clusteredSupports,
    resistances: clusteredResistances,
    rawSupports: supports,
    rawResistances: resistances
  };
};

const screen = async (sectors, options) => {
    options["filter"] = options["filter"] || ((data) => true);
    options["sort"] = options["sort"] || ((a, b) => a.symbol.localeCompare(b.symbol));
    options["progress"] = options["progress"] || ((to_go) => true);


    const symbols = (
        await Promise.all(sectors.map(sector => fetchHoldings(sector.symbol)))
    ).flat().map((h) => h.ticker);

    const result = [];
    const matches = {};
    let i = 0;
    for (;i < symbols.length; i++) {
        options["progress"](symbols.length - i);
        let symbol = symbols[i];
        try {
            const data_req = await fetch(`http://localhost:3001/history/${symbol}/150`);
            const data_raw = await data_req.json();
            const data = data_raw.summary;
            data["candles"] = data_raw.candles;
            let last_candle = data.candles[data.candles.length-1];
            let plast_candle = data.candles[data.candles.length-2];
            if (last_candle.date.split("T")[1] != plast_candle.date.split("T")[1]) {
              //we want to filter out the current candle if the market is still open
              //as the close or volume aren't representative or comparable to other candles
              data["candles"].pop();
              last_candle = plast_candle
            }
            data["symbol"] = symbol;
            data["name"] = data_raw.summary.price.shortName;
            const supres = support_resistance(data.candles.slice(-150));
            insert_sma(data.candles, 50);
            insert_sma(data.candles, 100);
            insert_sma(data.candles, 150);
            data["last"] = {
                close: last_candle.close,
                volume: last_candle.volume,
                date: last_candle.date,
                sma50: last_candle["sma50"],
                sma100: last_candle["sma100"],
                sma150: last_candle["sma150"],
                rsi14: rsi(data.candles, 14),
                support: supres.supports,
                resistance: supres.resistances
            };
            const filtered = options["filter"](data);
            let match = true;
            for (const [filter, value] of Object.entries(filtered)) {
              if (!(filter in matches)) {
                matches[filter] = 0;
              }
              if (value) {
                matches[filter] += 1;
              } else {
                match = false;
              }
            }
            if (match) {
              result.push(data);
            }
        } catch (e) {
            console.error(`Error ${e} when fetching ${symbol}`)
        }
    }
    console.log("Screened "+i+" stocks, your filter matched:" + result.length + ", specific filters matched :" + JSON.stringify(matches));
    options["progress"](0);
    return result.sort(options["sort"]);
};

export default screen;
