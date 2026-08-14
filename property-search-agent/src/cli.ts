import * as readline from "node:readline";

import { closeDatabase } from "./mysql";
import { handleActiveListingConversation } from "./active-listing-orchestration";


type OpenClawChannelContext = {
  senderId?: string;
  userId?: string;
  peerId?: string;
  channelId?: string;
  accountId?: string;
  provider?: string;
  from?: string;
};


function getSessionUserId(): string {
  const rawContext =
    process.env.OPENCLAW_CHANNEL_CONTEXT;

  if (!rawContext) {
    return "local-test-user";
  }

  try {
    const context = JSON.parse(
      rawContext
    ) as OpenClawChannelContext;

    return (
      context.senderId ??
      context.userId ??
      context.peerId ??
      context.from ??
      context.channelId ??
      "local-test-user"
    );
  } catch (error: unknown) {
    console.error(
      "Could not parse OPENCLAW_CHANNEL_CONTEXT:",
      error
    );

    return "local-test-user";
  }
}


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


const userId = getSessionUserId();
let isClosing = false;


console.log("Conversational Property Search");
console.log("Search active property listings.");
console.log('Type "exit" or "quit" to close the program.');
console.log(`Session user ID: ${userId}`);


async function closeCli(): Promise<void> {
  if (isClosing) {
    return;
  }

  isClosing = true;
  rl.close();

  try {
    await closeDatabase();
  } catch (error: unknown) {
    console.error(
      "Failed to close the database pool:",
      error
    );
  }
}


function askForMessage(): void {
  rl.question("\nYou: ", async (query) => {
    const trimmedQuery = query.trim();
    const normalizedQuery =
      trimmedQuery.toLowerCase();

    if (
      normalizedQuery === "exit" ||
      normalizedQuery === "quit"
    ) {
      await closeCli();
      return;
    }

    if (!trimmedQuery) {
      console.log(
        "Agent: Please enter a property search request."
      );
    } else {
      try {
        const result =
          await handleActiveListingConversation({
          query: trimmedQuery,
          userId,
        });

        console.log(
          `\nAgent:\n${result.response}`
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        console.error(
          `\nRequest failed: ${message}`
        );
      }
    }

    if (!isClosing) {
      askForMessage();
    }
  });
}


process.on("SIGINT", () => {
  void closeCli();
});


askForMessage();