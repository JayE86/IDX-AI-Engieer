import {
  handleMarketRequest,
  MarketAnalyticsDependencies,
} from "./question-type-router";
import { formatMarketResponse } from "./market-response-formatter";
import { getSupportedMarketCities } from "./query-city";
import { parseMarketQuery } from "./parse-user-query";

export interface AnswerMarketQuestionOptions {

  supportedCities?: string[];

  analyticsDependencies?: MarketAnalyticsDependencies;

  cityLoader?: () => Promise<string[]>;
}

export async function answerMarketQuestion(
  question: string,
  options: AnswerMarketQuestionOptions = {}
): Promise<string> {
  const cityLoader =
    options.cityLoader ?? getSupportedMarketCities;

  const supportedCities =
    options.supportedCities ?? (await cityLoader());

  if (supportedCities.length === 0) {
    throw new Error(
      "No supported cities were found in california_sold."
    );
  }

  const parsedRequest = parseMarketQuery(question, {
    supportedCities,
  });

  const result = await handleMarketRequest(
    parsedRequest,
    options.analyticsDependencies
  );

  return formatMarketResponse(result);
}
