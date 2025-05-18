const axios = require("axios");
const cheerio = require("cheerio");

async function fetchHoldingsCSV(etfSymbol = "XLK") {
  // iShares ETF product page URL pattern (you might need to update this for each ETF)
  // Note: The product ID needs to be found for each ETF, here are some examples:
  const etfMap = {
    XLK: "239726",
    XLF: "239704",
    XLV: "239707",
    XLE: "239704",
    XLI: "239726",
    XLY: "239726",
    XLP: "239726",
    XLU: "239726",
    XLB: "239726",
    XLRE: "239726",
    XLC: "239726",
  };

  const productId = etfMap[etfSymbol.toUpperCase()];
  if (!productId) {
    throw new Error(`ETF symbol ${etfSymbol} not supported in mapping.`);
  }

  const url = `https://www.ishares.com/us/products/${productId}/ishares-${etfSymbol.toLowerCase()}-etf`;

  console.log(`Fetching ETF page: ${url}`);

  // Fetch the HTML page
  const { data: html } = await axios.get(url, {
    headers: {
      // pretend to be a browser, helps avoid blocking
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    },
  });

  // Load into cheerio
  const $ = cheerio.load(html);

  // Find the download link for holdings CSV
  // Based on inspecting the page, the link for download usually has text "Download Holdings"
  const downloadLink = $("a")
    .filter((i, el) => {
      return $(el).text().trim().toLowerCase().includes("download holdings");
    })
    .attr("href");

  if (!downloadLink) {
    throw new Error("Could not find 'Download Holdings' link.");
  }

  // Build absolute URL if relative
  const csvUrl = downloadLink.startsWith("http")
    ? downloadLink
    : `https://www.ishares.com${downloadLink}`;

  console.log("Found CSV URL:", csvUrl);

  // Download CSV content
  const csvResponse = await axios.get(csvUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      Accept: "text/csv",
    },
  });

  if (csvResponse.status !== 200) {
    throw new Error(`Failed to download CSV: HTTP ${csvResponse.status}`);
  }

  console.log(csvResponse.data);
}

// Example usage:
fetchHoldingsCSV("XLK").catch((err) => {
  console.error("Error:", err.message);
});
