import { recommendListings } from "./recommendation-orchestrator";
import { pool } from "./mysql";

const TOP_K = 5;

async function main(): Promise<void> {
  try {
    const targetListingId = process.argv[2]?.trim();

    if (!targetListingId) {
      console.error(
        JSON.stringify(
          {
            success: false,
            error: "A target listing ID is required.",
            usage: 'npx tsx src/cli.ts "LISTING_ID"',
          },
          null,
          2
        )
      );

      process.exitCode = 1;
      return;
    }

    const results = await recommendListings(
      targetListingId,
      TOP_K
    );

    const output = {
      success: true,
      targetListingId,
      count: results.length,
      results,
    };

    console.log(
      JSON.stringify(output, null, 2)
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
        null,
        2
      )
    );

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
