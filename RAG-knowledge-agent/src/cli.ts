import readline from "readline";
import "dotenv/config";
import {
  buildKnowledgeIndex,
  answerKnowledgeQuestion,
} from "./final-orchestrator";

async function main() {
  console.log("Building knowledge index...");

  const index = await buildKnowledgeIndex();

  console.log("RAG Knowledge Agent is ready.");
  console.log("Type 'exit' to quit.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    rl.question("\nYou: ", async (query) => {
      if (query.trim().toLowerCase() === "exit") {
        rl.close();
        return;
      }

      try {
        const answer = await answerKnowledgeQuestion(
          query,
          index
        );

        console.log("\nAgent:");
        console.log(answer);
      } catch (error) {
        console.error("Error:", error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

main();