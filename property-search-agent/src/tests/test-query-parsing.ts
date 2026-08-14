import { parsePropertyQuery } from "../parse-property-query";

function runTests() {
  const queries = [
    "Show me 3-bedroom condos in Irvine under $1.5M with a pool.",
    "Find townhomes in Newport Beach under 900k.",
    "I want a single family home in Anaheim with 4 beds and 3 baths.",
    "Show properties in Irvine over 1800 sqft with a view.",
    "Find condos with HOA under 500.",
    "Show me houses in Tustin below $1,200,000 with pool.",
    "Find 2 bed 2 bath condos in Costa Mesa under 750k.",
    "I need a townhouse in Orange with 3 bedrooms and view.",
    "Show land in Laguna Beach under 2m.",
    "Find homes in Huntington Beach with 2500 square feet and HOA under 600.",

    // Price
    "Find homes under $1.5M",
    "Find homes over $800k",
    "Find homes between $800k and $1.5M",
    "Find homes exactly $1M",

    // Bedrooms
    "Find condos with at least 3 bedrooms",
    "Find condos with at most 4 bedrooms",
    "Find condos with 3 to 5 bedrooms",
    "Find 3-bedroom condos",

    // Bathrooms
    "Find homes with at least 2.5 bathrooms",
    "Find homes with 2 to 3 bathrooms",

    // Sqft
    "Find homes over 1800 sqft",
    "Find homes between 1500 and 2500 sqft",

    // HOA
    "Find condos with HOA under $500",
    "Find condos with HOA between $200 and $500",

    // Combined
    "Find 3 to 4 bedroom condos in Irvine between $800k and $1.5M with a pool",
  ];


  for (const query of queries) {
    const parsed = parsePropertyQuery(query);

    console.log("Query:", query);
    console.log("Parsed:", parsed);
    console.log("-----------------------------");
  }
}

runTests();